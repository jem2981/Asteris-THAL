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
  if (providedCode.trim() !== configuredCode) {
    response.status(401).json({ ok: false, message: "That code did not work. Please try again." });
    return;
  }

  response.status(200).json({
    ok: true,
    files: [
      {
        label: "Setup Guide",
        href: "/deliverables/ray/Ray-Asteris-Setup-Guide.pdf"
      },
      {
        label: "System Package",
        href: "/deliverables/ray/Ray-Asteris-System-Package.zip"
      },
      {
        label: "Release Notes",
        href: "/deliverables/ray/Release-Notes.txt"
      }
    ]
  });
}
