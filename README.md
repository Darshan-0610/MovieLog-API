# ◈ CINEVAULT

> A dark-mode RESTful Movie Recommendation API — **Node.js + Express**, integrated with **The Movie Database (TMDB)**. Features live streaming availability badges, mood-based filtering, and a bold brutalist cinema UI.

![Node](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-4.18-000000?logo=express&logoColor=white)
![TMDB](https://img.shields.io/badge/API-TMDB-01b4e4)
![License](https://img.shields.io/badge/license-MIT-blue)

---

## ✦ Features

| Feature | Details |
|---|---|
| **Full CRUD REST API** | GET, POST, PATCH, DELETE for `/movies` |
| **TMDB Live Search** | Search any film from The Movie Database |
| **Auto-fill from TMDB** | One-click form population: poster, year, overview |
| **Streaming Badges** | Live `/watch/providers` from TMDB — Netflix, Prime, Disney+, etc. |
| **Mood-based Filtering** | Tag films with vibes (`atmospheric`, `mind-bending`) and filter |
| **Streaming Filter** | Click any platform pill to filter the vault by where to watch |
| **Analytics Endpoint** | Genre breakdown, streaming breakdown, mood cloud |
| **Dark Brutalist UI** | Bebas Neue + Instrument Serif, grain overlay, no generic aesthetics |
| **Grid / List modes** | Toggle card grid ↔ compact list |

---

## Quick Start

```bash
npm install
npm run dev
# → http://localhost:3000
```

For live TMDB results (search + streaming availability):
```bash
cp .env.example .env
# Add your free key from https://www.themoviedb.org/settings/api
```

> Without a TMDB key the app runs on mock data — everything works.

---

## REST API

### Movies CRUD

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET`    | `/movies`                     | All movies — supports filters + sort |
| `GET`    | `/movies?rating=5`            | Filter by rating (1–5) |
| `GET`    | `/movies?genre=Sci-Fi`        | Filter by genre |
| `GET`    | `/movies?recommendation=Yes`  | Watch list only |
| `GET`    | `/movies?mood=atmospheric`    | Filter by mood tag |
| `GET`    | `/movies?streaming=Netflix`   | Filter by platform |
| `GET`    | `/movies?sort=year_desc`      | Sort results |
| `GET`    | `/movies/stats`               | Analytics & breakdowns |
| `GET`    | `/movies/moods`               | All mood tags + frequency |
| `GET`    | `/movies/streaming-platforms` | All platforms in vault |
| `GET`    | `/movies/:id`                 | Single movie |
| `POST`   | `/movies`                     | Add movie |
| `PATCH`  | `/movies/:id`                 | Partial update |
| `DELETE` | `/movies/:id`                 | Delete |

### TMDB Proxy

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/tmdb/search?q=dune`             | Live TMDB search |
| `GET` | `/api/tmdb/providers/:id?region=IN`   | Streaming providers |

### POST /movies body

```json
{
  "title": "Annihilation", "genre": "Sci-Fi", "rating": 5,
  "recommendation": "Yes", "year": 2018, "director": "Alex Garland",
  "overview": "A biologist leads an expedition into a mysterious zone.",
  "mood_tags": "unsettling, beautiful, slow-burn",
  "streaming": "Netflix, Prime Video",
  "tmdb_id": 300668
}
```

---

## Structure

```
cinevault/
├── server.js          # Express API + TMDB proxy
├── package.json
├── .env.example
├── .gitignore
└── public/
    ├── index.html     # 4-view SPA
    ├── css/style.css  # Dark brutalist design
    └── js/app.js      # Fetch + CRUD + streaming badges
```

## Stack

Node.js 18 (ESM) · Express 4 · TMDB API · Vanilla JS · nodemon

---

*Post-Lab for Experiment 4B — Full Stack Development, Fr. CRCE 2025-26*
