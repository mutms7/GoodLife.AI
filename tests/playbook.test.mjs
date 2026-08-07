import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fallbackTopic, findTopic, noteFor, parsePlaybook, readTopicChoice, topicMenu } from "../lib/playbook.ts";

const source = await readFile(new URL("../lib/playbook.md", import.meta.url), "utf8");
const topics = parsePlaybook(source);

test("the real playbook parses into topics", () => {
  assert.ok(topics.length >= 8, "expected the shipped topics");
  assert.deepEqual(
    topics.map((topic) => topic.id),
    ["crisis", "distress", "money", "health", "housing", "habits", "relationships", "meaning", "general"],
  );
  // The documentation above the first heading is not a topic.
  assert.equal(findTopic(topics, "coach playbook"), undefined);
});

test("every topic is usable: a description, and notes unless it has a fixed reply", () => {
  for (const topic of topics) {
    assert.ok(topic.when.length > 10, `${topic.id} needs a real When: line`);
    assert.ok(topic.notes.length > 0 || topic.fixedReply, `${topic.id} needs notes or a fixed reply`);
  }
  assert.ok(fallbackTopic(topics));
  assert.equal(fallbackTopic(topics).id, "general");
});

test("the menu the model chooses from is one line per topic", () => {
  const lines = topicMenu(topics).split("\n");
  assert.equal(lines.length, topics.length);
  for (const line of lines) assert.match(line, /^[a-z]+: .+/);
});

test("crisis is the only fixed reply, and it carries the numbers", () => {
  const fixed = topics.filter((topic) => topic.fixedReply);
  assert.equal(fixed.length, 1);
  assert.equal(fixed[0].id, "crisis");
  assert.match(fixed[0].fixedReply, /988/);
  assert.match(fixed[0].fixedReply, /emergency/i);
});

test("nothing in the playbook matches phrases any more", () => {
  // The floor under the model is gone on purpose. If a `Safety net:` or
  // `Except:` line ever comes back into the markdown, it is dead text that
  // reads like a guarantee, which is worse than not having it. Catch it here.
  assert.doesNotMatch(source, /^\s*(?:safety net|except)\s*:/im);
  for (const topic of topics) {
    assert.deepEqual(Object.keys(topic).filter((key) => /safety|except/i.test(key)), []);
  }
});

test("crisis is reachable only by the model naming it", () => {
  // Routing is the model's whole job now, so the thing that has to hold is
  // that a topic answer of "crisis" still lands on the fixed reply.
  const crisis = findTopic(topics, "crisis");
  assert.ok(crisis.fixedReply, "crisis still sends fixed text rather than a generation");
  assert.match(crisis.fixedReply, /988/);
  assert.equal(readTopicChoice(topics, "crisis").id, "crisis");
  assert.equal(readTopicChoice(topics, "The topic is crisis.").id, "crisis");
});

test("the crisis When: line is doing the work the phrase list used to", () => {
  const crisis = findTopic(topics, "crisis");
  // It is the only description the model gets, so it has to cover the indirect
  // phrasings and say which way to err against distress.
  assert.match(crisis.when, /suicide/i);
  assert.match(crisis.when, /self-harm|hurt themselves/i);
  assert.match(crisis.when, /slang|indirect/i);
  assert.match(crisis.when, /any doubt/i);
});

test("reading the model's topic answer tolerates a chatty small model", () => {
  assert.equal(readTopicChoice(topics, "money").id, "money");
  assert.equal(readTopicChoice(topics, "  Money  ").id, "money");
  assert.equal(readTopicChoice(topics, "The topic is health.").id, "health");
  assert.equal(readTopicChoice(topics, "housing\n").id, "housing");
});

test("an unusable topic answer falls back to general, never to no notes", () => {
  for (const answer of ["banana", "", "habits or meaning", "I'm not sure"]) {
    const topic = readTopicChoice(topics, answer);
    assert.equal(topic.id, "general", answer);
    assert.ok(topic.notes.length > 0, "the fallback still carries notes");
  }
});

test("the topics that need a disclaimer append one verbatim", () => {
  for (const id of ["distress", "money", "health", "housing"]) {
    const topic = findTopic(topics, id);
    assert.ok(topic.sayAfter && topic.sayAfter.length > 20, `${id} needs a Say after:`);
  }
  assert.equal(findTopic(topics, "habits").sayAfter, undefined);
  assert.match(findTopic(topics, "money").sayAfter, /general education/i);
  assert.match(findTopic(topics, "distress").sayAfter, /qualified professional|crisis line/i);
});

test("the notes forbid the things a small model should never say", () => {
  const money = findTopic(topics, "money").notes.join(" ");
  assert.match(money, /never name a specific security/i);
  assert.match(money, /never predict a return/i);

  const health = findTopic(topics, "health").notes.join(" ");
  assert.match(health, /never diagnose/i);
  // The line moved from "never mention a medication" to "never suggest they
  // take one", so the note has to carry the narrower rule, not just the word.
  assert.match(health, /suggesting they take one is not/i);
  assert.match(health, /a dose never is/i);

  const distress = findTopic(topics, "distress").notes.join(" ");
  assert.match(distress, /do not diagnose/i);

  assert.match(findTopic(topics, "housing").notes.join(" "), /never tell them which one to pick/i);
});

test("every reply carries a routing note that says where it came from", () => {
  assert.match(noteFor(findTopic(topics, "money"), "model"), /grounded in reviewed money guidance/i);
  assert.match(noteFor(findTopic(topics, "distress"), "model"), /grounded in/i);
  assert.match(noteFor(findTopic(topics, "general"), "model"), /local model/i);
  // The note has to stop claiming the model wasn't involved, because routing
  // here is now the only thing the model did.
  assert.match(noteFor(findTopic(topics, "crisis"), "crisis"), /model read this as crisis language/i);
  assert.match(noteFor(findTopic(topics, "crisis"), "crisis"), /not something the model wrote/i);
  assert.match(noteFor(undefined, "model-off"), /isn't running/i);
  assert.match(noteFor(undefined, "model-failed"), /try again/i);
  assert.match(noteFor(undefined, "model-blocked"), /recommending a medication/i);
});

test("the playbook copy follows the house style", () => {
  const copy = topics.flatMap((topic) => [...topic.notes, topic.when, topic.sayAfter ?? "", topic.fixedReply ?? ""]).join(" ");
  assert.doesNotMatch(copy, new RegExp(String.fromCodePoint(0x2014)));
  assert.doesNotMatch(copy, /!/);
  assert.doesNotMatch(copy, /delve|crucial|it(?:'|’)s important to note/i);
});

test("the parser survives a hand-edited file", () => {
  const edited = parsePlaybook([
    "# notes above the first heading are ignored",
    "",
    "## cooking",
    "When:   they're asking about food or what to make  ",
    "Say after: Not a nutritionist.",
    "",
    "-  Pick one meal and repeat it. ",
    "- Keep the ingredients visible.",
    "",
    "## general",
    "When: anything else",
    "- Ask one specific question.",
  ].join("\n"));
  assert.deepEqual(edited.map((topic) => topic.id), ["cooking", "general"]);
  assert.deepEqual(edited[0].notes, ["Pick one meal and repeat it.", "Keep the ingredients visible."]);
  assert.equal(edited[0].sayAfter, "Not a nutritionist.");
  // A topic with no When: line is skipped rather than offered to the model.
  assert.equal(parsePlaybook("## broken\n- a note").length, 0);
});
