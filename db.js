// db.js — Wrapper IndexedDB (offline-first). Stores do MVP SwimBase (PDR-SwimBase §2.2).
// Versão do schema: 1. Ao alterar índices/stores, incremente DB_VERSION e migre em onupgradeneeded.

const DB_NAME = "pbtracker-swimbase";
const DB_VERSION = 1;

export const STORES = {
  ATHLETES: "atletas",
  GROUPS: "turmas",
  RECORDS: "registros",
  PRS: "prs",
  SETTINGS: "settings",
};

let dbPromise = null;

function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      if (!db.objectStoreNames.contains(STORES.ATHLETES)) {
        const store = db.createObjectStore(STORES.ATHLETES, { keyPath: "id" });
        store.createIndex("turmaId", "turmaId", { unique: false });
        store.createIndex("nomeNormalized", "nomeNormalized", { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.GROUPS)) {
        const store = db.createObjectStore(STORES.GROUPS, { keyPath: "id" });
        store.createIndex("professorId", "professorId", { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.RECORDS)) {
        const store = db.createObjectStore(STORES.RECORDS, { keyPath: "id" });
        store.createIndex("atletaId", "atletaId", { unique: false });
        store.createIndex("dataHora", "dataHora", { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.PRS)) {
        const store = db.createObjectStore(STORES.PRS, { keyPath: "id" });
        store.createIndex("atletaId", "atletaId", { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.SETTINGS)) {
        db.createObjectStore(STORES.SETTINGS, { keyPath: "key" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return dbPromise;
}

function withStore(storeName, mode, fn) {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, mode);
        const store = tx.objectStore(storeName);
        const request = fn(store);
        tx.oncomplete = () => resolve(request && request.result);
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      })
  );
}

export function getAll(storeName) {
  return withStore(storeName, "readonly", (store) => store.getAll());
}

export function get(storeName, key) {
  return withStore(storeName, "readonly", (store) => store.get(key));
}

export function getByIndex(storeName, indexName, value) {
  return withStore(storeName, "readonly", (store) =>
    store.index(indexName).getAll(value)
  );
}

export function put(storeName, value) {
  return withStore(storeName, "readwrite", (store) => store.put(value));
}

export function putAll(storeName, values) {
  return withStore(storeName, "readwrite", (store) => {
    values.forEach((value) => store.put(value));
    return Promise.resolve(values.length);
  });
}

export function remove(storeName, key) {
  return withStore(storeName, "readwrite", (store) => store.delete(key));
}

export function clear(storeName) {
  return withStore(storeName, "readwrite", (store) => store.clear());
}

export function getSetting(key, fallback = null) {
  return get(STORES.SETTINGS, key).then((entry) =>
    entry ? entry.value : fallback
  );
}

export function setSetting(key, value) {
  return put(STORES.SETTINGS, { key, value });
}