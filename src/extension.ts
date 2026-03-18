import * as vscode from 'vscode';

let panel: vscode.WebviewPanel | undefined;

export function activate(context: vscode.ExtensionContext) {

    console.log("Bug Tracker Extension Activated");

    const command = vscode.commands.registerCommand('bugtracker.openPanel', () => {

        if (panel) {
            panel.reveal();
            return;
        }

        panel = vscode.window.createWebviewPanel(
            'bugTracker',
            'Bug Tracker',
            vscode.ViewColumn.One,
            { enableScripts: true }
        );

        panel.webview.html = getWebviewContent();

        panel.onDidDispose(() => {
            panel = undefined;
        });

        panel.webview.onDidReceiveMessage((message) => {

            let bugs = context.workspaceState.get<any[]>('bugs') || [];

            if (message.command === 'addBug') {

                const editor = vscode.window.activeTextEditor;

                const bug = {
                    id: Date.now(),
                    title: message.title,
                    description: message.description,
                    severity: message.severity,
                    status: "Open",
                    file: editor ? editor.document.fileName : "N/A",
                    line: editor ? editor.selection.active.line : "N/A",
                    dateCreated: new Date().toLocaleString(),
                    dateFixed: null
                };

                bugs.push(bug);
            }

            if (message.command === 'updateStatus') {
                bugs = bugs.map(bug => {
                    if (bug.id === message.id) {
                        bug.status = message.status;

                        if (message.status === "Fixed" && !bug.dateFixed) {
                            bug.dateFixed = new Date().toLocaleString();
                        }
                    }
                    return bug;
                });
            }

            context.workspaceState.update('bugs', bugs);

            panel?.webview.postMessage({
                command: 'loadBugs',
                bugs: bugs
            });
        });
    });

    context.subscriptions.push(command);
}

function getWebviewContent(): string {
    return `
    <html>
    <head>
        <style>
            body {
                font-family: Arial;
                padding: 15px;
                background-color: #1e1e1e;
                color: white;
            }

            input, textarea, select {
                width: 100%;
                padding: 8px;
                margin-bottom: 10px;
                border-radius: 6px;
                border: none;
            }

            button {
                background-color: #007acc;
                color: white;
                padding: 8px 12px;
                border: none;
                border-radius: 6px;
                cursor: pointer;
            }

            button:hover {
                background-color: #005f99;
            }

            .bug {
                background: #2d2d2d;
                padding: 10px;
                margin-top: 10px;
                border-radius: 8px;
            }

            .row {
                margin-bottom: 5px;
            }
        </style>
    </head>

    <body>
        <h2>Bug Tracker System</h2>

        <input id="title" placeholder="Bug Title"/>
        <textarea id="desc" placeholder="Description"></textarea>
        
        <select id="severity">
            <option>Low</option>
            <option>Medium</option>
            <option>High</option>
        </select>

        <button onclick="addBug()">➕ Add Bug</button>

        <h3>Bug List</h3>

        <select onchange="filterBugs(this.value)">
            <option value="All">All</option>
            <option value="Open">Open</option>
            <option value="In Progress">In Progress</option>
            <option value="Fixed">Fixed</option>
        </select>

        <div id="bugList"></div>

        <script>
            const vscode = acquireVsCodeApi();
            let allBugs = [];

            function addBug() {
                const title = document.getElementById('title').value;
                const description = document.getElementById('desc').value;
                const severity = document.getElementById('severity').value;

                if (!title || !description) {
                    alert("Missing fields");
                    return;
                }

                vscode.postMessage({
                    command: 'addBug',
                    title,
                    description,
                    severity
                });
            }

            function updateStatus(id, status) {
                vscode.postMessage({
                    command: 'updateStatus',
                    id,
                    status
                });
            }

            function filterBugs(filter) {
                renderBugs(filter === "All" ? allBugs : allBugs.filter(b => b.status === filter));
            }

            function renderBugs(bugs) {
                const container = document.getElementById('bugList');
                container.innerHTML = "";

                bugs.forEach(bug => {
                    const div = document.createElement('div');
                    div.className = "bug";

                    div.innerHTML = \`
                        <div class="row"><b>\${bug.title}</b> (\${bug.severity})</div>
                        <div class="row">Status: \${bug.status}</div>
                        <div class="row">Created: \${bug.dateCreated}</div>
                        <div class="row">Fixed: \${bug.dateFixed || "N/A"}</div>

                        <select onchange="updateStatus(\${bug.id}, this.value)">
                            <option \${bug.status === "Open" ? "selected" : ""}>Open</option>
                            <option \${bug.status === "In Progress" ? "selected" : ""}>In Progress</option>
                            <option \${bug.status === "Fixed" ? "selected" : ""}>Fixed</option>
                        </select>
                    \`;

                    container.appendChild(div);
                });
            }

            window.addEventListener('message', event => {
                const data = event.data;

                if (data.command === 'loadBugs') {
                    allBugs = data.bugs;
                    renderBugs(allBugs);
                }
            });

            vscode.postMessage({ command: 'loadBugs' });
        </script>
    </body>
    </html>
    `;
}

export function deactivate() {}