/**
 * Gantt Flow Logic
 */

let staffInfo = {};
let projects = [];
let config = { startYear: 2026, startMonth: 1, endYear: 2027, endMonth: 2 }; 
let timelineMonths = []; 
let currentFilter = 'ALL';
let editingContext = null;
let hasChanges = false;

const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const PROFESSIONAL_PALETTE = ["#f94144","#f3722c","#f8961e","#f9844a","#f9c74f","#90be6d","#43aa8b","#4d908e","#577590","#277da1"];

const iconMap = {
    'none': { class: 'fa-ban', label: 'None' },
    'workshop': { class: 'fa-users', label: 'Workshop' },
    'document': { class: 'fa-file-lines', label: 'Document' },
    'deployment': { class: 'fa-rocket', label: 'Launch' },
    'meeting': { class: 'fa-handshake', label: 'Meeting' },
    'tech': { class: 'fa-microchip', label: 'Technical' },
    'report': { class: 'fa-chart-pie', label: 'Analysis' }
};

// --- Calendar Helpers ---

function dateToViewIndex(monthVal, year) {
    const monthsDiff = (year - config.startYear) * 12 + (monthVal - config.startMonth);
    return monthsDiff + 1;
}

function getMonthPreview(val, year) {
    if (!val || isNaN(val) || !year) return "...";
    const mIdx = Math.floor(val);
    const mName = monthNames[mIdx - 1] || "???";
    const decimal = val % 1;
    let p = (decimal < 0.4) ? "Early" : (decimal < 0.7) ? "Mid" : "Late";
    return `${p} ${mName} ${year}`;
}

// --- Helpers ---

function getStaffSortedBySurname() {
    return Object.entries(staffInfo)
        .filter(([id]) => id !== 'TBC')
        .sort((a, b) => {
            const nameA = a[1].name.trim().split(/\s+/);
            const nameB = b[1].name.trim().split(/\s+/);
            const surnameA = nameA[nameA.length - 1].toLowerCase();
            const surnameB = nameB[nameB.length - 1].toLowerCase();
            return surnameA.localeCompare(surnameB);
        });
}

function initTimelineRange() {
    timelineMonths = [];
    let curMonth = config.startMonth;
    let curYear = config.startYear;
    const totalMonths = (config.endYear - config.startYear) * 12 + (config.endMonth - config.startMonth) + 1;
    for (let i = 0; i < totalMonths; i++) {
        timelineMonths.push({ label: `${monthNames[curMonth-1]} ${String(curYear).slice(-2)}`, month: curMonth, year: curYear });
        curMonth++;
        if (curMonth > 12) { curMonth = 1; curYear++; }
    }
}

function updateInitials() {
    getStaffSortedBySurname().forEach(([id, data]) => {
        const parts = data.name.trim().split(/\s+/);
        let base = (parts.length > 1) ? (parts[0][0] + parts[parts.length-1][0]) : parts[0].substring(0, 2);
        staffInfo[id].displayInitials = base.toUpperCase();
    });
    // Explicitly set TBC initials
    if (staffInfo['TBC']) staffInfo['TBC'].displayInitials = 'TBC';
}

function assignColors() {
    // 1. Force-inject TBC into the staffInfo object so it's never missing
    staffInfo['TBC'] = { 
        name: 'Unassigned', 
        role: 'Pending', 
        displayInitials: 'TBC', 
        color: '#64748b' 
    };

    // 2. Assign colors to everyone else
    getStaffSortedBySurname().forEach(([id], index) => { 
        staffInfo[id].color = PROFESSIONAL_PALETTE[index % PROFESSIONAL_PALETTE.length]; 
    });
}


function sortProjects() {
    projects.sort((a, b) => (a.name || "").localeCompare(b.name || "", undefined, {sensitivity: 'base'}));
}

// --- Persistence & Status ---

function loadData() {
    const saved = localStorage.getItem('gantt_flow');
    if (saved) {
        const data = JSON.parse(saved);
        projects = data.projects || []; 
        staffInfo = data.staff || {};
        if (data.config) config = data.config;
    }
    
    // Setup data
    assignColors(); 
    updateInitials(); 
    sortProjects(); 
    initTimelineRange(); 
    initFilters(); 
    render();

    // Reset status: On load, we assume the browser matches the last session
    hasChanges = false;
    updateStatusMessage("Workspace Ready", false);
}


