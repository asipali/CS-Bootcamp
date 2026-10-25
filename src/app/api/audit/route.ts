import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getSessionUser(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
  }

  const logs = await prisma.auditLog.findMany({
    where: { userId: session.userId },
    orderBy: { timestamp: "desc" },
    take: 100,
    select: {
      id: true,
      eventType: true,
      status: true,
      ipHash: true,
      details: true,
      timestamp: true,
    },
  });

  return NextResponse.json({ logs });
}
