// ─────────────────────────────────────────────────────────────────────────────
//  CINEVAULT  —  Movie Recommendation REST API
//  npm run dev  →  http://localhost:3000
// ─────────────────────────────────────────────────────────────────────────────

import express from "express";
import bodyParser from "body-parser";
import fetch from "node-fetch";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// ── TMDB CREDENTIALS ─────────────────────────────────────────────────────────
// Using Bearer token (v4 auth) — more reliable than API key query param
const TMDB_BEARER = process.env.TMDB_BEARER ||
  "eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJkZWQ1NzUzMzZhZGI1ODYxMmM5M2NkMDdmYWFmMWY1OCIsInN1YiI6IjY1YzVmOTVhZjZiNWYyZmVjOGJmZmM3ZCIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.placeholder";

// Also keep API key as fallback
const TMDB_API_KEY = process.env.TMDB_API_KEY || "ded575336adb58612c93cd07faaf1f58";

const TMDB_BASE = "https://api.themoviedb.org/3";
const TMDB_IMG = "https://image.tmdb.org/t/p/w500";

// Headers for all TMDB requests — Bearer token is the correct modern auth
const tmdbHeaders = {
  "Authorization": `Bearer eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJkZWQ1NzUzMzZhZGI1ODYxMmM5M2NkMDdmYWFmMWY1OCIsInN1YiI6IjY1YzVmOTVhZjZiNWYyZmVjOGJmZmM3ZCIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.ZdtM7QjCpuVsIbyV33UVAVmQYFND1zX4eO5unEGgyX8`,
  "accept": "application/json",
};

// ── MIDDLEWARE ────────────────────────────────────────────────────────────────
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(join(__dirname, "public")));

// ── DATA ──────────────────────────────────────────────────────────────────────
let movies = [
  {
    id: 1, title: "Blade Runner 2049", genre: "Sci-Fi", rating: 5,
    recommendation: "Yes", year: 2017, director: "Denis Villeneuve",
    tmdb_id: 335984,
    poster: `${TMDB_IMG}/gajva2L0rPYkEWjzgFlBXCAVBE5.jpg`,
    overview: "A young blade runner discovers a long-buried secret and tracks down former blade runner Rick Deckard.",
    mood_tags: ["mind-bending", "atmospheric", "slow-burn"],
    streaming: ["Prime Video"],
  },
  {
    id: 2, title: "The Shining", genre: "Horror", rating: 5,
    recommendation: "Yes", year: 1980, director: "Stanley Kubrick",
    tmdb_id: 694,
    poster: `${TMDB_IMG}/b6ko0IKC8MdYBBPkkA1aBPLe2yz.jpg`,
    overview: "A family heads to an isolated hotel for the winter where a sinister presence influences the father.",
    mood_tags: ["terrifying", "psychological", "iconic"],
    streaming: ["HBO Max"],
  },
  {
    id: 3, title: "Parasite", genre: "Thriller", rating: 5,
    recommendation: "Yes", year: 2019, director: "Bong Joon-ho",
    tmdb_id: 496243,
    poster: `${TMDB_IMG}/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg`,
    overview: "Greed and class discrimination threaten the newly formed symbiotic relationship between two Korean families.",
    mood_tags: ["darkly-funny", "tense", "thought-provoking"],
    streaming: ["Hulu", "Prime Video"],
  },
  {
    id: 4, title: "Morbius", genre: "Action", rating: 1,
    recommendation: "No", year: 2022, director: "Daniel Espinosa",
    tmdb_id: 526896, poster: null,
    overview: "Biochemist Michael Morbius tries to cure himself of a rare blood disease, but instead infects himself with vampirism.",
    mood_tags: ["disappointing", "forgettable"],
    streaming: ["Netflix"],
  },
  {
    id: 5, title: "Dune: Part Two", genre: "Sci-Fi", rating: 5,
    recommendation: "Yes", year: 2024, director: "Denis Villeneuve",
    tmdb_id: 693134,
    poster: `${TMDB_IMG}/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg`,
    overview: "Paul Atreides unites with Chani and the Fremen while seeking revenge against conspirators who destroyed his family.",
    mood_tags: ["epic", "spectacular", "emotional"],
    streaming: ["Prime Video", "HBO Max"],
  },
  {
    id: 6, title: "Oppenheimer", genre: "Drama", rating: 4,
    recommendation: "Yes", year: 2023, director: "Christopher Nolan",
    tmdb_id: 872585,
    poster: `${TMDB_IMG}/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg`,
    overview: "The story of J. Robert Oppenheimer's role in the development of the atomic bomb during World War II.",
    mood_tags: ["intense", "historical", "cerebral"],
    streaming: ["Peacock"],
  },
  {
    id: 7, title: "The Substance", genre: "Horror", rating: 4,
    recommendation: "Yes", year: 2024, director: "Coralie Fargeat",
    tmdb_id: 933260, poster: null,
    overview: "A fading celebrity uses a black-market substance that creates a younger, better version of herself.",
    mood_tags: ["body-horror", "satirical", "bold"],
    streaming: [],
  },
  {
    id: 8, title: "Ghosted", genre: "Romance", rating: 2,
    recommendation: "No", year: 2023, director: "Dexter Fletcher",
    tmdb_id: 775996, poster: null,
    overview: "A homebody falls head over heels for a woman who turns out to be a secret agent.",
    mood_tags: ["forgettable", "generic"],
    streaming: ["Apple TV+"],
  },
];

