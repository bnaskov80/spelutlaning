// ═══════════════════════════════════════════
//  MEDALS
// ═══════════════════════════════════════════
const SCISSORS_THRESHOLDS = [5, 10, 25, 50, 100];
const ROCKET_THRESHOLDS   = [5, 10, 25, 50, 100];

function getMedalInfo(type, count) {
  // Returns array of medal objects {threshold, earned, cssClass, emoji, label}
  const thresholds = type === "scissors" ? SCISSORS_THRESHOLDS : ROCKET_THRESHOLDS;
  const emoji      = type === "scissors" ? "✂️" : "🚀";
  return thresholds.map(t => ({
    threshold: t,
    earned: count >= t,
    cssClass: `medal-${type}-${t}`,
    emoji,
    label: `×${t}`
  }));
}

function buildMedals(spelCount, pysselCount) {
  const scissors = getMedalInfo("scissors", pysselCount);
  const rockets  = getMedalInfo("rocket",   spelCount);
  const rows = [
    { title: "✂️ Pyssel-medaljer", medals: scissors },
    { title: "🚀 Spel-medaljer",   medals: rockets  },
  ];
  return rows.map(row => `
    <div style="margin-bottom:10px">
      <div style="font-size:11px;color:var(--text-muted);font-weight:700;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:6px">${row.title}</div>
      <div class="medal-row">
        ${row.medals.map(m => `
          <div class="medal ${m.cssClass} ${m.earned ? '' : 'medal-locked'}" title="${m.earned ? 'Uppnådd!' : `Lås upp vid ${m.threshold} lån`}">
            ${m.emoji}
            <span class="medal-label">${m.label}</span>
          </div>`).join("")}
      </div>
    </div>`).join("");
}

async function getPersonLoanCounts(cardId) {
  const histSnap = await db.collection("history")
    .where("cardId", "==", cardId)
    .where("action", "==", "loan")
    .get();
  let spel = 0, pyssel = 0;
  histSnap.forEach(d => {
    const cat = d.data().category;
    if (cat === "pyssel") pyssel++;
    else spel++;
  });
  return { spel, pyssel };
}

