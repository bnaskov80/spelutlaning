// ═══════════════════════════════════════════
//  PAPER SYSTEM CONFIG
// ═══════════════════════════════════════════
const MAX_PAPERS    = 5;  // max man kan ha
const WEEKLY_PAPERS = 5;  // får varje vecka (max påfyllning upp till MAX)

// ── BUTIK: lägg till varor här ──
// Fälten: id (unikt), icon (emoji), name (namn), desc (beskrivning), price (pris i kr)
const SHOP_PRODUCTS = [
  // { id:"papper_1", icon:"📄", name:"1 papper", desc:"Ett ark papper", price:100 },
  // Ta bort // framför en rad för att aktivera varan
];

// ═══════════════════════════════════════════
//  PAPER HELPERS
// ═══════════════════════════════════════════
function getISOWeek() {
  const d = new Date();
  d.setHours(0,0,0,0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  return `${d.getFullYear()}-W${Math.ceil((((d - yearStart) / 86400000) + 1) / 7)}`;
}

// Tops up papers to MAX if it's a new week, returns current count
async function maybeRefillPapers(cardRef) {
  const data = (await cardRef.get()).data();
  const thisWeek = getISOWeek();
  if ((data.lastPaperWeek || "") !== thisWeek) {
    // New week: fill up to MAX (don't go over)
    const newCount = 0; // reset: 0 taken this week = all 5 available
    await cardRef.update({ papers: newCount, lastPaperWeek: thisWeek });
    return { count: newCount, refilled: true };
  }
  return { count: data.papers ?? MAX_PAPERS, refilled: false };
}

function buildCircles(count) {
  return Array.from({length: MAX_PAPERS}, (_, i) =>
    `<div class="paper-circle ${i < count ? 'used' : ''}"></div>`
  ).join("");
}

// ═══════════════════════════════════════════
//  PAPER FLOW
// ═══════════════════════════════════════════
function manualPaperLookup() {
  const val = (document.getElementById("manualId")?.value || "").trim().toUpperCase();
  if (!val) { showToast("Ange ett ID"); return; }
  showPaperForCard(val);
}

async function showPaperForCard(cardId) {
  try {
    const cardRef = db.collection("cards").doc(cardId);
    const cardDoc = await cardRef.get();
    if (!cardDoc.exists) { showToast("❌ Eleven hittades inte: " + cardId); return; }

    const { count, refilled } = await maybeRefillPapers(cardRef);
    const card = (await cardRef.get()).data();

    const atMax    = count >= MAX_PAPERS;
    const canTake1 = count < MAX_PAPERS;
    const canTake2 = count <= MAX_PAPERS - 2;

    const refillMsg = refilled
      ? `<div class="alert success" style="margin-bottom:0">🎉 Ny vecka! Ditt papper fylldes på till ${MAX_PAPERS}.</div>`
      : "";

    document.getElementById("view").innerHTML = `
      <div class="view-header"><h2>Köp papper</h2></div>
      ${refillMsg}
      <div class="paper-view">
        <div class="paper-person">${esc(card.name)}</div>
        <div class="paper-subtitle">${esc(cardId)}</div>

        <div class="paper-circles">
          ${buildCircles(count)}
        </div>

        <div class="paper-count-text">
          Du har köpt <span>${count} av ${MAX_PAPERS}</span> papper
        </div>

        ${atMax
          ? `<div class="paper-max-notice">Du har redan tagit ditt maxantal papper den här veckan 📄</div>`
          : `<div class="paper-buy-grid">
               <button class="paper-buy-btn" ${canTake1 ? '' : 'disabled'}
                 onclick="takePapers('${esc(cardId)}', 1)">
                 <span class="btn-label">1 papper</span>
                 <span class="btn-sub">Hämta 1 st</span>
               </button>
               <button class="paper-buy-btn" ${canTake2 ? '' : 'disabled'}
                 onclick="takePapers('${esc(cardId)}', 2)">
                 <span class="btn-label">2 papper</span>
                 <span class="btn-sub">Hämta 2 st</span>
               </button>
             </div>`
        }
      </div>
      <button class="back-btn" onclick="handleCardScan('${esc(cardId)}')">← Tillbaka</button>`;
  } catch(e) { showError(e); }
}

async function takePapers(cardId, amount) {
  // Disable both buttons immediately
  document.querySelectorAll('.paper-buy-btn').forEach(b => { b.disabled = true; b.style.opacity = "0.5"; b.style.cursor = "wait"; });
  try {
    const cardRef  = db.collection("cards").doc(cardId);
    const cardData = (await cardRef.get()).data();
    const current  = cardData.papers ?? 0;

    if (current + amount > MAX_PAPERS) {
      showToast("❌ Du kan inte ta fler papper den här veckan");
      await showPaperForCard(cardId);
      return;
    }

    const newCount = current + amount;
    // "papers" tracks how many taken this week (0 = none taken, MAX = all taken)
    // Actually we store remaining capacity: let's store "taken" count
    // Field "papers" = how many already taken this week
    await cardRef.update({ papers: newCount });

    await db.collection("history").add({
      cardId, name: cardData.name,
      action: "paper", amount,
      remaining: MAX_PAPERS - newCount,
      timestamp: firebase.firestore.Timestamp.now()
    });

    showToast(`✅ ${cardData.name} hämtade ${amount} papper`);

    // Send ntfy if paper notifications are enabled
    if (getPaperNotify()) {
      await sendNtfy({
        title: `📄 Papper hämtat`,
        body: `${cardData.name} hämtade ${amount} papper (${MAX_PAPERS - newCount} av ${MAX_PAPERS} kvar denna vecka)`,
        priority: "default"
      });
    }

    await showPaperForCard(cardId);
  } catch(e) { showError(e); }
}

// ═══════════════════════════════════════════
//  CARD SCAN → MAIN FLOW
// ═══════════════════════════════════════════
async function handleCardScan(cardId) {
  try {
    const doc = await db.collection("cards").doc(cardId).get();
    if (!doc.exists) { showToast("❌ Eleven hittades inte: " + cardId); return; }
    const card = doc.data();
    // Refill papers if new week
    const { count } = await maybeRefillPapers(db.collection("cards").doc(cardId));
    // Re-read after refill
    const freshCard = (await db.collection("cards").doc(cardId).get()).data();
    const credits   = freshCard.credits ?? 0;

    const papersLeft = MAX_PAPERS - count;

    // If person has active loan, fetch it so we can show direct return
    let activeLoan = null;
    if (card.activeLoan) {
      const loanDoc = await db.collection("activeLoans").doc(cardId).get();
      if (loanDoc.exists) activeLoan = loanDoc.data();
    }
    // Check for active mission
    const missionDoc = await db.collection("activeMissions").doc(cardId).get();
    const activeMission = missionDoc.exists ? missionDoc.data() : null;
    const loanIcon = activeLoan?.category === "pyssel" ? "✂️" : "🎮";

    const isTest = cardId === TEST_CARD_ID;
    const testBanner = isTest ? `
      <div style="background:rgba(168,85,247,0.15);border:1px solid rgba(168,85,247,0.3);
        border-radius:var(--radius-sm);padding:10px 14px;margin-bottom:12px;
        display:flex;align-items:center;justify-content:space-between;gap:10px">
        <div style="font-size:13px;font-weight:700;color:#d8b4fe">🧪 Testläge — ingen riktig data påverkas</div>
        <button onclick="resetTestAccount()" style="font-size:12px;padding:5px 10px;
          background:rgba(168,85,247,0.2);border:1px solid rgba(168,85,247,0.4);
          color:#d8b4fe;border-radius:var(--radius-sm);cursor:pointer;font-family:inherit;font-weight:700">
          Återställ
        </button>
      </div>` : "";

    document.getElementById("view").innerHTML = `
      <div class="view-header"><h2>${isTest ? "🧪 Testkonto" : "Elev vald"}</h2></div>
      ${testBanner}
      <div class="card-profile">
        <div class="profile-avatar">${esc(card.name[0])}</div>
        <div class="profile-name">${esc(card.name)}</div>
        <div class="profile-id">${esc(cardId)}</div>
        <div class="profile-loan-status ${card.activeLoan?'active':'free'}">
          ${card.activeLoan ? '🔴 Har aktivt lån' : '🟢 Ingen låning aktiv'}
        </div>
        ${activeLoan ? `<div class="alert info" style="margin-top:10px;margin-bottom:0;width:100%;text-align:left">
          ${loanIcon} Lånar just nu: <strong>${esc(activeLoan.gameTitle)}</strong>
        </div>` : `<div class="paper-badge">📄 ${papersLeft} papper kvar att hämta</div>`}
        ${activeMission ? `<div class="mission-active" style="margin-top:10px;width:100%">
          <div style="font-size:12px;color:#fcd34d;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:6px">⏳ Pågående uppdrag</div>
          <div class="mission-active-title">${activeMission.icon} ${esc(activeMission.name)}</div>
          <div class="mission-active-reward">+${activeMission.reward} kr vid godkännande</div>
          <div class="action-grid" style="margin-bottom:0">
            <button class="action-btn secondary" onclick="cancelMission('${esc(cardId)}')">✖ Avbryt</button>
            <button class="action-btn primary"   onclick="approveMissionPrompt('${esc(cardId)}')">✅ Admin godkänn</button>
          </div>
        </div>` : ""}
      </div>

      ${activeLoan ? `
      <!-- Person has active loan — show big return button first -->
      <button class="action-btn primary" id="confirmReturnBtn" style="width:100%;margin-bottom:12px;font-size:17px;padding:18px"
        onclick="returnGame('${esc(cardId)}','${esc(activeLoan.gameId)}','${encodeURIComponent(activeLoan.gameTitle)}')">
        ✅ Lämna tillbaka ${loanIcon} ${esc(activeLoan.gameTitle)}
      </button>
      <div class="action-grid">
        <button class="action-btn paper-btn" onclick="showPaperForCard('${esc(cardId)}')">
          📄 Hämta papper (${papersLeft} kvar)
        </button>
        <button class="action-btn" style="background:#1e3a5f;color:#93c5fd" onclick="showShopForCard('${esc(cardId)}')">
          🛒 Butik (${credits} kr)
        </button>
      </div>
      ` : `
      <!-- No active loan — buttons -->
      <div class="action-grid">
        <button class="action-btn primary" style="grid-column:1/-1" onclick="showBorrow('${esc(cardId)}')">📤 Låna spel</button>
        <button class="action-btn paper-btn" onclick="showPaperForCard('${esc(cardId)}')">
          📄 Hämta papper (${papersLeft} kvar)
        </button>
        <button class="action-btn" style="background:#1e3a5f;color:#93c5fd" onclick="showShopForCard('${esc(cardId)}')">
          🛒 Butik (${credits} kr)
        </button>
        <button class="action-btn" style="background:#1c3a2a;color:#6ee7b7;grid-column:1/-1" onclick="showMissions('${esc(cardId)}')">
          📋 Uppdrag
        </button>
      </div>
      `}
      <button class="back-btn" onclick="navigate('scan', document.getElementById('nav-scan'))">← Tillbaka</button>`;
  } catch(e) { showError(e); }
}

// ═══════════════════════════════════════════
//  BORROW FLOW
// ═══════════════════════════════════════════
async function showBorrow(cardId) {
  try {
    const card = (await db.collection("cards").doc(cardId).get()).data();
    if (card.activeLoan) {
      document.getElementById("view").innerHTML = `
        <div class="view-header"><h2>Kan ej låna</h2></div>
        <div class="alert warning">${esc(card.name)} har redan ett aktivt lån och måste lämna tillbaka först.</div>
        <button class="back-btn" onclick="navigate('scan', document.getElementById('nav-scan'))">← Tillbaka</button>`;
      return;
    }
    const [gamesSnap, pysselSnap] = await Promise.all([
      db.collection("games").where("category","==","spel").where("isLoaned","==",false).get(),
      db.collection("games").where("category","==","pyssel").where("isLoaned","==",false).get()
    ]);
    document.getElementById("view").innerHTML = `
      <div class="view-header"><h2>Vad vill du låna?</h2><span class="badge">${esc(card.name)}</span></div>
      <div class="cat-tabs">
        <button class="cat-tab" onclick="showBorrowCategory('${esc(cardId)}','spel')">
          <div class="cat-tab-icon">🎮</div>
          <div class="cat-tab-label">Spel</div>
          <div class="cat-tab-count">${gamesSnap.size} tillgängliga</div>
        </button>
        <button class="cat-tab" onclick="showBorrowCategory('${esc(cardId)}','pyssel')">
          <div class="cat-tab-icon">✂️</div>
          <div class="cat-tab-label">Pyssel-kit</div>
          <div class="cat-tab-count">${pysselSnap.size} tillgängliga</div>
        </button>
      </div>
      <button class="back-btn" onclick="navigate('scan', document.getElementById('nav-scan'))">← Avbryt</button>`;
  } catch(e) { showError(e); }
}

async function showBorrowCategory(cardId, category) {
  try {
    const card = (await db.collection("cards").doc(cardId).get()).data();
    const isSpel = category === "spel";
    const icon  = isSpel ? "🎮" : "✂️";
    const label = isSpel ? "spel" : "pyssel-kit";
    const gamesSnap = await db.collection("games")
      .where("category","==",category)
      .where("isLoaned","==",false)
      .orderBy("title").get();
    if (gamesSnap.empty) {
      document.getElementById("view").innerHTML = `
        <div class="view-header"><h2>Inga ${label}</h2></div>
        <div class="alert warning">Inga ${label} är tillgängliga just nu.</div>
        <button class="back-btn" onclick="showBorrow('${esc(cardId)}')">← Tillbaka</button>`;
      return;
    }
    let rows = "";
    gamesSnap.forEach(g => {
      rows += `<div class="list-item clickable"
          data-search="${esc(g.data().title.toLowerCase())}"
          onclick="borrowGame('${esc(cardId)}','${esc(g.id)}','${encodeURIComponent(g.data().title)}',this)">
        <div class="item-icon">${icon}</div>
        <div class="item-info"><span class="item-title">${esc(g.data().title)}</span></div>
        <span class="item-action">Låna →</span>
      </div>`;
    });
    document.getElementById("view").innerHTML = `
      <div class="view-header"><h2>Välj ${label}</h2><span class="badge">${esc(card.name)}</span></div>
      <div class="search-wrap"><span class="search-icon">🔍</span>
        <input type="text" placeholder="Sök…" oninput="filterList(this.value)" autofocus>
      </div>
      <div class="list" id="itemList">${rows}</div>
      <div class="no-results" id="noResults">Inga resultat</div>
      <button class="back-btn" style="margin-top:12px" onclick="showBorrow('${esc(cardId)}')">← Tillbaka</button>`;
  } catch(e) { showError(e); }
}

async function borrowGame(cardId, gameId, encodedTitle, el) {
  if (el) { el.style.pointerEvents="none"; el.style.opacity="0.5"; el.style.cursor="wait"; }
  const gameTitle = decodeURIComponent(encodedTitle);
  try {
    const cardRef  = db.collection("cards").doc(cardId);
    const cardData = (await cardRef.get()).data();
    const gameRef  = db.collection("games").doc(gameId);
    const gameDoc  = await gameRef.get();
    const gameData = gameDoc.data();
    const category = gameData.category || "spel";

    // Re-check game is still available (race condition guard)
    if (gameData.isLoaned) {
      showToast("❌ " + gameTitle + " är just utlånad — välj ett annat");
      if (el) { el.style.pointerEvents=""; el.style.opacity=""; el.style.cursor=""; }
      await showBorrowCategory(cardId, category);
      return;
    }

    // Re-check person doesn't already have a loan
    if (cardData.activeLoan) {
      showToast("❌ " + cardData.name + " har redan ett aktivt lån");
      if (el) { el.style.pointerEvents=""; el.style.opacity=""; el.style.cursor=""; }
      return;
    }

    const batch = db.batch();
    batch.update(cardRef, {activeLoan:true, currentGame:gameTitle});
    batch.update(gameRef, {isLoaned:true});
    batch.set(db.collection("activeLoans").doc(cardId), {
      cardId, gameId, gameTitle, name:cardData.name, category,
      loanedAt: new Date().toLocaleString("sv-SE")
    });
    await batch.commit();
    await db.collection("history").add({
      cardId, gameId, gameTitle, name:cardData.name, action:"loan", category,
      timestamp: firebase.firestore.Timestamp.now()
    });
    showToast(`✅ ${cardData.name} har lånat ${gameTitle}`);
    navigate("scan", document.getElementById("nav-scan"));
  } catch(e) {
    if (el) { el.style.pointerEvents=""; el.style.opacity=""; el.style.cursor=""; }
    showError(e);
  }
}

async function showReturn(cardId) {
  try {
    const card = (await db.collection("cards").doc(cardId).get()).data();
    if (!card.activeLoan) {
      document.getElementById("view").innerHTML = `
        <div class="view-header"><h2>Inget lån</h2></div>
        <div class="alert info">${esc(card.name)} har inga aktiva lån.</div>
        <button class="back-btn" onclick="navigate('scan', document.getElementById('nav-scan'))">← Tillbaka</button>`;
      return;
    }
    const loan     = (await db.collection("activeLoans").doc(cardId).get()).data();
    const loanIcon = loan.category === "pyssel" ? "✂️" : "🎮";
    document.getElementById("view").innerHTML = `
      <div class="view-header"><h2>Återlämna</h2></div>
      <div class="return-card">
        <div class="return-game">${loanIcon} ${esc(loan.gameTitle)}</div>
        <div class="return-person">Lånad av: ${esc(card.name)}</div>
        <div class="return-time">Sedan: ${esc(loan.loanedAt)}</div>
      </div>
      <div class="action-grid">
        <button class="action-btn primary" id="confirmReturnBtn"
          onclick="returnGame('${esc(cardId)}','${esc(loan.gameId)}','${encodeURIComponent(loan.gameTitle)}')">
          ✅ Bekräfta återlämning
        </button>
      </div>
      <button class="back-btn" onclick="navigate('scan', document.getElementById('nav-scan'))">← Avbryt</button>`;
  } catch(e) { showError(e); }
}

async function returnGame(cardId, gameId, encodedTitle) {
  const btn = document.getElementById("confirmReturnBtn");
  if (btn) { btn.disabled=true; btn.textContent="Sparar…"; btn.style.cursor="wait"; }
  const gameTitle = decodeURIComponent(encodedTitle);
  try {
    const cardRef  = db.collection("cards").doc(cardId);
    const cardName = (await cardRef.get()).data().name;
    const batch = db.batch();
    batch.update(cardRef, {activeLoan:false, currentGame:firebase.firestore.FieldValue.delete()});
    batch.update(db.collection("games").doc(gameId), {isLoaned:false});
    batch.delete(db.collection("activeLoans").doc(cardId));
    await batch.commit();
    await db.collection("history").add({
      cardId, gameId, gameTitle, name:cardName, action:"return",
      timestamp: firebase.firestore.Timestamp.now()
    });
    showToast(`✅ ${cardName} har lämnat tillbaka ${gameTitle}`);
    // Go back to card profile so they can do something else
    await handleCardScan(cardId);
  } catch(e) {
    if (btn) { btn.disabled=false; btn.textContent="✅ Bekräfta återlämning"; btn.style.cursor=""; }
    showError(e);
  }
}

async function quickReturn(cardId) {
  try {
    const loanDoc = await db.collection("activeLoans").doc(cardId).get();
    if (!loanDoc.exists) { showToast("❌ Hittade inte lånet"); return; }
    await showReturn(cardId);
  } catch(e) { showError(e); }
}

// ═══════════════════════════════════════════
//  CARD DETAIL PROFILE
// ═══════════════════════════════════════════
async function showCardProfile(cardId) {
  setView(`<div class="view-header"><h2>Profil</h2></div><div class="loading">Laddar...</div>`);
  try {
    const doc = await db.collection("cards").doc(cardId).get();
    if (!doc.exists) { showToast("❌ Eleven hittades inte"); return; }
    const c = doc.data();
    const papers  = c.papers ?? 0;
    const left    = MAX_PAPERS - papers;
    const loanSnap = c.activeLoan
      ? (await db.collection("activeLoans").doc(cardId).get()).data()
      : null;

    // Loan counts for medals
    const loanCounts = await getPersonLoanCounts(cardId);

    // Last 5 history entries for this card
    const histSnap = await db.collection("history")
      .where("cardId", "==", cardId)
      .orderBy("timestamp", "desc")
      .limit(5).get();

    let histRows = "";
    histSnap.forEach(h => {
      const d = h.data();
      const isLoan  = d.action === "loan";
      const isPaper = d.action === "paper";
      const icon    = isPaper ? "📄" : isLoan ? "📤" : "📥";
      let title = "";
      if (isPaper)    title = `Hämtade ${d.amount} papper`;
      else if(isLoan) title = `Lånade ${esc(d.gameTitle)}`;
      else            title = `Lämnade tillbaka ${esc(d.gameTitle)}`;
      histRows += `<div class="list-item" style="padding:10px 14px">
        <div class="item-icon" style="font-size:16px">${icon}</div>
        <div class="item-info">
          <span class="item-title" style="font-size:14px">${title}</span>
          <span class="item-sub">${d.timestamp.toDate().toLocaleString("sv-SE")}</span>
        </div>
      </div>`;
    });

    document.getElementById("view").innerHTML = `
      <div class="view-header"><h2>Profil</h2></div>
      <div class="card-detail">
        <div class="card-detail-avatar">${esc(c.name[0])}</div>
        <div class="card-detail-name">${esc(c.name)}</div>
        <div class="card-detail-id">${esc(cardId)}</div>
        <div class="card-detail-row">
          <div class="card-detail-stat">
            <strong>${left}</strong>papper kvar
          </div>
          <div class="card-detail-stat">
            <strong>${papers}</strong>hämtade denna vecka
          </div>
          <div class="card-detail-stat">
            <strong style="color:${c.activeLoan?'#f87171':'#4ade80'}">${c.activeLoan ? '🔴 Lån' : '🟢 Ledig'}</strong>status
          </div>
          <div class="card-detail-stat">
            <strong style="color:#fcd34d">${c.credits ?? 0} kr</strong>butikssaldo
          </div>
        </div>
        <div style="width:100%">
          <div style="display:flex;justify-content:center;gap:10px;margin-top:4px">${buildCircles(papers)}</div>
        </div>
        ${loanSnap ? `<div class="alert info" style="margin:0;width:100%;text-align:left">
          📦 Lånar just nu: <strong>${esc(loanSnap.gameTitle)}</strong> (sedan ${esc(loanSnap.loanedAt)})
        </div>` : ""}
      </div>
      <div style="margin-bottom:16px">
        <div style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:8px">🏅 Medaljer</div>
        <div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:14px">
          ${buildMedals(loanCounts.spel, loanCounts.pyssel)}
        </div>
      </div>
      ${histRows ? `<div class="shop-section-title" style="font-size:12px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:8px">Senaste aktivitet</div>
      <div class="list" style="margin-bottom:16px">${histRows}</div>` : ""}
      <button class="back-btn" onclick="navigate('students', document.getElementById('nav-students'))">← Tillbaka till elever</button>`;
  } catch(e) { showError(e); }
}

// ═══════════════════════════════════════════
//  SHOP: EXECUTE PURCHASE
// ═══════════════════════════════════════════
async function executePurchase(cardId, itemId, price, btn) {
  if (btn) { btn.disabled = true; btn.style.cursor = "wait"; btn.textContent = "Sparar..."; }
  try {
    const cardRef  = db.collection("cards").doc(cardId);
    const cardData = (await cardRef.get()).data();
    const credits  = cardData.credits ?? 0;

    if (credits < price) {
      showToast("❌ Inte tillräckligt med kr");
      if (btn) { btn.disabled = false; btn.style.cursor = ""; btn.innerHTML = "🛒 Köp"; }
      return;
    }

    // Get item data
    const itemDoc  = await db.collection("shopItems").doc(itemId).get();
    const itemName = itemDoc.exists ? itemDoc.data().name : "Vara";
    const itemData = itemDoc.exists ? itemDoc.data() : {};

    // Check purchase limits
    if (itemData.limitType && itemData.limitType !== "none") {
      const histQuery = db.collection("history")
        .where("cardId", "==", cardId)
        .where("action", "==", "purchase")
        .where("itemId", "==", itemId);

      const histSnap = await histQuery.get();

      if (itemData.limitType === "total") {
        if (histSnap.size >= (itemData.limitCount || 1)) {
          showToast(`❌ ${cardData.name} har redan köpt ${itemName} maximalt antal gånger`);
          if (btn) { btn.disabled = false; btn.style.cursor = ""; btn.innerHTML = "🛒 Köp"; }
          return;
        }
      } else if (itemData.limitType === "weekly") {
        const thisWeekStart = (() => {
          const now = new Date(); const day = now.getDay() || 7;
          const mon = new Date(now); mon.setHours(0,0,0,0); mon.setDate(now.getDate() - day + 1);
          return mon;
        })();
        const weekCount = histSnap.docs.filter(d =>
          d.data().timestamp.toDate() >= thisWeekStart
        ).length;
        if (weekCount >= (itemData.limitCount || 1)) {
          showToast(`❌ ${cardData.name} har redan köpt ${itemName} ${itemData.limitCount}× denna vecka`);
          if (btn) { btn.disabled = false; btn.style.cursor = ""; btn.innerHTML = "🛒 Köp"; }
          return;
        }
      }
    }

    const newBalance = credits - price;
    await cardRef.update({ credits: newBalance });

    await db.collection("history").add({
      cardId, name: cardData.name,
      action: "purchase", itemId,
      itemName, price,
      balanceBefore: credits, balanceAfter: newBalance,
      timestamp: firebase.firestore.Timestamp.now()
    });

    // Send ntfy notification if enabled for this item
    if (itemData.notify) {
      const title = itemData.notifyTitle || `${itemData.icon || "🛍️"} ${itemName} köpt!`;
      const body  = itemData.notifyBody
        ? `${cardData.name}: ${itemData.notifyBody}`
        : `${cardData.name} har köpt ${itemName} (${price} kr) — ${newBalance} kr kvar`;
      await sendNtfy({ title, body, priority: "high" });
    }

    showToast("✅ " + cardData.name + " köpte " + itemName + " — " + newBalance + " kr kvar");
    await showShopForCard(cardId);
  } catch(e) {
    if (btn) { btn.disabled = false; btn.style.cursor = ""; btn.innerHTML = "🛒 Köp"; }
    showError(e);
  }
}


// ═══════════════════════════════════════════
//  MISSIONS
// ═══════════════════════════════════════════

async function showMissions(cardId) {
  try {
    const cardRef = db.collection("cards").doc(cardId);
    const card    = (await cardRef.get()).data();

    // Check if already has active mission
    const activeDoc = await db.collection("activeMissions").doc(cardId).get();
    if (activeDoc.exists) {
      const m = activeDoc.data();
      document.getElementById("view").innerHTML = `
        <div class="view-header"><h2>Uppdrag</h2></div>
        <div class="mission-active">
          <div style="font-size:12px;color:#fcd34d;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:8px">⏳ Du har ett pågående uppdrag</div>
          <div class="mission-active-title">${m.icon} ${esc(m.name)}</div>
          <div class="mission-active-desc">${esc(m.desc || "")}</div>
          <div class="mission-active-reward">+${m.reward} kr vid godkännande</div>
          <div class="action-grid">
            <button class="action-btn secondary" onclick="cancelMission('${esc(cardId)}')">✖ Avbryt uppdrag</button>
            <button class="action-btn primary"   onclick="approveMissionPrompt('${esc(cardId)}')">✅ Admin godkänn</button>
          </div>
        </div>
        <button class="back-btn" onclick="handleCardScan('${esc(cardId)}')">← Tillbaka</button>`;
      return;
    }

    // Show available missions
    const snap = await db.collection("missions").where("active","==",true).get();
    if (snap.empty) {
      document.getElementById("view").innerHTML = `
        <div class="view-header"><h2>Uppdrag</h2></div>
        <div class="empty-state">Inga uppdrag tillgängliga just nu</div>
        <button class="back-btn" onclick="handleCardScan('${esc(cardId)}')">← Tillbaka</button>`;
      return;
    }

    let rows = "";
    snap.forEach(doc => {
      const m = doc.data();
      rows += `<div class="mission-item" onclick="selectMission('${esc(cardId)}','${doc.id}')">
        <div class="mission-icon">${m.icon || "📋"}</div>
        <div class="mission-info">
          <div class="mission-name">${esc(m.name)}</div>
          <div class="mission-desc">${esc(m.desc || "")}</div>
        </div>
        <div class="mission-reward">+${m.reward} kr</div>
      </div>`;
    });

    document.getElementById("view").innerHTML = `
      <div class="view-header"><h2>Välj uppdrag</h2><span class="badge">${esc(card.name)}</span></div>
      <p style="font-size:14px;color:var(--text-muted);margin-bottom:16px">Utför uppdraget och få din belöning godkänd av admin.</p>
      ${rows}
      <button class="back-btn" style="margin-top:8px" onclick="handleCardScan('${esc(cardId)}')">← Tillbaka</button>`;
  } catch(e) { showError(e); }
}

async function selectMission(cardId, missionId) {
  try {
    const missionDoc = await db.collection("missions").doc(missionId).get();
    const mission    = missionDoc.data();
    const card       = (await db.collection("cards").doc(cardId).get()).data();

    document.getElementById("view").innerHTML = `
      <div class="view-header"><h2>Ta uppdrag</h2></div>
      <div class="mission-active">
        <div class="mission-active-title">${mission.icon || "📋"} ${esc(mission.name)}</div>
        <div class="mission-active-desc">${esc(mission.desc || "")}</div>
        <div class="mission-active-reward">+${mission.reward} kr</div>
        <p style="font-size:13px;color:var(--text-muted);margin-bottom:14px">Utför uppdraget och skanna kortet igen för att få det godkänt av admin.</p>
        <div class="action-grid">
          <button class="action-btn secondary" onclick="showMissions('${esc(cardId)}')">← Tillbaka</button>
          <button class="action-btn primary" onclick="confirmSelectMission('${esc(cardId)}','${missionId}')">✅ Jag tar det!</button>
        </div>
      </div>`;
  } catch(e) { showError(e); }
}

async function confirmSelectMission(cardId, missionId) {
  try {
    const missionDoc = await db.collection("missions").doc(missionId).get();
    const mission    = missionDoc.data();
    const card       = (await db.collection("cards").doc(cardId).get()).data();
    await db.collection("activeMissions").doc(cardId).set({
      cardId, missionId, name: mission.name, desc: mission.desc || "",
      icon: mission.icon || "📋", reward: mission.reward,
      takenAt: new Date().toLocaleString("sv-SE"),
      cardName: card.name
    });
    showToast(`✅ ${card.name} har tagit uppdraget: ${mission.name}`);
    await handleCardScan(cardId);
  } catch(e) { showError(e); }
}

async function cancelMission(cardId) {
  const card = (await db.collection("cards").doc(cardId).get()).data();
  showConfirmModal("Avbryt uppdrag", `Vill du avbryta uppdraget för ${card.name}?`, "✖️", async () => {
    await db.collection("activeMissions").doc(cardId).delete();
    showToast(`Uppdraget avbrutet`);
    await handleCardScan(cardId);
  });
}

async function approveMissionPrompt(cardId) {
  requireAdminAuth("Godkänn uppdrag", async () => {
    await approveMission(cardId);
  });
}

async function approveMission(cardId) {
  try {
    const missionDoc = await db.collection("activeMissions").doc(cardId).get();
    if (!missionDoc.exists) { showToast("Inget aktivt uppdrag"); return; }
    const mission  = missionDoc.data();
    const cardRef  = db.collection("cards").doc(cardId);
    const cardData = (await cardRef.get()).data();
    const newBal   = (cardData.credits || 0) + mission.reward;

    await cardRef.update({ credits: newBal });
    await db.collection("activeMissions").doc(cardId).delete();
    await db.collection("history").add({
      cardId, name: cardData.name, action: "mission",
      missionName: mission.name, reward: mission.reward,
      balanceAfter: newBal, timestamp: firebase.firestore.Timestamp.now()
    });

    showToast(`✅ ${cardData.name} fick +${mission.reward} kr för "${mission.name}"!`);
    await handleCardScan(cardId);
  } catch(e) { showError(e); }
}

// ── Admin: add/remove missions ──
async function loadMissionList() {
  const el = document.getElementById("missionList");
  if (!el) return;
  try {
    const snap = await db.collection("missions").orderBy("name").get();
    if (snap.empty) { el.innerHTML = `<div style="font-size:13px;color:var(--text-muted)">Inga uppdrag ännu</div>`; return; }
    let rows = "";
    snap.forEach(doc => {
      const m = doc.data();
      rows += `<div class="admin-item-row">
        <span style="font-size:20px">${m.icon||"📋"}</span>
        <div class="item-name">${esc(m.name)}</div>
        <span class="item-meta">${m.reward} kr</span>
        <button class="admin-delete-btn" onclick="deleteMission('${doc.id}')">Ta bort</button>
      </div>`;
    });
    el.innerHTML = rows;
  } catch(e) { el.innerHTML = `<div style="color:#f87171">Kunde inte ladda</div>`; }
}

async function addMission(btn) {
  const icon   = document.getElementById("missionIcon")?.value.trim() || "📋";
  const name   = document.getElementById("missionName")?.value.trim();
  const desc   = document.getElementById("missionDesc")?.value.trim();
  const reward = parseInt(document.getElementById("missionReward")?.value) || 0;
  if (!name || reward < 1) { showToast("Ange namn och belöning"); return; }
  if (btn) { btn.disabled = true; btn.style.cursor = "wait"; btn.textContent = "Sparar..."; }
  try {
    await db.collection("missions").add({ icon, name, desc, reward, active: true });
    showToast(`✅ Uppdrag "${name}" tillagt`);
    document.getElementById("missionName").value = "";
    document.getElementById("missionDesc").value = "";
    document.getElementById("missionReward").value = "";
    document.getElementById("missionIcon").value = "";
    loadMissionList();
  } catch (e) {
    showError(e);
  } finally {
    if (btn) { btn.disabled = false; btn.style.cursor = ""; btn.textContent = "+ Lägg till"; }
  }
}

async function deleteMission(id) {
  showConfirmModal("Ta bort uppdrag", "Är du säker på att du vill ta bort uppdraget?", "🗑️", async () => {
    await db.collection("missions").doc(id).delete();
    showToast("Uppdrag borttaget");
    loadMissionList();
  });
}

// ── Admin: add/remove shop items ──
async function loadShopItemList() {
  const el = document.getElementById("shopItemList");
  if (!el) return;
  try {
    const snap = await db.collection("shopItems").get();
    if (snap.empty) { el.innerHTML = `<div style="font-size:13px;color:var(--text-muted)">Inga varor ännu</div>`; return; }
    let rows = "";
    snap.forEach(doc => {
      const s = doc.data();
      const notifyBadge = s.notify
        ? `<span style="font-size:11px;background:rgba(79,142,247,0.15);color:#93c5fd;border-radius:10px;padding:2px 7px;font-weight:600">📲 Notis på</span>`
        : `<span style="font-size:11px;color:var(--text-muted)">Ingen notis</span>`;
      let limitBadge = "";
      if (s.limitType === "total")  limitBadge = `<span style="font-size:11px;background:rgba(245,158,11,0.15);color:#fcd34d;border-radius:10px;padding:2px 7px;font-weight:600">Max ${s.limitCount}× totalt</span>`;
      if (s.limitType === "weekly") limitBadge = `<span style="font-size:11px;background:rgba(34,197,94,0.15);color:#4ade80;border-radius:10px;padding:2px 7px;font-weight:600">Max ${s.limitCount}×/vecka</span>`;
      rows += `<div class="admin-item-row">
        <span style="font-size:20px">${s.icon||"🛍️"}</span>
        <div class="item-name">${esc(s.name)}</div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:3px">
          <span class="item-meta">${s.price} kr</span>
          ${notifyBadge}
          ${limitBadge}
        </div>
        <button class="admin-delete-btn" onclick="deleteShopItem('${doc.id}')">Ta bort</button>
      </div>`;
    });
    el.innerHTML = rows;
  } catch(e) { el.innerHTML = `<div style="color:#f87171">Kunde inte ladda</div>`; }
}

async function addShopItem(btn) {
  const icon         = document.getElementById("shopIcon")?.value.trim() || "🛍️";
  const name         = document.getElementById("shopName")?.value.trim();
  const desc         = document.getElementById("shopDesc")?.value.trim() || "";
  const price        = parseInt(document.getElementById("shopPrice")?.value) || 0;
  const notify       = document.getElementById("shopNotify")?.checked ?? false;
  const notifyTitle  = document.getElementById("shopNotifyTitle")?.value.trim() || `${icon} ${name} köpt!`;
  const notifyBody   = document.getElementById("shopNotifyBody")?.value.trim() || `En elev har köpt ${name}`;
  const limitType    = document.getElementById("shopLimitType")?.value || "none";
  const limitCount   = parseInt(document.getElementById("shopLimitCount")?.value) || 1;
  if (!name || price < 1) { showToast("Ange namn och pris"); return; }
  if (btn) { btn.disabled = true; btn.style.cursor = "wait"; btn.textContent = "Sparar..."; }
  try {
    await db.collection("shopItems").add({ icon, name, desc, price, notify, notifyTitle, notifyBody, limitType, limitCount });
    showToast(`✅ "${name}" tillagd i butiken`);
    document.getElementById("shopName").value = "";
    document.getElementById("shopDesc").value = "";
    document.getElementById("shopPrice").value = "";
    document.getElementById("shopIcon").value = "";
    document.getElementById("shopNotifyTitle").value = "";
    document.getElementById("shopNotifyBody").value = "";
    document.getElementById("shopNotify").checked = true;
    document.getElementById("shopLimitType").value = "none";
    document.getElementById("shopLimitCount").value = "1";
    loadShopItemList();
  } catch (e) {
    showError(e);
  } finally {
    if (btn) { btn.disabled = false; btn.style.cursor = ""; btn.textContent = "+ Lägg till"; }
  }
}

async function deleteShopItem(id) {
  showConfirmModal("Ta bort vara", "Är du säker på att du vill ta bort varan?", "🗑️", async () => {
    await db.collection("shopItems").doc(id).delete();
    showToast("Vara borttagen");
    loadShopItemList();
  });
}


// ═══════════════════════════════════════════
//  GAME PROFILE
// ═══════════════════════════════════════════
async function showGameProfile(gameId, encodedTitle, category) {
  const gameTitle = decodeURIComponent(encodedTitle);
  const backView  = category === "pyssel" ? "pyssel" : "games";
  const backNavId = category === "pyssel" ? "nav-pyssel" : "nav-games";
  const icon      = category === "pyssel" ? "✂️" : "🎮";

  setView(`<div class="view-header"><h2>${esc(gameTitle)}</h2></div><div class="loading">Laddar...</div>`);
  try {
    const gameDoc = await db.collection("games").doc(gameId).get();
    const game    = gameDoc.data();

    // Fetch last 10 loans of this game from history
    const histSnap = await db.collection("history")
      .where("gameId", "==", gameId)
      .where("action", "==", "loan")
      .orderBy("timestamp", "desc")
      .limit(10).get();

    // Who currently has it?
    let currentBorrower = null;
    if (game.isLoaned) {
      const loanSnap = await db.collection("activeLoans").where("gameId","==",gameId).get();
      if (!loanSnap.empty) currentBorrower = loanSnap.docs[0].data();
    }

    // Count total loans per person
    const loanCount = {};
    histSnap.forEach(d => {
      const name = d.data().name;
      loanCount[name] = (loanCount[name] || 0) + 1;
    });

    let histRows = "";
    histSnap.forEach(doc => {
      const h = doc.data();
      histRows += `<div class="list-item" style="padding:10px 14px">
        <div class="item-icon avatar" style="font-size:13px;width:32px;height:32px">${esc(h.name[0])}</div>
        <div class="item-info">
          <span class="item-title" style="font-size:14px">${esc(h.name)}</span>
          <span class="item-sub">${h.timestamp.toDate().toLocaleString("sv-SE")}</span>
        </div>
      </div>`;
    });

    // Most frequent borrower
    const topBorrower = Object.entries(loanCount).sort((a,b)=>b[1]-a[1])[0];

    document.getElementById("view").innerHTML = `
      <div class="view-header"><h2>${esc(gameTitle)}</h2></div>

      <!-- Game card -->
      <div class="card-detail" style="margin-bottom:16px">
        <div class="card-detail-avatar" style="font-size:32px;background:var(--surface-2)">${icon}</div>
        <div class="card-detail-name">${esc(gameTitle)}</div>
        <div class="card-detail-id">${esc(gameId)}</div>
        <div class="card-detail-row">
          <div class="card-detail-stat">
            <strong style="color:${game.isLoaned?'#f87171':'#4ade80'}">${game.isLoaned?'🔴 Utlånad':'🟢 Tillgänglig'}</strong>status
          </div>
          <div class="card-detail-stat">
            <strong>${histSnap.size}</strong>senaste lån
          </div>
          ${topBorrower ? `<div class="card-detail-stat">
            <strong style="font-size:14px">${esc(topBorrower[0])}</strong>lånar mest (${topBorrower[1]}×)
          </div>` : ""}
        </div>
        ${currentBorrower ? `<div class="alert info" style="margin:0;width:100%;text-align:left">
          📦 Lånas just nu av <strong>${esc(currentBorrower.name)}</strong> sedan ${esc(currentBorrower.loanedAt)}
        </div>` : ""}
      </div>

      <!-- Loan history -->
      ${histRows ? `
        <div class="stats-section-title" style="margin-bottom:8px">Senast lånad av</div>
        <div class="list" style="margin-bottom:16px">${histRows}</div>
      ` : `<div class="empty-state">Spelet har inte lånats ut än</div>`}

      <button class="back-btn" onclick="navigate('${backView}', document.getElementById('${backNavId}'))">← Tillbaka</button>`;
  } catch(e) { showError(e); }
}


// ═══════════════════════════════════════════
//  SHOP VIEW (empty for now)
// ═══════════════════════════════════════════
async function showShopForCard(cardId) {
  try {
    const cardRef = db.collection("cards").doc(cardId);
    const cardDoc = await cardRef.get();
    if (!cardDoc.exists) { showToast("❌ Eleven hittades inte"); return; }
    const card    = cardDoc.data();
    const credits = card.credits ?? 0;

    // Load from Firestore
    const shopSnap   = await db.collection("shopItems").get();
    const shopItems  = [];
    shopSnap.forEach(doc => shopItems.push({ id: doc.id, ...doc.data() }));

    // Build shop HTML safely without nested template literals
    let productHtml = "";
    if (shopItems.length === 0) {
      productHtml = `<div class="shop-empty">
        <div class="shop-empty-icon">🛒</div>
        <div class="shop-empty-text">Butiken är tom just nu.<br>Varor kommer att läggas till snart!</div>
      </div>`;
    } else {
      let itemsHtml = "";
      shopItems.forEach(p => {
        const cantAfford = credits < p.price;
        const buyAction = cantAfford
          ? ""
          : `executePurchase('${esc(cardId)}','${p.id}',${p.price}, this)`;
        itemsHtml += `<div class="shop-item ${cantAfford ? 'cant-afford' : ''}">
          <div class="shop-item-icon">${p.icon || "🛍️"}</div>
          <div class="shop-item-name">${esc(p.name)}</div>
          <div class="shop-item-desc">${esc(p.desc || "")}</div>
          <div class="shop-item-price">🪙 ${p.price} kr</div>
          <button class="shop-buy-btn" ${cantAfford ? "disabled" : ""}
            onclick="${cantAfford ? "showToast('❌ Inte tillräckligt med kr')" : buyAction}">
            ${cantAfford ? "❌ Råd inte" : "🛒 Köp"}
          </button>
        </div>`;
      });
      productHtml = `<div class="shop-grid">${itemsHtml}</div>`;
    }


    document.getElementById("view").innerHTML = `
      <div class="view-header"><h2>Butik</h2></div>
      <div class="card-profile" style="margin-bottom:16px">
        <div class="profile-avatar">${esc(card.name[0])}</div>
        <div class="profile-name">${esc(card.name)}</div>
        <div class="credit-banner">🪙 <strong>${credits} kr</strong> butikssaldo</div>
      </div>
      ${productHtml}
      <button class="back-btn" onclick="handleCardScan('${esc(cardId)}')">← Tillbaka</button>`;
  } catch(e) { showError(e); }
}
// ═══════════════════════════════════════════
//  TEST ACCOUNT
// ═══════════════════════════════════════════
const TEST_CARD_ID   = "TEST-00";
const TEST_CARD_NAME = "Testelev";

async function openTestAccount() {
  const testRef = db.collection("cards").doc(TEST_CARD_ID);
  const testDoc = await testRef.get();
  if (!testDoc.exists) {
    await testRef.set({
      name: TEST_CARD_NAME,
      activeLoan: false,
      papers: 0,
      lastPaperWeek: getISOWeek(),
      credits: 9999,
      isTestAccount: true
    });
  } else {
    if ((testDoc.data().credits ?? 0) < 500) {
      await testRef.update({ credits: 9999 });
    }
  }
  // handleCardScan will render the view — test banner is added inside it via isTest check
  await handleCardScan(TEST_CARD_ID);
}

async function resetTestAccount() {
  const testRef = db.collection("cards").doc(TEST_CARD_ID);
  // Return any active loan
  const loanDoc = await db.collection("activeLoans").doc(TEST_CARD_ID).get();
  if (loanDoc.exists) {
    const loan = loanDoc.data();
    const batch = db.batch();
    batch.update(testRef, { activeLoan: false, currentGame: firebase.firestore.FieldValue.delete() });
    batch.update(db.collection("games").doc(loan.gameId), { isLoaned: false });
    batch.delete(loanDoc.ref);
    await batch.commit();
  }
  await testRef.update({ credits: 9999, papers: 0, activeLoan: false });
  showToast("🧪 Testkonto återställt");
}

async function deleteGame(gameId, title, isLoaned) {
  const msg = isLoaned 
    ? `"${title}" är just nu utlånad! Vill du ta bort den ändå?` 
    : `Är du säker på att du vill ta bort "${title}"?`;
  showConfirmModal("Ta bort spel", msg, "🗑️", async () => {
    const batch = db.batch();
    batch.delete(db.collection("games").doc(gameId));
    if (isLoaned) {
      const loanSnap = await db.collection("activeLoans").where("gameId","==",gameId).get();
      loanSnap.forEach(doc => batch.delete(doc.ref));
    }
    await batch.commit();
    showToast(`"${title}" borttagen`);
    loadAdminGameList(currentGameFilter);
  });
}
