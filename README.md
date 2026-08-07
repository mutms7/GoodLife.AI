# GoodLife.AI

<p align="center">
  <img src="docs/images/marketing-home.png" alt="GoodLife.AI marketing homepage with interactive coach demo" width="900" />
</p>

<p align="center">
  <strong>A private, local-first coach for building a life that fits.</strong><br />
  GoodLife.AI turns a few honest answers into small steps you can actually try.
</p>

<p align="center">
  <a href="https://goodlifeai.vercel.app">Try the live app</a>
  ·
  <a href="https://github.com/mutms7/GoodLife.AI">View the source</a>
</p>

## Why GoodLife.AI exists

Self-improvement advice often creates another giant list of things to fix. Most people need help deciding what to do first, with a first step small enough for a normal Tuesday.

GoodLife.AI is built around that idea. It opens with a short conversation about an ordinary good day, what matters right now, and where things feel stuck. Then the coach brings three practical starting points into today's thread, where you can check them off, push back, and return tomorrow.

The financial guidance draws on a lesson from *The Wealthy Barber*: pay yourself first, automate saving, live below your means, and give long-term investing a place in the plan. GoodLife.AI turns that into general education about emergency savings, expensive debt, and diversified, low-cost ETFs. It doesn't promise returns or tell anyone what to buy.

## A quick tour

<p align="center">
  <img src="docs/images/first-run.png" alt="GoodLife.AI first-run good-day question" width="800" />
</p>

First run is a three-step conversation rather than a form. You describe an ordinary good day, pick up to three things that matter right now, and say whether four areas feel fine, shaky, or rough. Three is a hard cap, because everything can't be first.

<p align="center">
  <img src="docs/images/todays-thread.png" alt="GoodLife.AI today's coach thread with two completed plan actions" width="800" />
</p>

The coach thread is the home screen, and the day's plan arrives inside it as a message you check off. The app ranks three starting actions from those answers: rough areas first, then what you said matters. Someone with rough sleep, rough money, and energy on their list gets a wake-time anchor, a payday transfer, and a daylight walk. You can argue with any of it in the same thread.

<p align="center">
  <img src="docs/images/your-data.png" alt="GoodLife.AI Your data screen with the local AI coach card" width="800" />
</p>

Your data is also where you export a local copy, start over, or download the optional AI coach. The app works without the model; you get fixed guidance instead of open conversation. Every coach reply includes a source note, so you can see whether it came from the local model or fixed guidance.

## How the AI works

GoodLife.AI uses a hybrid design. The three-step first run and the first-week plan use fixed, testable rules. That keeps the most visible recommendations predictable.

The optional conversational layer uses a pretrained Qwen2.5-0.5B-Instruct model through WebLLM. It has roughly 500 million parameters. The model is quantized, which keeps the download and memory requirements lower than a full-size model. The first download is about 1 GB and needs a browser with WebGPU.

The model runs on your device inside the browser. There is no GoodLife.AI inference server, no API key, and no per-message cloud request. GoodLife.AI uses the pretrained model as published; it wasn't trained or fine-tuned for this app.

Before answering, the app checks whether a message is about crisis support, money, health, housing, habits, relationships, meaning, or a general question.

- General questions, habits, relationships, and meaning can use the local model.
- Money, health, and housing stay on fixed, reviewed guidance.
- Crisis language receives a crisis-support response instead of model-generated coaching.
- If the model can't load or generation fails, the fixed coach answers instead.

For lower-risk conversations, the local model receives only your description of a good day. Your other answers stay with the fixed planner. That boundary is intentional and reflects what the app does today.

Replies stream token by token, and if the model is off, unsupported or fails mid-generation, the fixed coach answers and the note says exactly that.

## The ideas behind the product

GoodLife.AI borrows ideas, not slogans.

Atomic Habits shaped the seven-day plan. Actions are made smaller, tied to cues that already exist, supported by the environment, and tracked without treating a missed day as a personal failure. The app uses a simple “never miss twice” reminder.

The Wealthy Barber shaped the money prompts. Pay yourself first, automate a sustainable amount, keep an emergency buffer, deal with high-interest debt, and invest for the long term only after considering risk, time horizon, account rules, fees, and local tax context.

Other cards in the library are informed by *How to Win Friends and Influence People*, *The Happiness Trap*, *Why We Sleep*, and *Four Thousand Weeks*. The app also links to public guidance from the CDC, WHO, Investor.gov, and the Consumer Financial Protection Bureau. These are prompts to test, not rules to obey.

## How messages are routed

~~~mermaid
flowchart TD
    A[Three-step first run] --> B[Local profile in browser storage]
    B --> C[Fixed planner]
    C --> D[Three starting actions]
    D --> E[Seven-day habit plan]
    B --> F[Coach message]
    F --> G[Safety and topic check]
    G -->|General habits relationships meaning| H[Optional local model]
    G -->|Money health housing| I[Fixed guidance]
    G -->|Crisis language| J[Crisis support response]
    H --> K[Local chat response]
    H -->|Unavailable or error| I
    I --> K
    J --> K
    K --> L[Local chat history and progress]
~~~

## Privacy and limits

The profile, completions, streaks, and chat history are stored in the browser's local storage. They aren't sent to a GoodLife.AI server. The optional model runs locally after its files are downloaded and cached by the browser.

This also means the data is tied to that browser and device. Clearing site data can remove it, so the app includes a JSON export. The model needs a compatible WebGPU device and a fairly large first download. Small local models can be less capable than cloud models, especially with complex or nuanced questions.

GoodLife.AI is a reflection and education tool. It isn't medical, mental-health, legal, or financial advice. Investment returns aren't guaranteed. Renting and owning both have trade-offs, and the app doesn't assume one is right for everyone. For urgent safety concerns, contact local emergency services or a crisis service in your area.

## Tech stack

- React and TypeScript
- Vinext and Vite
- The Organic design system, self-hosted Caprasimo and Figtree
- WebLLM with Qwen2.5-0.5B-Instruct
- WebGPU for in-browser inference
- Browser local storage for the local-first data model
- Service worker and web manifest for PWA installation
- Node's built-in test runner, ESLint, and TypeScript checks

## Run it locally

Requires Node.js >=22.13.0.

~~~bash
git clone https://github.com/mutms7/GoodLife.AI.git
cd GoodLife.AI
npm install
npm run dev
~~~

Then open the local URL printed by Vinext. `/` is the marketing page, with a coach demo you can talk to before committing to anything, and `/app` is the product. First run and the fixed coach work right away. To try the local AI coach, open Your data in a WebGPU-compatible browser and choose “Download the model.” The download happens once per browser profile and can take a while.

To make a production build:

~~~bash
npm run build
npm start
~~~

## Tests and checks

~~~bash
npm test
npm run lint
npm run build
~~~

The checks cover rendering, advice routing, high-risk safeguards, and how the day's three actions are chosen.

## Install it as an app

GoodLife.AI is a Progressive Web App. On a supported browser, use the install prompt in the app or the browser's “Add to Home Screen” or “Install” command. The service worker caches the application shell so it opens like a standalone app after the first visit. The local model still needs its initial download before it can answer.
