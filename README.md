# PortfolioAI Frontend (React + Material UI)

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

---

**Enjoy your modern AI-powered portfolio builder!** 