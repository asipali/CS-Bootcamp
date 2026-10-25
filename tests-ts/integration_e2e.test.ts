import { describe, it, expect, beforeEach } from "vitest";
import { encryptFileClientSide, decryptFileClientSide } from "@/lib/crypto/web-crypto";
import { prisma } from "@/lib/prisma";
import { serverStorage } from "@/lib/storage/local-storage";
import crypto from "crypto";

describe("Phase 3 - Full Stack Multi-Format Integration Suite", () => {
  let userId: string;
  const masterKey = "Phase3_MasterKey#2026!";

  beforeEach(async () => {
    await prisma.fileRecord.deleteMany({});
    await prisma.auditLog.deleteMany({});
    await prisma.user.deleteMany({});

    const user = await prisma.user.create({
      data: {
        username: "e2e_tester",
        email: "e2e@example.com",
        passwordHash: "$dummy_hash",
        clientSalt: crypto.randomBytes(16).toString("hex"),
      },
    });
    userId = user.id;
  });

  it("should encrypt, store, retrieve, and decrypt various file formats with exact SHA-256 matches", async () => {
    const fileFixtures = [
      {
        name: "test_doc.txt",
        mime: "text/plain",
        bytes: new TextEncoder().encode("CipherVault 2.0 Integration Test Document Text Content."),
      },
      {
        name: "test_report.pdf",
        mime: "application/pdf",
        bytes: new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37, ...new Array(2048).fill(0x41)]),
      },
      {
        name: "test_archive.docx",
        mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        bytes: new Uint8Array([0x50, 0x4b, 0x03, 0x04, ...new Array(1024).fill(0x5a)]),
      },
      {
        name: "test_image.png",
        mime: "image/png",
        bytes: new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, ...new Array(4096).fill(0x88)]),
      },
      {
        name: "test_empty.bin",
        mime: "application/octet-stream",
        bytes: new Uint8Array(0),
      },
    ];

    for (const fixture of fileFixtures) {
      const originalSha256 = crypto.createHash("sha256").update(fixture.bytes).digest("hex");

      // 1. Client-Side Encryption
      const containerBytes = await encryptFileClientSide(fixture.bytes, masterKey);
      expect(containerBytes.length).toBeGreaterThanOrEqual(93);

      // 2. Server Storage
      const storageId = await serverStorage.saveFile(Buffer.from(containerBytes));
      const fileRecord = await prisma.fileRecord.create({
        data: {
          userId,
          originalName: fixture.name,
          mimeType: fixture.mime,
          ciphertextSize: containerBytes.length,
          storageId,
          formatVersion: 1,
          algorithm: "AES-256-GCM",
          fileHashSha256: crypto.createHash("sha256").update(containerBytes).digest("hex"),
        },
      });

      // 3. Retrieval
      const fetchedRecord = await prisma.fileRecord.findFirst({
        where: { id: fileRecord.id, userId },
      });
      expect(fetchedRecord).not.toBeNull();

      const retrievedBlob = await serverStorage.readFile(fetchedRecord!.storageId);
      expect(retrievedBlob.length).toBe(containerBytes.length);

      // 4. Client-Side Decryption
      const decryptedBytes = await decryptFileClientSide(new Uint8Array(retrievedBlob), masterKey);
      const decryptedSha256 = crypto.createHash("sha256").update(decryptedBytes).digest("hex");

      // 5. Verification
      expect(decryptedSha256).toBe(originalSha256);
      expect(decryptedBytes.length).toBe(fixture.bytes.length);
    }
  });
});
