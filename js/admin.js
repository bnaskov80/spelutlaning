// ═══════════════════════════════════════════
//  ADMIN
// ═══════════════════════════════════════════
const ADMIN_PASSWORD = "admin123"; // ← byt detta lösenord!

function promptAdmin(btn) {
  const pw = prompt("Ange adminlösenord:");
  if (pw === null) return; // cancelled
  if (pw !== ADMIN_PASSWORD) {
    alert("❌ Fel lösenord");
    return;
  }
  navigate("admin", btn);
}

// Admin view is reached via navigate() after password check
// Admin view handled inside showView directly

async function showAdminView() {
  // Build person selector options
  const cardOptions = cardsData.map(c =>
    `<option value="${c.cardId}">${c.name} (${c.cardId})</option>`
  ).join("");

  setView(`
    <div class="view-header"><h2>Admin</h2></div>

    <!-- ── SEKTION: SE & RAPPORTER ── -->
    <div style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.08em;padding:4px 0 8px">Se & rapporter</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:16px">
      <button class="admin-danger-btn" onclick="navigate('history', document.getElementById('nav-admin'))"
        style="background:var(--surface);border-color:var(--border);color:var(--text)">
        📚 Historik
      </button>
      <button class="admin-danger-btn" onclick="navigate('stats', document.getElementById('nav-admin'))"
        style="background:var(--surface);border-color:var(--border);color:var(--text)">
        📊 Statistik
      </button>
      <button class="admin-danger-btn" id="weekSummaryBtn" onclick="showWeeklySummary()"
        style="background:var(--surface);border-color:var(--border);color:var(--text);grid-column:1/-1">
        📅 Veckosummering
      </button>
    </div>
    <div id="weeklySummaryResult" style="margin-bottom:8px"></div>

    <!-- ── SEKTION: PAPPER ── -->
    <div style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.08em;padding:4px 0 8px;margin-top:8px">📄 Papper</div>
    <div class="admin-card">
      <div style="display:flex;gap:8px;align-items:center;justify-content:space-between;flex-wrap:wrap">
        <div>
          <div style="font-size:14px;font-weight:600">Återställ alla</div>
          <div style="font-size:12px;color:var(--text-muted)">Ger alla ${MAX_PAPERS} papper igen</div>
        </div>
        <button class="admin-danger-btn" id="resetBtn" onclick="resetAllPapers()" style="white-space:nowrap">
          🔄 Återställ alla
        </button>
      </div>
      <div style="border-top:1px solid var(--border);margin:12px 0"></div>
      <div style="font-size:13px;font-weight:600;margin-bottom:8px">Justera per person</div>
      <div class="admin-input-row">
        <select id="paperPerson">${cardOptions}</select>
        <input type="number" id="paperAmt" value="1" min="1" max="${MAX_PAPERS}" style="width:60px">
        <button class="btn-add"    onclick="adjustPapers('add')">+</button>
        <button class="btn-remove" onclick="adjustPapers('remove')">−</button>
      </div>
    </div>

    <!-- ── SEKTION: BUTIKSKREDITER ── -->
    <div style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.08em;padding:4px 0 8px;margin-top:16px">🪙 Butikskrediter</div>
    <div class="admin-card">
      <div style="display:flex;gap:8px;align-items:center;justify-content:space-between;flex-wrap:wrap">
        <div>
          <div style="font-size:14px;font-weight:600">+500 kr till alla</div>
          <div style="font-size:12px;color:var(--text-muted)">Veckovis utdelning</div>
        </div>
        <button class="admin-danger-btn" id="creditsAllBtn" onclick="giveCreditsToAll()"
          style="background:rgba(245,158,11,0.15);border-color:rgba(245,158,11,0.3);color:#fcd34d;white-space:nowrap">
          🪙 Ge +500 kr
        </button>
      </div>
      <div style="border-top:1px solid var(--border);margin:12px 0"></div>
      <div style="font-size:13px;font-weight:600;margin-bottom:8px">Justera per person</div>
      <div class="admin-input-row">
        <select id="creditPerson">${cardOptions}</select>
        <input type="number" id="creditAmt" value="100" min="1" style="width:70px">
        <button class="btn-add"    onclick="adjustCredits('add')">+</button>
        <button class="btn-remove" onclick="adjustCredits('remove')">−</button>
      </div>
    </div>

    <!-- ── SEKTION: INNEHÅLL ── -->
    <div style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.08em;padding:4px 0 8px;margin-top:16px">Innehåll</div>

    <!-- Uppdrag -->
    <div class="admin-card" style="margin-bottom:8px">
      <h3 style="margin-bottom:10px">📋 Uppdrag</h3>
      <div class="admin-form">
        <div class="admin-form-row">
          <input type="text" id="missionIcon" placeholder="Emoji" maxlength="4" style="width:60px;flex:none">
          <input type="text" id="missionName" placeholder="Uppdragsnamn">
        </div>
        <div class="admin-form-row">
          <input type="text" id="missionDesc" placeholder="Beskrivning (valfri)">
        </div>
        <div class="admin-form-row">
          <input type="number" id="missionReward" placeholder="Belöning kr" min="1">
          <button class="admin-save-btn" onclick="addMission()">+ Lägg till</button>
        </div>
      </div>
      <div id="missionList" style="margin-top:12px"><div class="loading">Laddar...</div></div>
    </div>

    <!-- Butik -->
    <div class="admin-card">
      <h3 style="margin-bottom:10px">🛒 Butik</h3>
      <div class="admin-form">
        <div class="admin-form-row">
          <input type="text" id="shopIcon" placeholder="Emoji" maxlength="4" style="width:60px;flex:none">
          <input type="text" id="shopName" placeholder="Varunamn">
        </div>
        <div class="admin-form-row">
          <input type="text" id="shopDesc" placeholder="Beskrivning (valfri)">
        </div>
        <div class="admin-form-row">
          <input type="number" id="shopPrice" placeholder="Pris kr" min="1">
          <button class="admin-save-btn" onclick="addShopItem()">+ Lägg till</button>
        </div>
        <div class="admin-form-row">
          <select id="shopLimitType" style="flex:1;padding:10px 12px;background:var(--navy);border:1px solid var(--border);border-radius:var(--radius-sm);color:var(--text);font-size:14px;font-family:inherit;outline:none">
            <option value="none">Ingen köpgräns</option>
            <option value="total">Max antal köp totalt</option>
            <option value="weekly">Max antal köp per vecka</option>
          </select>
          <input type="number" id="shopLimitCount" placeholder="Antal" min="1" value="1" style="width:70px;flex:none;padding:10px 12px;background:var(--navy);border:1px solid var(--border);border-radius:var(--radius-sm);color:var(--text);font-size:14px;font-family:inherit;outline:none">
        </div>
        <div class="notify-row">
          <input type="checkbox" id="shopNotify" checked>
          <label for="shopNotify">📲 Skicka notis till personal vid köp</label>
        </div>
        <input type="text" id="shopNotifyTitle" placeholder="Notisrubrik, t.ex. 🍬 Godis köpt!" style="padding:10px 12px;background:var(--navy);border:1px solid var(--border);border-radius:var(--radius-sm);color:var(--text);font-size:14px;font-family:inherit;outline:none;transition:border-color 0.15s">
        <input type="text" id="shopNotifyBody" placeholder="Notistext, t.ex. Eleven vill hämta ut sitt godis" style="padding:10px 12px;background:var(--navy);border:1px solid var(--border);border-radius:var(--radius-sm);color:var(--text);font-size:14px;font-family:inherit;outline:none;transition:border-color 0.15s">
      </div>
      <div id="shopItemList" style="margin-top:12px"><div class="loading">Laddar...</div></div>
    </div>

    <!-- ── SEKTION: SPEL & PYSSEL ── -->
    <div style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.08em;padding:4px 0 8px;margin-top:16px">🎮 Spel & Pyssel-kit</div>
    <div class="admin-card">
      <h3 style="margin-bottom:10px">Lägg till nytt</h3>
      <div class="admin-form">
        <div class="admin-form-row">
          <input type="text" id="newGameTitle" placeholder="Namn på spel / pyssel-kit">
          <select id="newGameCategory" style="flex:none;width:120px;padding:10px 12px;background:var(--navy);border:1px solid var(--border);border-radius:var(--radius-sm);color:var(--text);font-size:14px;font-family:inherit;outline:none">
            <option value="spel">🎮 Spel</option>
            <option value="pyssel">✂️ Pyssel</option>
          </select>
        </div>
        <button class="admin-save-btn" onclick="addGame()">+ Lägg till</button>
      </div>
      <div style="border-top:1px solid var(--border);margin:14px 0 10px"></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px">
        <button onclick="setGameFilter('spel',this)" id="filterSpel"
          style="padding:8px;border:1px solid var(--accent-2);background:var(--accent-2);color:#fff;border-radius:var(--radius-sm);font-size:13px;font-weight:700;cursor:pointer;font-family:inherit">🎮 Spel</button>
        <button onclick="setGameFilter('pyssel',this)" id="filterPyssel"
          style="padding:8px;border:1px solid var(--border);background:var(--surface);color:var(--text-muted);border-radius:var(--radius-sm);font-size:13px;font-weight:700;cursor:pointer;font-family:inherit">✂️ Pyssel-kit</button>
      </div>
      <div id="adminGameList"><div class="loading">Laddar...</div></div>
    </div>

    <!-- ── SEKTION: TESTKONTO ── -->
    <div style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.08em;padding:4px 0 8px;margin-top:16px">🧪 Testkonto</div>
    <div class="admin-card" style="border-color:rgba(168,85,247,0.3)">
      <div style="font-size:13px;color:var(--text-muted);margin-bottom:12px;line-height:1.5">
        Testa låna, lämna tillbaka och köpa saker utan att påverka elevernas riktiga data.
      </div>
      <button class="admin-danger-btn" onclick="openTestAccount()"
        style="background:rgba(168,85,247,0.15);border-color:rgba(168,85,247,0.3);color:#d8b4fe">
        🧪 Öppna testkonto
      </button>
    </div>

    <!-- ── SEKTION: NOTISER ── -->
    <div style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.08em;padding:4px 0 8px;margin-top:16px">📲 Notiser (ntfy.sh)</div>
    <div class="admin-card">
      <div style="font-size:13px;color:var(--text-muted);margin-bottom:10px;line-height:1.5">
        Installera appen <strong style="color:var(--text)">ntfy</strong> på telefonen och prenumerera på kanalen nedan för att få notiser vid köp.
      </div>
      <div class="ntfy-setup">
        <div style="font-size:13px;font-weight:600">Kanalnamn</div>
        <input type="text" id="ntfyChannelInput" placeholder="t.ex. spelbutik-friskolan-2025">
        <div style="display:flex;gap:0">
          <button class="ntfy-save-btn" onclick="saveNtfyChannel(document.getElementById('ntfyChannelInput').value);showToast('✅ Kanal sparad')">💾 Spara</button>
          <button class="ntfy-test-btn" onclick="testNtfy()">📲 Skicka testnotis</button>
        </div>
      </div>
      <div style="font-size:12px;color:var(--text-muted);margin-top:8px">
        Välj ett unikt, svårgissat kanalnamn. Vem som helst med kanalnamnet kan se notiserna.
      </div>
      <div style="border-top:1px solid var(--border);margin:14px 0 10px"></div>
      <div style="font-size:13px;font-weight:600;margin-bottom:10px">Notiser för papper</div>
      <div class="notify-row" id="paperNotifyRow" onclick="togglePaperNotify()" style="cursor:pointer">
        <label for="paperNotifyToggle" style="cursor:pointer">📄 Notis när elev hämtar papper</label>
        <input type="checkbox" id="paperNotifyToggle" onclick="event.stopPropagation();togglePaperNotify()">
      </div>
    </div>

    <!-- ── SEKTION: LÅN ── -->
    <div style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.08em;padding:4px 0 8px;margin-top:16px">Lån</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:16px">
      <button class="admin-danger-btn" id="bulkReturnBtn" onclick="bulkReturn()"
        style="background:var(--surface);border-color:var(--border);color:var(--text)">
        📥 Återlämna alla
      </button>
      <button class="admin-danger-btn" id="clearHistoryBtn" onclick="clearHistory()"
        style="background:rgba(239,68,68,0.1);border-color:rgba(239,68,68,0.25);color:#f87171">
        🗑️ Rensa historik
      </button>
    </div>

    <!-- ── SEKTION: ÖVERSIKT ── -->
    <div style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.08em;padding:4px 0 8px">Översikt</div>
    <div class="admin-card">
      <div id="adminOverview"><div class="loading">Laddar...</div></div>
    </div>

    <button class="back-btn" style="margin-top:16px" onclick="navigate('scan', document.getElementById('nav-scan'))">← Tillbaka</button>
  `);
  loadAdminOverview();
  loadMissionList();
  loadShopItemList();
  loadAdminGameList("spel");
  // Restore saved settings after render
  setTimeout(() => {
    const cb = document.getElementById("paperNotifyToggle");
    if (cb) cb.checked = getPaperNotify();
    const ch = document.getElementById("ntfyChannelInput");
    if (ch) ch.value = getNtfyChannel();
  }, 50);
}

