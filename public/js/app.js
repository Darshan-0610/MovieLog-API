/* ═══════════════════════════════════════════════════════════════
   CINEVAULT — Frontend Application
   REST API + TMDB search + streaming providers + mood filter
═══════════════════════════════════════════════════════════════ */

const TMDB_IMG  = "https://image.tmdb.org/t/p/w500";
const TMDB_LOGO = "https://image.tmdb.org/t/p/original";

// ── Streaming platform display map ──────────────────────────────
const PLATFORM_STYLE = {
  "Netflix":      { cls: "badge-netflix",   short: "N" },
  "Prime Video":  { cls: "badge-prime",     short: "P" },
  "Disney+":      { cls: "badge-disney",    short: "D+" },
  "Hulu":         { cls: "badge-hulu",      short: "H" },
  "HBO Max":      { cls: "badge-hbo",       short: "M" },
  "Peacock":      { cls: "badge-peacock",   short: "P+" },
  "Apple TV+":    { cls: "badge-apple",     short: "🍎" },
  "Paramount+":   { cls: "badge-paramount", short: "P+" },
};

function platformClass(name) {
  return PLATFORM_STYLE[name]?.cls || "badge-default";
}
function platformShort(name) {
  return PLATFORM_STYLE[name]?.short || name.slice(0, 2).toUpperCase();
}

// ── State ────────────────────────────────────────────────────────
let movies      = [];
let activeMood  = "";
let activeStream = "";
let isListMode  = false;
let filters     = { genre:"", rating:"", recommendation:"", sort:"rating_desc", search:"" };

// ── Init ─────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  setupNav();
  loadVault();
  loadMoodPills();
  loadStreamPills();
  setupFilters();
  setupLayoutToggle();
  setupAddForm();
  setupPrefill();
  setupDiscover();
  setupModal();
  initTicker();
});

// ── NAV ──────────────────────────────────────────────────────────
function setupNav() {
  document.querySelectorAll(".nav-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById(`view-${btn.dataset.view}`).classList.add("active");
      if (btn.dataset.view === "stats") renderStats();
    });
  });
}

// ── TICKER ───────────────────────────────────────────────────────
function initTicker() {
  const el = document.getElementById("ticker");
  el.innerHTML = el.innerHTML.repeat(6);
}

async function refreshTicker() {
  try {
    const r = await fetch("/movies/stats");
    const d = await r.json();
    const text = `◈ CINEVAULT &nbsp;·&nbsp; ${d.total} FILMS LOGGED &nbsp;·&nbsp; AVG RATING ${d.avgRating} &nbsp;·&nbsp; ${d.recommended} RECOMMENDED &nbsp;·&nbsp; POWERED BY TMDB &nbsp;·&nbsp; `;
    const el = document.getElementById("ticker");
    el.innerHTML = `<span class="ticker-text">${text}</span>`.repeat(6);
  } catch {}
}

// ── VAULT LOAD ───────────────────────────────────────────────────
async function loadVault() {
  const params = new URLSearchParams();
  if (filters.genre)          params.set("genre",          filters.genre);
  if (filters.rating)         params.set("rating",         filters.rating);
  if (filters.recommendation) params.set("recommendation", filters.recommendation);
  if (filters.sort)           params.set("sort",           filters.sort);
  if (filters.search)         params.set("search",         filters.search);
  if (activeMood)             params.set("mood",           activeMood);
  if (activeStream)           params.set("streaming",      activeStream);

  try {
    const res  = await fetch(`/movies?${params}`);
    const data = await res.json();
    movies = data.movies;
    renderGrid(movies);
    renderRibbon(data.count);
  } catch {
    showToast("Failed to load vault", "err");
  }
}

