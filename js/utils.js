// ═══════════════════════════════════════════
//  ONLINE / OFFLINE
// ═══════════════════════════════════════════
window.addEventListener("online", () => {
  document.getElementById("offline-banner").classList.remove("show");
  document.getElementById("onlineDot").classList.remove("offline");
});
window.addEventListener("offline", () => {
  document.getElementById("offline-banner").classList.add("show");
  document.getElementById("onlineDot").classList.add("offline");
});
if (!navigator.onLine) {
  document.getElementById("offline-banner").classList.add("show");
  document.getElementById("onlineDot").classList.add("offline");
}

// ═══════════════════════════════════════════
//  XSS SAFETY
// ═══════════════════════════════════════════
function esc(str) {
  return String(str)
    .replace(/&/g,"&amp;").replace(/</g,"&lt;")
    .replace(/>/g,"&gt;").replace(/"/g,"&quot;")
    .replace(/'/g,"&#39;");
}

// ═══════════════════════════════════════════
//  NTFY NOTIFICATIONS
// ═══════════════════════════════════════════
function getNtfyChannel() {
  return localStorage.getItem("ntfy_channel") || "";
}
function saveNtfyChannel(channel) {
  localStorage.setItem("ntfy_channel", channel.trim());
}

function getPaperNotify() {
  return localStorage.getItem("ntfy_paper_notify") === "true";
}
function togglePaperNotify() {
  const cb = document.getElementById("paperNotifyToggle");
  if (!cb) return;
  const newVal = cb.checked;
  localStorage.setItem("ntfy_paper_notify", newVal ? "true" : "false");
  showToast(newVal ? "📄 Papper-notiser aktiverade" : "📄 Papper-notiser avstängda");
}

async function sendNtfy({ title, body, priority = "default" }) {
  const channel = getNtfyChannel();
  if (!channel) return; // no channel configured, silently skip
  try {
    await fetch(`https://ntfy.sh/${encodeURIComponent(channel)}`, {
      method: "POST",
      body: body,
      headers: {
        "Title": title,
        "Priority": priority,
        "Tags": "shopping_cart"
      }
    });
  } catch(e) {
    console.warn("ntfy failed:", e);
  }
}

async function testNtfy() {
  const channel = getNtfyChannel();
  if (!channel) { showToast("❌ Ange en kanal först"); return; }
  await sendNtfy({
    title: "✅ Testnotis från Spelutlåning",
    body: "Notiser fungerar! Du är redo.",
    priority: "default"
  });
  showToast("📲 Testnotis skickad till " + channel);
}

// ═══════════════════════════════════════════
//  SCANNER
// ═══════════════════════════════════════════
let qrScanner = null, scannerRunning = false, scanLock = false;

async function stopScanner() {
  if (qrScanner && scannerRunning) {
    try { await qrScanner.stop(); } catch(_) {}
    scannerRunning = false;
  }
}

function startScanner(onScan) {
  stopScanner().then(() => {
    scanLock = false;
    qrScanner = new Html5Qrcode("reader");
    qrScanner.start(
      {facingMode:"environment"},
      {fps:10, qrbox:{width:250,height:250}},
      code => {
        if (scanLock) return;
        scanLock = true;
        const el = document.getElementById("scanResult");
        if (el) el.textContent = "Skannar: " + code;
        onScan(code);
      },
      () => {}
    )
    .then(() => { scannerRunning = true; })
    .catch(() => {
      const el = document.getElementById("scanResult");
      if (el) el.textContent = "Kunde inte starta kamera — använd manuell inmatning nedan.";
    });
  });
}

// ═══════════════════════════════════════════
//  SEARCH FILTER
// ═══════════════════════════════════════════
function filterList(query) {
  const q = query.toLowerCase().trim();
  const items = document.querySelectorAll("#itemList .list-item");
  let visible = 0;
  items.forEach(item => {
    const match = !q || (item.dataset.search || "").includes(q);
    item.classList.toggle("hidden", !match);
    if (match) visible++;
  });
  const noRes = document.getElementById("noResults");
  if (noRes) noRes.classList.toggle("visible", visible === 0 && q.length > 0);
}

// ═══════════════════════════════════════════
//  TOAST & ERROR
// ═══════════════════════════════════════════
let toastTimer = null;
function showToast(msg) {
  let toast = document.getElementById("toast");
  if (!toast) {
    toast = document.createElement("div"); toast.id = "toast";
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add("show");
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 3500);
}

function showError(e) {
  console.error(e);
  document.getElementById("view").innerHTML = `
    <div class="view-header"><h2>Något gick fel</h2></div>
    <div class="alert error">⚠️ ${esc(e.message || "Okänt fel")} — kontrollera nätverket och försök igen.</div>
    <button class="back-btn" onclick="navigate('scan', document.getElementById('nav-scan'))">← Tillbaka</button>`;
}