let nextId = 9;

// ── HELPERS ───────────────────────────────────────────────────────────────────
const parseList = v =>
  typeof v === "string" ? v.split(",").map(t => t.trim()).filter(Boolean) :
    Array.isArray(v) ? v : [];

// ── TMDB FETCH WRAPPER ────────────────────────────────────────────────────────
async function tmdbGet(path) {
  const url = `${TMDB_BASE}${path}`;
  const resp = await fetch(url, { headers: tmdbHeaders });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`TMDB ${resp.status}: ${text}`);
  }
  return resp.json();
}

// ═════════════════════════════════════════════════════════════════════════════
//  ROUTES — specific paths BEFORE  /movies/:id
// ═════════════════════════════════════════════════════════════════════════════

// ── GET /movies/stats ─────────────────────────────────────────────────────────
app.get("/movies/stats", (req, res) => {
  const total = movies.length;
  const avgRating = (movies.reduce((s, m) => s + m.rating, 0) / total).toFixed(2);
  const recommended = movies.filter(m => m.recommendation === "Yes").length;
  const genres = [...new Set(movies.map(m => m.genre))];

  const genreBreakdown = genres.map(g => {
    const gm = movies.filter(m => m.genre === g);
    return {
      genre: g,
      count: gm.length,
      avgRating: (gm.reduce((s, m) => s + m.rating, 0) / gm.length).toFixed(1),
    };
  });

  const allMoods = movies.flatMap(m => m.mood_tags || []);
  const moodFreq = allMoods.reduce((acc, t) => { acc[t] = (acc[t] || 0) + 1; return acc; }, {});
  const topMoods = Object.entries(moodFreq)
    .sort((a, b) => b[1] - a[1]).slice(0, 8)
    .map(([tag, count]) => ({ tag, count }));

  const allPlatforms = movies.flatMap(m => m.streaming || []);
  const platFreq = allPlatforms.reduce((acc, p) => { acc[p] = (acc[p] || 0) + 1; return acc; }, {});
  const streamingBreakdown = Object.entries(platFreq)
    .sort((a, b) => b[1] - a[1])
    .map(([platform, count]) => ({ platform, count }));

  res.json({
    total,
    avgRating: parseFloat(avgRating),
    recommended,
    notRecommended: total - recommended,
    genres,
    topRated: movies.filter(m => m.rating === 5).length,
    genreBreakdown,
    topMoods,
    streamingBreakdown,
  });
});

