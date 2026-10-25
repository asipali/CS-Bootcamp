import { NextRequest, NextResponse } from "next/server";
import { clearSessionCookie, getSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  const session = await getSessionUser(req);
  if (session) {
    const ip = req.headers.get("x-forwarded-for") || "127.0.0.1";
    const ipHash = crypto.createHash("sha256").update(ip).digest("hex").slice(0, 16);
    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        eventType: "AUTH_LOGOUT",
        status: "SUCCESS",
        ipHash,
      },
    });
  }
  await clearSessionCookie();
  return NextResponse.json({ success: true });
}
