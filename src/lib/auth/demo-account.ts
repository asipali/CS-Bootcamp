import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth/password";
import crypto from "crypto";

export const DEMO_CONFIG = {
  EMAIL: "demo@ciphervault.local",
  USERNAME: "demo_user",
  PASSWORD: "DemoVault@2026!",
  INITIAL_CREDITS: 100,
  ALLOW_PUBLIC_DEMO: process.env.NEXT_PUBLIC_ENABLE_DEMO !== "false", // enabled by default in dev
};

/**
 * Ensures the restricted demonstration account exists in the database.
 * Idempotent: does not overwrite existing files or modify existing user data.
 */
export async function ensureDemoAccount() {
  const existing = await prisma.user.findFirst({
    where: {
      OR: [{ email: DEMO_CONFIG.EMAIL }, { username: DEMO_CONFIG.USERNAME }],
    },
    include: { creditAccount: true },
  });

  if (existing) {
    // If user exists but creditAccount missing, provision it
    if (!existing.creditAccount) {
      await prisma.creditAccount.create({
        data: {
          userId: existing.id,
          balance: DEMO_CONFIG.INITIAL_CREDITS,
          initialGrant: DEMO_CONFIG.INITIAL_CREDITS,
        },
      });
      await prisma.creditTransaction.create({
        data: {
          userId: existing.id,
          type: "INITIAL_GRANT",
          amount: DEMO_CONFIG.INITIAL_CREDITS,
          balanceAfter: DEMO_CONFIG.INITIAL_CREDITS,
          reason: "Demo evaluation grant (100 credits)",
        },
      });
    }
    return existing;
  }

  const passwordHash = await hashPassword(DEMO_CONFIG.PASSWORD);
  const clientSalt = crypto.randomBytes(16).toString("hex");

  const demoUser = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        username: DEMO_CONFIG.USERNAME,
        email: DEMO_CONFIG.EMAIL,
        passwordHash,
        clientSalt,
      },
    });

    await tx.creditAccount.create({
      data: {
        userId: user.id,
        balance: DEMO_CONFIG.INITIAL_CREDITS,
        initialGrant: DEMO_CONFIG.INITIAL_CREDITS,
      },
    });

    await tx.creditTransaction.create({
      data: {
        userId: user.id,
        type: "INITIAL_GRANT",
        amount: DEMO_CONFIG.INITIAL_CREDITS,
        balanceAfter: DEMO_CONFIG.INITIAL_CREDITS,
        reason: "Demo evaluation grant (100 credits)",
      },
    });

    return user;
  });

  return demoUser;
}
