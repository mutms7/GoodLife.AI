import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fallbackTopic, findTopic, matchSafetyNet, noteFor, parsePlaybook, readTopicChoice, topicMenu } from "../lib/playbook.ts";

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

test("the safety net catches the obvious phrasings without the model", () => {
  const caught = [
    "I want to kill myself",
    "I've been thinking about suicide",
    "there's no point in living",
    "kms",
    "I want to die",
    "everyone would be better off without me",
    "I've been thinking about unaliving myself",
    "I don't want to be here anymore",
  ];
  for (const message of caught) {
    assert.equal(matchSafetyNet(topics, message)?.id, "crisis", message);
  }
});

test("the safety net does not fire on idioms or on ordinary words", () => {
  for (const message of ["this commute is killing me", "I feel lonely", "my kmsomething broke", "the cake was to die for"]) {
    assert.equal(matchSafetyNet(topics, message), undefined, message);
  }
});

test("Except: cancels a hit and hands the call back to the model", () => {
  // "want to die" is on the net, but these are idioms, so the model decides.
  assert.equal(matchSafetyNet(topics, "I want to die of embarrassment when I present"), undefined);
  assert.equal(matchSafetyNet(topics, "I nearly died laughing"), undefined);
  // The plain phrasing still trips it.
  assert.equal(matchSafetyNet(topics, "I want to die")?.id, "crisis");
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

test("the notes forbid the things a 0.5B model should never say", () => {
  const money = findTopic(topics, "money").notes.join(" ");
  assert.match(money, /never name a specific security/i);
  assert.match(money, /never predict a return/i);

  const health = findTopic(topics, "health").notes.join(" ");
  assert.match(health, /never diagnose/i);
  assert.match(health, /medication/i);

  const distress = findTopic(topics, "distress").notes.join(" ");
  assert.match(distress, /do not diagnose/i);

  assert.match(findTopic(topics, "housing").notes.join(" "), /never tell them which one to pick/i);
});

test("every reply carries a routing note that says where it came from", () => {
  assert.match(noteFor(findTopic(topics, "money"), "model"), /grounded in reviewed money guidance/i);
  assert.match(noteFor(findTopic(topics, "distress"), "model"), /grounded in/i);
  assert.match(noteFor(findTopic(topics, "general"), "model"), /local model/i);
  assert.match(noteFor(findTopic(topics, "crisis"), "crisis"), /model was not involved/i);
  assert.match(noteFor(undefined, "model-off"), /isn't running/i);
  assert.match(noteFor(undefined, "model-failed"), /try again/i);
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
  assert.deepEqual(edited[0].safetyNet, []);
  assert.deepEqual(edited[0].except, []);
  // A topic with no When: line is skipped rather than offered to the model.
  assert.equal(parsePlaybook("## broken\n- a note").length, 0);
});
