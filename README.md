# Weighbridge Analytics App

## Project Overview
React-based weighbridge analytics application with an Express + SQLite backend. Supports Excel uploads, people/group/shift management, and revenue analytics (by person, site, and shift).

## Tech Stack
- **Frontend**: React 19, React Bootstrap, Chart.js
- **Backend**: Node/Express, better-sqlite3 (SQLite)
- **Parsing**: xlsx

## Prerequisites
- Node.js 18+ and npm

## Getting Started

### 1) Backend
1. Open a terminal in `server/`
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the API (default port 4000):
   ```bash
   npm start
   ```

### 2) Frontend
1. Open a terminal in the project root
2. Install dependencies:
   ```bash
   npm install
   ```
3. (Optional) Create `.env` in the project root to point to the API:
   ```bash
   REACT_APP_API_URL=http://localhost:4000
   ```
4. Start the app:
   ```bash
   npm start
   ```

## API Endpoints (Brief)
- **Analytics**: `GET /analytics/overview`, `GET /analytics/by-person`, `GET /analytics/by-site`, `GET /analytics/by-shift`
- **Records**: `POST /records/bulk` (bulk insert parsed Excel rows)
- **References**: People/Groups/Shifts CRUD, Sites/Users read-only under `/refs/*`

## Excel Import
- Frontend parses `.xlsx` using `xlsx` and posts normalized rows to `POST /records/bulk`.
- Revenue totals are computed from individual fine fields if `total_revenue` is not provided.

## Utilities
- HTML aggregation script (optional helper):
  ```bash
  node scripts/aggregate_html.js "30.06.2025 TO 31.07.2025.html" > scripts/agg_out.json
  ```

## Notes
- Database file is stored at `server/data/weighbridge.db`.
- For production, configure `REACT_APP_API_URL` accordingly.

## License
See `LICENSE` for details.