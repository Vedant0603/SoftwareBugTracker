# Software Bug Tracker — VS Code Extension

A Visual Studio Code extension for tracking bugs and artifacts in your software projects. Built for CPS406.

## Features

- Log bugs with title, description, severity, type, reporter, methodology, and iteration/phase
- Link bugs to project artifacts (source files, design docs, test files, etc.)
- Track bug status: Open → In Progress → Fixed (with auto timestamp)
- Duplicate bug detection using fuzzy matching
- Filter and search bugs by status, severity, and keyword
- Add, edit, and delete artifacts
- All data persists across VS Code sessions

## How to Run

1. Make sure you have **Visual Studio Code** and **Node.js** installed
2. Clone the repository:
```
   git clone https://github.com/Vedant0603/SoftwareBugTracker
```
3. Open the cloned folder in VS Code: **File → Open Folder**
4. Open the terminal (`Ctrl+``) and install dependencies:
```
   npm install
```
5. Compile the TypeScript:
```
   npm run compile
```
6. Press **F5** to launch the Extension Development Host
7. In the new window, press **Ctrl+Shift+P**, type **Open Bug Tracker**, and press Enter

## Built With

- TypeScript
- VS Code Extension API
- Webview API

## Authors

Sarim Khan, Raiyan Mirza, Aryan Desai, Vedant Prajapati, Ammar Ahmad
