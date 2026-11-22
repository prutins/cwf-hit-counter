// Super-basic hit counter for Cloudflare Workers, backed by a SQLite Durable Object.
//
//   GET /            -> increments the "default" counter, returns the new count
//   GET /?page=home  -> increments the "home" counter
//   GET /?page=home&peek=1 -> returns the count without incrementing
//
// Each page name maps to its own Durable Object instance. An object handles one
// request at a time and the increment is a single SQL statement, so counts are
// exact even under concurrent traffic.

import { DurableObject } from "cloudflare:workers";

export class Counter extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.ctx.storage.sql.exec(
      "CREATE TABLE IF NOT EXISTS counter (id INTEGER PRIMARY KEY CHECK (id = 1), hits INTEGER NOT NULL)",
    );
  }

  increment() {
    return this.ctx.storage.sql
      .exec(
        `INSERT INTO counter (id, hits) VALUES (1, 1)
         ON CONFLICT (id) DO UPDATE SET hits = hits + 1
         RETURNING hits`,
      )
      .one().hits;
  }

  peek() {
    const rows = this.ctx.storage.sql.exec("SELECT hits FROM counter WHERE id = 1").toArray();
    return rows.length ? rows[0].hits : 0;
  }
}

export default {
  async fetch(request, env) {
    if (request.method !== "GET") {
      return new Response("Method not allowed", { status: 405 });
    }

    const url = new URL(request.url);
    if (url.pathname !== "/") {
      return new Response("Not found", { status: 404 });
    }

    // Keep names tidy and bounded: letters, digits, dash, underscore, max 64 chars.
    const page = url.searchParams.get("page") || "default";
    if (page.length > 64 || !/^[\w-]+$/.test(page)) {
      return new Response("Invalid page name", { status: 400 });
    }

    const counter = env.COUNTER.getByName(page);
    const hits = url.searchParams.has("peek") ? await counter.peek() : await counter.increment();

    return Response.json(
      { page, hits },
      { headers: { "Cache-Control": "no-store", "Access-Control-Allow-Origin": "*" } },
    );
  },
};