async function loadAdminOverview() {
  try {
    const snap = await db.collection("cards").orderBy("name").get();
    let rows = "";
    snap.forEach(doc => {
      const c = doc.data();
      const papers = c.papers ?? 0;
      const left   = MAX_PAPERS - papers;
      const pct    = Math.round((papers / MAX_PAPERS) * 100);
      const credits = c.credits ?? 0;
      rows += `<div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--border)">
        <div style="width:32px;height:32px;border-radius:50%;background:var(--accent-2);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;flex-shrink:0">${esc(c.name[0])}</div>
        <div style="flex:1;min-width:0">
          <div style="font-size:14px;font-weight:600">${esc(c.name)}</div>
          <div style="height:6px;background:var(--navy);border-radius:3px;margin-top:5px;overflow:hidden">
            <div style="height:100%;width:${pct}%;background:var(--accent-2);border-radius:3px;transition:width 0.3s"></div>
          </div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:2px;flex-shrink:0">
          <div style="font-size:13px;font-weight:700;color:${left===MAX_PAPERS?'#4ade80':left===0?'#f87171':'#fcd34d'}">${left}/${MAX_PAPERS} 📄</div>
          <div style="font-size:12px;color:#fcd34d">${credits} kr 🪙</div>
        </div>
      </div>`;
    });
    const el = document.getElementById("adminOverview");
    if (el) el.innerHTML = rows || "<div class='empty-state'>Inga kort</div>";
  } catch(e) { console.error(e); }
}