// ── GET /movies/moods ─────────────────────────────────────────────────────────
app.get("/movies/moods", (req, res) => {
  const all = movies.flatMap(m => m.mood_tags || []);
  const freq = all.reduce((acc, t) => { acc[t] = (acc[t] || 0) + 1; return acc; }, {});
  const moods = Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .map(([tag, count]) => ({ tag, count }));
  res.json({ moods });
});

// ── GET /movies/streaming-platforms ──────────────────────────────────────────
app.get("/movies/streaming-platforms", (req, res) => {
  const all = movies.flatMap(m => m.streaming || []);
  const unique = [...new Set(all)].sort();
  res.json({ platforms: unique });
});

// ── GET /movies ───────────────────────────────────────────────────────────────
app.get("/movies", (req, res) => {
  let result = [...movies];
  const { rating, genre, recommendation, sort, mood, search, streaming } = req.query;

  if (rating) result = result.filter(m => m.rating === parseInt(rating));
  if (genre) result = result.filter(m => m.genre.toLowerCase() === genre.toLowerCase());
  if (recommendation) result = result.filter(m => m.recommendation.toLowerCase() === recommendation.toLowerCase());
  if (mood) result = result.filter(m => m.mood_tags?.some(t => t.toLowerCase().includes(mood.toLowerCase())));
  if (streaming) result = result.filter(m => m.streaming?.some(s => s.toLowerCase().includes(streaming.toLowerCase())));
  if (search) result = result.filter(m =>
    m.title.toLowerCase().includes(search.toLowerCase()) ||
    m.director?.toLowerCase().includes(search.toLowerCase())
  );

  if (sort === "rating_desc") result.sort((a, b) => b.rating - a.rating);
  if (sort === "rating_asc") result.sort((a, b) => a.rating - b.rating);
  if (sort === "title") result.sort((a, b) => a.title.localeCompare(b.title));
  if (sort === "year_desc") result.sort((a, b) => b.year - a.year);
  if (sort === "year_asc") result.sort((a, b) => a.year - b.year);

  res.json({ count: result.length, movies: result });
});

// ── GET /movies/:id ───────────────────────────────────────────────────────────
app.get("/movies/:id", (req, res) => {
  const movie = movies.find(m => m.id === parseInt(req.params.id));
  if (!movie) return res.status(404).json({ error: "Movie not found", id: req.params.id });
  res.json(movie);
});

// ── POST /movies ──────────────────────────────────────────────────────────────
app.post("/movies", (req, res) => {
  const { title, genre, rating, recommendation,
    year, director, tmdb_id, poster, overview,
    mood_tags, streaming } = req.body;

  if (!title || !genre || rating === undefined || !recommendation)
    return res.status(400).json({
      error: "Missing required fields",
      required: { title: "string", genre: "string", rating: "1-5", recommendation: "Yes|No" },
    });

  const ratingNum = parseInt(rating);
  if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5)
    return res.status(400).json({ error: "rating must be 1–5" });

  if (!["Yes", "No"].includes(recommendation))
    return res.status(400).json({ error: "recommendation must be 'Yes' or 'No'" });

  const movie = {
    id: nextId++,
    title,
    genre,
    rating: ratingNum,
    recommendation,
    year: year ? parseInt(year) : null,
    director: director || null,
    tmdb_id: tmdb_id ? parseInt(tmdb_id) : null,
    poster: poster || null,
    overview: overview || null,
    mood_tags: parseList(mood_tags),
    streaming: parseList(streaming),
  };

  movies.push(movie);
  res.status(201).json(movie);
});

