// ═══════════════════════════════════════════
//  DATA
// ═══════════════════════════════════════════
const cardsData = [
  {cardId:"LK-01",name:"Adam"},{cardId:"LK-02",name:"Aditya"},{cardId:"LK-03",name:"Aleksandar"},
  {cardId:"LK-04",name:"Alice"},{cardId:"LK-05",name:"Alicia-RM"},{cardId:"LK-06",name:"Alicia-P"},
  {cardId:"LK-07",name:"Anlin"},{cardId:"LK-08",name:"Anton"},{cardId:"LK-09",name:"Arvin"},
  {cardId:"LK-10",name:"August"},{cardId:"LK-11",name:"Baran"},{cardId:"LK-12",name:"Bella"},
  {cardId:"LK-13",name:"Danielle"},{cardId:"LK-14",name:"Ellinor"},{cardId:"LK-15",name:"Ema"},
  {cardId:"LK-16",name:"Emilia"},{cardId:"LK-17",name:"Emilija"},{cardId:"LK-18",name:"Emma"},
  {cardId:"LK-19",name:"Freja"},{cardId:"LK-20",name:"Greta"},{cardId:"LK-21",name:"Harry"},
  {cardId:"LK-22",name:"Hildana"},{cardId:"LK-23",name:"Jonathan"},{cardId:"LK-24",name:"Justina"},
  {cardId:"LK-25",name:"Kai"},{cardId:"LK-26",name:"Leia"},{cardId:"LK-27",name:"Leo"},
  {cardId:"LK-28",name:"Leonie"},{cardId:"LK-29",name:"Lillian"},{cardId:"LK-30",name:"Lou"},
  {cardId:"LK-31",name:"Louise"},{cardId:"LK-32",name:"Lovis"},{cardId:"LK-33",name:"Lydia"},
  {cardId:"LK-34",name:"Mateo"},{cardId:"LK-35",name:"Matvei"},{cardId:"LK-36",name:"Maxine"},
  {cardId:"LK-37",name:"Minou"},{cardId:"LK-38",name:"Noa"},{cardId:"LK-39",name:"Noah-V"},
  {cardId:"LK-40",name:"Noelia"},{cardId:"LK-41",name:"Nora"},{cardId:"LK-42",name:"Penny"},
  {cardId:"LK-43",name:"Mia"},{cardId:"LK-44",name:"Sveva"},{cardId:"LK-45",name:"Tage"},
  {cardId:"LK-46",name:"Talya"},{cardId:"LK-47",name:"Theo"},{cardId:"LK-48",name:"Vaani"},
  {cardId:"LK-49",name:"Viggo"},{cardId:"LK-50",name:"Yohan"},{cardId:"LK-51",name:"Jhanvi"}
];

const gamesData = [
  {gameId:"tre_i_rad_1",title:"Tre i rad (1)",category:"spel"},{gameId:"tre_i_rad_2",title:"Tre i rad (2)",category:"spel"},
  {gameId:"tre_i_rad_3",title:"Tre i rad (3)",category:"spel"},{gameId:"fyra_i_rad_1",title:"Fyra i rad (1)",category:"spel"},
  {gameId:"fyra_i_rad_2",title:"Fyra i rad (2)",category:"spel"},{gameId:"fia_med_knuff",title:"Fia med knuff",category:"spel"},
  {gameId:"alphaphet",title:"Alphaphet",category:"spel"},{gameId:"skipo",title:"Skipo",category:"spel"},
  {gameId:"kortlek",title:"Kortlek",category:"spel"},{gameId:"othello",title:"Othello",category:"spel"},
  {gameId:"twister",title:"Twister",category:"spel"},{gameId:"shut_the_box",title:"Shut the box",category:"spel"},
  {gameId:"lusen",title:"Lusen",category:"spel"},{gameId:"skipbo",title:"Skipbo",category:"spel"},
  {gameId:"uno_1",title:"Uno (1)",category:"spel"},{gameId:"uno_2",title:"Uno (2)",category:"spel"},
  {gameId:"vem_där",title:"Vem där",category:"spel"},{gameId:"rush_hour_1",title:"Rush hour (1)",category:"spel"},
  {gameId:"rush_hour_2",title:"Rush hour (2)",category:"spel"},{gameId:"rush_hour_3",title:"Rush hour (3)",category:"spel"},
  ...Array.from({length:22},(_,i)=>({
    gameId:`pyssel_${String(i+1).padStart(2,'0')}`,
    title:`Pyssel-kit ${String(i+1).padStart(2,'0')}`, category:"pyssel"
  })),
  {gameId:"pyssel_23_vänster",title:"Pyssel-kit 23 (Vänster)",category:"pyssel"},
  {gameId:"pyssel_24_vänster",title:"Pyssel-kit 24 (Vänster)",category:"pyssel"},
  {gameId:"mix_max",title:"MIX-Max",category:"spel"}
];

// ═══════════════════════════════════════════
//  CLASS DATA
// ═══════════════════════════════════════════
const classData = {
  "1A": ["Adam","Aleksandar","Anlin","Anton","August","Bella","Ema","Emilija",
         "Harry","Hildana","Leo","Leonie","Lillian","Lovis","Lydia","Maxine",
         "Mia","Minou","Noa","Noah-V","Noelia","Penny","Sveva","Theo","Vaani","Yohan"],
  "1B": ["Aditya","Alice","Alicia-P","Alicia-RM","Arvin","Baran","Danielle",
         "Ellinor","Emilia","Freja","Greta","Jhanvi","Jonathan","Justina","Kai",
         "Leia","Lou","Louise","Mateo","Matvei","Nora","Tage","Talya","Viggo","Emma"]
};

