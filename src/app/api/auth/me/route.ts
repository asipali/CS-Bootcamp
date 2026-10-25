import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getSessionUser(req);
  if (!session) {
    return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      username: true,
      email: true,
      clientSalt: true,
      createdAt: true,
      creditAccount: {
        select: {
          balance: true,
          initialGrant: true,
        },
      },
    },
  });

  if (!user) {
    return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
  }

  const credits = user.creditAccount ? user.creditAccount.balance : 25;

  return NextResponse.json({
    authenticated: true,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      clientSalt: user.clientSalt,
      createdAt: user.createdAt,
      credits,
    },
  });

}
