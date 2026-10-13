const express = require("express");
const path = require("path");
const { Pool } = require("pg");

const app = express();
const PORT = process.env.PORT || 5001;

const pool = new Pool({
    host: process.env.DB_HOST || "localhost",
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || "company_db",
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || ""
});

app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

const query = async (sql, params = []) => {
    const result = await pool.query(sql, params);
    return result.rows;
};

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}

function options(values, selected = "") {
    return values.map(value => `
        <option value="${escapeHTML(value)}"
            ${selected === value ? "selected" : ""}>
            ${escapeHTML(value)}
        </option>
    `).join("");
}

function page(title, content) {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title} | SomaiyaSat</title>
        <link rel="stylesheet" href="/style.css">
    </head>
    <body>
        <aside class="sidebar">
            <div class="brand">
                <div class="logo">S</div>
                <div>
                    <b>SomaiyaSat</b>
                    <small>MISSION CONSOLE</small>
                </div>
            </div>

            <p class="navlabel">GROUND SEGMENT</p>
            <a href="/">Overview</a>
            <a href="/logs">Mission Logs</a>
            <a href="/reports">Reports</a>
            <a href="/sql">DBMS Concepts</a>

            <div class="sidebottom">
                Local demo environment
                <small>Node.js · PostgreSQL</small>
            </div>
        </aside>

        <main class="main">
            <header class="top">
                <div>
                    <small>SPACE SYSTEMS / KJS-SRS-01</small>
                    <h1>${title}</h1>
                </div>
                <span class="demo">SIMULATION / DEMO DATA</span>
            </header>

            ${content}

            <footer>
                SomaiyaSat & SomaiyaPod · DBMS Mini Project
            </footer>
        </main>
    </body>
    </html>`;
}

function missionTable(rows, actions = false) {
    if (rows.length === 0) {
        return `<div class="empty">No mission records found.</div>`;
    }

    return `
    <div class="tablewrap">
        <table>
            <thead>
                <tr>
                    <th>Log</th>
                    <th>Data Type</th>
                    <th>Mode</th>
                    <th>Priority</th>
                    <th>Battery</th>
                    <th>Link Quality</th>
                    <th>Status</th>
                    ${actions ? "<th>Actions</th>" : ""}
                </tr>
            </thead>
            <tbody>
                ${rows.map(record => `
                    <tr>
                        <td>
                            <b>#${record.log_id} ${escapeHTML(record.satellite_name)}</b>
                            <small>${new Date(record.log_time).toLocaleString()}</small>
                        </td>
                        <td>${escapeHTML(record.data_type)}</td>
                        <td>${escapeHTML(record.communication_mode)}</td>
                        <td>${escapeHTML(record.priority)}</td>
                        <td>${record.battery_percent}%</td>
                        <td>${record.link_quality}%</td>
                        <td>${escapeHTML(record.status)}</td>

                        ${actions ? `
                        <td>
                            <div class="actions">
                                <form method="POST"
                                    action="/logs/${record.log_id}/status">
                                    <select name="status">
                                        ${options(
                                            ["Queued", "Transmitted", "Received", "Failed"],
                                            record.status
                                        )}
                                    </select>
                                    <button class="tiny">Update</button>
                                </form>

                                <form method="POST"
                                    action="/logs/${record.log_id}/delete"
                                    onsubmit="return confirm('Delete this record?')">
                                    <button class="tiny delete">Delete</button>
                                </form>
                            </div>
                        </td>
                        ` : ""}
                    </tr>
                `).join("")}
            </tbody>
        </table>
    </div>`;
}

app.get("/", async (req, res) => {
    try {
        const [
            satellites,
            stations,
            total,
            completed,
            queued,
            recent
        ] = await Promise.all([
            query("SELECT * FROM satellites ORDER BY satellite_id"),
            query("SELECT * FROM ground_stations ORDER BY station_id"),
            query("SELECT COUNT(*)::int AS count FROM mission_logs"),
            query(`
                SELECT COUNT(*)::int AS count
                FROM mission_logs
                WHERE status IN ('Received', 'Transmitted')
            `),
            query(`
                SELECT COUNT(*)::int AS count
                FROM mission_logs
                WHERE status = 'Queued'
            `),
            query(`
                SELECT * FROM recent_mission_logs
                ORDER BY log_time DESC
                LIMIT 8
            `)
        ]);

        const content = `
        <section class="welcome">
            <div>
                <span class="tag">KJS-SRS-01 · POCKETQUBE</span>
                <h2>Mission data, one place.</h2>
                <p>
                    Record telemetry, log payload activity, and review
                    simulated ground-station communications.
                </p>
                <a class="button" href="/logs#new-log">Add Mission Log</a>
            </div>
            <div class="orbit">
                <div class="orbit-ring"></div>
                <div class="planet">✦</div>
            </div>
        </section>

        <div class="stats">
            <div class="stat">
                <small>LOG RECORDS</small>
                <strong>${total[0].count}</strong>
                <span>Stored in PostgreSQL</span>
            </div>
            <div class="stat">
                <small>RECEIVED / SENT</small>
                <strong>${completed[0].count}</strong>
                <span>Transmitted or received</span>
            </div>
            <div class="stat">
                <small>IN QUEUE</small>
                <strong>${queued[0].count}</strong>
                <span>Awaiting simulated pass</span>
            </div>
            <div class="stat">
                <small>SATELLITES</small>
                <strong>${satellites.length}</strong>
                <span>Mission assets</span>
            </div>
        </div>

        <div class="columns">
            <section class="panel">
                <div class="paneltitle">
                    <h3>Recent Mission Logs</h3>
                    <a href="/logs">View All</a>
                </div>
                ${missionTable(recent)}
            </section>

            <section class="panel">
                <div class="paneltitle">
                    <h3>Satellite Registry</h3>
                </div>

                ${satellites.map(satellite => `
                    <div class="asset">
                        <div class="asseticon">✦</div>
                        <div class="assetbody">
                            <b>${escapeHTML(satellite.satellite_name)}</b>
                            <span>
                                ${escapeHTML(satellite.platform)}
                                · ${escapeHTML(satellite.deployment_status)}
                            </span>
                            <div class="meter">
                                <i style="width:${satellite.battery_percent}%"></i>
                            </div>
                            <small>
                                Battery ${satellite.battery_percent}%
                                · Link ${satellite.link_quality}%
                            </small>
                        </div>
                    </div>
                `).join("")}

                <div class="paneltitle">
                    <h3>Ground Stations</h3>
                </div>

                ${stations.map(station => `
                    <div class="station">
                        <div>
                            <b>${escapeHTML(station.station_name)}</b>
                            <small>${escapeHTML(station.location)}</small>
                        </div>
                    </div>
                `).join("")}
            </section>
        </div>

        <div class="notice">
            <b>Demo</b>
            <span>
                This project stores manually entered or simulated mission data.
            </span>
        </div>`;

        res.send(page("Mission Console", content));
    } catch (error) {
        res.status(500).send(page(
            "Database Connection",
            `<section class="panel">
                <h2>Cannot connect to PostgreSQL</h2>
                <p>Check your database name, username and password.</p>
                <pre>${escapeHTML(error.message)}</pre>
            </section>`
        ));
    }
});

app.get("/logs", async (req, res) => {
    try {
        const conditions = [];
        const params = [];

        if (req.query.status) {
            params.push(req.query.status);
            conditions.push(`status = $${params.length}`);
        }

        if (req.query.mode) {
            params.push(req.query.mode);
            conditions.push(`communication_mode = $${params.length}`);
        }

        const where = conditions.length
            ? `WHERE ${conditions.join(" AND ")}`
            : "";

        const [logs, satellites, stations] = await Promise.all([
            query(`
                SELECT * FROM recent_mission_logs
                ${where}
                ORDER BY log_time DESC
            `, params),
            query("SELECT satellite_id, satellite_name FROM satellites"),
            query("SELECT station_id, station_name FROM ground_stations")
        ]);

        const content = `
        <div class="pageintro">
            <p>Enter mission data and save it to PostgreSQL.</p>
            <a class="button" href="#new-log">New Log</a>
        </div>

        ${req.query.message
            ? `<div class="success">${escapeHTML(req.query.message)}</div>`
            : ""}

        <section class="panel">
            <div class="paneltitle">
                <h3>Mission Logbook</h3>
                <span class="count">${logs.length} Records</span>
            </div>

            <form class="filters" method="GET">
                <select name="status">
                    <option value="">All Statuses</option>
                    ${options(
                        ["Queued", "Transmitted", "Received", "Failed"],
                        req.query.status
                    )}
                </select>

                <select name="mode">
                    <option value="">All Modes</option>
                    ${options(
                        ["TT&C", "SSTV", "M17", "Codec2", "Beacon"],
                        req.query.mode
                    )}
                </select>

                <button class="button secondary">Filter</button>
                <a href="/logs">Reset</a>
            </form>

            ${missionTable(logs, true)}
        </section>

        <section class="panel" id="new-log">
            <div class="paneltitle">
                <h3>Create Mission Record</h3>
                <span class="count">Form → Database</span>
            </div>

            <form method="POST" action="/logs" class="dataform">
                <label>
                    Satellite
                    <select name="satellite_id" required>
                        ${satellites.map(s => `
                            <option value="${s.satellite_id}">
                                ${escapeHTML(s.satellite_name)}
                            </option>
                        `).join("")}
                    </select>
                </label>

                <label>
                    Ground Station
                    <select name="station_id">
                        <option value="">Not specified</option>
                        ${stations.map(s => `
                            <option value="${s.station_id}">
                                ${escapeHTML(s.station_name)}
                            </option>
                        `).join("")}
                    </select>
                </label>

                <label>
                    Data Type
                    <select name="data_type">
                        ${options([
                            "TT&C / Housekeeping",
                            "SSTV Image",
                            "M17 Voice",
                            "Codec2 Voice",
                            "Deployment Confirmation"
                        ])}
                    </select>
                </label>

                <label>
                    Priority
                    <select name="priority">
                        ${options(["Critical", "High", "Normal", "Low"])}
                    </select>
                </label>

                <label>
                    Communication Mode
                    <select name="communication_mode">
                        ${options(["TT&C", "SSTV", "M17", "Codec2", "Beacon"])}
                    </select>
                </label>

                <label>
                    Battery (%)
                    <input type="number" name="battery_percent"
                        min="0" max="100" value="85" required>
                </label>

                <label>
                    Link Quality (%)
                    <input type="number" name="link_quality"
                        min="0" max="100" value="70" required>
                </label>

                <label>
                    Packet Size (KB)
                    <input type="number" name="packet_size_kb"
                        min="0" step="0.01" value="1" required>
                </label>

                <label>
                    Status
                    <select name="status">
                        ${options(["Queued", "Transmitted", "Received", "Failed"])}
                    </select>
                </label>

                <label class="wide">
                    Notes
                    <textarea name="notes" rows="3"
                        placeholder="Enter mission details"></textarea>
                </label>

                <div class="wide formfoot">
                    <span>Data will be stored in PostgreSQL.</span>
                    <button class="button">Save to Database</button>
                </div>
            </form>
        </section>`;

        res.send(page("Mission Logs", content));
    } catch (error) {
        res.status(500).send(page(
            "Error",
            `<section class="panel"><pre>${escapeHTML(error.message)}</pre></section>`
        ));
    }
});

app.post("/logs", async (req, res) => {
    try {
        const data = req.body;

        await pool.query(`
            INSERT INTO mission_logs (
                satellite_id,
                station_id,
                data_type,
                priority,
                communication_mode,
                battery_percent,
                link_quality,
                packet_size_kb,
                status,
                notes
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `, [
            data.satellite_id,
            data.station_id || null,
            data.data_type,
            data.priority,
            data.communication_mode,
            data.battery_percent,
            data.link_quality,
            data.packet_size_kb || 0,
            data.status,
            data.notes || null
        ]);

        res.redirect("/logs?message=Mission+log+saved+successfully");
    } catch (error) {
        res.status(400).send(page(
            "Save Error",
            `<section class="panel">
                <h2>Could not save record</h2>
                <pre>${escapeHTML(error.message)}</pre>
                <a href="/logs">Go Back</a>
            </section>`
        ));
    }
});

app.post("/logs/:id/status", async (req, res) => {
    try {
        await pool.query(
            "UPDATE mission_logs SET status = $1 WHERE log_id = $2",
            [req.body.status, req.params.id]
        );

        res.redirect("/logs?message=Status+updated");
    } catch (error) {
        res.status(400).send(escapeHTML(error.message));
    }
});

app.post("/logs/:id/delete", async (req, res) => {
    try {
        await pool.query(
            "DELETE FROM mission_logs WHERE log_id = $1",
            [req.params.id]
        );

        res.redirect("/logs?message=Record+deleted");
    } catch (error) {
        res.status(400).send(escapeHTML(error.message));
    }
});

app.get("/reports", async (req, res) => {
    try {
        const [modes, statuses, critical, lowBattery, joinedMissions] = await Promise.all([
            query(`
                SELECT communication_mode,
                       COUNT(*)::int AS records,
                       SUM(packet_size_kb) AS total_kb,
                       AVG(link_quality)::numeric(5,1) AS avg_link
                FROM mission_logs
                GROUP BY communication_mode
                ORDER BY records DESC
            `),
            query(`
                SELECT status, COUNT(*)::int AS records
                FROM mission_logs
                GROUP BY status
                ORDER BY records DESC
            `),
            query(`
                SELECT * FROM recent_mission_logs
                WHERE priority = 'Critical'
                ORDER BY log_time DESC
            `),
            query(`
                SELECT satellite_name, battery_percent, link_quality
                FROM satellites
                WHERE battery_percent < 30 OR link_quality < 30
            `),
            query(`
                SELECT
                    s.satellite_name,
                    m.data_type,
                    m.communication_mode,
                    m.status
                FROM mission_logs m
                JOIN satellites s
                    ON m.satellite_id = s.satellite_id
                ORDER BY m.log_id DESC
            `)
        ]);

        const content = `
        <div class="notice">
            <b>SQL Reports</b>
            <span>These reports use aggregate functions and grouping.</span>
        </div>

        <div class="columns">
            <section class="panel">
                <div class="paneltitle">
                    <h3>Traffic by Communication Mode</h3>
                </div>
                <div class="tablewrap">
                    <table>
                        <tr>
                            <th>Mode</th>
                            <th>Records</th>
                            <th>Total KB</th>
                            <th>Average Link</th>
                        </tr>
                        ${modes.map(row => `
                            <tr>
                                <td>${escapeHTML(row.communication_mode)}</td>
                                <td>${row.records}</td>
                                <td>${Number(row.total_kb || 0).toFixed(2)}</td>
                                <td>${row.avg_link || 0}%</td>
                            </tr>
                        `).join("")}
                    </table>
                </div>
            </section>

            <section class="panel">
                <div class="paneltitle">
                    <h3>Records by Status</h3>
                </div>
                ${statuses.map(row => `
                    <div class="reportrow">
                        <span>${escapeHTML(row.status)}</span>
                        <b>${row.records}</b>
                    </div>
                `).join("")}
            </section>
        </div>

        <section class="panel">
            <div class="paneltitle">
                <h3>Critical Mission Records</h3>
            </div>
            ${missionTable(critical)}
        </section>

        <section class="panel">
            <div class="paneltitle">
                <h3>Low Battery or Weak Link</h3>
            </div>
            ${lowBattery.length ? lowBattery.map(row => `
                <div class="reportrow">
                    <span>${escapeHTML(row.satellite_name)}</span>
                    <b>Battery ${row.battery_percent}% · Link ${row.link_quality}%</b>
                </div>
            `).join("") : "<p>No satellites below the threshold.</p>"}
        </section>`;

        res.send(page("Reports", content));
    } catch (error) {
        res.status(500).send(page(
            "Error",
            `<pre>${escapeHTML(error.message)}</pre>`
        ));
    }
});

app.get("/sql", (req, res) => {
    const examples = [
        ["DDL", "CREATE TABLE mission_logs (log_id SERIAL PRIMARY KEY, satellite_id INTEGER REFERENCES satellites(satellite_id));"],
        ["INSERT", "INSERT INTO mission_logs (satellite_id, data_type, priority, communication_mode, battery_percent, link_quality, status) VALUES (1, 'TT&C / Housekeeping', 'Critical', 'TT&C', 85, 70, 'Received');"],
        ["SELECT", "SELECT * FROM mission_logs ORDER BY log_time DESC;"],
        ["JOIN", "SELECT s.satellite_name, g.station_name, m.data_type FROM mission_logs m JOIN satellites s ON m.satellite_id = s.satellite_id LEFT JOIN ground_stations g ON m.station_id = g.station_id;"],
        ["GROUP BY", "SELECT communication_mode, COUNT(*) FROM mission_logs GROUP BY communication_mode;"],
        ["VIEW", "SELECT * FROM recent_mission_logs;"],
        ["UPDATE", "UPDATE mission_logs SET status = 'Received' WHERE log_id = 1;"],
        ["DELETE", "DELETE FROM mission_logs WHERE log_id = 1;"]
    ];

    const content = examples.map(example => `
        <section class="panel sqlpanel">
            <h3>${example[0]}</h3>
            <pre>${escapeHTML(example[1])}</pre>
        </section>
    `).join("");

    res.send(page("DBMS Concepts", content));
});

app.listen(PORT, () => {
    console.log(`SomaiyaSat running at http://localhost:${PORT}`);
});