/**
 * Gantt Flow - Roadmap Manager Logic v25.4.1
 */

let staffInfo = {};
let projects = [];
let config = { startYear: 2026, startMonth: 1, endYear: 2026, endMonth: 12 }; 
let timelineMonths = []; 
let currentFilter = 'ALL';
let editingContext = null;

const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const PROFESSIONAL_PALETTE = ["#f94144","#f3722c","#f8961e","#f9844a","#f9c74f","#90be6d","#43aa8b","#4d908e","#577590","#277da1"];

const iconLibrary = {
    'none': { class: '', label: 'None' },
    'workshop': { class: 'fa-solid fa-users', label: 'Workshop' },
    'document': { class: 'fa-solid fa-file-lines', label: 'Paperwork' },
    'deployment': { class: 'fa-solid fa-rocket', label: 'Launch' },
    'meeting': { class: 'fa-solid fa-handshake', label: 'Meeting' },
    'tech': { class: 'fa-solid fa-microchip', label: 'Technical' },
    'report': { class: 'fa-solid fa-chart-pie', label: 'Analysis' }
};

// --- Initialization & Identity ---

function initTimelineRange() {
    timelineMonths = [];
    let curMonth = config.startMonth;
    let curYear = config.startYear;
    let index = 1;
    const totalMonths = (config.endYear - config.startYear) * 12 + (config.endMonth - config.startMonth) + 1;
    for (let i = 0; i < totalMonths; i++) {
        timelineMonths.push({ label: `${monthNames[curMonth-1]} ${String(curYear).slice(-2)}`, absIndex: index });
        index++; curMonth++;
        if (curMonth > 12) { curMonth = 1; curYear++; }
    }
}

function getMonthPreview(val) {
    if (!val || isNaN(val)) return "...";
    const floorVal = Math.floor(val);
    const entry = timelineMonths.find(m => m.absIndex === Math.floor(val)) || timelineMonths[timelineMonths.length - 1];
    const decimal = val % 1;
    let p = "Early";
    if (decimal >= 0.4 && decimal < 0.7) p = "Mid";
    else if (decimal >= 0.7) p = "Late";
    return `${p} ${entry.label}`;
}

function sortProjects() {
    projects.sort((a, b) => (a.name || "").localeCompare(b.name || "", undefined, {sensitivity: 'base'}));
}

function updateInitials() {
    const initialsMap = {};
    const sortedKeys = Object.keys(staffInfo).filter(k => k !== 'TBC').sort((a,b) => staffInfo[a].name.localeCompare(staffInfo[b].name));
    sortedKeys.forEach(id => {
        const nameParts = staffInfo[id].name.trim().split(/\s+/);
        let base = (nameParts.length > 1) ? (nameParts[0][0] + nameParts[nameParts.length-1][0]) : nameParts[0].substring(0, 2);
        base = base.toUpperCase();
        if (!initialsMap[base]) { initialsMap[base] = id; staffInfo[id].displayInitials = base; }
        else { let c = 2; while (initialsMap[base + c]) { c++; } staffInfo[id].displayInitials = base + c; initialsMap[base + c] = id; }
    });
    if (staffInfo['TBC']) staffInfo['TBC'].displayInitials = 'TBC';
}

function assignColors() {
    const sortedKeys = Object.keys(staffInfo).filter(k => k !== 'TBC').sort((a,b) => staffInfo[a].name.localeCompare(staffInfo[b].name));
    sortedKeys.forEach((key, index) => { staffInfo[key].color = PROFESSIONAL_PALETTE[index % PROFESSIONAL_PALETTE.length]; });
    if (!staffInfo['TBC']) staffInfo['TBC'] = { name: 'Unassigned', color: '#64748b' };
    staffInfo['TBC'].name = 'Unassigned'; staffInfo['TBC'].color = '#64748b';
    updateInitials();
}

// --- Persistence ---

function loadData() {
    const saved = localStorage.getItem('gantt_flow_v25_final');
    if (saved) {
        const data = JSON.parse(saved);
        projects = data.projects || []; staffInfo = data.staff || {};
        if (data.config) config = data.config;
    }
    sortProjects(); initTimelineRange(); assignColors(); initFilters(); render();
}

function persist() {
    localStorage.setItem('gantt_flow_v25_final', JSON.stringify({ config, staff: staffInfo, projects }));
    const statusEl = document.getElementById('save-status');
    statusEl.textContent = "Flow Saved " + new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
    statusEl.classList.add('save-pulse');
    setTimeout(() => statusEl.classList.remove('save-pulse'), 800);
}