function markModified() {
    hasChanges = true;
    updateStatusMessage("Changes Pending Export", true);
}

function persist() {
    localStorage.setItem('gantt_flow', JSON.stringify({ config, staff: staffInfo, projects }));
    const time = new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
    
    // Even though it's saved to browser, keep warning if not exported to file
    if (hasChanges) {
        updateStatusMessage(`Auto-saved to Browser (${time}) - Export Required`, true);
    } else {
        updateStatusMessage(`Workspace Ready (${time})`, false);
    }
}

function updateStatusMessage(text, isWarning) {
    const el = document.getElementById('save-status');
    if (!el) return;
    
    // Change icons to reflect the actual action needed
    const icon = isWarning 
        ? '<i class="fa-solid fa-file-export fa-fade"></i>' // Pulse icon for export
        : '<i class="fa-solid fa-circle-check"></i>';      // Check for synced
        
    el.innerHTML = `${icon} <span>${text}</span>`;
    el.className = isWarning ? 'unsaved' : 'saved';
}


// --- Sidebar & Filter Logic ---

function toggleSidebar() { document.getElementById('sidebar').classList.toggle('collapsed'); }

function setFilter(key) {
    currentFilter = key;
    document.querySelectorAll('.filter-item').forEach(b => b.classList.remove('active'));
    if (document.getElementById(`f-${key}`)) document.getElementById(`f-${key}`).classList.add('active');
    render();
}

function initFilters() {
    const container = document.getElementById('filter-list');
    container.innerHTML = `
        <button class="filter-item active" id="f-ALL" onclick="setFilter('ALL')"><i class="fa-solid fa-layer-group"></i> All Projects</button>
        <button class="filter-item" id="f-TBC" onclick="setFilter('TBC')"><i class="fa-solid fa-user-slash"></i> Unassigned</button>
    `;
    getStaffSortedBySurname().forEach(([key, info]) => {
        const btn = document.createElement('button');
        btn.className = 'filter-item'; btn.id = `f-${key}`;
        btn.innerHTML = `<div class="filter-color-dot" style="background:${info.color}"></div><div class="filter-info"><strong>${info.name}</strong><br><small>${info.role}</small></div>`;
        btn.onclick = () => setFilter(key);
        container.appendChild(btn);
    });
}

function configureTimeline() {
    editingContext = { type: 'timeline-config' };
    const monthOptions = monthNames.map((m, i) => `<option value="${i+1}">${m}</option>`).join('');
    const years = [2024, 2025, 2026, 2027, 2028, 2029, 2030];
    const yearOptions = years.map(y => `<option value="${y}">${y}</option>`).join('');

    openModal("Timeline Settings", "Reconfigure chart view period", `
        <div class="form-grid">
            <div class="form-group"><label>Start Month</label><select id="conf_startMonth">${monthOptions}</select></div>
            <div class="form-group"><label>Start Year</label><select id="conf_startYear">${yearOptions}</select></div>
            <div class="form-group"><label>End Month</label><select id="conf_endMonth">${monthOptions}</select></div>
            <div class="form-group"><label>End Year</label><select id="conf_endYear">${yearOptions}</select></div>
        </div>
    `);
    document.getElementById('conf_startMonth').value = config.startMonth;
    document.getElementById('conf_startYear').value = config.startYear;
    document.getElementById('conf_endMonth').value = config.endMonth;
    document.getElementById('conf_endYear').value = config.endYear;
}

// --- Modal Management ---

function openModal(title, subtitle, bodyHtml, onDelete) {
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalSubtitle').textContent = subtitle;
    document.getElementById('modalBody').innerHTML = bodyHtml;
    const footer = document.querySelector('.modal-footer');
    footer.innerHTML = `<button class="btn btn-primary" onclick="saveChanges()">Save Details</button><button class="btn" onclick="closeModal()">Cancel</button>`;
    if (onDelete) {
        const del = document.createElement('button');
        del.className = 'btn btn-danger'; del.innerHTML = '<i class="fa-solid fa-trash"></i> Delete'; del.onclick = onDelete;
        footer.appendChild(del);
    }
    document.getElementById('editorModal').style.display = 'flex';
}

function closeModal() { document.getElementById('editorModal').style.display = 'none'; editingContext = null; }

