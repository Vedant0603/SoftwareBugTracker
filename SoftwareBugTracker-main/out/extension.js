"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = require("vscode");
let panel;
function normalizeBug(raw) {
    const id = Number(raw.id);
    const af = raw.artifactId;
    return {
        id,
        title: String(raw.title ?? ''),
        description: String(raw.description ?? ''),
        severity: String(raw.severity ?? 'Medium'),
        bugKind: String(raw.bugKind ?? 'General'),
        status: String(raw.status ?? 'Open'),
        dateCreated: String(raw.dateCreated ?? ''),
        dateFixed: raw.dateFixed != null && raw.dateFixed !== '' ? String(raw.dateFixed) : undefined,
        reporter: String(raw.reporter ?? ''),
        artifactId: af == null || af === '' ? null : Number(af),
        artifactOtherLabel: String(raw.artifactOtherLabel ?? ''),
        iterationOrPhase: String(raw.iterationOrPhase ?? ''),
        methodology: String(raw.methodology ?? '')
    };
}
function loadBugs(context) {
    const raw = context.workspaceState.get('bugs') || [];
    return raw.map(normalizeBug);
}
function activate(context) {
    const command = vscode.commands.registerCommand('bugtracker.openPanel', () => {
        if (panel) {
            panel.reveal();
            sendAllData(context);
            return;
        }
        panel = vscode.window.createWebviewPanel('bugTracker', 'Bug Tracker', vscode.ViewColumn.One, { enableScripts: true });
        panel.webview.html = getWebviewContent();
        panel.onDidDispose(() => {
            panel = undefined;
        });
        panel.webview.onDidReceiveMessage((message) => {
            let bugs = loadBugs(context);
            let artifacts = context.workspaceState.get('artifacts') || [];
            if (message.command === 'loadData') {
                sendAllData(context);
                return;
            }
            if (message.command === 'addBug') {
                const artifactId = message.artifactId == null || message.artifactId === ''
                    ? null
                    : Number(message.artifactId);
                const artifactOtherLabel = artifactId != null ? '' : String(message.artifactOtherLabel ?? '').trim();
                const bug = {
                    id: Date.now(),
                    title: message.title,
                    description: message.description,
                    severity: message.severity,
                    bugKind: message.bugKind,
                    status: 'Open',
                    dateCreated: new Date().toLocaleString(),
                    reporter: message.reporter ?? '',
                    artifactId,
                    artifactOtherLabel,
                    iterationOrPhase: message.iterationOrPhase ?? '',
                    methodology: message.methodology ?? ''
                };
                bugs.push(bug);
                context.workspaceState.update('bugs', bugs);
            }
            if (message.command === 'saveBugEdit') {
                bugs = bugs.map((bug) => {
                    if (bug.id === message.id) {
                        const artifactId = message.artifactId == null || message.artifactId === ''
                            ? null
                            : Number(message.artifactId);
                        const artifactOtherLabel = artifactId != null ? '' : String(message.artifactOtherLabel ?? '').trim();
                        return {
                            ...bug,
                            title: message.title,
                            description: message.description,
                            severity: message.severity,
                            bugKind: message.bugKind,
                            reporter: message.reporter ?? '',
                            artifactId,
                            artifactOtherLabel,
                            iterationOrPhase: message.iterationOrPhase ?? '',
                            methodology: message.methodology ?? ''
                        };
                    }
                    return bug;
                });
                context.workspaceState.update('bugs', bugs);
            }
            if (message.command === 'updateBugStatus') {
                bugs = bugs.map((bug) => {
                    if (bug.id === message.id) {
                        const next = { ...bug, status: message.status };
                        if (message.status === 'Fixed' && !next.dateFixed) {
                            next.dateFixed = new Date().toLocaleString();
                        }
                        return next;
                    }
                    return bug;
                });
                context.workspaceState.update('bugs', bugs);
            }
            if (message.command === 'deleteBug') {
                bugs = bugs.filter((bug) => bug.id !== message.id);
                context.workspaceState.update('bugs', bugs);
            }
            if (message.command === 'addArtifact') {
                const artifact = {
                    id: Date.now(),
                    name: message.name,
                    type: message.type,
                    details: message.details,
                    dateCreated: new Date().toLocaleString()
                };
                artifacts.push(artifact);
                context.workspaceState.update('artifacts', artifacts);
            }
            if (message.command === 'saveArtifactEdit') {
                artifacts = artifacts.map((artifact) => {
                    if (artifact.id === message.id) {
                        artifact.name = message.name;
                        artifact.type = message.type;
                        artifact.details = message.details;
                    }
                    return artifact;
                });
                context.workspaceState.update('artifacts', artifacts);
            }
            if (message.command === 'deleteArtifact') {
                artifacts = artifacts.filter((artifact) => artifact.id !== message.id);
                context.workspaceState.update('artifacts', artifacts);
            }
            sendAllData(context);
        });
        sendAllData(context);
    });
    context.subscriptions.push(command);
}
function sendAllData(context) {
    const bugs = loadBugs(context);
    const artifacts = context.workspaceState.get('artifacts') || [];
    panel?.webview.postMessage({
        command: 'loadData',
        bugs,
        artifacts
    });
}
function getWebviewContent() {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8" />
        <style>
            body {
                font-family: Arial, sans-serif;
                padding: 14px;
                background-color: #1e1e1e;
                color: white;
            }

            h2, h3 {
                margin: 0;
            }

            .section {
                background: #252526;
                padding: 14px;
                border-radius: 10px;
                margin-bottom: 18px;
            }

            .subsection {
                margin-top: 12px;
                margin-bottom: 12px;
            }

            .toolbar {
                display: flex;
                gap: 10px;
                margin-top: 8px;
                margin-bottom: 12px;
                align-items: center;
            }

            .toolbar > * {
                flex: 1;
            }

            input, textarea, select {
                width: 100%;
                padding: 8px;
                margin-bottom: 10px;
                border-radius: 6px;
                border: 1px solid #3c3c3c;
                background: #1f1f1f;
                color: white;
                box-sizing: border-box;
            }

            textarea {
                min-height: 72px;
                resize: vertical;
            }

            button {
                background-color: #007acc;
                color: white;
                padding: 8px 12px;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                margin-right: 8px;
                margin-top: 4px;
            }

            button:hover {
                background-color: #005f99;
            }

            .delete-btn {
                background-color: #a1260d;
            }

            .delete-btn:hover {
                background-color: #7f1d0c;
            }

            .secondary-btn {
                background-color: #5a5a5a;
            }

            .secondary-btn:hover {
                background-color: #707070;
            }

            .card {
                background: #2d2d2d;
                padding: 12px;
                margin-top: 10px;
                border-radius: 8px;
                border-left: 4px solid #007acc;
            }

            .row {
                margin-bottom: 6px;
                word-break: break-word;
            }

            .small-title {
                color: #9cdcfe;
                font-weight: bold;
                margin-bottom: 8px;
            }

            .actions {
                margin-top: 10px;
            }

            .empty {
                opacity: 0.85;
            }

            .list-header {
                margin-top: 8px;
                margin-bottom: 4px;
            }

            .hint {
                font-size: 12px;
                opacity: 0.8;
                margin-bottom: 8px;
            }

            .other-detail {
                display: none;
                margin-top: -4px;
            }

            .other-detail.visible {
                display: block;
            }
        </style>
    </head>
    <body>
        <div class="section">
            <h2>Bug Tracker System</h2>

            <div class="subsection">
                <div class="small-title">Add Bug</div>
                <input id="reporter" placeholder="Found by (name or id)" />
                <div class="small-title">Bug found in artifact</div>
                <div class="hint">Choose a registered artifact to track this bug against it, or Other if it is not in the list yet.</div>
                <select id="bugArtifactId" onchange="onBugArtifactChange()">
                    <option value="">— Not linked —</option>
                </select>
                <input id="bugArtifactOther" class="other-detail" placeholder="Describe the artifact (e.g. path, ticket ID, or name)" />
                <select id="bugKind" onchange="onBugKindChange()">
                    <option>General</option>
                    <option>Functional</option>
                    <option>UI</option>
                    <option>Performance</option>
                    <option>Security</option>
                    <option>Data</option>
                    <option>Integration</option>
                    <option>Documentation</option>
                    <option>Other</option>
                </select>
                <input id="bugKindOther" class="other-detail" placeholder="Specify bug kind" />
                <select id="methodology" onchange="onMethodologyChange()">
                    <option value="">Process (optional)</option>
                    <option>Agile / Scrum</option>
                    <option>Kanban</option>
                    <option>Waterfall</option>
                    <option>Hybrid</option>
                    <option>Other</option>
                </select>
                <input id="methodologyOther" class="other-detail" placeholder="Specify process / methodology" />
                <input id="iterationOrPhase" placeholder="Sprint, iteration, phase, or release (e.g. Sprint 3, Phase 2)" />
                <input id="title" placeholder="Bug Title" />
                <textarea id="desc" placeholder="Bug Description"></textarea>

                <select id="severity">
                    <option>Low</option>
                    <option>Medium</option>
                    <option>High</option>
                </select>

                <button id="bugSubmitBtn" onclick="submitBug()">Add Bug</button>
                <button id="bugCancelBtn" class="secondary-btn" onclick="cancelBugEdit()" style="display:none;">Cancel Edit</button>
            </div>

            <div class="subsection">
                <h3 class="list-header">Bug List</h3>

                <div class="toolbar">
                    <select id="bugStatusFilter" onchange="applyBugFilters()">
                        <option value="All">All Statuses</option>
                        <option value="Open">Open</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Fixed">Fixed</option>
                    </select>

                    <select id="bugSeverityFilter" onchange="applyBugFilters()">
                        <option value="All">All Severities</option>
                        <option value="Low">Low</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High</option>
                    </select>

                    <input id="bugSearch" placeholder="Search bug title" oninput="applyBugFilters()" />
                </div>

                <div id="bugList"></div>
            </div>
        </div>

        <div class="section">
            <h2>Artifacts Tracker</h2>
            <div class="hint">Register artifacts first to link bugs to backlog items, files, specs, etc.</div>

            <div class="subsection">
                <div class="small-title">Add Artifact</div>
                <input id="artifactName" placeholder="Artifact Name" />

                <select id="artifactType" onchange="onArtifactTypeChange()">
                    <option>Product Backlog Item</option>
                    <option>Design Document</option>
                    <option>Diagram</option>
                    <option>Formal Spec</option>
                    <option>Source File</option>
                    <option>Test Source File</option>
                    <option>Binary</option>
                    <option>Data File</option>
                    <option>Other</option>
                </select>
                <input id="artifactTypeOther" class="other-detail" placeholder="Specify artifact type" />

                <textarea id="artifactDetails" placeholder="Artifact Details"></textarea>

                <button id="artifactSubmitBtn" onclick="submitArtifact()">Add Artifact</button>
                <button id="artifactCancelBtn" class="secondary-btn" onclick="cancelArtifactEdit()" style="display:none;">Cancel Edit</button>
            </div>

            <div class="subsection">
                <h3 class="list-header">Artifact List</h3>

                <div class="toolbar">
                    <select id="artifactTypeFilter" onchange="applyArtifactFilters()">
                        <option value="All">All Types</option>
                        <option>Product Backlog Item</option>
                        <option>Design Document</option>
                        <option>Diagram</option>
                        <option>Formal Spec</option>
                        <option>Source File</option>
                        <option>Test Source File</option>
                        <option>Binary</option>
                        <option>Data File</option>
                        <option value="Other">Other (custom types)</option>
                    </select>

                    <input id="artifactSearch" placeholder="Search artifact name" oninput="applyArtifactFilters()" />
                </div>

                <div id="artifactList"></div>
            </div>
        </div>

        <script>
            const vscode = acquireVsCodeApi();
            let allBugs = [];
            let allArtifacts = [];
            let editingBugId = null;
            let editingArtifactId = null;

            const STANDARD_BUG_KINDS = ['General', 'Functional', 'UI', 'Performance', 'Security', 'Data', 'Integration', 'Documentation', 'Other'];
            const STANDARD_METHODOLOGIES = ['', 'Agile / Scrum', 'Kanban', 'Waterfall', 'Hybrid', 'Other'];
            const ARTIFACT_PRESET_TYPES = ['Product Backlog Item', 'Design Document', 'Diagram', 'Formal Spec', 'Source File', 'Test Source File', 'Binary', 'Data File'];

            function setOtherDetailVisible(inputId, visible) {
                const el = document.getElementById(inputId);
                if (visible) el.classList.add('visible');
                else el.classList.remove('visible');
            }

            function onBugKindChange() {
                setOtherDetailVisible('bugKindOther', document.getElementById('bugKind').value === 'Other');
            }

            function onMethodologyChange() {
                setOtherDetailVisible('methodologyOther', document.getElementById('methodology').value === 'Other');
            }

            function onArtifactTypeChange() {
                setOtherDetailVisible('artifactTypeOther', document.getElementById('artifactType').value === 'Other');
            }

            function onBugArtifactChange() {
                setOtherDetailVisible('bugArtifactOther', document.getElementById('bugArtifactId').value === '__other__');
            }

            function levenshtein(a, b) {
                const m = a.length;
                const n = b.length;
                if (!m) return n;
                if (!n) return m;
                const dp = [];
                for (let i = 0; i <= m; i++) {
                    dp[i] = new Array(n + 1);
                    dp[i][0] = i;
                }
                for (let j = 0; j <= n; j++) dp[0][j] = j;
                for (let i = 1; i <= m; i++) {
                    for (let j = 1; j <= n; j++) {
                        const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
                        dp[i][j] = Math.min(
                            dp[i - 1][j] + 1,
                            dp[i][j - 1] + 1,
                            dp[i - 1][j - 1] + cost
                        );
                    }
                }
                return dp[m][n];
            }

            function similarityRatio(s1, s2) {
                const a = (s1 || '').toLowerCase().trim();
                const b = (s2 || '').toLowerCase().trim();
                if (!a && !b) return 1;
                const max = Math.max(a.length, b.length);
                if (!max) return 1;
                return 1 - levenshtein(a, b) / max;
            }

            function tokenJaccard(a, b) {
                const ta = new Set((a || '').toLowerCase().split(/\\s+/).filter(Boolean));
                const tb = new Set((b || '').toLowerCase().split(/\\s+/).filter(Boolean));
                if (!ta.size && !tb.size) return 1;
                let inter = 0;
                for (const w of ta) if (tb.has(w)) inter++;
                const union = ta.size + tb.size - inter;
                return union ? inter / union : 0;
            }

            function findSimilarBugs(title, description, excludeId) {
                const candidates = [];
                for (const bug of allBugs) {
                    if (excludeId != null && bug.id === excludeId) continue;
                    const tSim = similarityRatio(title, bug.title);
                    const dSim = similarityRatio(description, bug.description);
                    const j = tokenJaccard(title, bug.title);
                    const score = Math.max(tSim, dSim * 0.9, j);
                    if (tSim >= 0.52 || dSim >= 0.42 || (j >= 0.45 && tSim >= 0.35)) {
                        candidates.push({ bug, score });
                    }
                }
                candidates.sort((x, y) => y.score - x.score);
                return candidates.slice(0, 5);
            }

            function populateArtifactSelect() {
                const sel = document.getElementById('bugArtifactId');
                const current = sel.value;
                sel.innerHTML = '<option value="">— Not linked —</option>';
                for (const a of allArtifacts) {
                    const opt = document.createElement('option');
                    opt.value = String(a.id);
                    opt.textContent = a.name + ' (' + a.type + ')';
                    sel.appendChild(opt);
                }
                const otherOpt = document.createElement('option');
                otherOpt.value = '__other__';
                otherOpt.textContent = 'Other (describe manually)';
                sel.appendChild(otherOpt);
                if (current === '__other__' || (current && [...sel.options].some((o) => o.value === current))) {
                    sel.value = current;
                }
                onBugArtifactChange();
            }

            function getBugFormPayload() {
                const artifactRaw = document.getElementById('bugArtifactId').value;
                let artifactId = null;
                let artifactOtherLabel = '';
                if (artifactRaw === '__other__') {
                    artifactOtherLabel = document.getElementById('bugArtifactOther').value.trim();
                } else if (artifactRaw !== '') {
                    artifactId = artifactRaw;
                }
                let bugKind = document.getElementById('bugKind').value;
                if (bugKind === 'Other') {
                    bugKind = document.getElementById('bugKindOther').value.trim();
                }
                let methodology = document.getElementById('methodology').value;
                if (methodology === 'Other') {
                    methodology = document.getElementById('methodologyOther').value.trim();
                }
                return {
                    title: document.getElementById('title').value.trim(),
                    description: document.getElementById('desc').value.trim(),
                    severity: document.getElementById('severity').value,
                    bugKind,
                    reporter: document.getElementById('reporter').value.trim(),
                    iterationOrPhase: document.getElementById('iterationOrPhase').value.trim(),
                    methodology,
                    artifactId,
                    artifactOtherLabel
                };
            }

            function submitBug() {
                if (document.getElementById('bugKind').value === 'Other' && !document.getElementById('bugKindOther').value.trim()) {
                    alert('Please specify the bug kind, or choose a different option.');
                    return;
                }
                if (document.getElementById('methodology').value === 'Other' && !document.getElementById('methodologyOther').value.trim()) {
                    alert('Please specify the process, or choose a different option.');
                    return;
                }
                if (document.getElementById('bugArtifactId').value === '__other__' && !document.getElementById('bugArtifactOther').value.trim()) {
                    alert('Please describe the artifact, or choose a registered artifact / Not linked.');
                    return;
                }

                const p = getBugFormPayload();
                const { title, description, severity, bugKind, reporter, iterationOrPhase, methodology, artifactId, artifactOtherLabel } = p;

                if (!title || !description) {
                    alert('Please fill in bug title and description.');
                    return;
                }

                if (editingBugId !== null) {
                    vscode.postMessage({
                        command: 'saveBugEdit',
                        id: editingBugId,
                        title,
                        description,
                        severity,
                        bugKind,
                        reporter,
                        iterationOrPhase,
                        methodology,
                        artifactId,
                        artifactOtherLabel
                    });
                    cancelBugEdit();
                    return;
                }

                const similar = findSimilarBugs(title, description, null);
                if (similar.length > 0) {
                    const lines = similar.map(function (s) {
                        return '- #' + s.bug.id + ' ' + s.bug.title + ' (match ~' + Math.round(s.score * 100) + '%)';
                    }).join('\\n');
                    const ok = confirm(
                        'Possible duplicate(s) already in the database:\\n\\n' +
                            lines +
                            '\\n\\nClick OK to add this as a NEW bug anyway, or Cancel to go back and compare.'
                    );
                    if (!ok) return;
                }

                vscode.postMessage({
                    command: 'addBug',
                    title,
                    description,
                    severity,
                    bugKind,
                    reporter,
                    iterationOrPhase,
                    methodology,
                    artifactId,
                    artifactOtherLabel
                });
                clearBugForm();
            }

            function editBug(id) {
                const bug = allBugs.find(b => b.id === id);
                if (!bug) return;

                editingBugId = id;
                document.getElementById('title').value = bug.title;
                document.getElementById('desc').value = bug.description;
                document.getElementById('severity').value = bug.severity;
                const bk = bug.bugKind || 'General';
                if (STANDARD_BUG_KINDS.includes(bk)) {
                    document.getElementById('bugKind').value = bk;
                    document.getElementById('bugKindOther').value = '';
                } else {
                    document.getElementById('bugKind').value = 'Other';
                    document.getElementById('bugKindOther').value = bk;
                }
                onBugKindChange();

                document.getElementById('reporter').value = bug.reporter || '';
                document.getElementById('iterationOrPhase').value = bug.iterationOrPhase || '';
                const meth = bug.methodology || '';
                if (STANDARD_METHODOLOGIES.includes(meth)) {
                    document.getElementById('methodology').value = meth;
                    document.getElementById('methodologyOther').value = '';
                } else {
                    document.getElementById('methodology').value = 'Other';
                    document.getElementById('methodologyOther').value = meth;
                }
                onMethodologyChange();

                populateArtifactSelect();
                if (bug.artifactId != null) {
                    document.getElementById('bugArtifactId').value = String(bug.artifactId);
                    document.getElementById('bugArtifactOther').value = '';
                } else if (bug.artifactOtherLabel) {
                    document.getElementById('bugArtifactId').value = '__other__';
                    document.getElementById('bugArtifactOther').value = bug.artifactOtherLabel;
                } else {
                    document.getElementById('bugArtifactId').value = '';
                    document.getElementById('bugArtifactOther').value = '';
                }
                onBugArtifactChange();
                document.getElementById('bugSubmitBtn').textContent = 'Save Bug';
                document.getElementById('bugCancelBtn').style.display = 'inline-block';
            }

            function cancelBugEdit() {
                editingBugId = null;
                clearBugForm();
                document.getElementById('bugSubmitBtn').textContent = 'Add Bug';
                document.getElementById('bugCancelBtn').style.display = 'none';
            }

            function clearBugForm() {
                document.getElementById('title').value = '';
                document.getElementById('desc').value = '';
                document.getElementById('severity').value = 'Low';
                document.getElementById('bugKind').value = 'General';
                document.getElementById('bugKindOther').value = '';
                onBugKindChange();
                document.getElementById('reporter').value = '';
                document.getElementById('iterationOrPhase').value = '';
                document.getElementById('methodology').value = '';
                document.getElementById('methodologyOther').value = '';
                onMethodologyChange();
                document.getElementById('bugArtifactId').value = '';
                document.getElementById('bugArtifactOther').value = '';
                onBugArtifactChange();
            }

            function deleteBug(id) {
                vscode.postMessage({
                    command: 'deleteBug',
                    id
                });
            }

            function updateBugStatus(id, status) {
                vscode.postMessage({
                    command: 'updateBugStatus',
                    id,
                    status
                });
            }

            function submitArtifact() {
                const name = document.getElementById('artifactName').value.trim();
                let type = document.getElementById('artifactType').value;
                if (type === 'Other') {
                    type = document.getElementById('artifactTypeOther').value.trim();
                    if (!type) {
                        alert('Please specify the artifact type, or choose a different option.');
                        return;
                    }
                }
                const details = document.getElementById('artifactDetails').value.trim();

                if (!name || !details) {
                    alert('Please fill in artifact name and details.');
                    return;
                }

                if (editingArtifactId !== null) {
                    vscode.postMessage({
                        command: 'saveArtifactEdit',
                        id: editingArtifactId,
                        name,
                        type,
                        details
                    });
                    cancelArtifactEdit();
                } else {
                    vscode.postMessage({
                        command: 'addArtifact',
                        name,
                        type,
                        details
                    });
                    clearArtifactForm();
                }
            }

            function editArtifact(id) {
                const artifact = allArtifacts.find(a => a.id === id);
                if (!artifact) return;

                editingArtifactId = id;
                document.getElementById('artifactName').value = artifact.name;
                const t = artifact.type;
                if (ARTIFACT_PRESET_TYPES.includes(t)) {
                    document.getElementById('artifactType').value = t;
                    document.getElementById('artifactTypeOther').value = '';
                } else {
                    document.getElementById('artifactType').value = 'Other';
                    document.getElementById('artifactTypeOther').value = t;
                }
                onArtifactTypeChange();
                document.getElementById('artifactDetails').value = artifact.details;
                document.getElementById('artifactSubmitBtn').textContent = 'Save Artifact';
                document.getElementById('artifactCancelBtn').style.display = 'inline-block';
            }

            function cancelArtifactEdit() {
                editingArtifactId = null;
                clearArtifactForm();
                document.getElementById('artifactSubmitBtn').textContent = 'Add Artifact';
                document.getElementById('artifactCancelBtn').style.display = 'none';
            }

            function clearArtifactForm() {
                document.getElementById('artifactName').value = '';
                document.getElementById('artifactType').value = 'Product Backlog Item';
                document.getElementById('artifactTypeOther').value = '';
                onArtifactTypeChange();
                document.getElementById('artifactDetails').value = '';
            }

            function deleteArtifact(id) {
                vscode.postMessage({
                    command: 'deleteArtifact',
                    id
                });
            }

            function applyBugFilters() {
                const statusFilter = document.getElementById('bugStatusFilter').value;
                const severityFilter = document.getElementById('bugSeverityFilter').value;
                const searchText = document.getElementById('bugSearch').value.trim().toLowerCase();

                let filtered = [...allBugs];

                if (statusFilter !== 'All') {
                    filtered = filtered.filter(bug => bug.status === statusFilter);
                }

                if (severityFilter !== 'All') {
                    filtered = filtered.filter(bug => bug.severity === severityFilter);
                }

                if (searchText) {
                    filtered = filtered.filter(bug => bug.title.toLowerCase().includes(searchText));
                }

                renderBugs(filtered);
            }

            function applyArtifactFilters() {
                const typeFilter = document.getElementById('artifactTypeFilter').value;
                const searchText = document.getElementById('artifactSearch').value.trim().toLowerCase();

                let filtered = [...allArtifacts];

                if (typeFilter !== 'All') {
                    if (typeFilter === 'Other') {
                        filtered = filtered.filter(artifact => !ARTIFACT_PRESET_TYPES.includes(artifact.type));
                    } else {
                        filtered = filtered.filter(artifact => artifact.type === typeFilter);
                    }
                }

                if (searchText) {
                    filtered = filtered.filter(artifact => artifact.name.toLowerCase().includes(searchText));
                }

                renderArtifacts(filtered);
            }

            function artifactLabelForBug(bug) {
                if (bug.artifactId != null) {
                    const a = allArtifacts.find(function (x) { return x.id === bug.artifactId; });
                    return a ? a.name + ' (' + a.type + ')' : '#' + bug.artifactId;
                }
                if (bug.artifactOtherLabel) {
                    return 'Other: ' + bug.artifactOtherLabel;
                }
                return 'None';
            }

            function renderBugs(bugs) {
                const container = document.getElementById('bugList');
                container.innerHTML = '';

                if (bugs.length === 0) {
                    container.innerHTML = '<div class="card empty">No bugs match the current filters.</div>';
                    return;
                }

                bugs.forEach(bug => {
                    const div = document.createElement('div');
                    div.className = 'card';

                    const fixedLine = bug.dateFixed
                        ? '<div class="row">Fixed: ' + bug.dateFixed + '</div>'
                        : '';

                    div.innerHTML = \`
                        <div class="row"><strong>\${bug.title}</strong> — \${bug.severity} / \${bug.bugKind || 'General'}</div>
                        <div class="row">Description: \${bug.description}</div>
                        <div class="row">Found by: \${bug.reporter || '—'}</div>
                        <div class="row">Artifact: \${artifactLabelForBug(bug)}</div>
                        <div class="row">Process: \${bug.methodology || '—'} · Iteration/phase: \${bug.iterationOrPhase || '—'}</div>
                        <div class="row">Status: \${bug.status}</div>
                        <div class="row">Found: \${bug.dateCreated}</div>
                        \${fixedLine}

                        <select onchange="updateBugStatus(\${bug.id}, this.value)">
                            <option \${bug.status === 'Open' ? 'selected' : ''}>Open</option>
                            <option \${bug.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
                            <option \${bug.status === 'Fixed' ? 'selected' : ''}>Fixed</option>
                        </select>

                        <div class="actions">
                            <button onclick="editBug(\${bug.id})">Edit</button>
                            <button class="delete-btn" onclick="deleteBug(\${bug.id})">Delete</button>
                        \</div>
                    \`;

                    container.appendChild(div);
                });
            }

            function renderArtifacts(artifacts) {
                const container = document.getElementById('artifactList');
                container.innerHTML = '';

                if (artifacts.length === 0) {
                    container.innerHTML = '<div class="card empty">No artifacts match the current filters.</div>';
                    return;
                }

                artifacts.forEach(artifact => {
                    const div = document.createElement('div');
                    div.className = 'card';

                    div.innerHTML = \`
                        <div class="row"><strong>\${artifact.name}</strong></div>
                        <div class="row">Type: \${artifact.type}</div>
                        <div class="row">Details: \${artifact.details}</div>
                        <div class="row">Created: \${artifact.dateCreated}</div>

                        <div class="actions">
                            <button onclick="editArtifact(\${artifact.id})">Edit</button>
                            <button class="delete-btn" onclick="deleteArtifact(\${artifact.id})">Delete</button>
                        </div>
                    \`;

                    container.appendChild(div);
                });
            }

            window.addEventListener('message', event => {
                const data = event.data;

                if (data.command === 'loadData') {
                    allBugs = data.bugs || [];
                    allArtifacts = data.artifacts || [];
                    populateArtifactSelect();
                    applyBugFilters();
                    applyArtifactFilters();
                }
            });

            vscode.postMessage({ command: 'loadData' });
        </script>
    </body>
    </html>
    `;
}
function deactivate() { }
