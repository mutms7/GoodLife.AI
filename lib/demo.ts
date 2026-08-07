/* Scripted exchanges for the marketing page only.
 *
 * The product has no reply path that skips the model, and no keyword classifier
 * left to fake one with. So this is four written pairs you can click through to
 * see the tone, and an honest deferral for anything typed by hand. */

export type DemoExchange = { ask: string; text: string; note: string };

export const DEMO_EXCHANGES: DemoExchange[] = [
  {
    ask: "Bedtime keeps slipping",
    text: "Wake time is the easier end to hold, and it usually pulls bedtime along with it. Pick one time you can keep within 30 minutes for seven days, weekends included, and leave the evening alone for now. I'm not a clinician, so if this keeps up it's worth seeing one.",
    note: "A written sample. In the app the model answers this, grounded in the health notes from the playbook.",
  },
  {
    ask: "Where do I start with savings?",
    text: "Start with a buffer you can actually reach, not a number that sounds impressive. A few hundred dollars in a plain savings account keeps a flat tire from turning into a credit card balance. After that, whatever is charging you the most interest is the next thing to go. This is general education, not advice about your situation.",
    note: "A written sample. The last line is appended by the app after the model finishes, so it can't get reworded.",
  },
  {
    ask: "I keep missing days",
    text: "One miss is just a Tuesday. Two in a row is how a habit quietly ends, so the only rule is don't miss twice. Do the two-minute version today and call that done.",
    note: "A written sample. In the app the model answers this, grounded in the habits notes from the playbook.",
  },
  {
    ask: "Nothing feels like it matters lately",
    text: "That sounds heavy, and I'm not going to talk you out of it. Pick one small thing that lines up with what you care about, fifteen minutes, on the calendar. Meaning usually shows up after you start rather than before.",
    note: "A written sample. In the app the model answers this, grounded in the meaning notes from the playbook.",
  },
];

export const DEMO_DEFERRAL = {
  text: "I'd need the actual coach for that one, and it isn't running on this page. It downloads once inside the app and answers on your own hardware. The samples above are the tone you'd get.",
  note: "This page has no model. The coach only runs in the app, after the download.",
};