function exportData() {
    setFilter('ALL'); sortProjects();
    const clean = JSON.parse(JSON.stringify({ config, staff: staffInfo, projects }));
    Object.keys(clean.staff).forEach(k => delete clean.staff[k].color);
    const blob = new Blob([JSON.stringify(clean, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "project_roadmap.json"; a.click();
}

function triggerImport() { document.getElementById('importFile').click(); }
function handleFileImport(e) {
    const reader = new FileReader();
    reader.onload = (ev) => {
        const imported = JSON.parse(ev.target.result);
        projects = imported.projects || []; staffInfo = imported.staff || {};
        if (imported.config) config = imported.config;
        sortProjects(); initTimelineRange(); assignColors(); initFilters(); setFilter('ALL'); persist();
    };
    reader.readAsText(e.target.files[0]);
}

// --- UI Logic ---

function toggleSidebar() {
    const sb = document.getElementById('sidebar');
    sb.classList.toggle('collapsed');
    localStorage.setItem('sidebar_collapsed', sb.classList.contains('collapsed'));
}

function initFilters() {
    const container = document.getElementById('filter-list');
    container.innerHTML = `<button class="filter-item active" id="f-ALL" onclick="setFilter('ALL')"><i class="fa-solid fa-layer-group"></i> All Projects</button><button class="filter-item" id="f-TBC" onclick="setFilter('TBC')"><i class="fa-solid fa-circle-exclamation"></i> Unassigned</button>`;
    Object.entries(staffInfo).filter(([k]) => k !== 'TBC').sort((a,b) => a[1].name.localeCompare(b[1].name)).forEach(([key, info]) => {
        const btn = document.createElement('button');
        btn.className = 'filter-item'; btn.id = `f-${key}`;
        btn.innerHTML = `<div style="display:flex; align-items:center; gap:10px;"><div class="filter-color-dot" style="background:${info.color}"></div><div><strong>${info.name} (${info.displayInitials})</strong><br><small>${info.role}</small></div></div>`;
        btn.onclick = () => setFilter(key);
        container.appendChild(btn);
    });
}

function setFilter(key) {
    currentFilter = key;
    document.querySelectorAll('.filter-item').forEach(b => b.classList.remove('active'));
    if (document.getElementById(`f-${key}`)) document.getElementById(`f-${key}`).classList.add('active');
    render();
}

function openModal(title, subtitle, bodyHtml, onDelete) {
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalSubtitle').textContent = subtitle;
    document.getElementById('modalBody').innerHTML = bodyHtml;
    const footer = document.querySelector('.modal-footer');
    footer.innerHTML = `<button class="btn btn-primary" onclick="saveChanges()"><i class="fa-solid fa-check"></i> Save Details</button><button class="btn" onclick="closeModal()">Cancel</button>${onDelete ? `<button class="btn btn-danger" id="deleteBtn"><i class="fa-solid fa-trash-can"></i> Delete</button>` : ''}`;
    if (onDelete) document.getElementById('deleteBtn').onclick = onDelete;
    document.getElementById('editorModal').style.display = 'flex';
}
function closeModal() { document.getElementById('editorModal').style.display = 'none'; editingContext = null; }

function setupLivePreviews() {
    ['e_start', 'e_end', 'e_month'].forEach(id => {
        const input = document.getElementById(id);
        if (input) input.oninput = () => {
            const badge = document.getElementById(id + '_preview');
            if (badge) badge.textContent = getMonthPreview(parseFloat(input.value));
        };
    });
}

// --- Actions ---

function addProject() { projects.push({ name: 'Untitled Project', tasks: [], milestones: [] }); sortProjects(); render(); persist(); }
function editProject(pIdx) {
    editingContext = { type: 'project', pIdx };
    openModal("Project Settings", "General settings", `<div class="form-group"><label>Project Title</label><input type="text" id="e_title" value="${projects[pIdx].name}"></div><div style="display:flex; gap:10px; margin-top:10px;"><button class="btn btn-success" style="flex:1" onclick="addTask(${pIdx})"><i class="fa-solid fa-plus"></i> Task</button><button class="btn btn-primary" style="flex:1" onclick="addMilestone(${pIdx})"><i class="fa-solid fa-diamond"></i> Milestone</button></div>`, () => { if(confirm("Delete Project?")) { projects.splice(pIdx,1); closeModal(); render(); persist(); }});
}

function addTask(pIdx) { projects[pIdx].tasks.push({ name: 'New Task', start: 1, end: 2, lead: 'TBC', support: [] }); render(); persist(); closeModal(); }
function addMilestone(pIdx) { projects[pIdx].milestones.push({ name: 'New Milestone', month: 1, icon: 'none' }); render(); persist(); closeModal(); }

function editTask(pIdx, tIdx) {
    editingContext = { type: 'task', pIdx, tIdx };
    const t = projects[pIdx].tasks[tIdx];
    const max = timelineMonths.length + 1;
    const collaboratorList = Object.entries(staffInfo).filter(([k]) => k !== 'TBC').sort((a,b) => a[1].name.localeCompare(b[1].name)).map(([k, v]) => `<label class="collaborator-item"><input type="checkbox" name="collab" value="${k}" ${t.support?.some(s => s.staff === k) ? 'checked' : ''}><span>${v.name}</span></label>`).join('');
    
    // REVISED: Sorted staffInfo for dropdown selection
    const sortedStaff = Object.entries(staffInfo).sort((a, b) => a[1].name.localeCompare(b[1].name));

    openModal("Edit Task", "Configure task details", `
        <div class="form-grid">
            <div class="form-group full-width"><label>Task Description</label><input type="text" id="e_title" value="${t.name}"></div>
            <div class="form-group"><label>Planned Start <span id="e_start_preview" class="preview-badge">${getMonthPreview(t.start)}</span></label><input type="number" step="0.1" min="1" max="${max}" id="e_start" value="${t.start}"></div>
            <div class="form-group"><label>Planned Completion <span id="e_end_preview" class="preview-badge">${getMonthPreview(t.end)}</span></label><input type="number" step="0.1" min="1" max="${max}" id="e_end" value="${t.end}"></div>
            <div class="form-group full-width"><label>Lead</label>
                <select id="e_lead">${sortedStaff.map(([k,v]) => `<option value="${k}" ${k===t.lead?'selected':''}>${v.name}</option>`).join('')}</select>
            </div>
            <div class="form-group full-width"><label>Collaborators</label><div class="collaborator-box">${collaboratorList}</div></div>
        </div>`, () => { projects[pIdx].tasks.splice(tIdx,1); closeModal(); render(); persist(); });
    setupLivePreviews();
}

function editMilestone(pIdx, mIdx) {
    editingContext = { type: 'milestone', pIdx, mIdx };
    const m = projects[pIdx].milestones[mIdx];
    openModal("Edit Milestone", "Event details", `<div class="form-grid"><div class="form-group full-width"><label>Milestone Title</label><input type="text" id="e_title" value="${m.name}"></div><div class="form-group full-width"><label>Target Date <span id="e_month_preview" class="preview-badge">${getMonthPreview(m.month)}</span></label><input type="number" step="0.1" min="1" max="${timelineMonths.length+1}" id="e_month" value="${m.month}"></div><div class="form-group full-width"><label>Category Icon</label><div class="icon-selector">${Object.entries({'none': {class:'', label:'None'}, 'workshop': {class:'fa-solid fa-users', label:'Workshop'}, 'document': {class:'fa-solid fa-file-lines', label:'Paperwork'}, 'deployment': {class:'fa-solid fa-rocket', label:'Launch'}, 'meeting': {class:'fa-solid fa-handshake', label:'Meeting'}, 'tech': {class:'fa-solid fa-microchip', label:'Technical'}, 'report': {class:'fa-solid fa-chart-pie', label:'Analysis'}}).map(([k,v]) => `<div class="icon-btn ${m.icon === k ? 'active' : ''}" onclick="window.selectIcon(this, '${k}')"><i class="${v.class || 'fa-solid fa-ban'}"></i><span>${v.label}</span></div>`).join('')}</div><input type="hidden" id="e_icon" value="${m.icon || 'none'}"></div></div>`, () => { projects[pIdx].milestones.splice(mIdx,1); closeModal(); render(); persist(); });
    setupLivePreviews();
}

window.selectIcon = function(el, key) { document.querySelectorAll('.icon-btn').forEach(b => b.classList.remove('active')); el.classList.add('active'); document.getElementById('e_icon').value = key; }

function saveChanges() {
    const ctx = editingContext;
    if (ctx.type === 'staff-edit') {
        const id = ctx.isNew ? "id_" + Date.now() : ctx.oldId;
        const name = document.getElementById('s_name').value;
        const role = document.getElementById('s_role').value;
        if(!name) return alert("Name required");
        staffInfo[id] = { name, role };
        assignColors(); initFilters(); render(); persist(); closeModal(); manageStaff();
        return;
    }
    const title = document.getElementById('e_title').value;
    if (ctx.type === 'project') { projects[ctx.pIdx].name = title; sortProjects(); }
    if (ctx.type === 'task') {
        const t = projects[ctx.pIdx].tasks[ctx.tIdx];
        t.name = title; t.start = parseFloat(document.getElementById('e_start').value); t.end = parseFloat(document.getElementById('e_end').value);
        t.lead = document.getElementById('e_lead').value; t.support = Array.from(document.querySelectorAll('input[name="collab"]:checked')).map(c => ({ staff: c.value }));
        projects[ctx.pIdx].tasks.sort((a,b) => a.start - b.start);
    }
    if (ctx.type === 'milestone') {
        const m = projects[ctx.pIdx].milestones[ctx.mIdx];
        m.name = title; m.month = parseFloat(document.getElementById('e_month').value); m.icon = document.getElementById('e_icon').value;
    }
    closeModal(); render(); persist();
}

// --- Team Management Logic ---

function manageStaff() {
    editingContext = { type: 'staff-manager' };
    let listHtml = `<div class="staff-manager-list">`;
    Object.entries(staffInfo).filter(([k])=> k !== 'TBC').forEach(([id, info]) => {
        listHtml += `<div class="staff-row"><div class="staff-color-dot" style="background:${info.color}"></div><div class="staff-info"><strong>${info.name} (${info.displayInitials})</strong><small>${info.role}</small></div><button class="btn btn-sm" onclick="editStaffMember('${id}')"><i class="fa-solid fa-pen"></i> Edit</button></div>`;
    });
    listHtml += `</div>`;
    openModal("Team Directory", "Manage project lead", listHtml);
    const footer = document.querySelector('.modal-footer');
    footer.innerHTML = `<button class="btn btn-success" onclick="addNewStaff()"><i class="fa-solid fa-user-plus"></i> Add Member</button><button class="btn" onclick="closeModal()">Close</button>`;
}

function addNewStaff() {
    editingContext = { type: 'staff-edit', isNew: true };
    openModal("Add Staff Member", "Create new team record", `<div class="form-grid"><div class="form-group full-width"><label>Full Name</label><input type="text" id="s_name" placeholder="e.g. Andy Nguyen"></div><div class="form-group full-width"><label>Job Title / Role</label><input type="text" id="s_role" placeholder="e.g. Solutions Analyst"></div></div>`);
}

function editStaffMember(id) {
    const s = staffInfo[id];
    editingContext = { type: 'staff-edit', isNew: false, oldId: id };
    openModal("Edit Staff Member", "Update profile details", `<div class="form-grid"><div class="form-group full-width"><label>Full Name</label><input type="text" id="s_name" value="${s.name}"></div><div class="form-group full-width"><label>Job Title / Role</label><input type="text" id="s_role" value="${s.role}"></div></div>`, () => deleteStaff(id));
}

function deleteStaff(id) {
    let count = 0; projects.forEach(p => p.tasks.forEach(t => { if(t.lead === id) count++; }));
    if (count > 0) {
        const re = prompt(`${count} tasks found. Enter Name/Initials to reassign, or leave blank for Unassigned:`, 'TBC');
        const target = staffInfo[re] ? re : (Object.keys(staffInfo).find(k => staffInfo[k].displayInitials === re) || 'TBC');
        projects.forEach(p => p.tasks.forEach(t => { if(t.lead === id) t.lead = target; }));
    }
    projects.forEach(p => p.tasks.forEach(t => { if(t.support) t.support = t.support.filter(s => s.staff !== id); }));
    delete staffInfo[id]; assignColors(); initFilters(); render(); persist(); closeModal(); manageStaff();
}

// --- Render Engine ---

function render() {
    const container = document.getElementById('timeline');
    const totalCols = timelineMonths.length;
    container.innerHTML = '';
    const gridWidth = Math.max(1600, totalCols * 130);
    
    const card = document.createElement('div');
    card.className = 'timeline-card';
    card.style.width = gridWidth + "px";

    const header = document.createElement('div');
    header.className = 'timeline-header';
    header.style.gridTemplateColumns = `var(--project-col-width) repeat(${totalCols}, 1fr)`;
    header.innerHTML = `<div>Project Item</div>` + timelineMonths.map(m => `<div>${m.label}</div>`).join('');
    card.appendChild(header);

    projects.forEach((p, pIdx) => {
        const isVisible = (currentFilter === 'ALL') || (currentFilter === 'TBC' && p.tasks.some(t => t.lead === 'TBC')) || p.tasks.some(t => t.lead === currentFilter || t.support?.some(s => s.staff === currentFilter));
        if (!isVisible) return;

        const items = [...p.tasks.map((t, idx) => ({ ...t, type: 'task', oIdx: idx, date: t.start })), ...p.milestones.map((m, idx) => ({ ...m, type: 'milestone', oIdx: idx, date: m.month }))]
                      .sort((a,b) => (a.date === b.date) ? (a.type === 'milestone' ? -1 : 1) : a.date - b.date);

        const row = document.createElement('div');
        row.className = 'timeline-row';
        row.style.gridTemplateColumns = `var(--project-col-width) 1fr`;
        const side = document.createElement('div');
        side.className = 'project-sidebar';
        side.innerHTML = `<div style="margin-bottom:12px;">${p.name}</div><button class="btn btn-sm" style="padding:4px 8px; font-size:11px" onclick="editProject(${pIdx})"><i class="fa-solid fa-gear"></i> Manage</button>`;
        row.appendChild(side);

        const area = document.createElement('div');
        area.className = 'data-area';
        area.style.backgroundSize = `calc(100% / ${totalCols}) 100%`;

        items.forEach((item, laneIdx) => {
            const vTop = 20 + (laneIdx * 50); 
            if (item.type === 'task') {
                const leadData = staffInfo[item.lead] || { name: 'Unassigned', color: '#64748b', displayInitials: '?' };
                const collabList = (item.support || []).map(s => staffInfo[s.staff]?.name || 'Unknown').join(', ');
                const tooltipText = `Task: ${item.name}\nLead: ${leadData.name}\nTiming: ${getMonthPreview(item.start)} to ${getMonthPreview(item.end)}\nCollaborators: ${collabList || 'None'}`;

                const barWidthPx = (((item.end - item.start) / totalCols) * gridWidth);
                const badgeWidth = 33 + ((item.support || []).length * 27);
                const textWidth = item.name.length * 8.5;
                const totalRequiredInside = badgeWidth + textWidth + 24;
                
                const labelOutside = totalRequiredInside > barWidthPx;

                const el = document.createElement('div');
                el.className = 'task-item';
                el.style.left = `${((item.start-1)/totalCols)*100}%`;
                el.style.width = `${((item.end-item.start)/totalCols)*100}%`;
                el.style.top = `${vTop}px`;
                el.onclick = () => editTask(pIdx, item.oIdx);
                const tbcClass = (item.lead === 'TBC') ? 'tbc-warning' : '';
                el.innerHTML = `<div class="task-bar ${tbcClass}" style="background:${leadData.color}" title="${tooltipText}"><div class="badge-group"><div class="badge lead" title="Lead: ${leadData.name}">${leadData.displayInitials}</div>${(item.support||[]).map(s => `<div class="badge support" title="Collaborator: ${staffInfo[s.staff]?.name || '?'}" style="background:${staffInfo[s.staff]?.color || '#64748b'}">${staffInfo[s.staff]?.displayInitials || '?'}</div>`).join('')}</div><span class="task-label ${labelOutside ? 'label-outside' : 'label-inside'}">${(item.lead === 'TBC') ? '<i class="fa-solid fa-triangle-exclamation" style="margin-right:8px"></i>' : ''}${item.name}</span></div>`;
                area.appendChild(el);
            } else {
                const iconMap = {'workshop':'fa-users','document':'fa-file-lines','deployment':'fa-rocket','meeting':'fa-handshake','tech':'fa-microchip','report':'fa-chart-pie'};
                const mEl = document.createElement('div');
                mEl.className = 'milestone-lane-item'; mEl.style.left = `${((item.month - 1) / totalCols) * 100}%`; mEl.style.top = `${vTop}px`;
                mEl.onclick = () => editMilestone(pIdx, item.oIdx);
                mEl.innerHTML = `<div class="date-line"></div><div class="milestone-diamond"></div><div class="milestone-lane-label">${item.icon && iconMap[item.icon] ? `<i class="fa-solid ${iconMap[item.icon]}"></i> ` : ''}${item.name}</div>`;
                area.appendChild(mEl);
            }
        });
        row.style.minHeight = Math.max(120, (items.length * 50) + 50) + "px";
        row.appendChild(area); card.appendChild(row);
    });
    container.appendChild(card);
}

loadData();