async function resetAllPapers() {
  const btn = document.getElementById("resetBtn");
  if (!btn) return;
  if (!confirm(`Återställa ALLA ${cardsData.length} lånekort till ${MAX_PAPERS} papper?`)) return;
  btn.disabled = true; btn.textContent = "Återställer...";
  try {
    // Firebase batches max 500 ops — split if needed
    const chunks = [];
    for (let i = 0; i < cardsData.length; i += 400) chunks.push(cardsData.slice(i, i+400));
    for (const chunk of chunks) {
      const batch = db.batch();
      chunk.forEach(c => {
        batch.update(db.collection("cards").doc(c.cardId), {
          papers: 0,
          lastPaperWeek: getISOWeek()
        });
      });
      await batch.commit();
    }
    showToast(`✅ Alla ${cardsData.length} kort återställda till ${MAX_PAPERS} papper`);
    btn.textContent = "✅ Klart!";
    setTimeout(() => loadAdminOverview(), 500);
  } catch(e) {
    btn.disabled = false; btn.textContent = `🔄 Återställ alla till ${MAX_PAPERS} papper`;
    showError(e);
  }
}

// ═══════════════════════════════════════════
//  ADMIN: ADJUST PAPERS (individual)
// ═══════════════════════════════════════════
async function adjustPapers(direction) {
  const cardId = document.getElementById("paperPerson")?.value;
  const amt    = parseInt(document.getElementById("paperAmt")?.value) || 1;
  if (!cardId || amt < 1) { showToast("Välj person och ange antal"); return; }
  try {
    const cardRef  = db.collection("cards").doc(cardId);
    const cardData = (await cardRef.get()).data();
    let current    = cardData.papers ?? 0;
    // "papers" = how many taken. Add = give more available = reduce taken count.
    if (direction === "add") {
      current = Math.max(0, current - amt); // fewer taken = more available
    } else {
      current = Math.min(MAX_PAPERS, current + amt); // more taken = fewer available
    }
    await cardRef.update({ papers: current });
    const left = MAX_PAPERS - current;
    showToast(`✅ ${cardData.name}: ${left}/${MAX_PAPERS} papper kvar`);
    loadAdminOverview();
  } catch(e) { showError(e); }
}

