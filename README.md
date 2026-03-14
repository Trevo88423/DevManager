# DevManager

A lightweight Electron desktop app for Windows that monitors all processes listening on TCP ports — and lets you kill them with one click.

![Dark themed frameless UI](https://img.shields.io/badge/theme-dark-0f172a) ![Electron](https://img.shields.io/badge/electron-35-47848f) ![Platform](https://img.shields.io/badge/platform-Windows-blue)

## Features

- **Port table** — View all listening TCP ports with process name, PID, address, and command line
- **Kill processes** — One-click kill with confirmation dialog (system PIDs protected)
- **Dev server detection** — Automatically identifies Node/Deno/Bun dev servers (Vite, Next, Webpack, etc.) with visual highlighting
- **Dev Servers filter** — Toggle to show only your dev servers
- **Compact mode** — Slim view showing just port, process, and kill button — shrinks the window to a narrow strip
- **Auto-refresh** — Configurable interval (2s/3s/5s/10s/off), pauses when minimized
- **Filter** — Real-time text search across port, PID, process name, and command line
- **Column sorting** — Click Port, PID, or Process headers to sort
- **System tray** — Close minimizes to tray, left-click toggles window, right-click menu to quit
- **Frameless dark UI** — Custom title bar, slate color palette, no native menu bar

## Screenshot

```
┌──────────────────────────────────────────────────┐
│ ● DevManager                          — □ ✕      │
├──────────────────────────────────────────────────┤
│ [Refresh] [Dev Servers] [Compact]   ⏱ 3s  🔍    │
├──────┬──────────┬──────┬───────────┬─────┬───────┤
│ Port │ Address  │ PID  │ Process   │ Cmd │ Action│
├──────┼──────────┼──────┼───────────┼─────┼───────┤
│ 5173 │ [::1]    │15540 │ node.exe  │ ... │ [KILL]│
│ 3000 │ 0.0.0.0  │ 8821 │ node.exe  │ ... │ [KILL]│
│  445 │ 0.0.0.0  │    4 │ System    │     │       │
├──────┴──────────┴──────┴───────────┴─────┴───────┤
│ 24 ports  ●  Last scan: 12:34:05                 │
└──────────────────────────────────────────────────┘
```

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)

### Install & Run

```bash
git clone https://github.com/Trevo88423/DevManager.git
cd DevManager
npm install
npm start
```

## Tech Stack

- **Electron** — vanilla JS, no React or bundler
- **Zero runtime dependencies** — only `electron` + `electron-builder` as dev deps
- Port scanning: `netstat -ano` → parse LISTENING rows
- Process details: PowerShell `Get-CimInstance Win32_Process` → JSON
- Kill: `taskkill /F /T /PID`

## Project Structure

```
DevManager/
├── main/
│   ├── main.js        # Electron window, frameless chrome, lifecycle
│   ├── preload.js     # contextBridge for secure IPC
│   ├── scanner.js     # Port scanning + process lookup + kill
│   ├── tray.js        # System tray icon + context menu
│   └── ipc.js         # IPC handler registration + auto-refresh
├── renderer/
│   ├── index.html     # Custom title bar + table UI
│   ├── styles.css     # Dark slate theme
│   └── app.js         # Table rendering, filtering, sorting, kill dialog
└── assets/
    └── icon.png       # App icon
```

## License

MIT
