import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth/password";
import { setSessionCookie } from "@/lib/auth/session";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, email, password, clientSalt } = body;

    if (!username || !email || !password) {
      return NextResponse.json(
        { error: "Username, email, and password are required." },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters in length." },
        { status: 400 }
      );
    }

    const cleanUser = username.trim();
    const cleanEmail = email.trim().toLowerCase();

    // Check duplicate username or email
    const existing = await prisma.user.findFirst({
      where: {
        OR: [{ username: cleanUser }, { email: cleanEmail }],
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Username or email is already registered." },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);
    const saltToStore = clientSalt || crypto.randomBytes(16).toString("hex");

    const INITIAL_CREDITS = 25;

    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          username: cleanUser,
          email: cleanEmail,
          passwordHash,
          clientSalt: saltToStore,
        },
      });

      await tx.creditAccount.create({
        data: {
          userId: newUser.id,
          balance: INITIAL_CREDITS,
          initialGrant: INITIAL_CREDITS,
        },
      });

      await tx.creditTransaction.create({
        data: {
          userId: newUser.id,
          type: "INITIAL_GRANT",
          amount: INITIAL_CREDITS,
          balanceAfter: INITIAL_CREDITS,
          reason: "New user registration welcome grant (25 free credits)",
        },
      });

      return newUser;
    });

    // Anonymized IP hash
    const ip = req.headers.get("x-forwarded-for") || "127.0.0.1";
    const ipHash = crypto.createHash("sha256").update(ip).digest("hex").slice(0, 16);

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        eventType: "AUTH_REGISTER",
        status: "SUCCESS",
        ipHash,
        details: JSON.stringify({ username: user.username, initialCredits: INITIAL_CREDITS }),
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
        credits: INITIAL_CREDITS,
      },
    });

  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Internal server registration error." },
      { status: 500 }
    );
  }
}