// ── GRID ─────────────────────────────────────────────────────────
function renderGrid(list) {
  const grid = document.getElementById("movieGrid");
  grid.innerHTML = "";
  grid.className = `movie-grid${isListMode ? " list" : ""}`;

  if (!list.length) {
    grid.innerHTML = `<div class="empty">
      <div class="empty-ico">◈</div>
      <div class="empty-text">NO FILMS MATCH</div>
    </div>`;
    return;
  }

  list.forEach((m, i) => {
    const card = document.createElement("div");
    card.className = `card ${m.recommendation === "Yes" ? "rec" : "skip"}`;
    card.style.animationDelay = `${i * 0.035}s`;
    card.innerHTML = buildCard(m);
    card.querySelector(".card-body").addEventListener("click", () => openDetail(m));
    card.querySelector(".btn-edit").addEventListener("click", e => { e.stopPropagation(); openEdit(m); });
    card.querySelector(".btn-del").addEventListener("click",  e => { e.stopPropagation(); delMovie(m.id, m.title); });
    grid.appendChild(card);
  });
}

function buildCard(m) {
  const stars = mkStars(m.rating);

  // Poster
  const poster = m.poster
    ? `<img class="card-poster" src="${m.poster}" alt="${m.title}" loading="lazy"
         onerror="this.parentElement.innerHTML='<div class=\\'card-no-poster\\'><span>🎬</span><span>NO POSTER</span></div>'" />`
    : `<div class="card-no-poster"><span>🎬</span><span>NO POSTER</span></div>`;

  // Streaming badges on poster
  const badges = (m.streaming || []).map(p =>
    `<span class="stream-badge ${platformClass(p)}">${platformShort(p)}</span>`
  ).join("");

  const moods = (m.mood_tags || []).map(t => `<span class="card-mood">${t}</span>`).join("");
  const meta  = [m.year, m.director].filter(Boolean).join(" · ");

  return `
    <div class="card-poster-wrap">
      ${poster}
      ${badges ? `<div class="poster-streaming">${badges}</div>` : ""}
    </div>
    <div class="card-body">
      <div class="card-genre">${m.genre.toUpperCase()}</div>
      <div class="card-title">${m.title}</div>
      ${meta ? `<div class="card-meta">${meta}</div>` : ""}
      <div class="card-stars">${stars}</div>
      <span class="card-rec ${m.recommendation==="Yes"?"yes":"no"}">
        ${m.recommendation==="Yes"?"✓ WATCH":"✕ SKIP"}
      </span>
      ${moods ? `<div class="card-moods">${moods}</div>` : ""}
    </div>
    <div class="card-foot">
      <button class="card-btn btn-edit">EDIT</button>
      <button class="card-btn btn-del">DELETE</button>
    </div>`;
}

function mkStars(r) {
  return Array.from({length:5}, (_,i) =>
    `<span class="${i<r?"":"off"}">★</span>`
  ).join("");
}

// ── RIBBON ───────────────────────────────────────────────────────
function renderRibbon(count) {
  const rec = movies.filter(m => m.recommendation==="Yes").length;
  const avg = movies.length
    ? (movies.reduce((s,m)=>s+m.rating,0)/movies.length).toFixed(1) : "—";
  document.getElementById("ribbon").innerHTML = `
    <div class="rib-cell"><span class="rib-val">${count}</span><span class="rib-label">SHOWING</span></div>
    <div class="rib-cell"><span class="rib-val">${avg}</span><span class="rib-label">AVG RATING</span></div>
    <div class="rib-cell"><span class="rib-val">${rec}</span><span class="rib-label">WATCH LIST</span></div>
    <div class="rib-cell"><span class="rib-val">${movies.length-rec}</span><span class="rib-label">SKIP LIST</span></div>
  `;
}

// ── MOOD PILLS ───────────────────────────────────────────────────
async function loadMoodPills() {
  try {
    const res  = await fetch("/movies/moods");
    const data = await res.json();
    const wrap = document.getElementById("moodPills");
    wrap.innerHTML = "";
    data.moods.forEach(({ tag, count }) => {
      const btn = document.createElement("button");
      btn.className = "m-chip";
      btn.innerHTML = `${tag} <span class="chip-count">${count}</span>`;
      btn.addEventListener("click", () => {
        if (activeMood === tag) {
          activeMood = "";
          btn.classList.remove("active");
          document.getElementById("moodClear").classList.add("hidden");
        } else {
          document.querySelectorAll(".m-chip").forEach(c => c.classList.remove("active"));
          activeMood = tag;
          btn.classList.add("active");
          document.getElementById("moodClear").classList.remove("hidden");
        }
        loadVault();
      });
      wrap.appendChild(btn);
    });

    document.getElementById("moodClear").addEventListener("click", () => {
      activeMood = "";
      document.querySelectorAll(".m-chip").forEach(c => c.classList.remove("active"));
      document.getElementById("moodClear").classList.add("hidden");
      loadVault();
    });
  } catch {}
}

