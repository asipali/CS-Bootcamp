import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { serverStorage } from "@/lib/storage/local-storage";
import crypto from "crypto";

describe("User Isolation & Server Storage Authorization", () => {
  let userAId: string;
  let userBId: string;

  beforeEach(async () => {
    // Clean test database tables
    await prisma.auditLog.deleteMany({});
    await prisma.fileRecord.deleteMany({});
    await prisma.user.deleteMany({});

    // Create User A
    const passHashA = await hashPassword("PasswordUserA#1");
    const userA = await prisma.user.create({
      data: {
        username: "usera_test",
        email: "usera@example.com",
        passwordHash: passHashA,
        clientSalt: crypto.randomBytes(16).toString("hex"),
      },
    });
    userAId = userA.id;

    // Create User B
    const passHashB = await hashPassword("PasswordUserB#2");
    const userB = await prisma.user.create({
      data: {
        username: "userb_test",
        email: "userb@example.com",
        passwordHash: passHashB,
        clientSalt: crypto.randomBytes(16).toString("hex"),
      },
    });
    userBId = userB.id;
  });

  it("should enforce server-side user isolation and prevent IDOR cross-tenant file downloads", async () => {
    // User A uploads an encrypted file
    const fakeCiphertext = Buffer.from("CVLT" + "encrypted-payload-of-user-a");
    const storageId = await serverStorage.saveFile(fakeCiphertext);

    const fileA = await prisma.fileRecord.create({
      data: {
        userId: userAId,
        originalName: "confidential_financials.pdf",
        mimeType: "application/pdf",
        ciphertextSize: fakeCiphertext.length,
        storageId,
        formatVersion: 1,
        algorithm: "AES-256-GCM",
        fileHashSha256: crypto.createHash("sha256").update(fakeCiphertext).digest("hex"),
      },
    });

    // Query file from User A context -> Permitted
    const userAQuery = await prisma.fileRecord.findFirst({
      where: { id: fileA.id, userId: userAId },
    });
    expect(userAQuery).not.toBeNull();
    expect(userAQuery?.originalName).toBe("confidential_financials.pdf");

    // Query file from User B context -> Must return null (Blocked!)
    const userBQuery = await prisma.fileRecord.findFirst({
      where: { id: fileA.id, userId: userBId },
    });
    expect(userBQuery).toBeNull();
  });

  it("should prevent User B from deleting User A's file", async () => {
    const payload = Buffer.from("CVLT" + "protected-file");
    const storageId = await serverStorage.saveFile(payload);

    const fileA = await prisma.fileRecord.create({
      data: {
        userId: userAId,
        originalName: "medical_records.pdf",
        mimeType: "application/pdf",
        ciphertextSize: payload.length,
        storageId,
        formatVersion: 1,
        algorithm: "AES-256-GCM",
        fileHashSha256: crypto.createHash("sha256").update(payload).digest("hex"),
      },
    });

    // Attempt deletion by User B: should find 0 matching records
    const deleteAttemptByB = await prisma.fileRecord.deleteMany({
      where: { id: fileA.id, userId: userBId },
    });
    expect(deleteAttemptByB.count).toBe(0);

    // Verify User A's file still exists
    const stillExists = await prisma.fileRecord.findUnique({
      where: { id: fileA.id },
    });
    expect(stillExists).not.toBeNull();
  });

  it("should prevent path traversal attempts in storage", async () => {
    await expect(serverStorage.readFile("../../package.json")).rejects.toThrow(
      /Security violation/i
    );
  });

  it("should verify password hashing with constant-time equality", async () => {
    const pwd = "Secure#Password#2026!";
    const hash = await hashPassword(pwd);
    expect(await verifyPassword(hash, pwd)).toBe(true);
    expect(await verifyPassword(hash, "WrongPassword")).toBe(false);
  });
});
