import { randomUUID } from "node:crypto";

const store = globalThis.__atcbChatStore ?? {
  messages: []
};
globalThis.__atcbChatStore = store;

function send(response, status, payload) {
  response.status(status).json(payload);
}

export default function handler(request, response) {
  response.setHeader("Cache-Control", "no-store");

  if (request.method === "GET") {
    send(response, 200, {
      ok: true,
      messages: store.messages.slice(-100)
    });
    return;
  }

  if (request.method === "POST") {
    const name = typeof request.body?.name === "string" ? request.body.name.trim().slice(0, 40) : "";
    const text = typeof request.body?.text === "string" ? request.body.text.trim().slice(0, 1000) : "";
    if (!name || !text) {
      send(response, 400, { ok: false, message: "Name and message are required." });
      return;
    }
    const message = {
      id: randomUUID(),
      name,
      text,
      createdAt: new Date().toISOString()
    };
    store.messages.push(message);
    store.messages = store.messages.slice(-100);
    send(response, 201, { ok: true, message });
    return;
  }

  response.setHeader("Allow", "GET, POST");
  send(response, 405, { ok: false, message: "Use GET or POST." });
}