// ── STREAMING PILLS ──────────────────────────────────────────────
async function loadStreamPills() {
  try {
    const res  = await fetch("/movies/streaming-platforms");
    const data = await res.json();
    const wrap = document.getElementById("streamPills");
    wrap.innerHTML = "";
    data.platforms.forEach(p => {
      const btn   = document.createElement("button");
      btn.className = "s-chip";
      const style = PLATFORM_STYLE[p];
      btn.innerHTML = `<span class="s-dot" style="background:${streamDotColor(p)}"></span>${p}`;
      btn.addEventListener("click", () => {
        if (activeStream === p) {
          activeStream = "";
          btn.classList.remove("active");
        } else {
          document.querySelectorAll(".s-chip").forEach(c => c.classList.remove("active"));
          activeStream = p;
          btn.classList.add("active");
        }
        loadVault();
      });
      wrap.appendChild(btn);
    });
  } catch {}
}

function streamDotColor(name) {
  const colors = {
    "Netflix":"#e50914","Prime Video":"#00a8e1","Disney+":"#113ccf",
    "Hulu":"#1ce783","HBO Max":"#a500b5","Peacock":"#f5a623",
    "Apple TV+":"#888","Paramount+":"#0064ff",
  };
  return colors[name] || "#555";
}

// ── FILTERS ──────────────────────────────────────────────────────
function setupFilters() {
  document.getElementById("fGenre").addEventListener("change",  e => { filters.genre = e.target.value; loadVault(); });
  document.getElementById("fRating").addEventListener("change", e => { filters.rating = e.target.value; loadVault(); });
  document.getElementById("fRec").addEventListener("change",    e => { filters.recommendation = e.target.value; loadVault(); });
  document.getElementById("fSort").addEventListener("change",   e => { filters.sort = e.target.value; loadVault(); });

  let dbt;
  document.getElementById("vaultSearch").addEventListener("input", e => {
    clearTimeout(dbt);
    dbt = setTimeout(() => { filters.search = e.target.value; loadVault(); }, 280);
  });
}

// ── LAYOUT TOGGLE ────────────────────────────────────────────────
function setupLayoutToggle() {
  document.getElementById("btnGrid").addEventListener("click", () => {
    isListMode = false;
    document.getElementById("btnGrid").classList.add("active");
    document.getElementById("btnList").classList.remove("active");
    renderGrid(movies);
  });
  document.getElementById("btnList").addEventListener("click", () => {
    isListMode = true;
    document.getElementById("btnList").classList.add("active");
    document.getElementById("btnGrid").classList.remove("active");
    renderGrid(movies);
  });
}

// ── DELETE ────────────────────────────────────────────────────────
async function delMovie(id, title) {
  if (!confirm(`Delete "${title}" from the vault?`)) return;
  try {
    await fetch(`/movies/${id}`, { method:"DELETE" });
    showToast(`✕ "${title}" deleted`, "ok");
    closeModal();
    loadVault(); loadMoodPills(); loadStreamPills(); refreshTicker();
  } catch { showToast("Delete failed","err"); }
}

