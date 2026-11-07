import { createId, createPublicCode, nowIso } from "./ids";
import type { Analysis, Business, JsonValue, Report, Repository, Upload } from "./types";

const STORAGE_PREFIX = "naik-in:data:";
const SERVER_STORE_KEY = "__naikInServerLocalStore";
const DATABASE_NAME = "naik-in";
const DATABASE_VERSION = 1;
const OBJECT_STORE = "records";
const OBJECT_KEY = "store";

type Store = {
  businesses: Business[];
  uploads: Upload[];
  analyses: Analysis[];
  reports: Report[];
  aiCache: Record<string, JsonValue>;
};

const emptyStore = (): Store => ({ businesses: [], uploads: [], analyses: [], reports: [], aiCache: {} });

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof indexedDB !== "undefined";
}

function browserStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB tidak tersedia."));
    request.onupgradeneeded = () => request.result.createObjectStore(OBJECT_STORE);
    request.onsuccess = () => resolve(request.result);
  });
}

const serverStore = (): Store => {
  const globalStore = globalThis as typeof globalThis & { [SERVER_STORE_KEY]?: Store };
  globalStore[SERVER_STORE_KEY] ??= emptyStore();
  return globalStore[SERVER_STORE_KEY];
};

async function browserRead(): Promise<Store> {
  try {
    const database = await openDatabase();
    const value = await new Promise<Store | undefined>((resolve, reject) => {
      const request = database.transaction(OBJECT_STORE, "readonly").objectStore(OBJECT_STORE).get(OBJECT_KEY);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result as Store | undefined);
    });
    database.close();
    if (value) return { ...emptyStore(), ...value, aiCache: value.aiCache ?? {} };
  } catch {
  }
  const storage = browserStorage();
  if (!storage) return emptyStore();
  const raw = storage.getItem(`${STORAGE_PREFIX}records`);
  if (!raw) return emptyStore();
  try {
    const parsed = JSON.parse(raw) as Partial<Store>;
    return { ...emptyStore(), ...parsed, aiCache: parsed.aiCache ?? {} };
  } catch {
    storage.removeItem(`${STORAGE_PREFIX}records`);
    return emptyStore();
  }
}

async function browserWrite(store: Store): Promise<void> {
  try {
    const database = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const request = database.transaction(OBJECT_STORE, "readwrite").objectStore(OBJECT_STORE).put(store, OBJECT_KEY);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
    database.close();
    return;
  } catch {
  }
  const storage = browserStorage();
  if (!storage) throw new Error("Penyimpanan lokal tidak tersedia di perangkat ini.");
  storage.setItem(`${STORAGE_PREFIX}records`, JSON.stringify(store));
}

export class LocalAdapter implements Repository {
  private readonly server = !isBrowser();

  private async read(): Promise<Store> {
    return this.server ? serverStore() : browserRead();
  }

  private async write(store: Store): Promise<void> {
    if (this.server) return;
    await browserWrite(store);
  }

  private async update<T>(operation: (store: Store) => T): Promise<T> {
    const store = await this.read();
    const result = operation(store);
    await this.write(store);
    return result;
  }

  businesses = {
    create: async (input: Parameters<Repository["businesses"]["create"]>[0]): Promise<Business> => this.update((store) => {
      const item: Business = { ...input, id: input.id ?? createId(), dibuat: input.dibuat ?? nowIso() };
      store.businesses.push(item);
      return item;
    }),
    getById: async (id: string) => {
      const store = await this.read();
      return store.businesses.find((item) => item.id === id) ?? null;
    },
  };

  uploads = {
    create: async (input: Parameters<Repository["uploads"]["create"]>[0]): Promise<Upload> => this.update((store) => {
      const item: Upload = { ...input, id: input.id ?? createId(), dibuat: input.dibuat ?? nowIso() };
      store.uploads.push(item);
      return item;
    }),
  };

  analyses = {
    create: async (input: Parameters<Repository["analyses"]["create"]>[0]): Promise<Analysis> => this.update((store) => {
      const item: Analysis = { ...input, id: input.id ?? createId(), dibuat: input.dibuat ?? nowIso() };
      store.analyses.push(item);
      return item;
    }),
  };

  reports = {
    create: async (input: Parameters<Repository["reports"]["create"]>[0]): Promise<Report> => this.update((store) => {
      const item: Report = { ...input, id: input.id ?? createId(), kodePublik: input.kodePublik || createPublicCode(), dibuat: input.dibuat ?? nowIso() };
      store.reports.push(item);
      return item;
    }),
    getByPublicCode: async (kodePublik: string) => {
      const store = await this.read();
      return store.reports.find((item) => item.kodePublik === kodePublik) ?? null;
    },
  };

  aiCache = {
    get: async (key: string): Promise<JsonValue | null> => {
      const store = await this.read();
      return store.aiCache[key] ?? null;
    },
    set: async (key: string, value: JsonValue): Promise<void> => {
      await this.update((store) => {
        store.aiCache[key] = value;
      });
    },
  };
}
