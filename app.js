/**
 * Gantt Flow - Roadmap Manager Logic
 */

let staffInfo = {};
let projects = [];
let config = { startYear: 2026, startMonth: 1, endYear: 2026, endMonth: 12 }; 
let timelineMonths = []; 
let currentFilter = 'ALL';
let editingContext = null;

const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const PROFESSIONAL_PALETTE = ["#f94144","#f3722c","#f8961e","#f9844a","#f9c74f","#90be6d","#43aa8b","#4d908e","#577590","#277da1"];

// --- Sorting Helper ---

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

// --- Initialization ---

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
    const entry = timelineMonths.find(m => m.absIndex === Math.floor(val)) || timelineMonths[timelineMonths.length - 1];
    const decimal = val % 1;
    let p = "Early";
    if (decimal >= 0.4 && decimal < 0.7) p = "Mid";
    else if (decimal >= 0.7) p = "Late";
    return `${p} ${entry.label}`;
}

function updateInitials() {
    getStaffSortedBySurname().forEach(([id, data]) => {
        const nameParts = data.name.trim().split(/\s+/);
        let base = (nameParts.length > 1) ? (nameParts[0][0] + nameParts[nameParts.length-1][0]) : nameParts[0].substring(0, 2);
        staffInfo[id].displayInitials = base.toUpperCase();
    });
    if (staffInfo['TBC']) staffInfo['TBC'].displayInitials = 'TBC';
}

function assignColors() {
    getStaffSortedBySurname().forEach(([id], index) => { 
        staffInfo[id].color = PROFESSIONAL_PALETTE[index % PROFESSIONAL_PALETTE.length]; 
    });
    if (!staffInfo['TBC']) staffInfo['TBC'] = { name: 'Unassigned', color: '#64748b' };
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
    assignColors(); initTimelineRange(); initFilters(); render();
}

function persist() {
    localStorage.setItem('gantt_flow_v25_final', JSON.stringify({ config, staff: staffInfo, projects }));
    const statusEl = document.getElementById('save-status');
    statusEl.textContent = "Flow Saved " + new Date().toLocaleTimeString();
}

// --- UI Logic ---

function toggleSidebar() { document.getElementById('sidebar').classList.toggle('collapsed'); }