// ═══════════════════════════════════════════
//  ADMIN: CREDITS +500 TO ALL
// ═══════════════════════════════════════════
async function giveCreditsToAll() {
  const btn = document.getElementById("creditsAllBtn");
  if (!confirm(`Ge +500 kr till alla ${cardsData.length} personer?`)) return;
  if (btn) { btn.disabled = true; btn.textContent = "Ger krediter..."; }
  try {
    const chunks = [];
    for (let i = 0; i < cardsData.length; i += 400) chunks.push(cardsData.slice(i, i+400));
    for (const chunk of chunks) {
      const batch = db.batch();
      chunk.forEach(c => {
        batch.update(db.collection("cards").doc(c.cardId), {
          credits: firebase.firestore.FieldValue.increment(500)
        });
      });
      await batch.commit();
    }
    showToast(`✅ Alla ${cardsData.length} personer fick +500 kr`);
    if (btn) { btn.disabled = false; btn.textContent = "🪙 Ge +500 kr till alla"; }
    loadAdminOverview();
  } catch(e) {
    if (btn) { btn.disabled = false; btn.textContent = "🪙 Ge +500 kr till alla"; }
    showError(e);
  }
}

// ═══════════════════════════════════════════
//  ADMIN: ADJUST CREDITS (individual)
// ═══════════════════════════════════════════
async function adjustCredits(direction) {
  const cardId = document.getElementById("creditPerson")?.value;
  const amt    = parseInt(document.getElementById("creditAmt")?.value) || 0;
  if (!cardId || amt < 1) { showToast("Välj person och ange belopp"); return; }
  try {
    const cardRef  = db.collection("cards").doc(cardId);
    const cardData = (await cardRef.get()).data();
    let current    = cardData.credits ?? 0;
    if (direction === "add") {
      current = current + amt;
    } else {
      current = Math.max(0, current - amt);
    }
    await cardRef.update({ credits: current });
    showToast(`✅ ${cardData.name}: ${current} kr`);
    loadAdminOverview();
  } catch(e) { showError(e); }
}

