import { LocalAdapter } from "./local-adapter";
import { PostgresAdapter } from "./postgres-adapter";
import type { Repository } from "./types";

const localAdapter = new LocalAdapter();

export async function createServerAdapter(): Promise<Repository> {
  if (process.env.DB_HOST && process.env.DB_NAME) return new FallbackAdapter(new PostgresAdapter(), localAdapter);
  return localAdapter;
}

class FallbackAdapter implements Repository {
  constructor(private readonly primary: Repository, private readonly fallback: Repository) {}
  private async withFallback<T>(operation: (adapter: Repository) => Promise<T>): Promise<T> {
    try { return await operation(this.primary); } catch { return operation(this.fallback); }
  }
  businesses = { create: (input: Parameters<Repository["businesses"]["create"]>[0]) => this.withFallback((a) => a.businesses.create(input)), getById: (id: string) => this.withFallback((a) => a.businesses.getById(id)) };
  uploads = { create: (input: Parameters<Repository["uploads"]["create"]>[0]) => this.withFallback((a) => a.uploads.create(input)) };
  analyses = { create: (input: Parameters<Repository["analyses"]["create"]>[0]) => this.withFallback((a) => a.analyses.create(input)) };
  reports = { create: (input: Parameters<Repository["reports"]["create"]>[0]) => this.withFallback((a) => a.reports.create(input)), getByPublicCode: (code: string) => this.withFallback((a) => a.reports.getByPublicCode(code)) };
  aiCache = { get: (key: string) => this.withFallback((a) => a.aiCache.get(key)), set: (key: string, value: Parameters<Repository["aiCache"]["set"]>[1]) => this.withFallback((a) => a.aiCache.set(key, value)) };
}
