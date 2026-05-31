// ═══════════════════════════════════════════
//  NAVIGATION
// ═══════════════════════════════════════════
const VIEW_TITLES = {
  scan:"Välj klass", active:"Aktiva lån", cards:"Lånekort",
  games:"Spel", pyssel:"Pyssel-kit", history:"Historik", paper:"Köp papper", admin:"Admin", stats:"Statistik", library:"Bibliotek"
};

function toggleLibrary(btn) {
  const sub   = document.getElementById("library-sub");
  const arrow = document.getElementById("library-arrow");
  const open  = sub.style.display === "flex";
  sub.style.display   = open ? "none" : "flex";
  arrow.style.transform = open ? "rotate(0deg)" : "rotate(90deg)";
  btn.classList.toggle("active", !open);
  // If closing, deactivate sub-items too
  if (open) {
    document.querySelectorAll('#nav-games, #nav-pyssel, #nav-cards').forEach(b => b.classList.remove('active'));
  }
}

function navigate(view, btn) {
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  // Auto-expand library submenu for library sub-views
  if (["games","pyssel","cards"].includes(view)) {
    const sub   = document.getElementById("library-sub");
    const arrow = document.getElementById("library-arrow");
    if (sub) sub.style.display = "flex";
    if (arrow) arrow.style.transform = "rotate(90deg)";
    document.getElementById("nav-library")?.classList.add("active");
  }
  document.getElementById("topbarTitle").textContent = VIEW_TITLES[view] || "Spelutlåning";
  showView(view);
}

function setView(html) {
  stopScanner();
  document.getElementById("view").innerHTML = html;
  // Always force-close sidebar and overlay when changing view
  document.querySelector('.sidebar').classList.remove('open');
  document.querySelector('.overlay').classList.remove('active');
  document.body.style.overflow = '';
}

function closeSidebar() {
  document.querySelector('.sidebar').classList.remove('open');
  document.querySelector('.overlay').classList.remove('active');
  document.body.style.overflow = '';
}
function toggleSidebar() {
  const isOpen = document.querySelector('.sidebar').classList.toggle('open');
  document.querySelector('.overlay').classList.toggle('active', isOpen);
}