// ═══════════════════════════════════════════
//  ADMIN: BULK RETURN
// ═══════════════════════════════════════════
async function bulkReturn() {
  const btn = document.getElementById("bulkReturnBtn");
  const snap = await db.collection("activeLoans").get();
  if (snap.empty) { showToast("Inga aktiva lån att återlämna"); return; }
  if (!confirm(`Återlämna ALLA ${snap.size} aktiva lån?`)) return;
  if (btn) { btn.disabled = true; btn.textContent = "Återlämnar..."; }
  try {
    let count = 0;
    for (const doc of snap.docs) {
      const loan = doc.data();
      const batch = db.batch();
      batch.update(db.collection("cards").doc(loan.cardId), {
        activeLoan: false,
        currentGame: firebase.firestore.FieldValue.delete()
      });
      batch.update(db.collection("games").doc(loan.gameId), { isLoaned: false });
      batch.delete(doc.ref);
      await batch.commit();
      await db.collection("history").add({
        cardId: loan.cardId, gameId: loan.gameId,
        gameTitle: loan.gameTitle, name: loan.name,
        action: "return", category: loan.category || "spel",
        timestamp: firebase.firestore.Timestamp.now()
      });
      count++;
    }
    showToast(`✅ ${count} lån återlämnade`);
    if (btn) { btn.disabled = false; btn.textContent = "📥 Återlämna alla aktiva lån"; }
    loadAdminOverview();
  } catch(e) {
    if (btn) { btn.disabled = false; btn.textContent = "📥 Återlämna alla aktiva lån"; }
    showError(e);
  }
}

