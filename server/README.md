# Weighbridge API (Node/Express + SQLite)

## Run
1. Install deps: `npm install` (in the `server` folder)
2. Start dev: `npm run dev`
3. Health: GET http://localhost:4000/health

## Endpoints
- GET /analytics/overview
- GET /analytics/by-person?limit=10
- GET /analytics/by-site?limit=10
- GET /analytics/by-shift
- POST /records/bulk
- GET /refs/people|groups|shifts|sites|users

## Bulk payload example
```json
{
  "source_filename": "30.06.2025 TO 31.07.2025.html",
  "rows": [
    {
      "w_datetime": "2025-06-30T12:13:17Z",
      "site": "Chipata",
      "user_full_name": "Officer A",
      "person_name": "John Doe",
      "amount_due": 100,
      "gvm_fine": 10
    }
  ]
}
```