function updateCollabPreview() {
    const selected = Array.from(document.querySelectorAll('input[name="collab"]:checked')).map(cb => staffInfo[cb.value]?.name || 'Unknown');
    const container = document.getElementById('e_collab_preview');
    if (container) container.innerHTML = selected.length ? selected.map(n => `<span class="collab-pill">${n}</span>`).join('') : '<span style="color:#94a3b8; font-style:italic; font-size:12px;">No collaborators selected</span>';
}

function filterCollabs(query) {
    const q = query.toLowerCase();
    document.querySelectorAll('.collaborator-item').forEach(item => {
        const name = item.querySelector('strong').textContent.toLowerCase();
        item.style.display = name.includes(q) ? 'flex' : 'none';
    });
}

function toggleCollabCard(el, id) {
    const checkbox = el.querySelector('input');
    checkbox.checked = !checkbox.checked;
    el.classList.toggle('selected', checkbox.checked);
    updateCollabPreview();
    markModified();
}

window.selectIcon = function(el, key) {
    document.querySelectorAll('.icon-btn').forEach(b => b.classList.remove('active'));
    el.classList.add('active');
    document.getElementById('e_icon').value = key;
    markModified();
}

// --- Actions ---

function addProject() { 
    const tempId = "new_" + Date.now();
    projects.push({ name: 'Untitled Project', tasks: [], milestones: [], goals: [], _scrollId: tempId });
    setFilter('ALL'); sortProjects(); markModified(); render(); persist(); 
    const row = document.querySelector(`[data-project-id="${tempId}"]`);
    if (row) row.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function editProject(pIdx) {
    editingContext = { type: 'project', pIdx };
    const p = projects[pIdx];
    const goalsHtml = (p.goals || []).map((g, i) => `<div class="goal-editor-row"><div class="goal-number">${i+1}</div><input type="text" class="goal-edit-input" value="${g}" oninput="updateGoalText(${pIdx}, ${i}, this.value)" placeholder="Edit goal..."><button class="btn-goal-remove" onclick="removeGoal(${pIdx}, ${i})"><i class="fa-solid fa-trash"></i></button></div>`).join('');

    openModal("Project Settings", "Manage objectives", `
        <div class="form-group"><label>Project Title</label><input type="text" id="e_title" value="${p.name}"></div>
        <div class="goal-manager-section">
            <label><i class="fa-solid fa-bullseye"></i> Key Objectives</label>
            <div class="goal-input-group"><input type="text" id="new_goal_text" placeholder="Add new goal..." onkeypress="if(event.key==='Enter') addGoal(${pIdx})"><button class="btn-add" onclick="addGoal(${pIdx})"><i class="fa-solid fa-plus"></i></button></div>
            <div class="goal-editor-list">${goalsHtml || '<em>No goals set</em>'}</div>
        </div>
        <div style="display:flex; gap:10px; margin-top:24px; border-top:1px solid #eee; padding-top:20px;">
            <button class="btn btn-success" style="flex:1" onclick="addTask(${pIdx})">Add Task</button>
            <button class="btn btn-primary" style="flex:1" onclick="addMilestone(${pIdx})">Add Milestone</button>
        </div>`, () => { if(confirm("Delete Project?")) { projects.splice(pIdx,1); markModified(); closeModal(); render(); persist(); } });
}

function updateGoalText(pIdx, gIdx, val) { projects[pIdx].goals[gIdx] = val; markModified(); }
function addGoal(pIdx) {
    const txt = document.getElementById('new_goal_text').value.trim();
    if (!txt) return;
    if (!projects[pIdx].goals) projects[pIdx].goals = [];
    projects[pIdx].goals.push(txt);
    markModified(); persist(); editProject(pIdx);
}
function removeGoal(pIdx, gIdx) { projects[pIdx].goals.splice(gIdx, 1); markModified(); persist(); editProject(pIdx); }

function manageStaff() {
    const ss = getStaffSortedBySurname();
    let html = `<div class="staff-manager-container"><div class="staff-list-header"><div></div><div>Member Info</div><div style="text-align:right">Options</div></div>`;
    ss.forEach(([id, info]) => {
        html += `<div class="staff-row"><div class="staff-avatar" style="background:${info.color}">${info.displayInitials}</div><div class="staff-meta"><strong>${info.name}</strong><span>${info.role}</span></div><div class="staff-actions"><button class="btn-icon" onclick="editStaffMember('${id}')"><i class="fa-solid fa-user-pen"></i></button><button class="btn-icon delete" onclick="deleteStaff('${id}')"><i class="fa-solid fa-user-xmark"></i></button></div></div>`;
    });
    openModal("Team Directory", "Team roles", html + `</div>`);
    const footer = document.querySelector('.modal-footer');
    footer.innerHTML = `<button class="btn btn-primary" onclick="addNewStaff()">+ Add New Member</button><button class="btn" onclick="closeModal()">Close</button>`;
}

function addNewStaff() { editingContext = { type: 'staff-edit', isNew: true }; openModal("Add Member", "Create profile", `<div class="form-grid"><div class="form-group full-width"><label>Name</label><input type="text" id="s_name"></div><div class="form-group full-width"><label>Role</label><input type="text" id="s_role"></div></div>`); }
function editStaffMember(id) { const s = staffInfo[id]; editingContext = { type: 'staff-edit', isNew: false, targetId: id }; openModal("Edit Profile", "Update record", `<div class="form-grid"><div class="form-group full-width"><label>Name</label><input type="text" id="s_name" value="${s.name}"></div><div class="form-group full-width"><label>Role</label><input type="text" id="s_role" value="${s.role}"></div></div>`); }

function editTask(pIdx, tIdx) {
    editingContext = { type: 'task', pIdx, tIdx };
    const t = projects[pIdx].tasks[tIdx];
    const sorted = getStaffSortedBySurname();
    const collabCards = sorted.map(([k, v]) => {
        const isChecked = t.support?.some(s => s.staff === k);
        return `<div class="collaborator-item ${isChecked ? 'selected' : ''}" onclick="toggleCollabCard(this, '${k}')"><input type="checkbox" name="collab" value="${k}" ${isChecked ? 'checked' : ''}><div class="collab-avatar" style="background:${v.color}">${v.displayInitials}</div><div class="collab-info"><strong>${v.name}</strong><span>${v.role}</span></div></div>`;
    }).join('');
    const leadOptions = [['TBC', staffInfo['TBC']], ...sorted].map(([k,v]) => `<option value="${k}" ${k===t.lead?'selected':''}>${v.name}</option>`).join('');
    const yearOptions = [2024, 2025, 2026, 2027, 2028, 2029, 2030].map(y => `<option value="${y}">${y}</option>`).join('');

    openModal("Edit Task", "Configure assignments", `
        <div class="form-grid">
            <div class="form-group full-width"><label>Name</label><input type="text" id="e_title" value="${t.name}"></div>
            <div class="form-group">
                <label>Start Month (1-12) <span id="e_start_preview" class="preview-badge">${getMonthPreview(t.startMonth, t.startYear)}</span></label>
                <input type="number" step="0.1" id="e_start_m" value="${t.startMonth || 1}">
            </div>
            <div class="form-group"><label>Start Year</label><select id="e_start_y">${yearOptions}</select></div>
            <div class="form-group">
                <label>End Month (1-12) <span id="e_end_preview" class="preview-badge">${getMonthPreview(t.endMonth, t.endYear)}</span></label>
                <input type="number" step="0.1" id="e_end_m" value="${t.endMonth || 2}">
            </div>
            <div class="form-group"><label>End Year</label><select id="e_end_y">${yearOptions}</select></div>
            <div class="form-group full-width"><label>Lead</label><select id="e_lead">${leadOptions}</select></div>
            <div class="form-group full-width"><label>Team</label><div id="e_collab_preview" class="collab-pills-container"></div><div class="team-picker-search"><i class="fa-solid fa-magnifying-glass"></i><input type="text" placeholder="Search team..." oninput="filterCollabs(this.value)"></div><div class="collaborator-box">${collabCards}</div></div>
        </div>`, () => { projects[pIdx].tasks.splice(tIdx,1); markModified(); closeModal(); render(); persist(); });
    
    document.getElementById('e_start_y').value = t.startYear || config.startYear;
    document.getElementById('e_end_y').value = t.endYear || config.startYear;
    updateCollabPreview();

    const updatePreview = () => {
        document.getElementById('e_start_preview').textContent = getMonthPreview(parseFloat(document.getElementById('e_start_m').value), document.getElementById('e_start_y').value);
        document.getElementById('e_end_preview').textContent = getMonthPreview(parseFloat(document.getElementById('e_end_m').value), document.getElementById('e_end_y').value);
        markModified();
    };
    ['e_start_m', 'e_start_y', 'e_end_m', 'e_end_y'].forEach(id => document.getElementById(id).onchange = updatePreview);
    ['e_start_m', 'e_end_m'].forEach(id => document.getElementById(id).oninput = updatePreview);
}

function editMilestone(pIdx, mIdx) {
    editingContext = { type: 'milestone', pIdx, mIdx };
    const m = projects[pIdx].milestones[mIdx];
    const iconHtml = Object.entries(iconMap).map(([k,v]) => `<div class="icon-btn ${m.icon === k ? 'active' : ''}" onclick="window.selectIcon(this, '${k}')"><i class="fa-solid ${v.class}"></i><span>${v.label}</span></div>`).join('');
    const yearOptions = [2024, 2025, 2026, 2027, 2028, 2029, 2030].map(y => `<option value="${y}">${y}</option>`).join('');

    openModal("Edit Milestone", "Timing", `
        <div class="form-grid">
            <div class="form-group full-width"><label>Title</label><input type="text" id="e_title" value="${m.name}"></div>
            <div class="form-group">
                <label>Month (1-12) <span id="e_m_preview" class="preview-badge">${getMonthPreview(m.month, m.year)}</span></label>
                <input type="number" step="0.1" id="e_m" value="${m.month || 1}">
            </div>
            <div class="form-group"><label>Year</label><select id="e_y">${yearOptions}</select></div>
            <div class="form-group full-width">
                <label>Icon</label>
                <div class="icon-selector">${iconHtml}</div>
                <input type="hidden" id="e_icon" value="${m.icon || 'none'}">
            </div>
        </div>`, () => { projects[pIdx].milestones.splice(mIdx,1); markModified(); closeModal(); render(); persist(); });
    document.getElementById('e_y').value = m.year || config.startYear;

    const updatePreview = () => {
        document.getElementById('e_m_preview').textContent = getMonthPreview(parseFloat(document.getElementById('e_m').value), document.getElementById('e_y').value);
        markModified();
    };
    ['e_m', 'e_y'].forEach(id => document.getElementById(id).onchange = updatePreview);
    document.getElementById('e_m').oninput = updatePreview;
}

function addTask(pIdx) { projects[pIdx].tasks.push({ name: 'New Task', startMonth: config.startMonth, startYear: config.startYear, endMonth: config.startMonth+1, endYear: config.startYear, lead: 'TBC', support: [] }); markModified(); closeModal(); render(); persist(); }
function addMilestone(pIdx) { projects[pIdx].milestones.push({ name: 'Milestone', month: config.startMonth, year: config.startYear, icon: 'none' }); markModified(); closeModal(); render(); persist(); }

// --- Global Save ---

function saveChanges() {
    const ctx = editingContext;
    if (ctx.type === 'timeline-config') {
        config.startMonth = parseInt(document.getElementById('conf_startMonth').value);
        config.startYear = parseInt(document.getElementById('conf_startYear').value);
        config.endMonth = parseInt(document.getElementById('conf_endMonth').value);
        config.endYear = parseInt(document.getElementById('conf_endYear').value);
        initTimelineRange(); render(); persist(); closeModal();
        return;
    }
    if (ctx.type === 'staff-edit') {
        const id = ctx.isNew ? "id_" + Date.now() : ctx.targetId;
        staffInfo[id] = { name: document.getElementById('s_name').value, role: document.getElementById('s_role').value };
        markModified(); assignColors(); initFilters(); render(); persist(); closeModal(); manageStaff();
        return;
    }
    if (ctx.type === 'project') projects[ctx.pIdx].name = document.getElementById('e_title').value;
    if (ctx.type === 'task') {
        const t = projects[ctx.pIdx].tasks[ctx.tIdx];
        Object.assign(t, { name: document.getElementById('e_title').value, startMonth: parseFloat(document.getElementById('e_start_m').value), startYear: parseInt(document.getElementById('e_start_y').value), endMonth: parseFloat(document.getElementById('e_end_m').value), endYear: parseInt(document.getElementById('e_end_y').value), lead: document.getElementById('e_lead').value, support: Array.from(document.querySelectorAll('input[name="collab"]:checked')).map(c => ({ staff: c.value })) });
    }
    if (ctx.type === 'milestone') {
        const m = projects[ctx.pIdx].milestones[ctx.mIdx];
        Object.assign(m, { name: document.getElementById('e_title').value, month: parseFloat(document.getElementById('e_m').value), year: parseInt(document.getElementById('e_y').value), icon: document.getElementById('e_icon').value });
    }
    markModified(); closeModal(); render(); persist();
}

function deleteStaff(id) { projects.forEach(p => p.tasks.forEach(t => { if(t.lead === id) t.lead = 'TBC'; t.support = t.support.filter(s => s.staff !== id); })); delete staffInfo[id]; markModified(); assignColors(); initFilters(); render(); persist(); manageStaff(); }

// --- IO ---

function triggerImport() { document.getElementById('importFile').click(); }
function handleFileImport(e) {
    const reader = new FileReader();
    reader.onload = (ev) => {
        try {
            const data = JSON.parse(ev.target.result);
            projects = data.projects || []; staffInfo = data.staff || {};
            if (data.config) config = data.config;

            assignColors(); updateInitials(); sortProjects(); 
            initTimelineRange(); initFilters(); render(); 
            persist(); 

            // After import, the state is "clean"
            hasChanges = false;
            updateStatusMessage("JSON File Loaded", false);
        } catch (err) { alert("Error parsing JSON."); }
    };
    reader.readAsText(e.target.files[0]);
}

function exportData() {
    const staffCopy = JSON.parse(JSON.stringify(staffInfo));
    const projectsCopy = JSON.parse(JSON.stringify(projects));

    delete staffCopy['TBC'];
    Object.keys(staffCopy).forEach(id => {
        delete staffCopy[id].color;
        delete staffCopy[id].displayInitials;
    });

    const exportObj = { config, staff: staffCopy, projects: projectsCopy };
    const blob = new Blob([JSON.stringify(exportObj, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const now = new Date();
    const timestamp = `${now.getFullYear()}_${monthNames[now.getMonth()]}_${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;

    const a = document.createElement("a");
    a.href = url;
    a.download = `roadmap_${timestamp}.json`;
    a.click();

    // RECTIFIED: The file is now the source of truth
    hasChanges = false;
    const time = new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
    updateStatusMessage(`JSON Exported (${time})`, false);
}

// --- Render Engine ---

function render() {
    const container = document.getElementById('timeline');
    const totalCols = timelineMonths.length;
    container.innerHTML = '';
    const gridWidth = Math.max(1600, totalCols * 130);
    const card = document.createElement('div');
    card.className = 'timeline-card'; card.style.width = gridWidth + "px";

    const header = document.createElement('div');
    header.className = 'timeline-header';
    header.style.gridTemplateColumns = `var(--project-col-width) repeat(${totalCols}, 1fr)`;
    header.innerHTML = `<div>Project</div>` + timelineMonths.map(m => `<div>${m.label}</div>`).join('');
    card.appendChild(header);

    projects.forEach((p, pIdx) => {
        const isVisible = (currentFilter === 'ALL') || 
                          (currentFilter === 'TBC' && p.tasks.some(t => t.lead === 'TBC')) || 
                          p.tasks.some(t => t.lead === currentFilter || t.support?.some(s => s.staff === currentFilter));
        if (!isVisible) return;

        const displayItems = [
            ...p.tasks.map((t, idx) => ({ ...t, type: 'task', oIdx: idx, viewStart: dateToViewIndex(t.startMonth, t.startYear), viewEnd: dateToViewIndex(t.endMonth, t.endYear) })),
            ...p.milestones.map((m, idx) => ({ ...m, type: 'milestone', oIdx: idx, viewStart: dateToViewIndex(m.month, m.year) }))
        ].sort((a,b) => (a.viewStart !== b.viewStart) ? (a.viewStart - b.viewStart) : (a.type === 'milestone' ? -1 : 1));

        const rowHeight = Math.max(120, (displayItems.length * 65) + 40);
        const row = document.createElement('div');
        row.className = 'timeline-row'; row.style.gridTemplateColumns = `var(--project-col-width) 1fr`; row.style.minHeight = rowHeight + "px";
        if (p._scrollId) row.setAttribute('data-project-id', p._scrollId);

        const side = document.createElement('div');
        side.className = 'project-sidebar';
        const gHtml = (p.goals || []).map(g => `<div class="goal-item-sidebar"><i class="fa-solid fa-check-double"></i><span>${g}</span></div>`).join('');
        side.innerHTML = `<h4>${p.name}</h4>${p.goals?.length ? `<div class="project-goals-list">${gHtml}</div>` : ''}<button class="btn btn-sm" style="margin-top:15px; width:100%" onclick="editProject(${pIdx})"><i class="fa-solid fa-gear"></i> Manage</button>`;
        row.appendChild(side);

        const area = document.createElement('div');
        area.className = 'data-area'; area.style.backgroundSize = `calc(100% / ${totalCols}) 100%`;

        displayItems.forEach((item, laneIdx) => {
            if (item.type === 'task' && (item.viewEnd < 1 || item.viewStart > totalCols + 1)) return;
            if (item.type === 'milestone' && (item.viewStart < 1 || item.viewStart > totalCols + 1)) return;

            const vTop = 20 + (laneIdx * 65); 
            if (item.type === 'task') {
                const leadData = staffInfo[item.lead] || staffInfo['TBC'];
                const supportIds = (item.support || []).map(s => s.staff);
                const sortedSupportIds = supportIds.sort((a, b) => {
                    const infoA = staffInfo[a]; const infoB = staffInfo[b];
                    if (!infoA || !infoB) return 0;
                    return infoA.name.trim().split(/\s+/).pop().toLowerCase().localeCompare(infoB.name.trim().split(/\s+/).pop().toLowerCase());
                });

                const supportNames = sortedSupportIds.map(id => staffInfo[id]?.name.split(' ')[0] || '?');
                const teamStr = `${leadData.name.split(' ')[0]}${supportNames.length ? ' + ' + supportNames.join(', ') : ''}`;
                
                const barWidthPercent = ((item.viewEnd - item.viewStart) / totalCols) * 100;
                const barWidthPx = (barWidthPercent / 100) * gridWidth;
                const badgeWidth = 28 + (supportNames.length * 24) + 20;
                const labelOutside = barWidthPx < (badgeWidth + (item.name.length * 7.5));

                const el = document.createElement('div');
                el.className = 'task-item'; el.style.left = `${((item.viewStart-1)/totalCols)*100}%`; el.style.width = `${barWidthPercent}%`; el.style.top = `${vTop}px`;
                el.onclick = () => editTask(pIdx, item.oIdx);
                const badgesHtml = `<div class="badge-group ${barWidthPx < badgeWidth-10 ? 'badges-outside' : ''}"><div class="badge lead">${leadData.displayInitials}</div>${sortedSupportIds.map(id => `<div class="badge support" style="background:${staffInfo[id]?.color || '#64748b'}">${staffInfo[id]?.displayInitials || '?'}</div>`).join('')}</div>`;
                const labelHtml = `<div class="task-label ${labelOutside ? 'label-outside' : 'label-inside'}"><div class="task-name-text">${item.name}</div><div class="task-team-text">${teamStr}</div></div>`;
                el.innerHTML = `<div class="task-bar ${item.lead === 'TBC' ? 'tbc-warning' : ''}" style="background:${leadData.color}">${badgesHtml}${labelHtml}</div>`;
                area.appendChild(el);
            } else {
                const mEl = document.createElement('div');
                mEl.className = 'milestone-lane-item'; mEl.style.left = `${((item.viewStart - 1) / totalCols) * 100}%`; mEl.style.top = `${vTop}px`;
                mEl.onclick = () => editMilestone(pIdx, item.oIdx);
                const vLine = document.createElement('div');
                vLine.className = 'date-line'; vLine.style.height = rowHeight + "px"; vLine.style.top = `-${vTop}px`; 
                const icon = (item.icon && iconMap[item.icon]) ? `<i class="fa-solid ${iconMap[item.icon].class}"></i> ` : '';
                mEl.innerHTML = `<div class="milestone-diamond"></div><div class="milestone-lane-label">${icon}${item.name}</div>`;
                mEl.appendChild(vLine); area.appendChild(mEl);
            }
        });
        row.appendChild(area); card.appendChild(row);
    });
    container.appendChild(card);
}

loadData();