import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { conversationLabel, dayStarter, responseTitle } from "../lib/conversation-ui.ts";

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

test("conversation labels use the coach's first response", () => {
  const msgs = [
    { isUser: true, text: "Why is bedtime difficult?" },
    { isUser: false, text: "Start by making the first step much smaller than usual tonight." },
    { isUser: false, text: "A later answer should not rename it." },
  ];
  assert.equal(responseTitle(msgs), "Start by making the first step much…");
  assert.equal(conversationLabel({ id: "1", date: "2026-08-10", title: "Why is bedtime difficult?", msgs }), "Start by making the first step much…");
  assert.equal(responseTitle([{ isUser: true, text: "Still waiting" }]), "New conversation");
});

test("the daily starter reflects the active habit count", () => {
  assert.match(dayStarter("Morning", 3), /All three/);
  assert.match(dayStarter("Morning", 2), /two small habits/);
  assert.match(dayStarter("Morning", 1), /one small habit/);
  assert.match(dayStarter("Morning", 0), /don't have any active habits/);
});
