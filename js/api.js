// ═══════════════════════════════════════════
//  FIREBASE
// ═══════════════════════════════════════════
firebase.initializeApp({
  apiKey: "AIzaSyBev6L3uR0TGhXIleHRd06m6Ix-rB5uBzs",
  authDomain: "spelutlaning.firebaseapp.com",
  projectId: "spelutlaning",
  storageBucket: "spelutlaning.firebasestorage.app",
  messagingSenderId: "277413784174",
  appId: "1:277413784174:web:5c1c9d180b020e73a6547f"
});
const db = firebase.firestore();

// ═══════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════
const INIT_VERSION = "v5";
async function initData() {
  try {
    const meta = await db.collection("meta").doc("init").get();
    if (meta.exists && meta.data().version === INIT_VERSION) return;
    const batch = db.batch();
    cardsData.forEach(c =>
      batch.set(db.collection("cards").doc(c.cardId),
        {name:c.name, activeLoan:false, papers:0, lastPaperWeek: getISOWeek()},
        {merge:true})
    );
    gamesData.forEach(g =>
      batch.set(db.collection("games").doc(g.gameId),
        {title:g.title, isLoaned:false, category:g.category}, {merge:true})
    );
    batch.set(db.collection("meta").doc("init"), {version:INIT_VERSION, at:firebase.firestore.Timestamp.now()});
    await batch.commit();
  } catch(e) { console.warn("initData:", e); }
}
initData();

// Safety: ensure overlay never blocks on load
window.addEventListener('DOMContentLoaded', () => {
  document.querySelector('.overlay')?.classList.remove('active');
  document.querySelector('.sidebar')?.classList.remove('open');
});

