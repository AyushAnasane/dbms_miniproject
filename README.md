# SomaiyaSat Mission Console — DBMS Mini Project

Built from the supplied KJS-SRS-01 SomaiyaSat & SomaiyaPod use case. This is a **manual/simulated mission logbook**, not a live satellite or RF connection.

## Stack
Node.js + Express + PostgreSQL (`pg`) + plain HTML/CSS. No Python or React.

## Workflow
1. Open Mission Logs.
2. Enter satellite, ground station, data type, priority, radio mode, battery %, link quality, packet size, status and notes.
3. Submit the form; Express executes a parameterized `INSERT` into PostgreSQL.
4. Read saved rows, filter by mode/status, update a record status, or delete a record.
5. Reports run SQL aggregate queries (`COUNT`, `SUM`, `AVG`, `GROUP BY`) and use a database view.

Use-case alignment: the PDF describes SomaiyaPod deployment confirmation, SomaiyaSat, link quality, battery/power telemetry, data priority, and TT&C/SSTV/M17/Codec2. Those are reflected as fields and log categories. The UI does **not** implement the onboard AI router or actual radio transmission.

## Run on macOS
1. Create a database and import schema:
```bash
createdb company_db
psql -d company_db -f schema.sql
```
Or create `company_db` in pgAdmin and run `schema.sql`.

2. Install dependencies:
```bash
npm install
```

3. Set PostgreSQL credentials in the same Terminal:
```bash
export DB_HOST=localhost
export DB_PORT=5432
export DB_NAME=company_db
export DB_USER=postgres
export DB_PASSWORD='YOUR_POSTGRES_PASSWORD'
```

4. Start:
```bash
npm start
```
Open **http://localhost:5001**. Port 5001 avoids the previous port-5000 conflict. To use another port: `PORT=5002 npm start`.

## Files
- `schema.sql`: tables, keys, constraints, view, indexes and demo rows
- `server.js`: routes and PostgreSQL queries
- `public/style.css`: UI
- `authorization.sql`: optional GRANT/REVOKE demo

## DBMS experiment mapping
- Experiments 1–2: entities and relational schema
- Experiment 3: DDL, PK/FK, CHECK, view, indexes
- Experiment 4: INSERT/SELECT/UPDATE/DELETE
- Experiment 5: aggregate functions, GROUP BY, ORDER BY, WHERE
- Experiment 6: JOIN and VIEW
- Experiment 7: GRANT/REVOKE example
