import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { serverStorage } from "@/lib/storage/local-storage";
import crypto from "crypto";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSessionUser(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
  }

  const { id } = params;
  const ip = req.headers.get("x-forwarded-for") || "127.0.0.1";
  const ipHash = crypto.createHash("sha256").update(ip).digest("hex").slice(0, 16);

  const fileRecord = await prisma.fileRecord.findUnique({
    where: { id },
  });

  if (!fileRecord) {
    return NextResponse.json({ error: "File not found." }, { status: 404 });
  }

  // Strict user isolation check (IDOR protection)
  if (fileRecord.userId !== session.userId) {
    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        eventType: "ACCESS_DENIED",
        status: "FAILED",
        ipHash,
        details: JSON.stringify({ attemptedFileId: id, action: "DOWNLOAD" }),
      },
    });
    return NextResponse.json(
      { error: "Forbidden: You do not have permission to download this file." },
      { status: 403 }
    );
  }

  try {
    const fileBuffer = await serverStorage.readFile(fileRecord.storageId);

    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        eventType: "VAULT_DOWNLOAD",
        status: "SUCCESS",
        ipHash,
        details: JSON.stringify({ fileId: id, sizeBytes: fileBuffer.length }),
      },
    });

    return new Response(new Uint8Array(fileBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(fileRecord.originalName)}.cvault"`,
        "X-Ciphertext-Hash": fileRecord.fileHashSha256,
        "X-Original-Name": encodeURIComponent(fileRecord.originalName),
        "X-Mime-Type": fileRecord.mimeType,
      },
    });
  } catch (error) {
    console.error("Download error:", error);
    return NextResponse.json({ error: "Failed to read encrypted file." }, { status: 500 });
  }
}
