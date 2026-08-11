# GoodLife.AI

## Download (Recommended)

[Download the latest Windows installer](https://github.com/mutms7/GoodLife.AI/releases/latest/download/GoodLife.AI-Setup.exe) (`GoodLife.AI-Setup.exe`). The installer includes the local coach and can run offline after setup.

## Website

[Open GoodLife.AI in your browser](https://goodlife-daily-guide.w-chenyin.chatgpt.site).

GoodLife.AI is **the only ethical AI coach**: the AI runs locally on your computer or phone. Only the account information you choose to sync is stored online, and conversations disappear after seven days.

The app turns a few honest answers into three small steps for today and a simple habit tracker. It is a reflection and education tool, not medical, legal, mental-health, or financial advice.

## Privacy and limits

The coach model runs on your device after a one-time download. Your local profile, progress, and chat stay in your browser unless you choose to sync account information. Synced conversations are deleted after seven days. Clearing browser data can remove local data, so use the built-in JSON export if you want a copy.

Conversation needs a WebGPU-compatible browser and the model download. Without it, the planner still works but chat is unavailable.

## Run locally

Requires Node.js >=22.13.0.

~~~bash
git clone https://github.com/mutms7/GoodLife.AI.git
cd GoodLife.AI
npm install
npm run dev
~~~

Open the local URL printed by Vinext. Edit [`lib/playbook.md`](lib/playbook.md) to change coaching guidance.

## Build and checks

~~~bash
npm test
npm run lint
npm run build
~~~

For a production server:

~~~bash
npm run build
npm start
~~~

## Windows release

The Windows installer bundles the local model. To build it locally (the model is roughly 1.6 GB):

~~~bash
npm run desktop:fetch-model
npm run desktop:package
~~~

Pushes to `main` test, package, and publish the latest installer to GitHub Releases.
