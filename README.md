# career-ops — AI Job Search Platform 🚀

> **The all-in-one, self-hosted, AI-powered job search command center.** Evaluate job descriptions with Claude AI, generate ATS-optimized PDF CVs tailored to every role, scan Greenhouse / Ashby / Lever portals automatically, track every application, draft LinkedIn outreach, prep interviews, and analyze rejection patterns — all from a single multi-user web app you can host on AWS, your own VPS, or any Node.js server.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D22-brightgreen)](https://nodejs.org)
[![Powered by Claude](https://img.shields.io/badge/AI-Claude%20Sonnet%204.6-orange)](https://anthropic.com)
[![Self-hosted](https://img.shields.io/badge/deploy-self--hosted-purple)]()

**Search keywords:** AI job search · AI resume builder · ATS-optimized CV generator · Claude AI career assistant · LinkedIn outreach AI · interview prep AI · job application tracker · multi-user self-hosted job search platform · Greenhouse Ashby Lever scraper · rejection pattern analyzer · follow-up cadence tracker · salary negotiation assistant · tailored cover letter · open-source career tools · Anthropic API job pipeline · ChatGPT job search alternative · Claude Sonnet 4.6 web app

---

## ⚡ Why career-ops

Sending hundreds of generic applications doesn't work anymore. **career-ops uses Claude AI to find the right roles, tailor your CV to each one, and track every step** — turning the modern job hunt from a soul-crushing slog into a focused, data-driven pipeline.

Originally built and used to evaluate **740+ job offers and land a Head of Applied AI role**, it's now a self-hostable web platform you and your friends can run privately. No SaaS lock-in, no monthly subscription, no data leaving your server.

## 🎯 What it does

### 🌐 Multi-user Web App ([`web/`](web/))

A single Node.js server gives every user their own private workspace:

| Feature | Description |
|---------|-------------|
| 🔐 **Multi-user accounts** | bcrypt-hashed passwords, session cookies, fully isolated per-user data |
| 📊 **Dashboard** | Applications tracker with status, scores, filters, statistics |
| ⚡ **AI Job Evaluation** | Paste any JD or URL → get a 7-block A–G analysis (fit, comp, gaps, red flags, posting legitimacy) streamed live |
| 📄 **ATS-Optimized PDF CV** | Claude tailors your CV to each JD, Playwright renders a clean PDF that passes ATS parsers |
| 🆚 **Compare Multiple Offers** | 10-dimension scoring matrix to rank competing offers |
| 🔍 **Deep Company Research** | Structured intel brief — AI strategy, recent moves, culture, tech stack |
| ✉️ **LinkedIn Outreach Generator** | Three-sentence framework for recruiters, hiring managers, and peers |
| 📚 **Interview Prep Engine** | Glassdoor / Blind / LeetCode pattern analysis + STAR stories |
| 📋 **Course / Certification ROI** | "Should I take this course?" → MAKE / SKIP / TIMEBOX verdict |
| 🚀 **Portfolio Project Evaluator** | Scores project ideas across signal, uniqueness, demo-ability |
| ✍️ **Apply Assistant** | Paste form questions → get tailored answers ready to copy-paste |
| 📡 **Portal Scanner** | Zero-token scan of Greenhouse, Ashby, Lever APIs to discover new roles |
| ⟳ **Pipeline Auto-Process** | Paste 10 URLs, get 10 evaluations + reports + tracker entries in one click |
| 📊 **Rejection Pattern Analyzer** | Detects what's working and what's wasting time, recommends targeting changes |
| 📬 **Follow-up Cadence Tracker** | Calculates which applications need a follow-up and drafts the message |
| ◎ **Profile & CV Editor** | Edit CV, archetypes, scoring weights, application tracker — all from the browser |

### 💻 CLI mode

The original career-ops CLI is also available — every mode is exposed as a Claude Code slash command (`/career-ops`, `/career-ops oferta`, `/career-ops scan`, etc.). See [CLAUDE.md](CLAUDE.md) for the full command list.

---

## 🛠 Quick start

### Run the web app locally (5 minutes)

```bash
git clone https://github.com/PunithVT/career-ops.git
cd career-ops

# Install root deps (Playwright for PDF generation)
npm install
npx playwright install chromium

# Install + run the web app
cd web
npm install
cp .env.example .env
# Edit .env — add your ANTHROPIC_API_KEY (get one at console.anthropic.com)
npm start
```

Open **http://localhost:3000**, register an account, paste your CV during onboarding, and start evaluating roles.

---

## ☁️ Deploy to AWS EC2 (production)

```bash
# On a fresh Ubuntu EC2 instance:
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs git

git clone https://github.com/PunithVT/career-ops.git
cd career-ops
npm install
npx playwright install --with-deps chromium

cd web
npm install
cp .env.example .env
nano .env   # paste your ANTHROPIC_API_KEY + a long random SESSION_SECRET

# Keep it running with PM2
sudo npm install -g pm2
pm2 start "node --env-file=.env server.mjs" --name career-ops
pm2 save && pm2 startup
```

Open port 3000 in your EC2 security group (or front it with nginx + Let's Encrypt for a proper HTTPS domain). Share the URL — friends register their own accounts with their own private data.

---

## 🧠 Architecture

```
┌─────────────────┐
│  Browser (SPA)  │  ←  vanilla HTML / CSS / JS, dark theme, no build step
└────────┬────────┘
         │  fetch + Server-Sent Events (streaming)
┌────────▼────────┐
│  Express server │  ←  bcrypt auth · session cookies · per-user data dirs
│   (Node.js 22)  │
└────────┬────────┘
         │
         ├──→ Anthropic API (Claude Sonnet 4.6)   ←  all AI modes, with prompt caching
         ├──→ Playwright (Chromium headless)      ←  HTML → ATS-clean PDF rendering
         └──→ Greenhouse / Ashby / Lever APIs     ←  zero-token portal scan
```

Each user has an isolated data directory (CV, profile, applications, reports, PDF output). The 13 AI prompt modes in [`modes/`](modes/) are loaded as Claude system prompts with **prompt caching enabled** to reduce token costs.

---

## 🔧 Tech stack

- **Backend:** Node.js 22 · Express 4 · `express-session` · `bcryptjs` · `js-yaml`
- **AI / LLM:** [`@anthropic-ai/sdk`](https://www.npmjs.com/package/@anthropic-ai/sdk) — Claude Sonnet 4.6, prompt caching, SSE streaming
- **PDF rendering:** [Playwright](https://playwright.dev) — Chromium headless, ATS-parseable output
- **Frontend:** Vanilla HTML / CSS / JS — no React, no Vue, no build pipeline, no bundler
- **Storage:** File-based — markdown + YAML, per-user directories. No database, no Docker required
- **Job portals:** Greenhouse, Ashby, Lever (direct REST APIs, zero LLM tokens spent)
- **Deployment:** Single Node process · works on any VPS · AWS-ready · Docker-friendly

---

## 🚀 Comparable to / better than

career-ops gives you the power of paid AI career platforms, **self-hosted and free**:

- **Better than ChatGPT job search** — automated portal scanning, persistent tracker, multi-user
- **Better than Teal / Huntr** — AI-tailored PDF CVs, deep evaluation, interview prep, all integrated
- **Better than Resume.io / Kickresume** — your CV is a markdown file, AI tailors it per role
- **Better than LinkedIn Premium** — outreach scripts that actually convert, no monthly fee
- **Better than Final Round AI / Glider** — interview intel pulled from real Glassdoor / Blind / LeetCode data

---

## 🤝 Contributing

This is a fork of the excellent [santifer/career-ops](https://github.com/santifer/career-ops) CLI with a custom multi-user web app added. Pull requests, bug reports, and feedback welcome.

## 📜 License

MIT — see [LICENSE](LICENSE).

## 🙏 Credits

- Original career-ops CLI, prompt logic, archetypes, and scoring system by [Santiago Fernández de Valderrama](https://santifer.io)
- Multi-user web app, AWS deployment, and platform engineering by [Punith VT](https://github.com/PunithVT)

---

🌐 Available in: [English](README.md) · [Español](README.es.md) · [Português](README.pt-BR.md) · [한국어](README.ko-KR.md) · [日本語](README.ja.md) · [Русский](README.ru.md) · [繁體中文](README.zh-TW.md)