// ═══════════════════════════════════════════
//  ADMIN: WEEKLY SUMMARY
// ═══════════════════════════════════════════
async function showWeeklySummary() {
  const btn = document.getElementById("weekSummaryBtn");
  const el  = document.getElementById("weeklySummaryResult");
  if (btn) { btn.disabled = true; btn.textContent = "Laddar..."; }
  try {
    // Get start of current week (Monday)
    const now   = new Date();
    const day   = now.getDay() || 7;
    const monday = new Date(now);
    monday.setHours(0,0,0,0);
    monday.setDate(now.getDate() - day + 1);

    const snap = await db.collection("history")
      .where("timestamp", ">=", firebase.firestore.Timestamp.fromDate(monday))
      .orderBy("timestamp", "desc").get();

    const docs      = snap.docs.map(d => d.data());
    const loans     = docs.filter(d => d.action === "loan");
    const returns   = docs.filter(d => d.action === "return");
    const papers    = docs.filter(d => d.action === "paper");
    const spelLoans = loans.filter(d => d.category !== "pyssel");
    const pyssel    = loans.filter(d => d.category === "pyssel");

    // Most active person this week
    const byPerson = {};
    loans.forEach(d => { byPerson[d.name] = (byPerson[d.name] || 0) + 1; });
    const topPerson = Object.entries(byPerson).sort((a,b)=>b[1]-a[1])[0];

    // Most popular game this week
    const byGame = {};
    loans.forEach(d => { byGame[d.gameTitle] = (byGame[d.gameTitle] || 0) + 1; });
    const topGame = Object.entries(byGame).sort((a,b)=>b[1]-a[1])[0];

    const totalPapers = papers.reduce((s,d) => s + (d.amount||1), 0);

    el.innerHTML = `
      <div class="week-summary">
        <h3>Vecka ${getISOWeek().split("-W")[1]} — ${monday.toLocaleDateString("sv-SE")} →</h3>
        <div class="week-row"><span class="week-row-label">Totala lån</span><span class="week-row-value">${loans.length}</span></div>
        <div class="week-row"><span class="week-row-label">Spellån</span><span class="week-row-value">${spelLoans.length}</span></div>
        <div class="week-row"><span class="week-row-label">Pyssel-kit lånade</span><span class="week-row-value">${pyssel.length}</span></div>
        <div class="week-row"><span class="week-row-label">Återlämningar</span><span class="week-row-value">${returns.length}</span></div>
        <div class="week-row"><span class="week-row-label">Papper hämtade</span><span class="week-row-value">${totalPapers}</span></div>
        <div class="week-row"><span class="week-row-label">Mest aktiv</span><span class="week-row-value">${topPerson ? esc(topPerson[0]) + " (" + topPerson[1] + " lån)" : "–"}</span></div>
        <div class="week-row"><span class="week-row-label">Populäraste spel</span><span class="week-row-value">${topGame ? esc(topGame[0]) : "–"}</span></div>
      </div>`;
    if (btn) { btn.disabled = false; btn.textContent = "📅 Visa veckans summering"; }
  } catch(e) {
    if (btn) { btn.disabled = false; btn.textContent = "📅 Visa veckans summering"; }
    showError(e);
  }
}


