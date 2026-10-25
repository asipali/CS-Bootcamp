import fs from "fs";
import path from "path";
import crypto from "crypto";

const DEFAULT_STORAGE_DIR = path.resolve(process.env.STORAGE_DIR || "./storage/vault");
const MAX_FILE_SIZE_BYTES = (parseInt(process.env.MAX_FILE_SIZE_MB || "50", 10)) * 1024 * 1024;

export class ServerVaultStorage {
  private baseDir: string;

  constructor(baseDir: string = DEFAULT_STORAGE_DIR) {
    this.baseDir = path.resolve(baseDir);
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  private resolveSafePath(storageId: string): string {
    // Validate UUID format to prevent path traversal
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(storageId)) {
      throw new Error(`Security violation: Invalid storage ID format '${storageId}'.`);
    }

    const resolved = path.resolve(this.baseDir, `${storageId}.cvault`);
    if (!resolved.startsWith(this.baseDir + path.sep) && resolved !== this.baseDir) {
      throw new Error("Security violation: Path traversal attempt detected.");
    }
    return resolved;
  }

  async saveFile(buffer: Buffer): Promise<string> {
    if (buffer.length > MAX_FILE_SIZE_BYTES) {
      throw new Error(
        `File exceeds configured maximum upload size of ${MAX_FILE_SIZE_BYTES / (1024 * 1024)} MB.`
      );
    }

    const storageId = crypto.randomUUID();
    const targetPath = this.resolveSafePath(storageId);

    // Atomic write using temporary file
    const tempPath = `${targetPath}.tmp.${Date.now()}`;
    await fs.promises.writeFile(tempPath, buffer);
    await fs.promises.rename(tempPath, targetPath);

    return storageId;
  }

  async readFile(storageId: string): Promise<Buffer> {
    const targetPath = this.resolveSafePath(storageId);
    if (!fs.existsSync(targetPath)) {
      throw new Error(`Encrypted file not found.`);
    }
    return await fs.promises.readFile(targetPath);
  }

  async deleteFile(storageId: string): Promise<boolean> {
    const targetPath = this.resolveSafePath(storageId);
    if (fs.existsSync(targetPath)) {
      await fs.promises.unlink(targetPath);
      return true;
    }
    return false;
  }
}

export const serverStorage = new ServerVaultStorage();
