import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getSessionUser(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
  }

  const files = await prisma.fileRecord.findMany({
    where: { userId: session.userId },
    select: {
      id: true,
      originalName: true,
      mimeType: true,
      ciphertextSize: true,
      formatVersion: true,
      algorithm: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ files });
}