// ═══════════════════════════════════════════
//  ADMIN: CLEAR HISTORY
// ═══════════════════════════════════════════
async function clearHistory() {
  const btn = document.getElementById("clearHistoryBtn");
  if (!confirm("Är du säker? All historik raderas permanent och kan inte återställas.")) return;
  if (btn) { btn.disabled = true; btn.textContent = "Rensar..."; }
  try {
    // Firestore can't delete collections directly — fetch all docs and batch delete
    let deleted = 0;
    while (true) {
      const snap = await db.collection("history").limit(400).get();
      if (snap.empty) break;
      const batch = db.batch();
      snap.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
      deleted += snap.size;
    }
    showToast(`✅ ${deleted} historikposter raderade`);
    if (btn) { btn.disabled = false; btn.textContent = "🗑️ Rensa all historik"; }
  } catch(e) {
    if (btn) { btn.disabled = false; btn.textContent = "🗑️ Rensa all historik"; }
    showError(e);
  }
}

// ═══════════════════════════════════════════
//  ADMIN: GAMES & PYSSEL
// ═══════════════════════════════════════════
let currentGameFilter = "spel";

function setGameFilter(cat, btn) {
  currentGameFilter = cat;
  ["filterSpel","filterPyssel"].forEach(id => {
    const b = document.getElementById(id);
    if (!b) return;
    const active = (id === "filterSpel" && cat === "spel") || (id === "filterPyssel" && cat === "pyssel");
    b.style.background  = active ? "var(--accent-2)" : "var(--surface)";
    b.style.color       = active ? "#fff" : "var(--text-muted)";
    b.style.borderColor = active ? "var(--accent-2)" : "var(--border)";
  });
  loadAdminGameList(cat);
}

async function loadAdminGameList(cat) {
  const el = document.getElementById("adminGameList");
  if (!el) return;
  el.innerHTML = `<div class="loading">Laddar...</div>`;
  try {
    const snap = await db.collection("games").where("category","==",cat).orderBy("title").get();
    if (snap.empty) {
      el.innerHTML = `<div style="font-size:13px;color:var(--text-muted);padding:8px 0">Inga ${cat === "spel" ? "spel" : "pyssel-kit"} tillagda ännu</div>`;
      return;
    }
    let rows = "";
    snap.forEach(doc => {
      const g = doc.data();
      const loanedBadge = g.isLoaned
        ? `<span style="font-size:11px;background:rgba(239,68,68,0.15);color:#f87171;border-radius:10px;padding:2px 7px;font-weight:600">Utlånad</span>`
        : `<span style="font-size:11px;background:rgba(34,197,94,0.15);color:#4ade80;border-radius:10px;padding:2px 7px;font-weight:600">Ledig</span>`;
      rows += `<div class="admin-item-row">
        <span style="font-size:18px">${cat === "spel" ? "🎮" : "✂️"}</span>
        <div class="item-name">${esc(g.title)}</div>
        ${loanedBadge}
        <button class="admin-delete-btn" onclick="deleteGame('${doc.id}','${esc(g.title)}',${g.isLoaned})">Ta bort</button>
      </div>`;
    });
    el.innerHTML = rows;
  } catch(e) { el.innerHTML = `<div style="color:#f87171">Kunde inte ladda</div>`; }
}

async function addGame() {
  const title    = document.getElementById("newGameTitle")?.value.trim();
  const category = document.getElementById("newGameCategory")?.value || "spel";
  if (!title) { showToast("Ange ett namn"); return; }

  const gameId = title.toLowerCase()
    .replace(/å/g,"a").replace(/ä/g,"a").replace(/ö/g,"o")
    .replace(/[^a-z0-9]+/g,"_").replace(/^_|_$/g,"")
    + "_" + Date.now();

  const existing = await db.collection("games")
    .where("category","==",category).where("title","==",title).get();
  if (!existing.empty) { showToast(`❌ "${title}" finns redan`); return; }

  await db.collection("games").doc(gameId).set({ title, category, isLoaned: false });
  showToast(`✅ "${title}" tillagt`);
  document.getElementById("newGameTitle").value = "";
  loadAdminGameList(currentGameFilter);
}

