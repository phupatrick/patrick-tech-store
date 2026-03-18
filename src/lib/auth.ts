import { createHmac, timingSafeEqual } from "node:crypto";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { getAccessCodeById, verifyManagedAccessCode } from "@/lib/access-codes";
import { AuthSession } from "@/lib/types";

export const AUTH_SESSION_COOKIE_NAME = "pts_admin_session";
export const FIXED_ADMIN_CODE = process.env.FIXED_ADMIN_CODE ?? "Phu@209202";

const SESSION_SECRET = process.env.AUTH_SESSION_SECRET ?? "patrick-tech-store-local-session-secret";

const createSessionSignature = (payload: string) =>
  createHmac("sha256", SESSION_SECRET).update(payload).digest("base64url");

const encodeSession = (session: AuthSession) => {
  const payload = Buffer.from(JSON.stringify(session), "utf8").toString("base64url");
  const signature = createSessionSignature(payload);
  return `${payload}.${signature}`;
};

const decodeSession = (value: string) => {
  const [payload, signature] = value.split(".");

  if (!payload || !signature) {
    return undefined;
  }

  const expectedSignature = createSessionSignature(payload);
  const expectedBuffer = Buffer.from(expectedSignature, "utf8");
  const actualBuffer = Buffer.from(signature, "utf8");

  if (expectedBuffer.length !== actualBuffer.length || !timingSafeEqual(expectedBuffer, actualBuffer)) {
    return undefined;
  }

  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as AuthSession;
  } catch {
    return undefined;
  }
};

export const createAuthSession = async (session: AuthSession) => {
  const cookieStore = await cookies();
  cookieStore.set(AUTH_SESSION_COOKIE_NAME, encodeSession(session), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/"
  });
};

export const clearAuthSession = async () => {
  const cookieStore = await cookies();
  cookieStore.set(AUTH_SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
    path: "/"
  });
};

export const getAuthSession = async () => {
  const cookieStore = await cookies();
  const value = cookieStore.get(AUTH_SESSION_COOKIE_NAME)?.value;

  if (!value) {
    return undefined;
  }

  const session = decodeSession(value);

  if (!session) {
    return undefined;
  }

  if (session.fixed) {
    return session;
  }

  const accessCode = getAccessCodeById(session.subject);

  if (!accessCode || !accessCode.active || accessCode.role !== session.role) {
    return undefined;
  }

  return {
    subject: accessCode.id,
    role: accessCode.role,
    label: accessCode.label,
    tier: accessCode.tier,
    points: accessCode.points,
    vip: accessCode.vip
  } satisfies AuthSession;
};

export const getAdminUser = async () => {
  const session = await getAuthSession();

  if (!session || !["admin", "deputy_admin", "staff"].includes(session.role)) {
    return undefined;
  }

  return session;
};

export const authenticateWithAccessCode = async (code: string) => {
  const normalizedCode = code.trim();

  if (!normalizedCode) {
    return undefined;
  }

  if (normalizedCode === FIXED_ADMIN_CODE) {
    const session: AuthSession = {
      subject: "fixed-admin",
      role: "admin",
      label: "Quan tri vien he thong",
      tier: "guest",
      points: 0,
      vip: false,
      fixed: true
    };

    await createAuthSession(session);
    return session;
  }

  const accessCode = verifyManagedAccessCode(normalizedCode);

  if (!accessCode) {
    return undefined;
  }

  const session: AuthSession = {
    subject: accessCode.id,
    role: accessCode.role,
    label: accessCode.label,
    tier: accessCode.tier,
    points: accessCode.points,
    vip: accessCode.vip
  };

  await createAuthSession(session);
  return session;
};

export const requireAdminUser = async (nextPath = "/admin/products") => {
  const session = await getAdminUser();

  if (!session) {
    redirect(`/admin/login?next=${encodeURIComponent(nextPath)}`);
  }

  return session;
};

export const requireAdminRole = async (nextPath = "/admin/access-codes") => {
  const session = await getAuthSession();

  if (!session || !["admin", "deputy_admin"].includes(session.role)) {
    redirect(`/admin/login?next=${encodeURIComponent(nextPath)}`);
  }

  return session;
};
