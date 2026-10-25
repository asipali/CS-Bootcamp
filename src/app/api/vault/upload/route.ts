import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { serverStorage } from "@/lib/storage/local-storage";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  const session = await getSessionUser(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const originalName = (formData.get("originalName") as string) || "unnamed_file";
    const mimeType = (formData.get("mimeType") as string) || "application/octet-stream";

    if (!file) {
      return NextResponse.json({ error: "No file payload provided." }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Validate binary format header (must start with ASCII "CVLT")
    if (buffer.length < 93 || buffer.subarray(0, 4).toString("ascii") !== "CVLT") {
      return NextResponse.json(
        { error: "Invalid encrypted file container. Must be a valid .cvault binary format." },
        { status: 400 }
      );
    }

    // Compute SHA-256 of the stored ciphertext container
    const fileHashSha256 = crypto.createHash("sha256").update(buffer).digest("hex");

    // 1. Verify user's credit balance before allocating storage or record
    const creditAccount = await prisma.creditAccount.findUnique({
      where: { userId: session.userId },
    });

    const currentBalance = creditAccount ? creditAccount.balance : 0;
    if (currentBalance < 1) {
      return NextResponse.json(
        {
          error:
            "Insufficient demo credits. You need at least 1 credit to encrypt and upload a file. Free features (Crypto Lab, existing file decryption) remain available.",
          balance: currentBalance,
        },
        { status: 402 }
      );
    }

    // 2. Save blob to server storage using generated UUID
    const storageId = await serverStorage.saveFile(buffer);

    // 3. Atomically record file, deduct 1 credit, log transaction, and audit
    const ip = req.headers.get("x-forwarded-for") || "127.0.0.1";
    const ipHash = crypto.createHash("sha256").update(ip).digest("hex").slice(0, 16);

    const result = await prisma.$transaction(async (tx) => {
      // Re-check balance inside transaction for race-condition protection
      const account = await tx.creditAccount.findUnique({
        where: { userId: session.userId },
      });

      if (!account || account.balance < 1) {
        throw new Error("INSUFFICIENT_CREDITS");
      }

      const updatedBalance = account.balance - 1;

      // Update credit balance
      await tx.creditAccount.update({
        where: { userId: session.userId },
        data: { balance: updatedBalance },
      });

      // Create file record
      const fileRecord = await tx.fileRecord.create({
        data: {
          userId: session.userId,
          originalName: originalName.slice(0, 255),
          mimeType: mimeType.slice(0, 100),
          ciphertextSize: buffer.length,
          storageId,
          formatVersion: 1,
          algorithm: "AES-256-GCM",
          fileHashSha256,
        },
      });

      // Record credit deduction transaction
      await tx.creditTransaction.create({
        data: {
          userId: session.userId,
          type: "USAGE_DEDUCTION",
          amount: -1,
          balanceAfter: updatedBalance,
          operationId: fileRecord.id,
          reason: `Vault upload: ${originalName.slice(0, 50)}`,
        },
      });

      // Record audit log
      await tx.auditLog.create({
        data: {
          userId: session.userId,
          eventType: "VAULT_UPLOAD",
          status: "SUCCESS",
          ipHash,
          details: JSON.stringify({
            fileId: fileRecord.id,
            sizeBytes: buffer.length,
            fileHash: fileHashSha256,
            creditDeducted: 1,
            remainingCredits: updatedBalance,
          }),
        },
      });

      return { fileRecord, remainingCredits: updatedBalance };
    });

    return NextResponse.json({
      success: true,
      file: {
        id: result.fileRecord.id,
        originalName: result.fileRecord.originalName,
        ciphertextSize: result.fileRecord.ciphertextSize,
        createdAt: result.fileRecord.createdAt,
      },
      remainingCredits: result.remainingCredits,
    });
  } catch (error: any) {
    if (error?.message === "INSUFFICIENT_CREDITS") {
      return NextResponse.json(
        { error: "Insufficient demo credits. Concurrent request limit reached." },
        { status: 402 }
      );
    }
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Failed to store encrypted file." }, { status: 500 });
  }

}
