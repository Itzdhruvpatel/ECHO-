// Recorded fights live in IndexedDB so the Echo keeps learning across sessions.
// Works in the page and in the training worker.

import type { FighterId } from '../core/data.ts';

export interface MatchRecord {
  id?: number;
  fighter: FighterId; // who the player used
  opponent: FighterId;
  at: number;
  won: boolean;
  x: number[]; // flattened feature rows
  y: number[]; // action labels, one per row
}

const DB = 'echo', STORE = 'matches';

function open(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}

function run<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return open().then(db => new Promise<T>((res, rej) => {
    const req = fn(db.transaction(STORE, mode).objectStore(STORE));
    req.onsuccess = () => { res(req.result); db.close(); };
    req.onerror = () => { rej(req.error); db.close(); };
  }));
}

export const saveMatch = (m: MatchRecord) => run('readwrite', s => s.add(m));
export const allMatches = () => run<MatchRecord[]>('readonly', s => s.getAll());
export const clearMatches = () => run('readwrite', s => s.clear());
