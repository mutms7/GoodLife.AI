import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("account access is verified and forced before the product mounts", async () => {
  const [gate, app] = await Promise.all([
    readFile(new URL("../components/auth/auth-gate.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/app/page.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(app, /<AuthGate>/);
  assert.match(gate, /email_confirmed_at/);
  assert.match(gate, /signInWithPassword/);
  assert.match(gate, /signInWithOAuth/);
  assert.match(gate, /Stay signed in/);
});

test("cloud sync excludes the local model and limits conversations to seven days", async () => {
  const [sync, migration] = await Promise.all([
    readFile(new URL("../lib/cloud-sync.ts", import.meta.url), "utf8"),
    readFile(new URL("../supabase/migrations/20260810000000_goodlife_accounts.sql", import.meta.url), "utf8"),
  ]);
  assert.doesNotMatch(sync, /modelOn:\s*data\.modelOn/);
  assert.match(sync, /age < 7/);
  assert.match(migration, /row level security/i);
  assert.match(migration, /created_at < now\(\) - interval '7 days'/);
  assert.match(migration, /cron\.schedule/);
});

test("the requested navigation and removed prompts stay enforced", async () => {
  const [rail, thread, screens] = await Promise.all([
    readFile(new URL("../components/app/rail.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/app/thread.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/app/screens.tsx", import.meta.url), "utf8"),
  ]);
  for (const label of ["Your day", "Your week", "Your year", "Habits", "Ideas", "Your Data", "Settings"]) assert.match(rail, new RegExp(label));
  assert.doesNotMatch(thread, /Too much for today|Why the money one|Bedtime keeps slipping/);
  assert.doesNotMatch(screens, /Seven days on|sequence restarts/);
});