// ═══════════════════════════════════════════
//  VIEWS
// ═══════════════════════════════════════════
async function showView(view) {
  if (view === "admin") { showAdminView(); return; }

  // ── SCAN ──
  if (view === "scan") {
    setView(`
      <div class="view-header"><h2>Välj klass</h2></div>
      <div class="cat-tabs">
        <button class="cat-tab" onclick="showClassNames('1A')">
          <div class="cat-tab-icon">🏫</div>
          <div class="cat-tab-label">Klass 1A</div>
          <div class="cat-tab-count">${classData['1A'].length} elever</div>
        </button>
        <button class="cat-tab" onclick="showClassNames('1B')">
          <div class="cat-tab-icon">🏫</div>
          <div class="cat-tab-label">Klass 1B</div>
          <div class="cat-tab-count">${classData['1B'].length} elever</div>
        </button>
      </div>`);
    return;
  }

  // ── PAPER VIEW (scan first) ──
  if (view === "paper") {
    setView(`
      <div class="view-header"><h2>Köp papper</h2></div>
      <div class="alert info">Skanna ditt lånekort för att hämta ut papper.</div>
      <div class="scanner-wrap">
        <div id="reader"></div>
        <p id="scanResult" class="scan-hint">Rikta kameran mot QR-koden</p>
        <div class="manual-entry">
          <input type="text" id="manualId" placeholder="Manuellt kort-ID (LK-01)" maxlength="8"
            onkeydown="if(event.key==='Enter')manualPaperLookup()">
          <button onclick="manualPaperLookup()">Sök</button>
        </div>
      </div>`);
    startScanner(showPaperForCard);
    return;
  }

  // ── ACTIVE LOANS ──
  if (view === "active") {
    setView(`<div class="view-header"><h2>Aktiva lån</h2></div><div class="loading">Laddar...</div>`);
    try {
      const snap = await db.collection("activeLoans").get();
      if (snap.empty) {
        document.getElementById("view").innerHTML =
          `<div class="view-header"><h2>Aktiva lån</h2></div><div class="empty-state">🎉 Inga aktiva lån just nu</div>`;
        return;
      }
      let rows = "";
      snap.forEach(doc => {
        const l = doc.data();
        rows += `<div class="list-item clickable" onclick="quickReturn('${esc(doc.id)}')">
          <div class="item-icon">🎲</div>
          <div class="item-info">
            <span class="item-title">${esc(l.gameTitle)}</span>
            <span class="item-sub">${esc(l.name)} · ${esc(l.loanedAt)}</span>
          </div>
          <span class="item-action">Återlämna →</span>
        </div>`;
      });
      document.getElementById("view").innerHTML =
        `<div class="view-header"><h2>Aktiva lån</h2><span class="badge">${snap.size}</span></div>
         <div class="list">${rows}</div>`;
    } catch(e) { showError(e); }
    return;
  }

  // ── CARDS ──
  if (view === "cards") {
    setView(`<div class="view-header"><h2>Lånekort</h2></div><div class="loading">Laddar...</div>`);
    try {
      const snap = await db.collection("cards").orderBy("name").get();
      let rows = "";
      snap.forEach(doc => {
        const c = doc.data();
        const sub = doc.id + (c.activeLoan && c.currentGame ? ' · ' + c.currentGame : '');
        const papers = c.papers ?? MAX_PAPERS;
        rows += `<div class="list-item clickable" data-search="${esc(c.name.toLowerCase())} ${doc.id.toLowerCase()}"
            onclick="showCardProfile('${esc(doc.id)}')">
          <div class="item-icon avatar">${esc(c.name[0])}</div>
          <div class="item-info">
            <span class="item-title">${esc(c.name)}</span>
            <span class="item-sub">${esc(sub)}</span>
          </div>
          <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;flex-shrink:0">
            <span class="status-pill ${c.activeLoan?'loaned':'free'}">${c.activeLoan?'Har lån':'Ledig'}</span>
            <span style="font-size:12px;color:#4ade80">📄 ${papers}/${MAX_PAPERS}</span>
          </div>
          <span class="item-action" style="margin-left:8px">→</span>
        </div>`;
      });
      document.getElementById("view").innerHTML =
        `<div class="view-header"><h2>Lånekort</h2><span class="badge">${snap.size}</span></div>
         <div class="search-wrap"><span class="search-icon">🔍</span>
           <input type="text" placeholder="Sök namn eller kort-ID…" oninput="filterList(this.value)">
         </div>
         <div class="list" id="itemList">${rows}</div>
         <div class="no-results" id="noResults">Inga resultat</div>`;
    } catch(e) { showError(e); }
    return;
  }

  // ── GAMES / PYSSEL ──
  if (view === "games" || view === "pyssel") {
    const cat   = view === "games" ? "spel" : "pyssel";
    const title = view === "games" ? "Spel" : "Pyssel-kit";
    const icon  = view === "games" ? "🎮" : "✂️";
    setView(`<div class="view-header"><h2>${title}</h2></div><div class="loading">Laddar...</div>`);
    try {
      const snap = await db.collection("games").where("category","==",cat).orderBy("title").get();
      let available = 0, rows = "";
      snap.forEach(doc => {
        const g = doc.data();
        if (!g.isLoaned) available++;
        rows += `<div class="list-item clickable" data-search="${esc(g.title.toLowerCase())}"
            onclick="showGameProfile('${esc(doc.id)}','${encodeURIComponent(g.title)}','${esc(cat)}')">
          <div class="item-icon">${icon}</div>
          <div class="item-info"><span class="item-title">${esc(g.title)}</span></div>
          <span class="status-pill ${g.isLoaned?'loaned':'free'}">${g.isLoaned?'Utlånad':'Tillgänglig'}</span>
          <span class="item-action">→</span>
        </div>`;
      });
      document.getElementById("view").innerHTML =
        `<div class="view-header"><h2>${title}</h2><span class="badge">${available} lediga</span></div>
         <div class="search-wrap"><span class="search-icon">🔍</span>
           <input type="text" placeholder="Sök…" oninput="filterList(this.value)">
         </div>
         <div class="list" id="itemList">${rows}</div>
         <div class="no-results" id="noResults">Inga resultat</div>`;
    } catch(e) { showError(e); }
    return;
  }

  // ── HISTORY ──
  if (view === "history") {
    setView(`<div class="view-header"><h2>Historik</h2></div><div class="loading">Laddar...</div>`);
    try {
      const snap = await db.collection("history").orderBy("timestamp","desc").limit(100).get();
      if (snap.empty) {
        document.getElementById("view").innerHTML =
          `<div class="view-header"><h2>Historik</h2></div><div class="empty-state">Ingen historik ännu</div>`;
        return;
      }
      let rows = "";
      snap.forEach(doc => {
        const h = doc.data();
        const isLoan    = h.action === "loan";
        const isPaper   = h.action === "paper";
        const isMission = h.action === "mission";
        const icon  = isMission ? "📋" : isPaper ? "📄" : isLoan ? "📤" : "📥";
        let title = "";
        if (isMission)  title = `${esc(h.name)} klarade uppdraget "${esc(h.missionName)}" (+${h.reward} kr)`;
        else if (isPaper)    title = `${esc(h.name)} hämtade ${h.amount} papper (har ${h.remaining}/${MAX_PAPERS})`;
        else if(isLoan) title = `${esc(h.name)} lånade ${esc(h.gameTitle)}`;
        else            title = `${esc(h.name)} lämnade tillbaka ${esc(h.gameTitle)}`;
        rows += `<div class="list-item" data-search="${esc(h.name.toLowerCase())}">
          <div class="item-icon">${icon}</div>
          <div class="item-info">
            <span class="item-title">${title}</span>
            <span class="item-sub">${h.timestamp.toDate().toLocaleString("sv-SE")}</span>
          </div>
        </div>`;
      });
      document.getElementById("view").innerHTML =
        `<div class="view-header"><h2>Historik</h2></div>
         <div class="search-wrap"><span class="search-icon">🔍</span>
           <input type="text" placeholder="Sök…" oninput="filterList(this.value)">
         </div>
         <div class="list" id="itemList">${rows}</div>
         <div class="no-results" id="noResults">Inga resultat</div>`;
    } catch(e) { showError(e); }
    return;
  }

  // ── STATS ──
  if (view === "stats") {
    setView(`<div class="view-header"><h2>Statistik</h2></div><div class="loading">Laddar statistik...</div>`);
    try { await loadStats(); } catch(e) { showError(e); }
    return;
  }
}

// ═══════════════════════════════════════════
//  CLASS PICKER
// ═══════════════════════════════════════════
async function showClassNames(className) {
  const names = classData[className];

  // Build name buttons
  let rows = names.sort().map(name => {
    // Find cardId for this name
    const card = cardsData.find(c => c.name === name);
    if (!card) return "";
    return `<button class="name-btn" onclick="handleCardScan('${card.cardId}')">
      <span class="name-btn-avatar">${name[0]}</span>
      ${name}
    </button>`;
  }).join("");

  document.getElementById("view").innerHTML = `
    <div class="view-header">
      <h2>Klass ${className}</h2>
      <span class="badge">${names.length} elever</span>
    </div>
    <div class="name-grid">${rows}</div>
    <button class="back-btn" style="margin-top:16px" onclick="navigate('scan', document.getElementById('nav-scan'))">← Tillbaka</button>`;
}


// ═══════════════════════════════════════════
//  MANUAL LOOKUP
// ═══════════════════════════════════════════
function manualLookup() {
  const val = (document.getElementById("manualId")?.value || "").trim().toUpperCase();
  if (!val) { showToast("Ange ett kort-ID"); return; }
  handleCardScan(val);
}

