import * as SQLite from 'expo-sqlite';
import { ContactRecord, EventRecord, PatternRecord, SensorLogRecord } from '../types';

const dbName = 'safeband.db';

class DatabaseService {
  private db: SQLite.SQLiteDatabase | null = null;

  async init() {
    if (this.db) return;
    this.db = await SQLite.openDatabaseAsync(dbName);
    await this.setupDatabase();
  }

  private async setupDatabase() {
    if (!this.db) return;

    await this.db.execAsync(`
      PRAGMA journal_mode = WAL;
      
      CREATE TABLE IF NOT EXISTS events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp INTEGER NOT NULL,
        anomaly_score REAL,
        confidence INTEGER,
        duration_ms INTEGER,
        motion_pattern TEXT,
        threat_score REAL,
        threat_level TEXT,
        outcome TEXT,
        location_lat REAL,
        location_lng REAL,
        location_label TEXT,
        user_activity TEXT,
        raw_packet_hex TEXT,
        created_at INTEGER DEFAULT (strftime('%s','now'))
      );

      CREATE TABLE IF NOT EXISTS contacts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        phone TEXT NOT NULL,
        email TEXT,
        notify_methods TEXT,
        has_app INTEGER DEFAULT 0,
        verified INTEGER DEFAULT 0,
        priority INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS sensor_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_id INTEGER REFERENCES events(id),
        timestamp INTEGER,
        ax INTEGER, ay INTEGER, az INTEGER,
        gx INTEGER, gy INTEGER, gz INTEGER,
        resultant INTEGER,
        jerk INTEGER,
        anomaly_score INTEGER
      );

      CREATE TABLE IF NOT EXISTS pattern_library (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_id INTEGER REFERENCES events(id),
        anomaly_score REAL,
        dominant_freq REAL,
        zcr REAL,
        spectral_entropy REAL,
        eigenvalue_ratio REAL,
        motion_flags INTEGER,
        outcome TEXT,
        similarity_weight REAL DEFAULT 1.0
      );
    `);
  }

  // ---- Events ----
  async insertEvent(event: EventRecord): Promise<number> {
    if (!this.db) await this.init();
    const result = await this.db!.runAsync(
      `INSERT INTO events (timestamp, anomaly_score, confidence, duration_ms, motion_pattern, threat_score, threat_level, outcome, location_lat, location_lng, location_label, raw_packet_hex) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        event.timestamp, event.anomaly_score, event.confidence, event.duration_ms, 
        event.motion_pattern, event.threat_score, event.threat_level, event.outcome, 
        event.location_lat ?? null, event.location_lng ?? null, event.location_label ?? null, 
        event.raw_packet_hex ?? null
      ]
    );
    return result.lastInsertRowId;
  }

  async updateEventOutcome(eventId: number, outcome: string, userActivity?: string) {
    if (!this.db) await this.init();
    await this.db!.runAsync(
      `UPDATE events SET outcome = ?, user_activity = ? WHERE id = ?`,
      [outcome, userActivity ?? null, eventId]
    );
  }

  async getRecentEvents(limit: number = 50): Promise<EventRecord[]> {
    if (!this.db) await this.init();
    return await this.db!.getAllAsync<EventRecord>('SELECT * FROM events ORDER BY timestamp DESC LIMIT ?', [limit]);
  }

  // ---- Contacts ----
  async insertContact(contact: ContactRecord): Promise<number> {
    if (!this.db) await this.init();
    const result = await this.db!.runAsync(
      `INSERT INTO contacts (name, phone, email, notify_methods, has_app, verified, priority) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [contact.name, contact.phone, contact.email ?? null, contact.notify_methods, contact.has_app ? 1 : 0, contact.verified ? 1 : 0, contact.priority]
    );
    return result.lastInsertRowId;
  }

  async getAllContacts(): Promise<ContactRecord[]> {
    if (!this.db) await this.init();
    const records = await this.db!.getAllAsync<any>('SELECT * FROM contacts ORDER BY priority ASC');
    return records.map(r => ({
      ...r,
      has_app: r.has_app === 1,
      verified: r.verified === 1
    }));
  }

  // ---- Pattern Library ----
  async insertPattern(pattern: PatternRecord): Promise<number> {
    if (!this.db) await this.init();
    const result = await this.db!.runAsync(
      `INSERT INTO pattern_library (event_id, anomaly_score, dominant_freq, zcr, spectral_entropy, eigenvalue_ratio, motion_flags, outcome, similarity_weight)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        pattern.event_id ?? null, pattern.anomaly_score, pattern.dominant_freq, pattern.zcr,
        pattern.spectral_entropy, pattern.eigenvalue_ratio, pattern.motion_flags, pattern.outcome, pattern.similarity_weight
      ]
    );
    return result.lastInsertRowId;
  }

  async getPatternLibrary(): Promise<PatternRecord[]> {
    if (!this.db) await this.init();
    return await this.db!.getAllAsync<PatternRecord>('SELECT * FROM pattern_library');
  }

  // ---- Sensor Logs ----
  async insertSensorLog(log: SensorLogRecord): Promise<number> {
    if (!this.db) await this.init();
    const result = await this.db!.runAsync(
      `INSERT INTO sensor_logs (event_id, timestamp, ax, ay, az, gx, gy, gz, resultant, jerk, anomaly_score)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        log.event_id ?? null, log.timestamp, log.ax, log.ay, log.az,
        log.gx, log.gy, log.gz, log.resultant, log.jerk, log.anomaly_score
      ]
    );
    return result.lastInsertRowId;
  }
}

export const dbService = new DatabaseService();