// ── DETAIL MODAL ──────────────────────────────────────────────────
async function openDetail(m) {
  const stars   = mkStars(m.rating);
  const moods   = (m.mood_tags||[]).map(t=>`<span class="detail-mood">${t}</span>`).join("");
  const poster  = m.poster
    ? `<img class="detail-poster" src="${m.poster}" alt="${m.title}" />`
    : `<div class="detail-no-poster">🎬</div>`;

  // Build stored streaming badges
  const storedBadges = (m.streaming||[]).map(p =>
    `<span class="detail-badge ${platformClass(p)}">${p}</span>`
  ).join("");

  document.getElementById("modalBody").innerHTML = `
    <div class="detail-grid">
      <div>${poster}</div>
      <div>
        <div class="detail-genre">${m.genre.toUpperCase()}${m.year?` · ${m.year}`:""}</div>
        <h2 class="detail-title">${m.title}</h2>
        <div class="detail-meta">${m.director?`Directed by ${m.director}`:""}</div>
        <div class="detail-stars">${stars}</div>
        <span class="card-rec detail-rec ${m.recommendation==="Yes"?"yes":"no"}">
          ${m.recommendation==="Yes"?"✓ RECOMMENDED":"✕ SKIP IT"}
        </span>
        ${m.overview?`<p class="detail-overview">${m.overview}</p>`:""}
        ${moods?`<div class="detail-moods">${moods}</div>`:""}
        <div class="detail-streaming">
          <div class="detail-stream-label">WHERE TO WATCH</div>
          <div class="detail-stream-badges" id="streamBadges">
            ${storedBadges || `<span style="font-size:.62rem;color:var(--t2)">Loading…</span>`}
          </div>
          ${m.tmdb_id?`<div class="live-providers" id="liveProviders">Fetching live streaming data…</div>`:""}
        </div>
        <div class="detail-actions">
          <button class="d-btn d-edit" id="modalEdit">EDIT ENTRY</button>
          <button class="d-btn d-del"  id="modalDel">DELETE</button>
        </div>
        <div style="margin-top:.75rem;font-size:.56rem;color:var(--t2)">
          GET /movies/${m.id} · ID:${m.id}${m.tmdb_id?` · TMDB:${m.tmdb_id}`:""}
        </div>
      </div>
    </div>`;

  openModal();

  document.getElementById("modalEdit").onclick = () => openEdit(m);
  document.getElementById("modalDel").onclick  = () => delMovie(m.id, m.title);

  // Fetch live streaming providers if TMDB id exists
  if (m.tmdb_id) {
    try {
      const res  = await fetch(`/api/tmdb/providers/${m.tmdb_id}?region=IN`);
      const data = await res.json();
      const liveEl = document.getElementById("liveProviders");
      const badgeEl = document.getElementById("streamBadges");

      if (data.providers && data.providers.length > 0) {
        const liveBadges = data.providers.map(p => {
          const logo = p.logo_path
            ? `<img src="${TMDB_LOGO}${p.logo_path}" width="20" height="20"
                 style="border-radius:4px;object-fit:cover;vertical-align:middle;margin-right:.3rem"
                 onerror="this.style.display='none'" />`
            : "";
          const cls = platformClass(p.provider_name);
          return `<span class="detail-badge ${cls}">${logo}${p.provider_name}</span>`;
        }).join("");

        badgeEl.innerHTML = liveBadges;
        liveEl.textContent = `Live data for IN${data._mock?" (mock — add TMDB_API_KEY for live)":""}`;
      } else {
        liveEl.textContent = data.providers?.length === 0
          ? "Not available on streaming in India"
          : `Live data unavailable${data._mock?" (mock mode)":""}`;
      }
    } catch {
      const liveEl = document.getElementById("liveProviders");
      if (liveEl) liveEl.textContent = "Could not fetch streaming availability";
    }
  }
}

