DROP VIEW IF EXISTS recent_mission_logs;
DROP TABLE IF EXISTS mission_logs, ground_stations, satellites CASCADE;
CREATE TABLE satellites (
 satellite_id SERIAL PRIMARY KEY, satellite_name VARCHAR(60) NOT NULL,
 platform VARCHAR(30) NOT NULL, deployment_status VARCHAR(30) NOT NULL DEFAULT 'Awaiting deployment',
 battery_percent INTEGER NOT NULL CHECK(battery_percent BETWEEN 0 AND 100),
 link_quality INTEGER NOT NULL CHECK(link_quality BETWEEN 0 AND 100),
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE ground_stations (
 station_id SERIAL PRIMARY KEY, station_name VARCHAR(80) NOT NULL,
 location VARCHAR(100) NOT NULL, operator_name VARCHAR(80),
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE mission_logs (
 log_id SERIAL PRIMARY KEY,
 satellite_id INTEGER NOT NULL REFERENCES satellites(satellite_id) ON DELETE CASCADE,
 station_id INTEGER REFERENCES ground_stations(station_id) ON DELETE SET NULL,
 log_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 data_type VARCHAR(30) NOT NULL CHECK(data_type IN ('TT&C / Housekeeping','SSTV Image','M17 Voice','Codec2 Voice','Deployment Confirmation')),
 priority VARCHAR(15) NOT NULL CHECK(priority IN ('Critical','High','Normal','Low')),
 communication_mode VARCHAR(20) NOT NULL CHECK(communication_mode IN ('TT&C','SSTV','M17','Codec2','Beacon')),
 battery_percent INTEGER NOT NULL CHECK(battery_percent BETWEEN 0 AND 100),
 link_quality INTEGER NOT NULL CHECK(link_quality BETWEEN 0 AND 100),
 packet_size_kb NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK(packet_size_kb>=0),
 status VARCHAR(20) NOT NULL CHECK(status IN ('Queued','Transmitted','Received','Failed')), notes TEXT
);
CREATE VIEW recent_mission_logs AS
SELECT ml.log_id,ml.log_time,s.satellite_name,gs.station_name,ml.data_type,ml.priority,ml.communication_mode,
ml.battery_percent,ml.link_quality,ml.packet_size_kb,ml.status,ml.notes
FROM mission_logs ml JOIN satellites s ON s.satellite_id=ml.satellite_id
LEFT JOIN ground_stations gs ON gs.station_id=ml.station_id;
CREATE INDEX idx_mission_logs_time ON mission_logs(log_time DESC);
CREATE INDEX idx_mission_logs_status ON mission_logs(status);
INSERT INTO satellites(satellite_name,platform,deployment_status,battery_percent,link_quality)
VALUES('SomaiyaSat','PocketQube','Commissioning',86,72);
INSERT INTO ground_stations(station_name,location,operator_name)
VALUES('Somaiya Ground Station','Mumbai, India','Mission Operations');
INSERT INTO mission_logs(satellite_id,station_id,data_type,priority,communication_mode,battery_percent,link_quality,packet_size_kb,status,notes) VALUES
(1,1,'Deployment Confirmation','Critical','Beacon',86,72,1.20,'Received','Simulated deployment confirmation record.'),
(1,1,'TT&C / Housekeeping','Critical','TT&C',84,75,0.80,'Received','Simulated battery and housekeeping packet.'),
(1,1,'SSTV Image','High','SSTV',80,61,48.00,'Queued','Demo image packet awaiting a simulated ground pass.');
