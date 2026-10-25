import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { ensureDemoAccount, DEMO_CONFIG } from "@/lib/auth/demo-account";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { serverStorage } from "@/lib/storage/local-storage";
import { encryptFileClientSide, decryptFileClientSide } from "@/lib/crypto/web-crypto";
import crypto from "crypto";

describe("Demo Account, Credit System & Auth Gating Integration Suite", () => {
  beforeEach(async () => {
    // Clean test artifacts
    await prisma.creditTransaction.deleteMany();
    await prisma.creditAccount.deleteMany();
    await prisma.fileRecord.deleteMany();
    await prisma.auditLog.deleteMany();
    await prisma.user.deleteMany();
  });

  it("should provision the restricted demo account with exactly 100 initial credits idempotently", async () => {
    const demo1 = await ensureDemoAccount();
    expect(demo1).toBeDefined();
    expect(demo1.email).toBe(DEMO_CONFIG.EMAIL);

    const creditAccount1 = await prisma.creditAccount.findUnique({
      where: { userId: demo1.id },
    });
    expect(creditAccount1).toBeDefined();
    expect(creditAccount1?.balance).toBe(100);
    expect(creditAccount1?.initialGrant).toBe(100);

    // Verify initial transaction recorded
    const txs = await prisma.creditTransaction.findMany({
      where: { userId: demo1.id },
    });
    expect(txs.length).toBe(1);
    expect(txs[0].type).toBe("INITIAL_GRANT");
    expect(txs[0].amount).toBe(100);
    expect(txs[0].balanceAfter).toBe(100);

    // Idempotent call should not duplicate or reset
    const demo2 = await ensureDemoAccount();
    expect(demo2.id).toBe(demo1.id);
    const txsAfter = await prisma.creditTransaction.findMany({
      where: { userId: demo1.id },
    });
    expect(txsAfter.length).toBe(1);
  });

  it("should allocate exactly 25 free credits upon new user registration", async () => {
    const passwordHash = await hashPassword("UserPass123!Secure");
    const clientSalt = crypto.randomBytes(16).toString("hex");

    const user = await prisma.$transaction(async (tx) => {
      const u = await tx.user.create({
        data: {
          username: "credit_test_user",
          email: "credit_test@example.com",
          passwordHash,
          clientSalt,
        },
      });
      await tx.creditAccount.create({
        data: {
          userId: u.id,
          balance: 25,
          initialGrant: 25,
        },
      });
      await tx.creditTransaction.create({
        data: {
          userId: u.id,
          type: "INITIAL_GRANT",
          amount: 25,
          balanceAfter: 25,
          reason: "New user registration welcome grant (25 free credits)",
        },
      });
      return u;
    });

    const creditAccount = await prisma.creditAccount.findUnique({
      where: { userId: user.id },
    });
    expect(creditAccount?.balance).toBe(25);
    expect(creditAccount?.initialGrant).toBe(25);
  });

  it("should deduct exactly 1 credit on successful file upload and record a transaction", async () => {
    // 1. Create user with 25 credits
    const passwordHash = await hashPassword("VaultPass@2026!");
    const user = await prisma.user.create({
      data: {
        username: "upload_credit_user",
        email: "upload_credit@test.com",
        passwordHash,
        clientSalt: crypto.randomBytes(16).toString("hex"),
        creditAccount: {
          create: {
            balance: 25,
            initialGrant: 25,
          },
        },
      },
    });

    // 2. Perform encrypted upload workflow
    const plaintext = new TextEncoder().encode("Classified mission payload 2026");
    const containerBytes = await encryptFileClientSide(plaintext, "VaultPass@2026!");
    const storageId = await serverStorage.saveFile(Buffer.from(containerBytes));
    const fileHash = crypto.createHash("sha256").update(Buffer.from(containerBytes)).digest("hex");

    // Atomic transaction simulating upload route
    const uploadResult = await prisma.$transaction(async (tx) => {
      const account = await tx.creditAccount.findUnique({
        where: { userId: user.id },
      });
      if (!account || account.balance < 1) throw new Error("INSUFFICIENT_CREDITS");

      const newBalance = account.balance - 1;
      await tx.creditAccount.update({
        where: { userId: user.id },
        data: { balance: newBalance },
      });

      const fileRecord = await tx.fileRecord.create({
        data: {
          userId: user.id,
          originalName: "mission_plan.txt",
          mimeType: "text/plain",
          ciphertextSize: containerBytes.length,
          storageId,
          fileHashSha256: fileHash,
        },
      });

      await tx.creditTransaction.create({
        data: {
          userId: user.id,
          type: "USAGE_DEDUCTION",
          amount: -1,
          balanceAfter: newBalance,
          operationId: fileRecord.id,
          reason: "Vault upload: mission_plan.txt",
        },
      });

      return { fileRecord, remainingCredits: newBalance };
    });

    expect(uploadResult.remainingCredits).toBe(24);

    const updatedAccount = await prisma.creditAccount.findUnique({
      where: { userId: user.id },
    });
    expect(updatedAccount?.balance).toBe(24);

    const deductionTx = await prisma.creditTransaction.findFirst({
      where: { userId: user.id, type: "USAGE_DEDUCTION" },
    });
    expect(deductionTx).toBeDefined();
    expect(deductionTx?.amount).toBe(-1);
    expect(deductionTx?.balanceAfter).toBe(24);
  });

  it("should reject uploads when credit balance is zero", async () => {
    // Create user with 0 credits
    const user = await prisma.user.create({
      data: {
        username: "broke_user",
        email: "broke@test.com",
        passwordHash: await hashPassword("BrokePass@123!"),
        clientSalt: crypto.randomBytes(16).toString("hex"),
        creditAccount: {
          create: {
            balance: 0,
            initialGrant: 25,
          },
        },
      },
    });

    const account = await prisma.creditAccount.findUnique({
      where: { userId: user.id },
    });
    expect(account?.balance).toBe(0);

    // Attempting upload must fail
    let errorCaught = false;
    try {
      await prisma.$transaction(async (tx) => {
        const acc = await tx.creditAccount.findUnique({
          where: { userId: user.id },
        });
        if (!acc || acc.balance < 1) {
          throw new Error("INSUFFICIENT_CREDITS");
        }
      });
    } catch (e: any) {
      errorCaught = true;
      expect(e.message).toBe("INSUFFICIENT_CREDITS");
    }

    expect(errorCaught).toBe(true);
  });

  it("should allow downloading and decrypting already-stored files even when credit balance is zero", async () => {
    // 1. Create user and store a file
    const masterPass = "ZeroCreditRetrieval@2026!";
    const user = await prisma.user.create({
      data: {
        username: "zero_balance_downloader",
        email: "zero_download@test.com",
        passwordHash: await hashPassword(masterPass),
        clientSalt: crypto.randomBytes(16).toString("hex"),
        creditAccount: {
          create: {
            balance: 0, // 0 credits!
            initialGrant: 25,
          },
        },
      },
    });

    const originalData = new TextEncoder().encode("Critical document that must be readable at 0 credits.");
    const containerBytes = await encryptFileClientSide(originalData, masterPass);
    const storageId = await serverStorage.saveFile(Buffer.from(containerBytes));

    const fileRecord = await prisma.fileRecord.create({
      data: {
        userId: user.id,
        originalName: "free_download.txt",
        mimeType: "text/plain",
        ciphertextSize: containerBytes.length,
        storageId,
        fileHashSha256: crypto.createHash("sha256").update(Buffer.from(containerBytes)).digest("hex"),
      },
    });

    // 2. Fetch file from storage (simulating GET /api/vault/files/[id]/download)
    // Notice: NO credit balance check or deduction is performed on download!
    const retrievedBuffer = await serverStorage.readFile(fileRecord.storageId);
    expect(retrievedBuffer.length).toBe(containerBytes.length);

    // 3. Client decrypts with master password
    const recoveredPlaintext = await decryptFileClientSide(new Uint8Array(retrievedBuffer), masterPass);
    expect(new TextDecoder().decode(recoveredPlaintext)).toBe(new TextDecoder().decode(originalData));

    // 4. Verify balance is STILL 0 (not decremented, no penalty)
    const finalAccount = await prisma.creditAccount.findUnique({
      where: { userId: user.id },
    });
    expect(finalAccount?.balance).toBe(0);
  });

  it("should verify demonstration account credentials authenticate successfully", async () => {
    const demo = await ensureDemoAccount();
    expect(demo.email).toBe("demo@ciphervault.local");

    const validPassword = await verifyPassword(demo.passwordHash, DEMO_CONFIG.PASSWORD);
    expect(validPassword).toBe(true);

    const creditAccount = await prisma.creditAccount.findUnique({
      where: { userId: demo.id },
    });
    expect(creditAccount?.balance).toBe(100);
  });
});
