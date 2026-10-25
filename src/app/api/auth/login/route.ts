import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth/password";
import { setSessionCookie } from "@/lib/auth/session";
import { ensureDemoAccount, DEMO_CONFIG } from "@/lib/auth/demo-account";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: "Username and password are required." },
        { status: 400 }
      );
    }

    const cleanUser = username.trim();
    if (
      cleanUser.toLowerCase() === DEMO_CONFIG.EMAIL.toLowerCase() ||
      cleanUser === DEMO_CONFIG.USERNAME
    ) {
      await ensureDemoAccount();
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [{ username: cleanUser }, { email: cleanUser.toLowerCase() }],
      },
    });

    const ip = req.headers.get("x-forwarded-for") || "127.0.0.1";
    const ipHash = crypto.createHash("sha256").update(ip).digest("hex").slice(0, 16);

    if (!user) {
      await prisma.auditLog.create({
        data: {
          eventType: "AUTH_LOGIN",
          status: "FAILED",
          ipHash,
          details: JSON.stringify({ reason: "User not found" }),
        },
      });
      return NextResponse.json(
        { error: "Invalid username or password." },
        { status: 401 }
      );
    }

    const isValid = await verifyPassword(user.passwordHash, password);
    if (!isValid) {
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          eventType: "AUTH_LOGIN",
          status: "FAILED",
          ipHash,
          details: JSON.stringify({ reason: "Password mismatch" }),
        },
      });
      return NextResponse.json(
        { error: "Invalid username or password." },
        { status: 401 }
      );
    }

    // Fetch or provision credit account
    let creditAccount = await prisma.creditAccount.findUnique({
      where: { userId: user.id },
    });

    if (!creditAccount) {
      creditAccount = await prisma.creditAccount.create({
        data: {
          userId: user.id,
          balance: 25,
          initialGrant: 25,
        },
      });
      await prisma.creditTransaction.create({
        data: {
          userId: user.id,
          type: "INITIAL_GRANT",
          amount: 25,
          balanceAfter: 25,
          reason: "Default free credit grant",
        },
      });
    }

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        eventType: "AUTH_LOGIN",
        status: "SUCCESS",
        ipHash,
      },
    });

    await setSessionCookie({
      userId: user.id,
      username: user.username,
      email: user.email,
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        clientSalt: user.clientSalt,
        credits: creditAccount.balance,
      },
    });

  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Internal server login error." },
      { status: 500 }
    );
  }
}
