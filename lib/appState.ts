import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { RoadrAppState } from '@/types';

const EMPTY_STATE: RoadrAppState = {
  vehicles: [],
  activeVehicleId: null,
  savedPlaces: [],
  recordedRoutes: [],
};

declare global {
  // eslint-disable-next-line no-var
  var roadrDatabase: Database.Database | undefined;
}

function getDatabase(): Database.Database {
  if (globalThis.roadrDatabase) return globalThis.roadrDatabase;
  const databasePath = process.env.ROADR_DB_PATH || path.join(process.cwd(), 'data', 'roadr.sqlite');
  fs.mkdirSync(path.dirname(databasePath), { recursive: true });
  const database = new Database(databasePath);
  database.pragma('journal_mode = WAL');
  database.exec(`
    CREATE TABLE IF NOT EXISTS app_state (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      payload TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
  globalThis.roadrDatabase = database;
  return database;
}

function normaliseState(value: unknown): RoadrAppState {
  if (!value || typeof value !== 'object') return EMPTY_STATE;
  const candidate = value as Partial<RoadrAppState>;
  return {
    vehicles: Array.isArray(candidate.vehicles) ? candidate.vehicles : [],
    activeVehicleId: typeof candidate.activeVehicleId === 'string' ? candidate.activeVehicleId : null,
    savedPlaces: Array.isArray(candidate.savedPlaces) ? candidate.savedPlaces : [],
    recordedRoutes: Array.isArray(candidate.recordedRoutes) ? candidate.recordedRoutes : [],
  };
}

export function readAppState(): RoadrAppState {
  const row = getDatabase().prepare('SELECT payload FROM app_state WHERE id = 1').get() as { payload?: string } | undefined;
  if (!row?.payload) return EMPTY_STATE;
  try {
    return normaliseState(JSON.parse(row.payload));
  } catch {
    return EMPTY_STATE;
  }
}

export function writeAppState(nextState: RoadrAppState): RoadrAppState {
  const state = normaliseState(nextState);
  getDatabase().prepare(`
    INSERT INTO app_state (id, payload, updated_at) VALUES (1, ?, ?)
    ON CONFLICT(id) DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at
  `).run(JSON.stringify(state), new Date().toISOString());
  return state;
}
