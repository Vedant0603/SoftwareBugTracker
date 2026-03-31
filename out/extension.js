"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = require("vscode");
let panel;
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
            let bugs = context.workspaceState.get('bugs') || [];
            let artifacts = context.workspaceState.get('artifacts') || [];
            if (message.command === 'loadData') {
                sendAllData(context);
                return;
            }
            if (message.command === 'addBug') {
                const bug = {
                    id: Date.now(),
                    title: message.title,
                    description: message.description,
                    severity: message.severity,
                    status: 'Open',
                    dateCreated: new Date().toLocaleString()
                };
                bugs.push(bug);
                context.workspaceState.update('bugs', bugs);
            }
            if (message.command === 'saveBugEdit') {
                bugs = bugs.map((bug) => {
                    if (bug.id === message.id) {
                        bug.title = message.title;
                        bug.description = message.description;
                        bug.severity = message.severity;
                    }
                    return bug;
                });
                context.workspaceState.update('bugs', bugs);
            }
            if (message.command === 'updateBugStatus') {
                bugs = bugs.map((bug) => {
                    if (bug.id === message.id) {
                        bug.status = message.status;
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
    const bugs = context.workspaceState.get('bugs') || [];
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
        </style>
    </head>
    <body>
        <div class="section">
            <h2>Bug Tracker System</h2>

            <div class="subsection">
                <div class="small-title">Add Bug</div>
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

            <div class="subsection">
                <div class="small-title">Add Artifact</div>
                <input id="artifactName" placeholder="Artifact Name" />

                <select id="artifactType">
                    <option>Product Backlog Item</option>
                    <option>Design Document</option>
                    <option>Diagram</option>
                    <option>Formal Spec</option>
                    <option>Source File</option>
                    <option>Test Source File</option>
                    <option>Binary</option>
                    <option>Data File</option>
                </select>

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

            function submitBug() {
                const title = document.getElementById('title').value.trim();
                const description = document.getElementById('desc').value.trim();
                const severity = document.getElementById('severity').value;

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
                        severity
                    });
                    cancelBugEdit();
                } else {
                    vscode.postMessage({
                        command: 'addBug',
                        title,
                        description,
                        severity
                    });
                    clearBugForm();
                }
            }

            function editBug(id) {
                const bug = allBugs.find(b => b.id === id);
                if (!bug) return;

                editingBugId = id;
                document.getElementById('title').value = bug.title;
                document.getElementById('desc').value = bug.description;
                document.getElementById('severity').value = bug.severity;
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
                const type = document.getElementById('artifactType').value;
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
                document.getElementById('artifactType').value = artifact.type;
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
                    filtered = filtered.filter(artifact => artifact.type === typeFilter);
                }

                if (searchText) {
                    filtered = filtered.filter(artifact => artifact.name.toLowerCase().includes(searchText));
                }

                renderArtifacts(filtered);
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

                    div.innerHTML = \`
                        <div class="row"><strong>\${bug.title}</strong> (\${bug.severity})</div>
                        <div class="row">Description: \${bug.description}</div>
                        <div class="row">Status: \${bug.status}</div>
                        <div class="row">Created: \${bug.dateCreated}</div>

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
