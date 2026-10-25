import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";

const SESSION_SECRET_KEY = new TextEncoder().encode(
  process.env.SESSION_SECRET || "default-dev-secret-ciphervault-32-bytes!"
);

const SESSION_COOKIE_NAME = "cvault_session";
const SESSION_DURATION = 24 * 60 * 60; // 24 hours in seconds

export interface SessionPayload {
  userId: string;
  username: string;
  email: string;
}

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION}s`)
    .sign(SESSION_SECRET_KEY);
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SESSION_SECRET_KEY, {
      algorithms: ["HS256"],
    });
    return {
      userId: payload.userId as string,
      username: payload.username as string,
      email: payload.email as string,
    };
  } catch {
    return null;
  }
}

export async function setSessionCookie(payload: SessionPayload): Promise<void> {
  const token = await createSessionToken(payload);
  const cookieStore = cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: SESSION_DURATION,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function getSessionUser(req?: NextRequest): Promise<SessionPayload | null> {
  let token: string | undefined;

  if (req) {
    token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  } else {
    const cookieStore = cookies();
    token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  }

  if (!token) return null;
  return await verifySessionToken(token);
}
