---
title: PortfolioAI
emoji: 🦀
colorFrom: green
colorTo: purple
sdk: docker
pinned: false
---

Check out the configuration reference at https://huggingface.co/docs/hub/spaces-config-reference

# **PortfolioAI — Instant Personal Brand & Job-Readiness Suite**
(Python + React + Vite + MaterialUI + FastAPI + Supabase + Groq LLM)

## 🧩 Problem

* Early-career engineers and career-switchers often lack a polished online presence and spend days wrestling with portfolios, résumés, and cover letters.
* Generic job alerts bury the few perfect openings in a flood of noise.
* Interview prep is ad-hoc, leaving candidates unsure of real-world expectations.

---

## 💡 Solution

Build an AI-driven web app that, in minutes, turns raw inputs (existing CV, LinkedIn URL, or a short Q\&A) into:

* A fully hosted portfolio site
* ATS-ready résumé
* Tailored cover letters
* Personalized job alerts

Then drills users with an **AI interviewer** offering real-time coaching.

---

## 🔭 Scope

### 🔧 AI Portfolio Builder

Accepts PDF/Word résumé or guided Q\&A to generate a responsive, host-ready site (custom subdomain + exportable HTML).

### 📄 AI CV Generator

When no résumé exists, dynamic interview prompts collect work history, skills, and metrics; outputs ATS-friendly PDF/DOCX.

### ✉️ AI Cover-Letter Writer

One-click, job-specific letters using role description + user portfolio data; editable tone presets.

### 📈 Résumé / Portfolio Optimizer

Real-time score, keyword gap analysis vs. target job description, and auto-rewrite suggestions.

### 🎤 AI Mock Interviewer

Role-aware question sets (technical, behavioral) with live transcript, confidence metrics, and improvement tips.

### 🧠 AI Career Coaching

AI-driven personalized career coaching and skill gap analysis.


---


A modern, Spotify-inspired React frontend for PortfolioAI. Create beautiful portfolios from your resume or via chat Q&A with an LLM.

## Features
- **Dark, sleek UI** inspired by Spotify (Material UI, custom theme)
- **Sidebar navigation** for Home, Resume Upload, Chat Q&A, Portfolio List
- **Resume upload** (PDF/DOCX) to generate a portfolio
- **Chat-based portfolio creation** (Q&A with LLM)
- **Portfolio list/history** with status, view, and export actions
- **Portfolio viewer** (renders generated HTML/CSS)
- **No authentication required**

## Getting Started

### 1. Install dependencies
```
npm install
```

### 2. Run the frontend (dev mode)
```
npm run dev
```

- The app will be available at `http://localhost:5173` (or similar).
- API requests to `/api/*` are proxied to the backend (assumed at `http://localhost:8000`).

### 3. Backend
- Make sure your FastAPI backend is running on `localhost:8000`.

## Folder Structure
- `src/components/` — All main UI components
- `src/theme.js` — Custom Material UI theme (Spotify-inspired)
- `src/App.js` — Main app layout and routing

## Customization
- To change the color theme, edit `src/theme.js`.

## 🚀 Deployment

### Local Development with Docker

1. Create a `.env` file from `.env.example`:
```bash
cp .env.example .env
```

2. Fill in your environment variables in `.env`:
```
SUPABASE_URL=your_supabase_project_url
SUPABASE_KEY=your_supabase_anon_key
GROQ_API_KEY=your_groq_api_key
```

3. Build and run with Docker Compose:
```bash
docker-compose up --build
```

The app will be available at `http://localhost:8000`.

### Hugging Face Spaces Deployment

1. Fork this repository to your Hugging Face account
2. Create a new Space on Hugging Face:
   - Choose "Docker" as the SDK
   - Select your forked repository
   - Add the following secrets in Space settings:
     - `SUPABASE_URL`
     - `SUPABASE_KEY`
     - `GROQ_API_KEY`

3. The Space will automatically build and deploy using the Dockerfile

Your app will be available at `https://your-username-portfolioai.hf.space`

### Environment Variables

- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_KEY`: Your Supabase anonymous key
- `GROQ_API_KEY`: Your Groq LLM API key
- `PORT`: (Optional) Port to run the server on (default: 8000)

### Docker Commands

Build the image:
```bash
docker build -t portfolioai .
```

Run the container:
```bash
docker run -p 8000:8000 --env-file .env portfolioai
```

---

**Enjoy your modern AI-powered portfolio builder!** 