// ── EDIT MODAL ────────────────────────────────────────────────────
function openEdit(m) {
  const starsHtml = Array.from({length:5},(_,i)=>
    `<span class="star${i<m.rating?" lit":""}" data-v="${i+1}">★</span>`
  ).join("");

  document.getElementById("modalBody").innerHTML = `
    <h2 class="edit-title">EDIT ENTRY</h2>
    <div class="edit-form">
      <div class="fgrp full">
        <label class="flabel">TITLE</label>
        <input class="finput" id="e-title" value="${esc(m.title)}" type="text" />
      </div>
      <div class="frow">
        <div class="fgrp">
          <label class="flabel">GENRE</label>
          <select class="finput" id="e-genre">
            ${["Sci-Fi","Horror","Thriller","Drama","Action","Romance","Comedy","Documentary","Animation","Other"]
              .map(g=>`<option${g===m.genre?" selected":""}>${g}</option>`).join("")}
          </select>
        </div>
        <div class="fgrp">
          <label class="flabel">YEAR</label>
          <input class="finput" id="e-year" type="number" value="${m.year||""}" />
        </div>
      </div>
      <div class="frow">
        <div class="fgrp">
          <label class="flabel">DIRECTOR</label>
          <input class="finput" id="e-director" value="${esc(m.director||"")}" type="text" />
        </div>
        <div class="fgrp">
          <label class="flabel">RATING</label>
          <div class="star-row" id="eStarRow">${starsHtml}</div>
          <input type="hidden" id="e-rating" value="${m.rating}" />
        </div>
      </div>
      <div class="fgrp full">
        <label class="flabel">RECOMMEND?</label>
        <div class="rec-row">
          <button class="rec-opt${m.recommendation==="Yes"?" active":""}" id="eRYes" data-v="Yes">✓ WATCH IT</button>
          <button class="rec-opt${m.recommendation==="No"?" active":""}"  id="eRNo"  data-v="No">✕ SKIP IT</button>
        </div>
        <input type="hidden" id="e-recommendation" value="${m.recommendation}" />
      </div>
      <div class="fgrp full">
        <label class="flabel">OVERVIEW</label>
        <textarea class="finput ftextarea" id="e-overview">${esc(m.overview||"")}</textarea>
      </div>
      <div class="frow">
        <div class="fgrp">
          <label class="flabel">MOOD TAGS <span class="hint">(comma-sep)</span></label>
          <input class="finput" id="e-moods" value="${(m.mood_tags||[]).join(", ")}" />
        </div>
        <div class="fgrp">
          <label class="flabel">STREAMING <span class="hint">(comma-sep)</span></label>
          <input class="finput" id="e-streaming" value="${(m.streaming||[]).join(", ")}" />
        </div>
      </div>
      <button class="submit-btn" id="eSave">◈ SAVE CHANGES</button>
      <p class="form-msg" id="eMsg"></p>
    </div>`;

  initStarRow("eStarRow","e-rating");
  initRecToggle("eRYes","eRNo","e-recommendation");

  document.getElementById("eSave").addEventListener("click", async () => {
    const body = {
      title:          document.getElementById("e-title").value,
      genre:          document.getElementById("e-genre").value,
      year:           document.getElementById("e-year").value,
      director:       document.getElementById("e-director").value,
      rating:         document.getElementById("e-rating").value,
      recommendation: document.getElementById("e-recommendation").value,
      overview:       document.getElementById("e-overview").value,
      mood_tags:      document.getElementById("e-moods").value,
      streaming:      document.getElementById("e-streaming").value,
    };
    try {
      const res = await fetch(`/movies/${m.id}`, {
        method:"PATCH",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      showToast(`✓ "${body.title}" updated`,"ok");
      closeModal();
      loadVault(); loadMoodPills(); loadStreamPills();
    } catch { document.getElementById("eMsg").style.color="var(--red)"; document.getElementById("eMsg").textContent="Update failed"; }
  });

  openModal();
}

// ── ADD FORM ─────────────────────────────────────────────────────
function setupAddForm() {
  initStarRow("starRow","f-rating");
  initRecToggle("rYes","rNo","f-recommendation");

  document.getElementById("addSubmit").addEventListener("click", async () => {
    const title = document.getElementById("f-title").value.trim();
    const genre = document.getElementById("f-genre").value;
    const rating = document.getElementById("f-rating").value;
    const rec   = document.getElementById("f-recommendation").value;
    const msg   = document.getElementById("addMsg");

    if (!title||!genre||!rating||!rec) {
      msg.style.color="var(--red)";
      msg.textContent="Fill required fields: title, genre, rating, recommendation";
      return;
    }

    const body = {
      title, genre, rating, recommendation:rec,
      year:      document.getElementById("f-year").value,
      director:  document.getElementById("f-director").value,
      overview:  document.getElementById("f-overview").value,
      mood_tags: document.getElementById("f-moods").value,
      streaming: document.getElementById("f-streaming").value,
      tmdb_id:   document.getElementById("f-tmdb-id").value,
      poster:    document.getElementById("f-poster").value,
    };

    try {
      const res = await fetch("/movies", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      msg.style.color="var(--green)";
      msg.textContent=`✓ "${title}" added to the vault`;
      clearAddForm();
      loadVault(); loadMoodPills(); loadStreamPills(); refreshTicker();
    } catch {
      msg.style.color="var(--red)";
      msg.textContent="Failed to add";
    }
  });
}

function clearAddForm() {
  ["f-title","f-year","f-director","f-overview","f-moods","f-streaming","f-tmdb-id","f-poster"].forEach(id=>{
    document.getElementById(id).value="";
  });
  document.getElementById("f-genre").selectedIndex=0;
  document.getElementById("f-rating").value="";
  document.getElementById("f-recommendation").value="";
  document.querySelectorAll("#starRow .star").forEach(s=>s.classList.remove("lit"));
  document.querySelectorAll(".rec-opt").forEach(b=>b.classList.remove("active"));
  document.getElementById("prefillResults").innerHTML="";
  document.getElementById("prefillInput").value="";
}

// ── PREFILL (TMDB quick-fill in add form) ────────────────────────
function setupPrefill() {
  const btn   = document.getElementById("prefillBtn");
  const input = document.getElementById("prefillInput");

  const run = async () => {
    const q = input.value.trim();
    if (!q) return;
    btn.textContent = "…";
    const results = await tmdbSearch(q);
    btn.textContent = "FETCH";
    const wrap = document.getElementById("prefillResults");
    wrap.innerHTML = "";
    if (!results.length) {
      wrap.innerHTML=`<div style="font-size:.62rem;color:var(--t2);padding:.4rem">No results</div>`;
      return;
    }
    results.slice(0,6).forEach(m => {
      const yr = m.release_date?.slice(0,4)||"?";
      const poster = m.poster_path ? `${TMDB_IMG}${m.poster_path}` : null;
      const el = document.createElement("div");
      el.className = "p-result";
      el.innerHTML = `
        ${poster?`<img src="${poster}" alt="" />`:`<div style="width:28px;height:42px;background:var(--s3);flex-shrink:0"></div>`}
        <div>
          <div class="p-result-title">${m.title}</div>
          <div class="p-result-year">${yr}</div>
        </div>
        <span class="p-result-score">★ ${m.vote_average?.toFixed(1)||"?"}</span>`;
      el.addEventListener("click",()=>{
        document.getElementById("f-title").value   = m.title;
        document.getElementById("f-year").value    = yr;
        document.getElementById("f-overview").value= m.overview||"";
        document.getElementById("f-tmdb-id").value = m.id;
        document.getElementById("f-poster").value  = poster||"";
        wrap.innerHTML = `<div class="p-result" style="border-color:var(--green)">✓ Filled from TMDB: <strong style="margin-left:.4rem">${m.title}</strong></div>`;
      });
      wrap.appendChild(el);
    });
  };

  btn.addEventListener("click", run);
  input.addEventListener("keydown", e => { if(e.key==="Enter") run(); });
}

// ── DISCOVER VIEW ────────────────────────────────────────────────
function setupDiscover() {
  const btn   = document.getElementById("discoverBtn");
  const input = document.getElementById("discoverInput");

  const run = async () => {
    const q = input.value.trim();
    if (!q) return;
    btn.textContent = "SEARCHING…";
    const results = await tmdbSearch(q);
    btn.textContent = "SEARCH";
    renderDiscoverGrid(results);
  };

  btn.addEventListener("click", run);
  input.addEventListener("keydown", e => { if(e.key==="Enter") run(); });
}

async function tmdbSearch(q) {
  try {
    const res  = await fetch(`/api/tmdb/search?q=${encodeURIComponent(q)}`);
    const data = await res.json();
    return data.results || [];
  } catch { return []; }
}

function renderDiscoverGrid(list) {
  const grid = document.getElementById("discoverGrid");
  grid.innerHTML = "";
  if (!list.length) {
    grid.innerHTML=`<p style="color:var(--t2);font-size:.7rem;grid-column:1/-1">No results. Try a different title.</p>`;
    return;
  }
  list.forEach(m => {
    const yr     = m.release_date?.slice(0,4)||"?";
    const poster = m.poster_path ? `${TMDB_IMG}${m.poster_path}` : null;
    const card   = document.createElement("div");
    card.className = "d-card";
    card.innerHTML = `
      ${poster?`<img src="${poster}" alt="${m.title}" loading="lazy" />`:`<div class="d-no-poster">🎬</div>`}
      <div class="d-body">
        <div class="d-title">${m.title}</div>
        <div class="d-year">${yr}</div>
        <div class="d-score">★ ${m.vote_average?.toFixed(1)||"?"} / 10</div>
      </div>
      <button class="d-add">+ ADD TO VAULT</button>`;

    card.querySelector(".d-add").addEventListener("click", () => {
      // Switch to add view and prefill
      document.querySelectorAll(".nav-btn").forEach(b=>b.classList.remove("active"));
      document.querySelectorAll(".view").forEach(v=>v.classList.remove("active"));
      document.querySelector('[data-view="add"]').classList.add("active");
      document.getElementById("view-add").classList.add("active");

      document.getElementById("f-title").value    = m.title;
      document.getElementById("f-year").value     = yr;
      document.getElementById("f-overview").value = m.overview||"";
      document.getElementById("f-tmdb-id").value  = m.id;
      document.getElementById("f-poster").value   = poster||"";
      document.getElementById("prefillResults").innerHTML=`
        <div class="p-result" style="border-color:var(--amber)">
          ⚡ Pre-filled from TMDB: <strong style="margin-left:.4rem">${m.title}</strong>
        </div>`;
      showToast(`Pre-filled: "${m.title}"`, "ok");
    });
    grid.appendChild(card);
  });
}

// ── STATS VIEW ────────────────────────────────────────────────────
async function renderStats() {
  try {
    const res  = await fetch("/movies/stats");
    const d    = await res.json();

    document.getElementById("statCards").innerHTML = [
      [d.total,          "TOTAL FILMS"],
      [d.avgRating,      "AVG RATING"],
      [d.recommended,    "WATCH LIST"],
      [d.notRecommended, "SKIP LIST"],
      [d.topRated,       "5-STAR FILMS"],
      [d.genres.length,  "GENRES"],
    ].map(([v,l])=>`
      <div class="stat-card">
        <span class="sc-val">${v}</span>
        <span class="sc-lab">${l}</span>
      </div>`).join("");

    // Genre bars
    const maxG = Math.max(...d.genreBreakdown.map(g=>g.count));
    document.getElementById("genreChart").innerHTML = `
      <h3>GENRE BREAKDOWN</h3>
      ${d.genreBreakdown.map(g=>`
        <div class="bar-item">
          <div class="bar-head">
            <span class="bar-name">${g.genre.toUpperCase()}</span>
            <span class="bar-meta">${g.count} films · ${g.avgRating}★</span>
          </div>
          <div class="bar-track">
            <div class="bar-fill" style="width:${(g.count/maxG*100).toFixed(1)}%"></div>
          </div>
        </div>`).join("")}`;

    // Streaming bars
    const maxS = d.streamingBreakdown.length ? Math.max(...d.streamingBreakdown.map(p=>p.count)) : 1;
    document.getElementById("streamChart").innerHTML = `
      <h3>STREAMING BREAKDOWN</h3>
      ${d.streamingBreakdown.map(p=>`
        <div class="bar-item">
          <div class="bar-head">
            <span class="bar-name">${p.platform.toUpperCase()}</span>
            <span class="bar-meta">${p.count} film${p.count>1?"s":""}</span>
          </div>
          <div class="bar-track">
            <div class="bar-fill amber" style="width:${(p.count/maxS*100).toFixed(1)}%;background:${streamDotColor(p.platform)}"></div>
          </div>
        </div>`).join("") || "<p style='font-size:.65rem;color:var(--t2)'>No streaming data</p>"}`;

    // Mood cloud
    const maxM = d.topMoods.length ? d.topMoods[0].count : 1;
    document.getElementById("moodCloud").innerHTML = `
      <h3>MOOD CLOUD</h3>
      <div class="mood-cloud">
        ${d.topMoods.map(({tag,count})=>{
          const ratio = count/maxM;
          const size  = ratio>.75?"size-4":ratio>.5?"size-3":ratio>.25?"size-2":"size-1";
          return `<span class="mc-tag ${size}">${tag}</span>`;
        }).join("")}
      </div>`;

    // API explorer
    document.getElementById("endpointList").innerHTML = [
      ["GET",    "/movies",                      "Get all movies (filter + sort)"],
      ["GET",    "/movies?rating=5",             "Filter by rating (1–5)"],
      ["GET",    "/movies?genre=Sci-Fi",         "Filter by genre"],
      ["GET",    "/movies?mood=atmospheric",     "Filter by mood tag"],
      ["GET",    "/movies?streaming=Netflix",    "Filter by streaming platform"],
      ["GET",    "/movies/stats",                "Analytics & breakdowns"],
      ["GET",    "/movies/moods",                "All mood tags with frequency"],
      ["GET",    "/movies/streaming-platforms",  "All platforms in vault"],
      ["GET",    "/movies/:id",                  "Single movie by ID"],
      ["POST",   "/movies",                      "Add new movie"],
      ["PATCH",  "/movies/:id",                  "Update movie fields"],
      ["DELETE", "/movies/:id",                  "Remove from vault"],
      ["GET",    "/api/tmdb/search?q=",          "TMDB live movie search"],
      ["GET",    "/api/tmdb/providers/:tmdbId",  "Live streaming availability"],
    ].map(([m,p,d])=>`
      <div class="ep">
        <span class="ep-method m-${m}">${m}</span>
        <span class="ep-path">${p}</span>
        <span class="ep-desc">${d}</span>
      </div>`).join("");
  } catch { showToast("Stats failed","err"); }
}

// ── MODAL ────────────────────────────────────────────────────────
function setupModal() {
  document.getElementById("modalClose").addEventListener("click", closeModal);
  document.getElementById("overlay").addEventListener("click", e => {
    if (e.target === document.getElementById("overlay")) closeModal();
  });
  document.addEventListener("keydown", e => { if(e.key==="Escape") closeModal(); });
}
function openModal()  { document.getElementById("overlay").classList.add("open"); }
function closeModal() { document.getElementById("overlay").classList.remove("open"); }

// ── STAR ROW ─────────────────────────────────────────────────────
function initStarRow(rowId, inputId) {
  const row   = document.getElementById(rowId);
  const input = document.getElementById(inputId);
  const paint = (n) => row.querySelectorAll(".star").forEach((s,i)=>s.classList.toggle("lit",i<n));

  row.addEventListener("click", e => {
    const s = e.target.closest(".star"); if(!s) return;
    input.value = s.dataset.v;
    paint(parseInt(s.dataset.v));
  });
  row.addEventListener("mouseover", e => {
    const s = e.target.closest(".star"); if(!s) return;
    paint(parseInt(s.dataset.v));
  });
  row.addEventListener("mouseleave", () => { paint(parseInt(input.value)||0); });
}

// ── REC TOGGLE ───────────────────────────────────────────────────
function initRecToggle(yId, nId, inputId) {
  [yId,nId].forEach(id => {
    const el = document.getElementById(id); if(!el) return;
    el.addEventListener("click",()=>{
      document.getElementById(yId).classList.remove("active");
      document.getElementById(nId).classList.remove("active");
      el.classList.add("active");
      document.getElementById(inputId).value = el.dataset.v;
    });
  });
}

// ── TOAST ────────────────────────────────────────────────────────
function showToast(msg, type="ok") {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.className   = `toast ${type} show`;
  setTimeout(()=>t.classList.remove("show"), 3000);
}

// ── HELPERS ──────────────────────────────────────────────────────
function esc(s) { return String(s).replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/'/g,"&#39;"); }

// Expose for inline modal onclick fallback
window.openEdit  = openEdit;
window.delMovie  = delMovie;
