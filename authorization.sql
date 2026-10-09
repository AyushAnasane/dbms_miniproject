-- Optional DBMS authorization experiment: run as a PostgreSQL administrator.
CREATE ROLE mission_viewer LOGIN PASSWORD 'change_this_password';
GRANT CONNECT ON DATABASE company_db TO mission_viewer;
GRANT USAGE ON SCHEMA public TO mission_viewer;
GRANT SELECT ON satellites, ground_stations, mission_logs, recent_mission_logs TO mission_viewer;
-- Example: REVOKE SELECT ON mission_logs FROM mission_viewer;
