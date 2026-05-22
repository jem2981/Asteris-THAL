import { createHmac, timingSafeEqual } from "node:crypto";

const COOKIE_NAME = "atcb_ray_deliverables";
const REMEMBER_SECONDS = 60 * 60 * 24 * 30;

function normalizeAccessCode(value) {
  return value
    .normalize("NFKC")
    .replace(/[\u2010-\u2015\u2212]/g, "-")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .trim()
    .toLowerCase();
}

function files() {
  return [
    {
      label: "ATCB v0.3 Service Package",
      href: "/deliverables/ray/ATCB-v0.3-continuity-governance-service.zip",
      description: "Newest standalone continuity-governance service package. Use this first."
    },
    {
      label: "ATCB v0.2 Review Package",
      href: "/deliverables/ray/ATCB-v0.2-review-hardened-package.zip",
      description: "Current hardened review package. Newest version; use this first."
    },
    {
      label: "ATCB v0.1 Baseline Package",
      href: "/deliverables/ray/ATCB-v0.1-baseline-review-packet.zip",
      description: "Historical MVP baseline package retained for traceability."
    },
    {
      label: "Setup Guide",
      href: "/deliverables/ray/Ray-Asteris-Setup-Guide.pdf",
      description: "Short guide for opening the review page and package files."
    },
    {
      label: "System Package Compatibility Copy",
      href: "/deliverables/ray/Ray-Asteris-System-Package.zip",
      description: "Compatibility copy of the current ATCB v0.2 review package."
    },
    {
      label: "Release Notes",
      href: "/deliverables/ray/Release-Notes.txt",
      description: "Plain-language notes for this handoff."
    }
  ];
}

function signRememberToken(expiresAt, secret) {
  return createHmac("sha256", secret).update(`ray:${expiresAt}`).digest("base64url");
}

function rememberCookie(secret) {
  const expiresAt = Date.now() + REMEMBER_SECONDS * 1000;
  const signature = signRememberToken(expiresAt, secret);
  return `${COOKIE_NAME}=${expiresAt}.${signature}; Max-Age=${REMEMBER_SECONDS}; Path=/; HttpOnly; Secure; SameSite=Lax`;
}

function clearRememberCookie() {
  return `${COOKIE_NAME}=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax`;
}

function cookieValue(request) {
  const cookieHeader = request.headers.cookie || "";
  const match = cookieHeader
    .split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${COOKIE_NAME}=`));
  return match ? decodeURIComponent(match.slice(COOKIE_NAME.length + 1)) : "";
}

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function hasValidRememberCookie(request, secret) {
  if (!secret) return false;
  const value = cookieValue(request);
  const [expiresAtText, signature] = value.split(".");
  const expiresAt = Number(expiresAtText);
  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now() || !signature) return false;
  return safeEqual(signature, signRememberToken(expiresAt, secret));
}

export default function handler(request, response) {
  const rememberSecret = process.env.DELIVERABLES_RAY_REMEMBER_SECRET;

  if (request.method === "GET") {
    if (!hasValidRememberCookie(request, rememberSecret)) {
      response.status(401).json({ ok: false, remembered: false, message: "Access code required." });
      return;
    }
    response.status(200).json({ ok: true, remembered: true, files: files() });
    return;
  }

  if (request.method === "DELETE") {
    response.setHeader("Set-Cookie", clearRememberCookie());
    response.status(200).json({ ok: true, remembered: false });
    return;
  }

  if (request.method !== "POST") {
    response.setHeader("Allow", "GET, POST, DELETE");
    response.status(405).json({ ok: false, message: "Use GET, POST, or DELETE." });
    return;
  }

  const configuredCode = process.env.DELIVERABLES_RAY_ACCESS_CODE;
  if (!configuredCode) {
    response.status(503).json({ ok: false, message: "Access code is not configured yet." });
    return;
  }

  const providedCode = typeof request.body?.accessCode === "string" ? request.body.accessCode : "";
  if (normalizeAccessCode(providedCode) !== normalizeAccessCode(configuredCode)) {
    response.status(401).json({ ok: false, message: "That code did not work. Please try again." });
    return;
  }

  const rememberDevice = request.body?.rememberDevice === true;
  if (rememberDevice && rememberSecret) {
    response.setHeader("Set-Cookie", rememberCookie(rememberSecret));
  }

  response.status(200).json({
    ok: true,
    remembered: rememberDevice && Boolean(rememberSecret),
    files: files()
  });
}
