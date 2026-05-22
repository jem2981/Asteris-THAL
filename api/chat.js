import { randomUUID } from "node:crypto";
import { neon } from "@neondatabase/serverless";

const store = globalThis.__atcbChatStore ?? {
  messages: [],
  dbReady: null
};
globalThis.__atcbChatStore = store;

function send(response, status, payload) {
  response.status(status).json(payload);
}

function connectionString() {
  return process.env.NEON_DATABASE_URL || process.env.DATABASE_URL || "";
}

function db() {
  const url = connectionString();
  return url ? neon(url) : null;
}

async function ensureChatTable(sql) {
  if (!store.dbReady) {
    store.dbReady = sql`
      create table if not exists atcb_chat_messages (
        id text primary key,
        name text not null,
        text text not null,
        created_at timestamptz not null default now()
      )
    `;
  }
  await store.dbReady;
}

async function listMessages() {
  const sql = db();
  if (!sql) {
    return { storage: "memory", messages: store.messages.slice(-100) };
  }

  await ensureChatTable(sql);
  const rows = await sql`
    select id, name, text, created_at
    from atcb_chat_messages
    order by created_at desc
    limit 100
  `;

  return {
    storage: "neon",
    messages: rows.reverse().map((row) => ({
      id: row.id,
      name: row.name,
      text: row.text,
      createdAt: new Date(row.created_at).toISOString()
    }))
  };
}

async function saveMessage(message) {
  const sql = db();
  if (!sql) {
    store.messages.push(message);
    store.messages = store.messages.slice(-100);
    return { storage: "memory", message };
  }

  await ensureChatTable(sql);
  const [row] = await sql`
    insert into atcb_chat_messages (id, name, text, created_at)
    values (${message.id}, ${message.name}, ${message.text}, ${message.createdAt})
    returning id, name, text, created_at
  `;

  return {
    storage: "neon",
    message: {
      id: row.id,
      name: row.name,
      text: row.text,
      createdAt: new Date(row.created_at).toISOString()
    }
  };
}

export default function handler(request, response) {
  response.setHeader("Cache-Control", "no-store");

  if (request.method === "GET") {
    listMessages()
      .then(({ storage, messages }) => send(response, 200, { ok: true, storage, messages }))
      .catch((error) => send(response, 500, { ok: false, message: error.message || "Chat storage failed." }));
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
    saveMessage(message)
      .then(({ storage, message: savedMessage }) => send(response, 201, { ok: true, storage, message: savedMessage }))
      .catch((error) => send(response, 500, { ok: false, message: error.message || "Chat storage failed." }));
    return;
  }

  response.setHeader("Allow", "GET, POST");
  send(response, 405, { ok: false, message: "Use GET or POST." });
}
