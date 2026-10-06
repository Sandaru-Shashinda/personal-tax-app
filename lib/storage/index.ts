import "server-only";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { env } from "@/lib/env";

/** Private object storage. Keys are opaque and never derived from user input. */
export interface StorageProvider {
  put(key: string, data: Buffer): Promise<void>;
  get(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
}

/**
 * Stores files on local disk outside the web root. Suitable for a single server; swap in an
 * S3-compatible provider behind the same interface for anything larger.
 */
class LocalDiskStorage implements StorageProvider {
  private resolve(key: string): string {
    if (!/^[a-f0-9-]+\/[a-f0-9-]+$/.test(key)) throw new Error("Invalid storage key");
    return path.join(path.resolve(env().STORAGE_DIR), key);
  }

  async put(key: string, data: Buffer): Promise<void> {
    const file = this.resolve(key);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, data, { flag: "wx" });
  }

  get(key: string): Promise<Buffer> {
    return readFile(this.resolve(key));
  }

  async delete(key: string): Promise<void> {
    await rm(this.resolve(key), { force: true });
  }
}

const provider: StorageProvider = new LocalDiskStorage();

export function storage(): StorageProvider {
  return provider;
}
