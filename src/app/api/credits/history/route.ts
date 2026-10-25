import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getSessionUser(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
  }

  const creditAccount = await prisma.creditAccount.findUnique({
    where: { userId: session.userId },
  });

  const transactions = await prisma.creditTransaction.findMany({
    where: { userId: session.userId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const balance = creditAccount ? creditAccount.balance : 25;
  const initialGrant = creditAccount ? creditAccount.initialGrant : 25;

  // Calculate total consumed
  const totalConsumed = transactions
    .filter((t) => t.type === "USAGE_DEDUCTION")
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  return NextResponse.json({
    balance,
    initialGrant,
    totalConsumed,
    transactions,
  });
}