function initFilters() {
    const container = document.getElementById('filter-list');
    container.innerHTML = `<button class="filter-item active" id="f-ALL" onclick="setFilter('ALL')">All Projects</button>`;
    getStaffSortedBySurname().forEach(([key, info]) => {
        const btn = document.createElement('button');
        btn.className = 'filter-item'; btn.id = `f-${key}`;
        btn.innerHTML = `<div style="display:flex; align-items:center; gap:10px;"><div class="filter-color-dot" style="background:${info.color}"></div>${info.name}</div>`;
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
    footer.innerHTML = `<button class="btn btn-primary" onclick="saveChanges()">Save</button><button class="btn" onclick="closeModal()">Cancel</button>`;
    if (onDelete) {
        const del = document.createElement('button');
        del.className = 'btn btn-danger'; del.textContent = 'Delete'; del.onclick = onDelete;
        footer.appendChild(del);
    }
    document.getElementById('editorModal').style.display = 'flex';
}
function closeModal() { document.getElementById('editorModal').style.display = 'none'; }

function updateCollabPreview() {
    const selected = Array.from(document.querySelectorAll('input[name="collab"]:checked'))
        .map(cb => staffInfo[cb.value]?.name || 'Unknown');
    const container = document.getElementById('e_collab_preview');
    if (!container) return;

    if (selected.length === 0) {
        container.innerHTML = '<span style="color: #94a3b8; font-size: 12px; font-style: italic;">No collaborators selected</span>';
    } else {
        container.innerHTML = selected.map(name => `<span class="collab-pill">${name}</span>`).join('');
    }
}

// --- Actions ---

function addProject() { projects.push({ name: 'Untitled Project', tasks: [], milestones: [] }); render(); persist(); }

function editTask(pIdx, tIdx) {
    editingContext = { type: 'task', pIdx, tIdx };
    const t = projects[pIdx].tasks[tIdx];
    const sortedStaff = getStaffSortedBySurname();
    
    const collaboratorList = sortedStaff.map(([k, v]) => `
        <label class="collaborator-item">
            <input type="checkbox" name="collab" value="${k}" ${t.support?.some(s => s.staff === k) ? 'checked' : ''} onchange="updateCollabPreview()">
            <span>${v.name}</span>
        </label>`).join('');

    const leadOptions = [ ['TBC', staffInfo['TBC']], ...sortedStaff ]
        .map(([k,v]) => `<option value="${k}" ${k===t.lead?'selected':''}>${v.name}</option>`).join('');

    openModal("Edit Task", "Configure details", `
        <div class="form-grid">
            <div class="form-group full-width"><label>Task Name</label><input type="text" id="e_title" value="${t.name}"></div>
            <div class="form-group"><label>Start <span id="e_start_preview" class="preview-badge">${getMonthPreview(t.start)}</span></label><input type="number" step="0.1" id="e_start" value="${t.start}"></div>
            <div class="form-group"><label>End <span id="e_end_preview" class="preview-badge">${getMonthPreview(t.end)}</span></label><input type="number" step="0.1" id="e_end" value="${t.end}"></div>
            <div class="form-group full-width"><label>Project Lead</label><select id="e_lead">${leadOptions}</select></div>
            <div class="form-group full-width" style="margin-top: 10px;">
                <label>Selected Collaborators</label>
                <div id="e_collab_preview" class="collab-pills-container"></div>
                <label style="margin-top: 10px;">Select from Team</label>
                <div class="collaborator-box">${collaboratorList}</div>
            </div>
        </div>`, () => { projects[pIdx].tasks.splice(tIdx,1); closeModal(); render(); persist(); });
    
    // Initial pill load
    updateCollabPreview();
    
    // Add live timing previews
    ['e_start', 'e_end'].forEach(id => {
        document.getElementById(id).oninput = () => {
            document.getElementById(id + '_preview').textContent = getMonthPreview(parseFloat(document.getElementById(id).value));
        };
    });
}

function editProject(pIdx) {
    editingContext = { type: 'project', pIdx };
    openModal("Project Settings", "Settings", `<div class="form-group"><label>Title</label><input type="text" id="e_title" value="${projects[pIdx].name}"></div><div style="display:flex; gap:10px; margin-top:10px;"><button class="btn btn-success" style="flex:1" onclick="addTask(${pIdx})">Add Task</button><button class="btn btn-primary" style="flex:1" onclick="addMilestone(${pIdx})">Add Milestone</button></div>`, () => { projects.splice(pIdx,1); closeModal(); render(); persist(); });
}

function addTask(pIdx) { projects[pIdx].tasks.push({ name: 'New Task', start: 1, end: 3, lead: 'TBC', support: [] }); closeModal(); render(); persist(); }
function addMilestone(pIdx) { projects[pIdx].milestones.push({ name: 'Milestone', month: 2 }); closeModal(); render(); persist(); }

function editMilestone(pIdx, mIdx) {
    editingContext = { type: 'milestone', pIdx, mIdx };
    const m = projects[pIdx].milestones[mIdx];
    openModal("Edit Milestone", "Timing", `<div class="form-group"><label>Name</label><input type="text" id="e_title" value="${m.name}"></div><div class="form-group"><label>Month <span id="e_month_preview" class="preview-badge">${getMonthPreview(m.month)}</span></label><input type="number" step="0.1" id="e_month" value="${m.month}"></div>`, () => { projects[pIdx].milestones.splice(mIdx,1); closeModal(); render(); persist(); });
    // Live preview
    document.getElementById('e_month').oninput = () => {
        document.getElementById('e_month_preview').textContent = getMonthPreview(parseFloat(document.getElementById('e_month').value));
    };
}

function saveChanges() {
    const ctx = editingContext;
    if (ctx.type === 'project') projects[ctx.pIdx].name = document.getElementById('e_title').value;
    if (ctx.type === 'task') {
        const t = projects[ctx.pIdx].tasks[ctx.tIdx];
        t.name = document.getElementById('e_title').value;
        t.start = parseFloat(document.getElementById('e_start').value);
        t.end = parseFloat(document.getElementById('e_end').value);
        t.lead = document.getElementById('e_lead').value;
        t.support = Array.from(document.querySelectorAll('input[name="collab"]:checked')).map(c => ({ staff: c.value }));
    }
    if (ctx.type === 'milestone') {
        const m = projects[ctx.pIdx].milestones[ctx.mIdx];
        m.name = document.getElementById('e_title').value;
        m.month = parseFloat(document.getElementById('e_month').value);
    }
    closeModal(); render(); persist();
}

function manageStaff() {
    let html = `<div class="staff-manager-list">`;
    getStaffSortedBySurname().forEach(([id, info]) => {
        html += `<div style="display:flex; justify-content:space-between; padding:8px; border-bottom:1px solid #eee"><span>${info.name}</span><button class="btn btn-sm" onclick="deleteStaff('${id}')">Delete</button></div>`;
    });
    html += `</div><div class="form-group" style="margin-top:15px"><label>New Member</label><input type="text" id="new_staff_name"></div>`;
    openModal("Team", "Manage staff", html);
    const footer = document.querySelector('.modal-footer');
    footer.innerHTML = `<button class="btn btn-success" onclick="addStaff()">Add</button><button class="btn" onclick="closeModal()">Close</button>`;
}

function addStaff() {
    const name = document.getElementById('new_staff_name').value;
    if (name) staffInfo["id_"+Date.now()] = { name, role: 'Member' };
    assignColors(); initFilters(); manageStaff(); persist();
}
function deleteStaff(id) { delete staffInfo[id]; assignColors(); initFilters(); manageStaff(); persist(); }

function triggerImport() { document.getElementById('importFile').click(); }
function handleFileImport(e) {
    const reader = new FileReader();
    reader.onload = (ev) => {
        const imported = JSON.parse(ev.target.result);
        projects = imported.projects || []; staffInfo = imported.staff || {};
        assignColors(); initTimelineRange(); initFilters(); render(); persist();
    };
    reader.readAsText(e.target.files[0]);
}

function exportData() {
    const blob = new Blob([JSON.stringify({ config, staff: staffInfo, projects }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "roadmap.json"; a.click();
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
        const isVisible = (currentFilter === 'ALL') || p.tasks.some(t => t.lead === currentFilter || t.support?.some(s => s.staff === currentFilter));
        if (!isVisible) return;

        const items = [...p.tasks.map((t, idx) => ({ ...t, type: 'task', oIdx: idx, date: t.start })), ...p.milestones.map((m, idx) => ({ ...m, type: 'milestone', oIdx: idx, date: m.month }))]
                      .sort((a,b) => a.date - b.date);

        const row = document.createElement('div');
        row.className = 'timeline-row';
        row.style.gridTemplateColumns = `var(--project-col-width) 1fr`;
        const side = document.createElement('div');
        side.className = 'project-sidebar';
        side.innerHTML = `<div>${p.name}</div><button class="btn btn-sm" style="font-size:10px; padding:4px 8px; margin-top:8px" onclick="editProject(${pIdx})">Manage</button>`;
        row.appendChild(side);

        const area = document.createElement('div');
        area.className = 'data-area';
        area.style.backgroundSize = `calc(100% / ${totalCols}) 100%`;

        items.forEach((item, laneIdx) => {
            const vTop = 20 + (laneIdx * 65); 
            if (item.type === 'task') {
                const leadData = staffInfo[item.lead] || staffInfo['TBC'];
                const supportNames = (item.support || []).map(s => staffInfo[s.staff]?.name.split(' ')[0] || '?');
                const teamString = `${leadData.name.split(' ')[0]}${supportNames.length > 0 ? ' + ' + supportNames.join(', ') : ''}`;

                const barWidthPx = (((item.end - item.start) / totalCols) * gridWidth);
                const badgeWidth = 28 + (supportNames.length * 24) + 20; 
                const textWidth = Math.max(item.name.length, teamString.length) * 7.5;

                const badgesOutside = barWidthPx < (badgeWidth - 10);
                const labelOutside = barWidthPx < (badgeWidth + textWidth);

                const el = document.createElement('div');
                el.className = 'task-item';
                el.style.left = `${((item.start-1)/totalCols)*100}%`;
                el.style.width = `${((item.end-item.start)/totalCols)*100}%`;
                el.style.top = `${vTop}px`;
                el.onclick = () => editTask(pIdx, item.oIdx);

                const badgesHtml = `
                    <div class="badge-group ${badgesOutside ? 'badges-outside' : ''}">
                        <div class="badge lead">${leadData.displayInitials}</div>
                        ${(item.support||[]).map(s => `<div class="badge support" style="background:${staffInfo[s.staff]?.color || '#64748b'}">${staffInfo[s.staff]?.displayInitials || '?'}</div>`).join('')}
                    </div>`;

                const labelHtml = `
                    <div class="task-label ${labelOutside ? 'label-outside' : 'label-inside'}">
                        <div class="task-name-text">${item.name}</div>
                        <div class="task-team-text">${teamString}</div>
                    </div>`;

                el.innerHTML = `<div class="task-bar ${item.lead === 'TBC' ? 'tbc-warning' : ''}" style="background:${leadData.color}">${badgesHtml}${labelHtml}</div>`;
                area.appendChild(el);
            } else {
                const mEl = document.createElement('div');
                mEl.className = 'milestone-lane-item'; 
                mEl.style.left = `${((item.month - 1) / totalCols) * 100}%`; mEl.style.top = `${vTop}px`;
                mEl.onclick = () => editMilestone(pIdx, item.oIdx);
                mEl.innerHTML = `<div class="date-line"></div><div class="milestone-diamond"></div><div class="milestone-lane-label">${item.name}</div>`;
                area.appendChild(mEl);
            }
        });
        row.style.minHeight = Math.max(120, (items.length * 65) + 40) + "px";
        row.appendChild(area); card.appendChild(row);
    });
    container.appendChild(card);
}

loadData();