// ═══════════════════════════════════════════
//  STATISTICS
// ═══════════════════════════════════════════
async function loadStats() {
  const snap = await db.collection("history").orderBy("timestamp","desc").get();
  const docs  = snap.docs.map(d => d.data());

  const loanDocs   = docs.filter(d => d.action === "loan");
  const paperDocs  = docs.filter(d => d.action === "paper");

  // Split loans by category
  const spelDocs   = loanDocs.filter(d => d.category === "spel" || !d.category);
  const pysselDocs = loanDocs.filter(d => d.category === "pyssel");

  // Loans per person (all)
  const loansByPerson = {};
  loanDocs.forEach(d => { loansByPerson[d.name] = (loansByPerson[d.name] || 0) + 1; });

  // Loans per SPEL only
  const loansByGame = {};
  spelDocs.forEach(d => { loansByGame[d.gameTitle] = (loansByGame[d.gameTitle] || 0) + 1; });

  // Loans per PYSSEL kit
  const loansByPyssel = {};
  pysselDocs.forEach(d => { loansByPyssel[d.gameTitle] = (loansByPyssel[d.gameTitle] || 0) + 1; });

  // Papers per person
  const papersByPerson = {};
  paperDocs.forEach(d => { papersByPerson[d.name] = (papersByPerson[d.name] || 0) + (d.amount || 1); });

  // Loans per weekday — all
  // Only Mon-Fri (1=Mon ... 5=Fri)
  const weekdays = ["Mån","Tis","Ons","Tor","Fre"];
  const weekdayKeys = [1,2,3,4,5];
  const loansByDay = {1:0,2:0,3:0,4:0,5:0};
  loanDocs.forEach(d => { const day = d.timestamp.toDate().getDay(); if (day >= 1 && day <= 5) loansByDay[day]++; });

  // Pyssel per weekday
  const pysselByDay = {1:0,2:0,3:0,4:0,5:0};
  pysselDocs.forEach(d => { const day = d.timestamp.toDate().getDay(); if (day >= 1 && day <= 5) pysselByDay[day]++; });

  // Top lists
  const topBorrowers = Object.entries(loansByPerson).sort((a,b)=>b[1]-a[1]).slice(0,8);
  const topGames     = Object.entries(loansByGame).sort((a,b)=>b[1]-a[1]).slice(0,8);
  const topPyssel    = Object.entries(loansByPyssel).sort((a,b)=>b[1]-a[1]).slice(0,8);
  const topPaper     = Object.entries(papersByPerson).sort((a,b)=>b[1]-a[1]).slice(0,8);
  const maxLoans     = topBorrowers[0]?.[1] || 1;
  const maxGames     = topGames[0]?.[1] || 1;
  const maxPyssel    = topPyssel[0]?.[1] || 1;
  const maxPaper     = topPaper[0]?.[1] || 1;
  const maxDay       = Math.max(...weekdayKeys.map(k => loansByDay[k]), 1);
  const maxPysselDay = Math.max(...weekdayKeys.map(k => pysselByDay[k]), 1);

  // Summary
  const totalLoans   = loanDocs.length;
  const totalPapers  = paperDocs.reduce((s,d) => s + (d.amount||1), 0);
  const uniqueBorrow = Object.keys(loansByPerson).length;
  const topGame      = topGames[0]?.[0] || "–";
  const topPerson    = topBorrowers[0]?.[0] || "–";
  const totalPyssel  = pysselDocs.length;

  // Podium (top 3 borrowers)
  const podiumColors  = ["#f59e0b","#9ca3af","#b45309"];
  const podiumEmojis  = ["🥇","🥈","🥉"];
  const podiumHeights = [110, 80, 60];
  const top3 = topBorrowers.slice(0,3);
  const podiumOrder   = [top3[1], top3[0], top3[2]].filter(Boolean);
  const podiumOrderIdx = top3[1] ? [1,0,2] : [0];
  let podiumHtml = podiumOrder.map((p, i) => {
    const oi = podiumOrderIdx[i];
    return `<div class="podium-item">
      <div class="podium-bar" style="height:${podiumHeights[oi]}px;background:${podiumColors[oi]}20;border:2px solid ${podiumColors[oi]}">${podiumEmojis[oi]}</div>
      <div class="podium-name">${esc(p[0])}</div>
      <div class="podium-count">${p[1]} lån</div>
    </div>`;
  }).join("");

  // Bar helper
  function bars(data, max, colorClass) {
    if (!data.length) return '<div class="empty-state" style="padding:16px">Ingen data ännu</div>';
    return data.map(([name, val]) => `
      <div class="bar-row">
        <div class="bar-name" title="${esc(name)}">${esc(name)}</div>
        <div class="bar-wrap">
          <div class="bar-fill ${colorClass}" style="width:${Math.max(8, Math.round((val/max)*100))}%">${val}</div>
        </div>
      </div>`).join("");
  }

  // Weekday bar helper
  function dayBars(byDay, max, colorClass) {
    return weekdays.map((name, i) => {
      const key = weekdayKeys[i];
      return `<div class="bar-row">
        <div class="bar-name">${name}</div>
        <div class="bar-wrap">
          <div class="bar-fill ${colorClass}" style="width:${byDay[key] ? Math.max(8, Math.round((byDay[key]/max)*100)) : 0}%">${byDay[key]||0}</div>
        </div>
      </div>`;
    }).join("");
  }

  document.getElementById("view").innerHTML = `
    <div class="view-header"><h2>Statistik</h2></div>

    <!-- Summary cards -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-card-icon">📤</div>
        <div class="stat-card-value">${totalLoans}</div>
        <div class="stat-card-label">Totala lån</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-icon">✂️</div>
        <div class="stat-card-value">${totalPyssel}</div>
        <div class="stat-card-label">Pyssel-kit lånade</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-icon">👤</div>
        <div class="stat-card-value">${uniqueBorrow}</div>
        <div class="stat-card-label">Unika låntagare</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-icon">📄</div>
        <div class="stat-card-value">${totalPapers}</div>
        <div class="stat-card-label">Papper hämtade</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-icon">🏆</div>
        <div class="stat-card-value" style="font-size:16px">${esc(topPerson)}</div>
        <div class="stat-card-label">Mest aktiv</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-icon">🎮</div>
        <div class="stat-card-value" style="font-size:14px">${esc(topGame)}</div>
        <div class="stat-card-label">Populäraste spelet</div>
      </div>
    </div>

    <!-- Podium -->
    ${top3.length >= 2 ? `
    <div class="stats-section">
      <div class="stats-section-title">🏆 Topp-låntagare</div>
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:20px 12px">
        <div class="podium">${podiumHtml}</div>
        <div style="display:flex;justify-content:center;gap:24px;font-size:12px;color:var(--text-muted);margin-top:4px">
          <span>🥈 2:a</span><span>🥇 1:a</span><span>🥉 3:e</span>
        </div>
      </div>
    </div>` : ""}

    <!-- Top borrowers -->
    <div class="stats-section">
      <div class="stats-section-title">📤 Mest lån per person</div>
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:16px">
        <div class="bar-chart">${bars(topBorrowers, maxLoans, "blue")}</div>
      </div>
    </div>

    <!-- Top spel only -->
    <div class="stats-section">
      <div class="stats-section-title">🎮 Populäraste spelen</div>
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:16px">
        <div class="bar-chart">${bars(topGames, maxGames, "green")}</div>
      </div>
    </div>

    <!-- Weekday all loans -->
    <div class="stats-section">
      <div class="stats-section-title">📅 Lån per veckodag</div>
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:16px">
        <div class="bar-chart">${dayBars(loansByDay, maxDay, "purple")}</div>
      </div>
    </div>

    <!-- Top pyssel kits -->
    <div class="stats-section">
      <div class="stats-section-title">✂️ Mest lånade pyssel-kit</div>
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:16px">
        <div class="bar-chart">${bars(topPyssel, maxPyssel, "amber")}</div>
      </div>
    </div>

    <!-- Pyssel per weekday -->
    <div class="stats-section">
      <div class="stats-section-title">✂️ Pyssel-kit lånade per veckodag</div>
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:16px">
        <div class="bar-chart">${dayBars(pysselByDay, maxPysselDay, "amber")}</div>
      </div>
    </div>

    <!-- Paper chart -->
    ${paperDocs.length ? `
    <div class="stats-section">
      <div class="stats-section-title">📄 Mest papper hämtat</div>
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:16px">
        <div class="bar-chart">${bars(topPaper, maxPaper, "blue")}</div>
      </div>
    </div>` : ""}
    <button class="back-btn" style="margin-top:16px" onclick="navigate('admin', document.getElementById('nav-admin'))">← Tillbaka</button>
  `;
}
