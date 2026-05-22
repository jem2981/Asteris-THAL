function normalizeAccessCode(value) {
  return value
    .normalize("NFKC")
    .replace(/[\u2010-\u2015\u2212]/g, "-")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .trim()
    .toLowerCase();
}

export default function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    response.status(405).json({ ok: false, message: "Use POST." });
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

  response.status(200).json({
    ok: true,
    files: [
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
    ]
  });
}
