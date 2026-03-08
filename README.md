# Preventive Maintenance Dashboard
### Clamason Industries · PWA Network Application

---

## Quick Start

1. Double-click **START.bat** to launch the server
2. Open your browser at **http://localhost:3000**
3. Share with colleagues on the same network using the IP shown in the console

---

## Features

| Section | Description |
|---------|-------------|
| **KPI Strip** | Total PM Jobs, Compliance Rate, Overdue Tasks, Avg Time, Total Cost |
| **Planned vs Completed** | Weekly bar chart |
| **PM Adherence Funnel** | Visual funnel: Planned → Completed → Overdue |
| **Compliance Trend** | Line chart over time |
| **Overdue Breakdown** | Donut chart by week |
| **Cost Analysis** | Planned vs Actual cost per week |
| **PM Jobs Register** | Full CRUD table — add, edit, delete jobs |

---

## Requirements

- Node.js v16+ (portable or installed)
- Same network access for colleagues

## Portable Node.js (no install)

1. Download portable Node.js from https://nodejs.org
2. Extract to a folder named `node` next to START.bat
3. Run START.bat — it will use the portable version automatically

---

## Data

All data is stored in `data/pm_data.json` on the server.
Changes made by any user are shared in real-time.

---

## Sharing with Colleagues

When you start the server, the console will show:
```
Network: http://192.168.1.xx:3000  ← share this with colleagues
```
They can open that URL in their browser or install it as a PWA.

---

*Built for Clamason Industries · Maintenance Team*
