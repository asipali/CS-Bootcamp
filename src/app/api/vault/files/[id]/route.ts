import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { serverStorage } from "@/lib/storage/local-storage";
import crypto from "crypto";

export async function DELETE(
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

  // Strict user isolation check
  if (fileRecord.userId !== session.userId) {
    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        eventType: "ACCESS_DENIED",
        status: "FAILED",
        ipHash,
        details: JSON.stringify({ attemptedFileId: id, action: "DELETE" }),
      },
    });
    return NextResponse.json({ error: "Forbidden: You do not own this file." }, { status: 403 });
  }

  try {
    // Delete blob from storage
    await serverStorage.deleteFile(fileRecord.storageId);

    // Delete record from database
    await prisma.fileRecord.delete({
      where: { id },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        eventType: "VAULT_DELETE",
        status: "SUCCESS",
        ipHash,
        details: JSON.stringify({ fileId: id }),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete error:", error);
    return NextResponse.json({ error: "Failed to delete file." }, { status: 500 });
  }
}