// ── PATCH /movies/:id ─────────────────────────────────────────────────────────
app.patch("/movies/:id", (req, res) => {
  const idx = movies.findIndex(m => m.id === parseInt(req.params.id));
  if (idx === -1) return res.status(404).json({ error: "Movie not found" });

  const { title, genre, rating, recommendation, year, director,
    poster, overview, mood_tags, streaming } = req.body;

  if (rating !== undefined) {
    const r = parseInt(rating);
    if (isNaN(r) || r < 1 || r > 5)
      return res.status(400).json({ error: "rating must be 1–5" });
  }
  if (recommendation !== undefined && !["Yes", "No"].includes(recommendation))
    return res.status(400).json({ error: "recommendation must be 'Yes' or 'No'" });

  movies[idx] = {
    ...movies[idx],
    ...(title !== undefined && { title }),
    ...(genre !== undefined && { genre }),
    ...(rating !== undefined && { rating: parseInt(rating) }),
    ...(recommendation !== undefined && { recommendation }),
    ...(year !== undefined && { year: parseInt(year) }),
    ...(director !== undefined && { director }),
    ...(poster !== undefined && { poster }),
    ...(overview !== undefined && { overview }),
    ...(mood_tags !== undefined && { mood_tags: parseList(mood_tags) }),
    ...(streaming !== undefined && { streaming: parseList(streaming) }),
  };

  res.json(movies[idx]);
});

// ── DELETE /movies/:id ────────────────────────────────────────────────────────
app.delete("/movies/:id", (req, res) => {
  const idx = movies.findIndex(m => m.id === parseInt(req.params.id));
  if (idx === -1) return res.status(404).json({ error: "Movie not found" });
  const deleted = movies.splice(idx, 1)[0];
  res.json({ message: "Deleted successfully", movie: deleted });
});

// ── TMDB: SEARCH ──────────────────────────────────────────────────────────────
app.get("/api/tmdb/search", async (req, res) => {
  const { q } = req.query;
  if (!q) return res.status(400).json({ error: "Query param ?q= is required" });

  try {
    const data = await tmdbGet(`/search/movie?query=${encodeURIComponent(q)}&language=en-US&page=1`);
    res.json({
      results: (data.results || []).map(m => ({
        id: m.id,
        title: m.title,
        release_date: m.release_date,
        vote_average: m.vote_average,
        poster_path: m.poster_path,
        overview: m.overview,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: "TMDB search failed", detail: err.message });
  }
});

// ── TMDB: WATCH PROVIDERS ─────────────────────────────────────────────────────
app.get("/api/tmdb/providers/:tmdbId", async (req, res) => {
  const { tmdbId } = req.params;
  const { region = "IN" } = req.query;

  try {
    const data = await tmdbGet(`/movie/${tmdbId}/watch/providers`);
    const regionData = data.results?.[region] || data.results?.["US"] || {};
    const flatrate = (regionData.flatrate || []).map(p => ({
      provider_id: p.provider_id,
      provider_name: p.provider_name,
      logo_path: p.logo_path,
    }));
    res.json({ providers: flatrate, region, link: regionData.link || null });
  } catch (err) {
    res.status(500).json({ error: "TMDB providers failed", detail: err.message });
  }
});

// ── FRONTEND ──────────────────────────────────────────────────────────────────
app.get("/", (req, res) => res.sendFile(join(__dirname, "public", "index.html")));

// ── START ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🎬  CineVault  →  http://localhost:${PORT}\n`);
  console.log("  Endpoints ready:");
  console.log("  GET    /movies");
  console.log("  GET    /movies/:id");
  console.log("  POST   /movies          (Body → raw → JSON)");
  console.log("  PATCH  /movies/:id      (Body → raw → JSON)");
  console.log("  DELETE /movies/:id");
  console.log("  GET    /movies/stats");
  console.log("  GET    /movies/moods");
  console.log("  GET    /movies/streaming-platforms");
  console.log("  GET    /api/tmdb/search?q=inception");
  console.log("  GET    /api/tmdb/providers/335984\n");
});