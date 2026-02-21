import { useState, useEffect, useRef, useCallback } from "react";

// ═══════════════════════════════════════════════════════════
//  CONSTANTS
// ═══════════════════════════════════════════════════════════

const CREDIT_LIMIT = 800;

const UPGRADES = [
  { id: "shelf",     name: "Display Shelf",   cost: 15,  icon: "🗄️", desc: "+1 customer/day",         effect: "customers+1", unlocked: false, tier: 1 },
  { id: "sign",      name: "Neon Sign",        cost: 25,  icon: "✨", desc: "+2 customers/day",        effect: "customers+2", unlocked: false, tier: 1 },
  { id: "coffee",    name: "Coffee Machine",   cost: 60,  icon: "☕", desc: "+2 coins/min passive",     effect: "passive+2",   unlocked: false, tier: 2 },
  { id: "mixer",     name: "Stand Mixer",      cost: 80,  icon: "🌀", desc: "Halves baking time",       effect: "speed",       unlocked: false, tier: 2 },
  { id: "fridge",    name: "Glass Fridge",     cost: 120, icon: "🧊", desc: "+10 max flour storage",    effect: "storage+10",  unlocked: false, tier: 2 },
  { id: "insurance", name: "Storm Insurance",  cost: 100, icon: "🌂", desc: "No penalty on rainy days", effect: "insurance",   unlocked: false, tier: 3 },
  { id: "oven2",     name: "Second Oven",      cost: 200, icon: "🔥", desc: "Bake 2 items at once",     effect: "oven2",       unlocked: false, tier: 3 },
  { id: "delivery",  name: "Delivery Bike",    cost: 350, icon: "🚲", desc: "+5 coins per bake",        effect: "delivery",    unlocked: false, tier: 4 },
];

const BASE_RECIPES = [
  { id: "bread",     name: "Bread Loaf",       icon: "🍞", flourCost: 2, reward: 4,  time: 4,  locked: false, desc: "Classic staple" },
  { id: "muffin",    name: "Blueberry Muffin", icon: "🫐", flourCost: 3, reward: 6,  time: 5,  locked: true,  desc: "Customer favourite" },
  { id: "croissant", name: "Croissant",        icon: "🥐", flourCost: 4, reward: 9,  time: 7,  locked: true,  desc: "Buttery & flaky" },
  { id: "donut",     name: "Glazed Donut",     icon: "🍩", flourCost: 4, reward: 10, time: 8,  locked: true,  desc: "Sweet treat" },
  { id: "cake",      name: "Strawberry Cake",  icon: "🎂", flourCost: 6, reward: 18, time: 12, locked: true,  desc: "Special occasion" },
  { id: "macaron",   name: "Macarons",         icon: "🪷", flourCost: 5, reward: 22, time: 15, locked: true,  desc: "Premium tier" },
];

const MISSIONS_POOL = [
  { id: "m1",  text: "Save 5 coins",               reward: "🫐 Muffin recipe",       action: "save5",      done: false },
  { id: "m2",  text: "Resist an impulse buy",       reward: "+12 Flour",              action: "resist",     done: false },
  { id: "m3",  text: "Check your balance",          reward: "+6 Coins bonus",         action: "check",      done: false },
  { id: "m4",  text: "Transfer 20 coins to savings",reward: "🥐 Croissant recipe",   action: "save20",     done: false },
  { id: "m5",  text: "Stay under budget today",     reward: "+3 Customers",           action: "budget",     done: false },
  { id: "m6",  text: "Bake 3 items in one day",     reward: "+20 Coins bonus",        action: "bake3",      done: false, bakeCount: 0 },
  { id: "m7",  text: "Invest in sourdough (lvl 3+)",reward: "🍩 Donut recipe",       action: "invest3",    done: false },
  { id: "m8",  text: "Save 50 coins total",         reward: "🎂 Cake recipe",         action: "save50",     done: false },
  { id: "m9",  text: "Pay supplier bill in full",   reward: "+15 Credit Score 💳",    action: "pay_ontime", done: false },
  { id: "m10", text: "Keep credit under 30% limit", reward: "+10 Credit Score 💳",    action: "low_util",   done: false },
];

const BAKERY_EVENTS = [
  { id: "raccoon",  icon: "🦝", msg: "A raccoon stole your flour!",            effect: "bad",  flour: -6 },
  { id: "rush",     icon: "🌟", msg: "Morning rush! Extra customers arrived!",  effect: "good", coins: 10 },
  { id: "rain",     icon: "🌧️", msg: "Rainy day! Customers stayed home.",      effect: "bad",  customers: -2 },
  { id: "sunny",    icon: "☀️", msg: "Gorgeous day! Foot traffic is up.",      effect: "good", customers: 2 },
  { id: "delivery", icon: "🚚", msg: "Flour delivery! +10 flour bonus.",       effect: "good", flour: 10 },
  { id: "health",   icon: "🏥", msg: "Health inspection passed! Reputation+",  effect: "good", happiness: 10 },
  { id: "review",   icon: "⭐", msg: "Viral review! New customers coming.",    effect: "good", customers: 3 },
  { id: "storm",    icon: "⛈️", msg: "Storm! All customers stayed home.",     effect: "bad",  customers: -4, blockable: true },
  { id: "mouse",    icon: "🐭", msg: "Mouse infestation! Flour contaminated.", effect: "bad",  flour: -10 },
  { id: "sale",     icon: "💸", msg: "Competitor sale! Customers sniped.",     effect: "bad",  coins: -3 },
];

const FLOUR_BUY = [
  { amount: 5,  price: 4  },
  { amount: 10, price: 7  },
  { amount: 20, price: 12 },
];

const CREDIT_BANDS = [
  { min: 800, label: "Exceptional", color: "#16a34a", bg: "rgba(22,163,74,0.15)",  border: "rgba(22,163,74,0.4)",  icon: "👑", ovenDesc: "Golden Oven — best rates!" },
  { min: 740, label: "Very Good",   color: "#65a30d", bg: "rgba(101,163,13,0.15)", border: "rgba(101,163,13,0.4)", icon: "✨", ovenDesc: "Warm Oven — near-best rates" },
  { min: 670, label: "Good",        color: "#b45309", bg: "rgba(180,83,9,0.15)",   border: "rgba(180,83,9,0.4)",   icon: "🔥", ovenDesc: "Steady Oven — most loans approved" },
  { min: 580, label: "Fair",        color: "#c2410c", bg: "rgba(194,65,12,0.15)",  border: "rgba(194,65,12,0.4)",  icon: "🌡️", ovenDesc: "Cooling Oven — higher interest rates" },
  { min: 0,   label: "Poor",        color: "#b91c1c", bg: "rgba(185,28,28,0.15)",  border: "rgba(185,28,28,0.4)",  icon: "🪦", ovenDesc: "Cold Oven — loans denied or very costly" },
];

const getCreditBand = (s) => CREDIT_BANDS.find(b => s >= b.min) || CREDIT_BANDS[CREDIT_BANDS.length - 1];
const getLoanRate   = (s) => s >= 740 ? 0.06 : s >= 670 ? 0.10 : s >= 580 ? 0.18 : 0.25;

// ═══════════════════════════════════════════════════════════
//  ROOT COMPONENT
// ═══════════════════════════════════════════════════════════

export default function BakeryApp() {
  // Bakery state
  const [coins, setCoins]             = useState(20);
  const [flour, setFlour]             = useState(18);
  const [maxFlour, setMaxFlour]       = useState(40);
  const [savings, setSavings]         = useState(0);
  const [customers, setCustomers]     = useState(3);
  const [happiness, setHappiness]     = useState(72);
  const [coinHistory, setCoinHistory] = useState([20, 20, 20]);
  const [flourHistory, setFlourHistory] = useState([18, 18, 18]);
  const [upgrades, setUpgrades]       = useState(UPGRADES);
  const [recipes, setRecipes]         = useState(BASE_RECIPES);
  const [missions, setMissions]       = useState(MISSIONS_POOL);
  const [day, setDay]                 = useState(1);
  const [activityLog, setActivityLog] = useState(["[Day 1] ☀️ Your bakery is open!"]);
  const [baking, setBaking]           = useState([]);
  const [bakesToday, setBakesToday]   = useState(0);
  const [sourdoughLevel, setSourdoughLevel] = useState(0);
  const [sourdoughEarned, setSourdoughEarned] = useState(0);
  const [pastryShelf, setPastryShelf] = useState([]);
  const [totalEarned, setTotalEarned] = useState(0);
  const [impulseShown, setImpulseShown] = useState(false);
  const [bakeryEvent, setBakeryEvent] = useState(null);

  // Credit state
  const [creditScore, setCreditScore]     = useState(650);
  const [animScore, setAnimScore]         = useState(650);
  const [scoreHistory, setScoreHistory]   = useState([650]);
  const [creditUsed, setCreditUsed]       = useState(0);
  const [supplierDebt, setSupplierDebt]   = useState(0);
  const [emergencyFund, setEmergencyFund] = useState(0);
  const [loanBalance, setLoanBalance]     = useState(0);
  const [loanRate, setLoanRate]           = useState(0);
  const [totalInterest, setTotalInterest] = useState(0);
  const [creditLog, setCreditLog]         = useState(["[Day 1] 💳 Credit account opened. Score: 650"]);
  const [explainTopic, setExplainTopic]   = useState(null);
  const [scoreFlash, setScoreFlash]       = useState(null);

  // UI state
  const [tab, setTab]                   = useState("bakery");
  const [notification, setNotification] = useState(null);
  const [showChart, setShowChart]       = useState("coins");

  const timerRef   = useRef({});
  const passiveRef = useRef(null);
  const bakingId   = useRef(0);
  const dayRef     = useRef(1);
  const scoreRef   = useRef(650);
  dayRef.current   = day;
  scoreRef.current = creditScore;

  // ── Helpers ──────────────────────────────────────────────
  const notify = useCallback((msg, type = "good") => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3800);
  }, []);

  const addLog = useCallback((msg) => {
    setActivityLog(p => [`[Day ${dayRef.current}] ${msg}`, ...p].slice(0, 40));
  }, []);

  const addCreditLog = useCallback((msg) => {
    setCreditLog(p => [`[Day ${dayRef.current}] ${msg}`, ...p].slice(0, 40));
  }, []);

  const earnCoins = useCallback((amt) => {
    setCoins(c => c + amt);
    setTotalEarned(t => t + amt);
  }, []);

  const changeScore = useCallback((delta, reason) => {
    const next = Math.max(300, Math.min(850, scoreRef.current + delta));
    setCreditScore(next);
    setScoreHistory(h => [...h, next]);
    setScoreFlash({ delta, reason });
    setTimeout(() => setScoreFlash(null), 3000);
    addCreditLog(`${delta > 0 ? "📈" : "📉"} ${delta > 0 ? "+" : ""}${delta} pts: ${reason} → ${next}`);
  }, [addCreditLog]);

  // Animate score number
  useEffect(() => {
    if (animScore === creditScore) return;
    const step = creditScore > animScore ? 1 : -1;
    const t = setInterval(() => {
      setAnimScore(s => { if (s === creditScore) { clearInterval(t); return s; } return s + step; });
    }, 14);
    return () => clearInterval(t);
  }, [creditScore]);

  // Passive income
  useEffect(() => {
    const coffeeOwned = upgrades.find(u => u.id === "coffee")?.unlocked;
    const rate = sourdoughLevel * 0.6 + (coffeeOwned ? 2 : 0);
    clearInterval(passiveRef.current);
    if (rate > 0) {
      passiveRef.current = setInterval(() => {
        setCoins(c => c + rate / 60);
        setSourdoughEarned(e => e + sourdoughLevel * 0.6 / 60);
      }, 1000);
    }
    return () => clearInterval(passiveRef.current);
  }, [sourdoughLevel, upgrades]);

  // Baking engine
  const startBaking = (recipeId) => {
    const recipe = recipes.find(r => r.id === recipeId);
    if (!recipe || recipe.locked) return;
    const hasOven2 = upgrades.find(u => u.id === "oven2")?.unlocked;
    const hasMixer = upgrades.find(u => u.id === "mixer")?.unlocked;
    if (baking.length >= (hasOven2 ? 2 : 1)) { notify("Ovens are full!", "bad"); return; }
    if (flour < recipe.flourCost) { notify("Not enough flour! Buy more in Market.", "bad"); return; }
    setFlour(f => f - recipe.flourCost);
    const bakeTime = hasMixer ? recipe.time * 0.6 : recipe.time;
    const bid = bakingId.current++;
    setBaking(prev => [...prev, { bid, recipeId, progress: 0, recipe }]);
    addLog(`🥣 Started baking ${recipe.name}...`);
    let prog = 0;
    timerRef.current[bid] = setInterval(() => {
      prog += 100 / (bakeTime * 10);
      setBaking(prev => prev.map(b => b.bid === bid ? { ...b, progress: Math.min(prog, 100) } : b));
      if (prog >= 100) {
        clearInterval(timerRef.current[bid]);
        const hasDelivery = upgrades.find(u => u.id === "delivery")?.unlocked;
        const earned = recipe.reward + (hasDelivery ? 5 : 0);
        earnCoins(earned);
        setPastryShelf(p => [...p, recipe.icon].slice(-10));
        setBaking(prev => prev.filter(b => b.bid !== bid));
        setBakesToday(b => b + 1);
        addLog(`${recipe.icon} ${recipe.name} sold! +${earned} coins`);
        notify(`${recipe.icon} ${recipe.name} → +${earned} coins!`);
        setMissions(prev => prev.map(m =>
          m.action === "bake3" && !m.done ? { ...m, bakeCount: (m.bakeCount || 0) + 1 } : m
        ));
      }
    }, 100);
  };

  // Auto-tracked missions
  useEffect(() => {
    const m = missions.find(x => x.action === "bake3" && !x.done && (x.bakeCount || 0) >= 3);
    if (m) completeMission("bake3");
  }, [missions]);
  useEffect(() => { if (savings >= 50) completeMission("save50"); }, [savings]);
  useEffect(() => { if (sourdoughLevel >= 3) completeMission("invest3"); }, [sourdoughLevel]);
  useEffect(() => {
    const util = (creditUsed / CREDIT_LIMIT) * 100;
    if (util > 0 && util <= 30) completeMission("low_util");
  }, [creditUsed]);

  const completeMission = (action) => {
    const m = missions.find(x => x.action === action && !x.done);
    if (!m) return;
    setMissions(prev => prev.map(x => x.action === action ? { ...x, done: true } : x));
    addLog(`✅ Mission: "${m.text}" → ${m.reward}`);
    notify(`🏆 Mission done! ${m.reward}`);
    if (action === "save5")      { setSavings(s => s + 5); setFlour(f => Math.min(maxFlour, f + 5)); setRecipes(p => p.map(r => r.id === "muffin"    ? { ...r, locked: false } : r)); }
    if (action === "resist")     { setFlour(f => Math.min(maxFlour, f + 12)); setHappiness(h => Math.min(100, h + 10)); }
    if (action === "check")      { earnCoins(6); }
    if (action === "save20")     { setSavings(s => s + 20); setRecipes(p => p.map(r => r.id === "croissant" ? { ...r, locked: false } : r)); }
    if (action === "budget")     { setCustomers(c => c + 3); setHappiness(h => Math.min(100, h + 12)); }
    if (action === "bake3")      { earnCoins(20); }
    if (action === "invest3")    { setRecipes(p => p.map(r => r.id === "donut"  ? { ...r, locked: false } : r)); }
    if (action === "save50")     { setRecipes(p => p.map(r => r.id === "cake"   ? { ...r, locked: false } : r)); }
    if (action === "pay_ontime") { changeScore(15, "Paid supplier on time (mission bonus)"); }
    if (action === "low_util")   { changeScore(10, "Kept utilization under 30% (mission bonus)"); }
  };

  const feedSourdough = (amt) => {
    if (coins < amt) { notify("Not enough coins!", "bad"); return; }
    setCoins(c => c - amt);
    setSourdoughLevel(l => l + 1);
    setSavings(s => s + amt);
    addLog(`🍞 Invested ${amt} coins → Sourdough Level ${sourdoughLevel + 1}`);
    notify(`Sourdough Lv${sourdoughLevel + 1}! +${((sourdoughLevel + 1) * 0.6).toFixed(1)} coins/min 📈`);
  };

  const buyUpgrade = (id) => {
    const u = upgrades.find(x => x.id === id);
    if (!u || u.unlocked) return;
    if (coins < u.cost) { notify("Not enough coins!", "bad"); return; }
    setCoins(c => c - u.cost);
    setUpgrades(prev => prev.map(x => x.id === id ? { ...x, unlocked: true } : x));
    if (u.effect === "customers+1") setCustomers(c => c + 1);
    if (u.effect === "customers+2") setCustomers(c => c + 2);
    if (u.effect === "storage+10")  setMaxFlour(m => m + 10);
    addLog(`🎉 Purchased: ${u.icon} ${u.name}`);
    notify(`${u.icon} ${u.name} unlocked!`);
  };

  const buyFlour = (idx) => {
    const { amount, price } = FLOUR_BUY[idx];
    if (coins < price) { notify("Not enough coins!", "bad"); return; }
    if (flour + amount > maxFlour) { notify("Storage full! Buy the Glass Fridge.", "bad"); return; }
    setCoins(c => c - price);
    setFlour(f => Math.min(maxFlour, f + amount));
    addLog(`🌾 Bought ${amount} flour for ${price} coins`);
    notify(`+${amount} flour!`);
  };

  const triggerBakeryEvent = () => {
    const pool = BAKERY_EVENTS.filter(e => !(e.blockable && upgrades.find(u => u.id === "insurance")?.unlocked));
    const e = pool[Math.floor(Math.random() * pool.length)];
    setBakeryEvent(e);
    if (e.flour)     setFlour(f => Math.max(0, Math.min(maxFlour, f + e.flour)));
    if (e.coins)     { e.coins > 0 ? earnCoins(e.coins) : setCoins(c => Math.max(0, c + e.coins)); }
    if (e.customers) setCustomers(c => Math.max(1, c + e.customers));
    if (e.happiness) setHappiness(h => Math.min(100, h + e.happiness));
    addLog(`${e.icon} ${e.msg}`);
    setTimeout(() => setBakeryEvent(null), 4000);
  };

  const nextDay = () => {
    const income = customers * 3 + Math.floor(Math.random() * 6);
    earnCoins(income);
    setFlour(f => Math.min(maxFlour, f + 3));
    const nextD = day + 1;
    setDay(nextD);
    setBakesToday(0);
    setMissions(prev => prev.map(m => ({ ...m, done: false, bakeCount: 0 })));
    setCoinHistory(h => [...h, Math.round(coins + income)].slice(-14));
    setFlourHistory(h => [...h, Math.min(maxFlour, flour + 3)].slice(-14));
    addLog(`🌅 Day ${nextD}! +${income} coins from ${customers} customers. +3 flour.`);
    if (loanBalance > 0) {
      const interest = Math.round(loanBalance * loanRate / 365);
      setTotalInterest(i => i + interest);
      setCoins(c => Math.max(0, c - interest));
      addCreditLog(`💸 Daily loan interest: -${interest} coins`);
    }
    triggerBakeryEvent();
  };

  const handleImpulse = (resist) => {
    setImpulseShown(false);
    if (resist) {
      completeMission("resist");
      setHappiness(h => Math.min(100, h + 8));
      notify("💪 Resisted! Flour protected.");
    } else {
      setCoins(c => Math.max(0, c - 28));
      setFlour(f => Math.max(0, f - 4));
      setHappiness(h => Math.max(0, h - 15));
      addLog("💸 Impulse buy: Fancy Gadget (-28 coins, -4 flour)");
      notify("🦝 Raccoon strikes! -28 coins, -4 flour", "bad");
    }
  };

  // Credit actions
  const borrowOnCredit = (amount) => {
    if (creditUsed + amount > CREDIT_LIMIT) { notify("Over credit limit!", "bad"); return; }
    setCreditUsed(c => c + amount);
    setSupplierDebt(d => d + amount);
    earnCoins(amount);
    const newUtil = ((creditUsed + amount) / CREDIT_LIMIT) * 100;
    if (newUtil > 70) changeScore(-15, `High utilization (${Math.round(newUtil)}%)`);
    else if (newUtil > 30) changeScore(-5, `Moderate utilization (${Math.round(newUtil)}%)`);
    addCreditLog(`💳 Borrowed ${amount} coins on credit. Utilization: ${Math.round(newUtil)}%`);
    notify(`💳 Borrowed ${amount} coins. ${Math.round(newUtil)}% of limit used.`, newUtil > 70 ? "bad" : "good");
  };

  const paySupplier = (choice) => {
    const bill = supplierDebt;
    if (bill === 0) { notify("No outstanding debt!", "good"); return; }
    if (choice === "full") {
      if (coins < bill) { notify("Not enough coins!", "bad"); return; }
      setCoins(c => c - bill);
      setCreditUsed(c => Math.max(0, c - bill));
      setSupplierDebt(0);
      changeScore(+20, "Paid supplier in full!");
      completeMission("pay_ontime");
      addCreditLog(`✅ Paid full bill: ${bill} coins`);
      notify("✅ Paid in full! +20 credit score.", "good");
    } else if (choice === "partial") {
      const half = Math.ceil(bill / 2);
      if (coins < half) { notify("Not enough coins!", "bad"); return; }
      setCoins(c => c - half);
      setCreditUsed(c => Math.max(0, c - half));
      setSupplierDebt(d => d - half);
      changeScore(-8, "Partial payment");
      addCreditLog(`⚠️ Partial payment: ${half} of ${bill} coins`);
      notify("⚠️ Partial pay. -8 score. Balance rolls over.", "bad");
    } else {
      changeScore(-35, "Missed payment!");
      addCreditLog(`🚨 Missed payment of ${bill} coins!`);
      notify("🚨 Missed payment! -35 credit score!", "bad");
    }
  };

  const takeLoan = (amount) => {
    if (loanBalance > 0) { notify("Already have an active loan!", "bad"); return; }
    const rate = getLoanRate(creditScore);
    const interest = Math.round(amount * rate);
    setLoanBalance(amount);
    setLoanRate(rate);
    earnCoins(amount);
    changeScore(-10, "New credit inquiry");
    addCreditLog(`🏦 Loan: ${amount} coins @ ${Math.round(rate * 100)}% (${interest} total interest)`);
    notify(`🏦 Loan approved @ ${Math.round(rate * 100)}% interest. Total cost: ${interest} coins.`, rate < 0.15 ? "good" : "bad");
  };

  const saveToEmergency = (amt) => {
    if (coins < amt) { notify("Not enough coins!", "bad"); return; }
    setCoins(c => c - amt);
    setEmergencyFund(f => f + amt);
    changeScore(+3, "Building emergency fund");
    addCreditLog(`🏦 Added ${amt} to emergency fund`);
    notify(`+${amt} to emergency fund! +3 score.`);
  };

  // Derived
  const shopLevel    = upgrades.filter(u => u.unlocked).length;
  const isStress     = coins < 6 && flour < 5;
  const passiveRate  = sourdoughLevel * 0.6 + (upgrades.find(u => u.id === "coffee")?.unlocked ? 2 : 0);
  const missionsDone = missions.filter(m => m.done).length;
  const recipeCount  = recipes.filter(r => !r.locked).length;
  const utilPct      = Math.round((creditUsed / CREDIT_LIMIT) * 100);
  const band         = getCreditBand(creditScore);
  const shopIcon     = shopLevel === 0 ? "🏚️" : shopLevel <= 2 ? "🏠" : shopLevel <= 4 ? "🏪" : shopLevel <= 6 ? "🏬" : "🏰";

  // Single consistent warm bakery theme throughout
  const bg       = isStress
    ? "linear-gradient(135deg,#1a0505,#2d1010)"
    : "linear-gradient(160deg,#fef8ed,#fce8c0,#f5d5a0)";
  const textPri  = isStress ? "#ffe4c8" : "#3d2b1f";
  const textSec  = isStress ? "#c8908a" : "#6b4c2a";
  const card     = isStress ? "rgba(80,20,20,0.5)"   : "rgba(255,255,255,0.62)";
  const cardBdr  = isStress ? "#7f1d1d"              : "#d4a96a";
  const accent   = "#f5c842";

  // ═════════════════════════════════════════════════════════
  //  RENDER
  // ═════════════════════════════════════════════════════════
  return (
    <div style={{ minHeight: "100vh", background: bg, fontFamily: "'Georgia', serif", color: textPri, transition: "background 0.8s ease" }}>

      {/* Toast */}
      {notification && (
        <div style={{
          position: "fixed", top: 72, right: 14, zIndex: 999,
          background: notification.type === "bad" ? "#7f1d1d" : "#14532d",
          color: "#fff", padding: "11px 18px", borderRadius: 14,
          boxShadow: "0 8px 30px rgba(0,0,0,0.4)", maxWidth: 300, fontSize: 13,
          animation: "popIn 0.3s cubic-bezier(.175,.885,.32,1.275)", lineHeight: 1.5,
        }}>{notification.msg}</div>
      )}

      {/* Score change flash — warm themed */}
      {scoreFlash && (
        <div style={{
          position: "fixed", top: "38%", left: "50%", transform: "translate(-50%,-50%)",
          fontSize: 16, fontWeight: "bold", fontFamily: "monospace",
          background: "rgba(62,31,10,0.95)", padding: "12px 24px", borderRadius: 14,
          zIndex: 998, pointerEvents: "none", animation: "popIn 0.3s ease",
          color: scoreFlash.delta > 0 ? "#4ade80" : "#fca5a5",
          border: `1.5px solid ${scoreFlash.delta > 0 ? "#4ade8066" : "#fca5a566"}`,
          maxWidth: 360, textAlign: "center", boxShadow: "0 8px 30px rgba(0,0,0,0.4)",
        }}>
          💳 {scoreFlash.delta > 0 ? "▲" : "▼"} {Math.abs(scoreFlash.delta)} pts — {scoreFlash.reason}
        </div>
      )}

      {/* Bakery event banner */}
      {bakeryEvent && (
        <div style={{ background: bakeryEvent.effect === "bad" ? "#7f1d1d" : "#14532d", color: "#fff", textAlign: "center", padding: "9px 16px", fontSize: 14, fontWeight: "bold" }}>
          {bakeryEvent.icon} {bakeryEvent.msg}
        </div>
      )}

      {/* Impulse modal */}
      {impulseShown && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 300 }}>
          <div style={{ background: "#2d1a0e", borderRadius: 24, padding: 32, maxWidth: 340, textAlign: "center", border: `2px solid ${accent}`, color: "#fef3e2" }}>
            <div style={{ fontSize: 56 }}>🦝</div>
            <h2 style={{ color: accent, margin: "10px 0 6px", fontSize: 20 }}>Temptation Alert!</h2>
            <p style={{ fontSize: 14 }}>Fancy Coffee Gadget — <strong>28 coins</strong></p>
            <p style={{ color: "#fca5a5", fontSize: 12, marginBottom: 16 }}>Drains coins AND 4 flour from stress-eating.</p>
            <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 10, padding: 10, marginBottom: 18, fontSize: 12 }}>
              <strong>Resist →</strong> +12 flour, +8 happiness, mission complete ✅
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => handleImpulse(true)}  style={{ flex: 1, padding: 13, background: "#166534", color: "#fff", border: "none", borderRadius: 12, cursor: "pointer", fontSize: 14, fontWeight: "bold" }}>💪 Resist!</button>
              <button onClick={() => handleImpulse(false)} style={{ flex: 1, padding: 13, background: "#7f1d1d", color: "#fca5a5", border: "none", borderRadius: 12, cursor: "pointer", fontSize: 13 }}>😈 Splurge</button>
            </div>
          </div>
        </div>
      )}

      {/* Explain modal */}
      {explainTopic && <ExplainModal topic={explainTopic} onClose={() => setExplainTopic(null)} textPri={textPri} accent={accent} />}

      {/* ── HEADER ── */}
      <div style={{
        background: isStress ? "rgba(50,8,8,0.97)" : "rgba(42,18,4,0.97)",
        padding: "10px 16px", display: "flex", justifyContent: "space-between", alignItems: "center",
        boxShadow: "0 3px 18px rgba(0,0,0,0.4)", position: "sticky", top: 0, zIndex: 50,
      }}>
        <div>
          <div style={{ fontSize: 19, fontWeight: "bold", color: accent }}>🧁 Dough & Dough</div>
          <div style={{ fontSize: 10, color: "#c8a96a" }}>
            Day {day} · {shopIcon} Lv{shopLevel} · {recipeCount}/6 recipes · {missionsDone}/{missions.length} missions
          </div>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <div style={{ textAlign: "right", fontSize: 12, lineHeight: 1.8 }}>
            <div style={{ color: accent, fontWeight: "bold" }}>💰 {Math.floor(coins)}</div>
            <div style={{ color: "#c8a96a" }}>🌾 {flour}/{maxFlour}</div>
          </div>
          {/* Credit score badge — always visible, same warm theme */}
          <div onClick={() => setTab("credit")} style={{
            border: `2px solid ${band.color}`, borderRadius: 14, padding: "6px 14px",
            textAlign: "center", background: band.bg, cursor: "pointer",
            transition: "all 0.4s ease", boxShadow: `0 0 14px ${band.color}44`,
          }}>
            <div style={{ fontSize: 9, color: textSec, letterSpacing: 1, textTransform: "uppercase" }}>Credit</div>
            <div style={{ fontSize: 22, fontWeight: "900", color: band.color, fontFamily: "monospace", lineHeight: 1 }}>{animScore}</div>
            <div style={{ fontSize: 9, color: band.color }}>{band.icon} {band.label}</div>
          </div>
        </div>
      </div>

      {/* Stress banner */}
      {isStress && (
        <div style={{ background: "#7f1d1d", color: "#fca5a5", padding: "10px 16px", textAlign: "center", borderBottom: "2px solid #ef4444" }}>
          <strong>⚠️ Paycheck Mode</strong> — Bakery struggling. Complete missions to stabilize.
        </div>
      )}

      {/* Resource bars */}
      <div style={{ background: isStress ? "rgba(50,8,8,0.6)" : "rgba(255,255,255,0.38)", padding: "8px 16px", display: "flex", gap: 10, flexWrap: "wrap" }}>
        <ResBar value={coins}      max={Math.max(200, Math.ceil(coins / 50) * 50)} color="#b45309" icon="💰" label="Coins"   textSec={textSec} textPri={textPri} />
        <ResBar value={flour}      max={maxFlour}   color="#65a30d" icon="🌾" label="Flour"   textSec={textSec} textPri={textPri} />
        <ResBar value={happiness}  max={100}        color="#be185d" icon="😊" label="Happy"   textSec={textSec} textPri={textPri} suffix="%" />
        <ResBar value={creditUsed} max={CREDIT_LIMIT} color={utilPct > 70 ? "#b91c1c" : utilPct > 30 ? "#c2410c" : "#1e6fa0"} icon="💳" label={`Credit ${utilPct}%`} textSec={textSec} textPri={textPri} />
      </div>

      {/* TABS */}
      <div style={{ display: "flex", background: "rgba(0,0,0,0.1)", borderBottom: `2px solid ${cardBdr}` }}>
        {[
          { key: "bakery",   label: "🏠 Bakery"  },
          { key: "missions", label: "📋 Orders"  },
          { key: "market",   label: "🛒 Market"  },
          { key: "invest",   label: "📈 Invest"  },
          { key: "shop",     label: "🔧 Shop"    },
          { key: "credit",   label: "💳 Credit"  },
          { key: "stats",    label: "📊 Stats"   },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            flex: 1, padding: "9px 2px", border: "none", cursor: "pointer", fontSize: 10,
            background: tab === t.key ? (isStress ? "rgba(120,30,30,0.9)" : accent) : "transparent",
            color: tab === t.key ? (isStress ? "#fca5a5" : "#3d2b1f") : textSec,
            fontWeight: tab === t.key ? "bold" : "normal",
            fontFamily: "'Georgia', serif",
          }}>{t.label}</button>
        ))}
      </div>

      <div style={{ padding: 16, maxWidth: 680, margin: "0 auto", paddingBottom: 48 }}>

        {/* ══ BAKERY ══ */}
        {tab === "bakery" && (
          <div>
            <div style={{ background: card, borderRadius: 20, padding: 20, marginBottom: 16, border: `1.5px solid ${cardBdr}`, textAlign: "center" }}>
              <div style={{ fontSize: 58 }}>{shopIcon}</div>
              <div style={{ fontSize: 12, color: textSec, marginBottom: 6 }}>
                {shopLevel === 0 ? "Tiny Starter Bakery" : shopLevel <= 2 ? "Cozy Neighbourhood Bakery" : shopLevel <= 4 ? "Thriving Local Bakery" : "Popular City Bakery"}
              </div>
              <div style={{ minHeight: 32, fontSize: 24, margin: "6px 0" }}>
                {pastryShelf.length === 0 ? <span style={{ fontSize: 12, color: textSec }}>No pastries yet — start baking!</span> : pastryShelf.map((p, i) => <span key={i}>{p}</span>)}
              </div>
              <div style={{ display: "flex", justifyContent: "center", gap: 18, fontSize: 12, color: textSec, marginTop: 4 }}>
                <span>👥 {customers} customers</span>
                <span>🍰 {bakesToday} today</span>
                <span>{upgrades.filter(u => u.unlocked).map(u => u.icon).join(" ")}</span>
              </div>
            </div>
            {baking.length > 0 && (
              <div style={{ display: "grid", gap: 8, marginBottom: 14 }}>
                {baking.map(slot => (
                  <div key={slot.bid} style={{ background: "rgba(245,200,66,0.2)", borderRadius: 12, padding: "12px 14px", border: `1.5px solid ${accent}88` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 13 }}>
                      <span>🔥 {slot.recipe.icon} {slot.recipe.name}</span>
                      <span style={{ fontSize: 11, color: "#b45309" }}>{Math.round(slot.progress)}%</span>
                    </div>
                    <div style={{ background: "rgba(0,0,0,0.15)", borderRadius: 20, height: 8, overflow: "hidden" }}>
                      <div style={{ width: `${slot.progress}%`, height: "100%", background: "linear-gradient(90deg,#d97706,#b45309)", borderRadius: 20, transition: "width 0.1s linear" }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
            <h3 style={{ fontSize: 14, marginBottom: 8, color: textPri }}>🧁 Bake Something</h3>
            <div style={{ display: "grid", gap: 8, marginBottom: 14 }}>
              {recipes.map(recipe => {
                const canBake  = !recipe.locked && flour >= recipe.flourCost;
                const hasMixer = upgrades.find(u => u.id === "mixer")?.unlocked;
                return (
                  <button key={recipe.id} onClick={() => startBaking(recipe.id)} disabled={recipe.locked || !canBake}
                    style={{ display: "grid", gridTemplateColumns: "36px 1fr auto", alignItems: "center", gap: 10, padding: "12px 14px", background: recipe.locked ? "rgba(0,0,0,0.08)" : canBake ? card : "rgba(180,83,9,0.08)", border: `1.5px solid ${recipe.locked ? "#bbb" : canBake ? cardBdr : "#c2410c66"}`, borderRadius: 12, cursor: recipe.locked || !canBake ? "not-allowed" : "pointer", color: textPri, textAlign: "left" }}>
                    <span style={{ fontSize: 22 }}>{recipe.locked ? "🔒" : recipe.icon}</span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: "bold" }}>{recipe.name}</div>
                      <div style={{ fontSize: 10, color: textSec }}>{recipe.desc}</div>
                    </div>
                    <div style={{ textAlign: "right", fontSize: 11, color: textSec, lineHeight: 1.6 }}>
                      {recipe.locked ? <span style={{ color: "#c2410c" }}>Locked</span> : <>
                        <div>🌾 {recipe.flourCost}</div>
                        <div>💰 +{recipe.reward}</div>
                        <div>⏱ {hasMixer ? (recipe.time * 0.6).toFixed(1) : recipe.time}s</div>
                      </>}
                    </div>
                  </button>
                );
              })}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <button onClick={nextDay} style={{ padding: 14, background: accent, border: "none", borderRadius: 12, cursor: "pointer", fontWeight: "bold", fontSize: 14, color: "#3d2b1f", fontFamily: "'Georgia', serif" }}>🌅 End Day {day}</button>
              <button onClick={() => setImpulseShown(true)} style={{ padding: 14, background: "rgba(180,83,9,0.12)", border: `1.5px solid #c2410c`, borderRadius: 12, cursor: "pointer", fontSize: 13, color: textPri, fontFamily: "'Georgia', serif" }}>🦝 Impulse Test</button>
            </div>
          </div>
        )}

        {/* ══ MISSIONS ══ */}
        {tab === "missions" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <h3 style={{ fontSize: 15, margin: 0, color: textPri }}>📋 Daily Orders</h3>
              <span style={{ fontSize: 12, color: textSec }}>{missionsDone}/{missions.length}</span>
            </div>
            <p style={{ fontSize: 12, color: textSec, marginBottom: 12 }}>Financial habits → game rewards. 💳 Credit missions affect your score directly.</p>
            <div style={{ background: "rgba(0,0,0,0.12)", borderRadius: 20, height: 7, marginBottom: 16, overflow: "hidden" }}>
              <div style={{ width: `${(missionsDone / missions.length) * 100}%`, height: "100%", background: `linear-gradient(90deg,${accent},#84cc16)`, borderRadius: 20, transition: "width 0.5s" }} />
            </div>
            <div style={{ display: "grid", gap: 9 }}>
              {missions.map(m => {
                const isCreditMission = m.id === "m9" || m.id === "m10";
                return (
                  <div key={m.id} style={{ background: m.done ? "rgba(22,101,52,0.18)" : card, border: `1.5px solid ${m.done ? "#16a34a" : isCreditMission ? "#b4530966" : cardBdr}`, borderRadius: 14, padding: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: "bold", marginBottom: 3, color: textPri }}>
                          {m.done ? "✅" : isCreditMission ? "💳" : "⬜"} {m.text}
                        </div>
                        <div style={{ fontSize: 11, color: isCreditMission ? "#b45309" : textSec }}>Reward: {m.reward}</div>
                        {m.action === "bake3" && !m.done && <div style={{ fontSize: 11, color: "#b45309", marginTop: 2 }}>Progress: {m.bakeCount || 0}/3</div>}
                      </div>
                      {!m.done && !["bake3","invest3","save50","pay_ontime","low_util"].includes(m.action) && (
                        <button onClick={() => completeMission(m.action)} style={{ padding: "7px 12px", background: accent, border: "none", borderRadius: 8, cursor: "pointer", fontSize: 11, fontWeight: "bold", color: "#3d2b1f", fontFamily: "'Georgia', serif" }}>✓ Log it</button>
                      )}
                      {!m.done && ["invest3","save50","pay_ontime","low_util"].includes(m.action) && (
                        <span style={{ fontSize: 10, color: textSec }}>Auto-tracks</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ══ MARKET ══ */}
        {tab === "market" && (
          <div>
            <h3 style={{ fontSize: 15, marginBottom: 4, color: textPri }}>🛒 Ingredient Market</h3>
            <p style={{ fontSize: 12, color: textSec, marginBottom: 14 }}>Bulk orders = better value per unit.</p>
            <div style={{ display: "grid", gap: 10, marginBottom: 18 }}>
              {FLOUR_BUY.map(({ amount, price }, i) => (
                <div key={i} style={{ background: card, border: `1.5px solid ${cardBdr}`, borderRadius: 14, padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: "bold", fontSize: 14, color: textPri }}>🌾 {amount} Flour</div>
                    <div style={{ fontSize: 11, color: textSec }}>{(price / amount).toFixed(2)} coins/unit{i === 2 ? " 🏷️ Best deal!" : ""}</div>
                  </div>
                  <button onClick={() => buyFlour(i)} style={{ padding: "10px 18px", background: coins >= price ? accent : "rgba(0,0,0,0.12)", border: "none", borderRadius: 10, cursor: "pointer", fontWeight: "bold", fontSize: 13, color: "#3d2b1f", fontFamily: "'Georgia', serif" }}>💰 {price}</button>
                </div>
              ))}
            </div>
            <div style={{ background: card, borderRadius: 14, padding: 16, border: `1.5px solid ${cardBdr}` }}>
              <h4 style={{ margin: "0 0 10px", fontSize: 13, color: textPri }}>🌾 Storage</h4>
              <ResBar value={flour} max={maxFlour} color="#65a30d" icon="🌾" label="Current Stock" textSec={textSec} textPri={textPri} />
              <p style={{ fontSize: 11, color: textSec, marginTop: 8 }}>Max: {maxFlour}. Buy 🧊 Glass Fridge in Shop to add +10.</p>
            </div>
          </div>
        )}

        {/* ══ INVEST ══ */}
        {tab === "invest" && (
          <div>
            <h3 style={{ fontSize: 15, marginBottom: 4, color: textPri }}>📈 Sourdough Portfolio</h3>
            <p style={{ fontSize: 12, color: textSec, marginBottom: 14 }}>Feed it coins. It compounds. That's investing.</p>
            <div style={{ background: card, borderRadius: 20, padding: 22, textAlign: "center", border: `1.5px solid ${cardBdr}`, marginBottom: 14 }}>
              <div style={{ fontSize: 66 }}>{sourdoughLevel === 0 ? "🫙" : sourdoughLevel < 3 ? "🍞" : sourdoughLevel < 6 ? "🥖" : sourdoughLevel < 10 ? "🧑‍🍳" : "👑"}</div>
              <div style={{ fontSize: 18, fontWeight: "bold", margin: "6px 0 2px", color: textPri }}>Level {sourdoughLevel}</div>
              <div style={{ fontSize: 13, color: textSec }}>Generating <strong style={{ color: "#16a34a" }}>{(sourdoughLevel * 0.6).toFixed(1)}</strong> coins/min</div>
              <div style={{ fontSize: 11, color: textSec, marginTop: 2 }}>Total earned passively: {sourdoughEarned.toFixed(1)} coins</div>
              <div style={{ background: "rgba(0,0,0,0.12)", borderRadius: 20, height: 10, margin: "14px 0 18px", overflow: "hidden" }}>
                <div style={{ width: `${Math.min((sourdoughLevel % 5) / 5 * 100, 100)}%`, height: "100%", background: "linear-gradient(90deg,#65a30d,#16a34a)", borderRadius: 20, transition: "width 0.5s" }} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                {[5, 10, 20].map(amt => (
                  <button key={amt} onClick={() => feedSourdough(amt)} style={{ padding: "11px 0", background: coins >= amt ? "rgba(22,163,74,0.2)" : "rgba(0,0,0,0.1)", color: coins >= amt ? "#16a34a" : textSec, border: `1.5px solid ${coins >= amt ? "#16a34a66" : cardBdr}`, borderRadius: 10, cursor: "pointer", fontSize: 12, fontWeight: "bold", fontFamily: "'Georgia', serif" }}>🌱 {amt}</button>
                ))}
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              {[
                { label: "Total Saved",  val: `${savings.toFixed(0)}`,          icon: "💰" },
                { label: "Passive Rate", val: `${passiveRate.toFixed(1)}/min`,   icon: "📈" },
                { label: "Portfolio",    val: `~${(sourdoughLevel * 5)}`,        icon: "📊" },
              ].map((s, i) => (
                <div key={i} style={{ background: card, border: `1.5px solid ${cardBdr}`, borderRadius: 10, padding: "10px 8px", textAlign: "center" }}>
                  <div style={{ fontSize: 18 }}>{s.icon}</div>
                  <div style={{ fontWeight: "bold", fontSize: 14, color: textPri }}>{s.val}</div>
                  <div style={{ color: textSec, fontSize: 10 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══ SHOP ══ */}
        {tab === "shop" && (
          <div>
            <h3 style={{ fontSize: 15, marginBottom: 4, color: textPri }}>🔧 Bakery Upgrades</h3>
            <p style={{ fontSize: 12, color: textSec, marginBottom: 14 }}>Each upgrade changes how you play.</p>
            {[1,2,3,4].map(tier => {
              const names = { 1: "Tier 1 — Starter", 2: "Tier 2 — Growing", 3: "Tier 3 — Advanced", 4: "Tier 4 — Premium" };
              return (
                <div key={tier} style={{ marginBottom: 18 }}>
                  <div style={{ fontSize: 10, color: textSec, fontWeight: "bold", marginBottom: 8, letterSpacing: 1, textTransform: "uppercase" }}>{names[tier]}</div>
                  <div style={{ display: "grid", gap: 8 }}>
                    {upgrades.filter(u => u.tier === tier).map(u => (
                      <div key={u.id} style={{ background: u.unlocked ? "rgba(22,101,52,0.18)" : card, border: `1.5px solid ${u.unlocked ? "#16a34a" : cardBdr}`, borderRadius: 14, padding: "13px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                          <span style={{ fontSize: 26 }}>{u.icon}</span>
                          <div>
                            <div style={{ fontWeight: "bold", fontSize: 13, color: textPri }}>{u.name}</div>
                            <div style={{ fontSize: 11, color: textSec }}>{u.desc}</div>
                          </div>
                        </div>
                        {u.unlocked ? <span style={{ color: "#16a34a", fontWeight: "bold", fontSize: 16 }}>✅</span> :
                          <button onClick={() => buyUpgrade(u.id)} style={{ padding: "9px 14px", background: coins >= u.cost ? accent : "rgba(0,0,0,0.12)", border: "none", borderRadius: 10, cursor: "pointer", fontWeight: "bold", fontSize: 12, color: "#3d2b1f", fontFamily: "'Georgia', serif" }}>💰 {u.cost}</button>
                        }
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ══════════════════════════════════════════════════
            CREDIT TAB — matches bakery warm theme exactly
        ══════════════════════════════════════════════════ */}
        {tab === "credit" && (
          <div>
            {/* Score hero card — warm bakery card style */}
            <div style={{ background: card, border: `1.5px solid ${cardBdr}`, borderRadius: 20, padding: 20, marginBottom: 14, textAlign: "center" }}>
              {/* Oven emoji instead of abstract badge */}
              <div style={{ fontSize: 56, marginBottom: 4 }}>
                {band.icon === "👑" ? "🏆" : band.icon === "✨" ? "🔥" : band.icon === "🔥" ? "🌡️" : band.icon === "🌡️" ? "❄️" : "🪦"}
              </div>
              <div style={{ fontSize: 11, color: textSec, letterSpacing: 1, textTransform: "uppercase", marginBottom: 2 }}>Credit Score</div>
              <div style={{ fontSize: 60, fontWeight: "900", color: band.color, fontFamily: "monospace", lineHeight: 1.1 }}>{animScore}</div>
              <div style={{ fontSize: 14, color: band.color, fontWeight: "bold", marginTop: 4 }}>{band.label}</div>
              <div style={{ fontSize: 12, color: textSec, marginTop: 2 }}>{band.ovenDesc}</div>

              {/* Score band ladder — styled like pastry shelf */}
              <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 14, flexWrap: "wrap" }}>
                {CREDIT_BANDS.map(b => {
                  const active = creditScore >= b.min && creditScore < (CREDIT_BANDS[CREDIT_BANDS.indexOf(b) - 1]?.min || 999);
                  return (
                    <div key={b.label} style={{ background: active ? b.bg : "rgba(0,0,0,0.06)", border: `1.5px solid ${active ? b.border : cardBdr}`, borderRadius: 10, padding: "4px 10px", fontSize: 10, color: active ? b.color : textSec, fontWeight: active ? "bold" : "normal" }}>
                      {b.icon} {b.min}+ {b.label}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Credit utilization bar — same style as flour bar */}
            <div style={{ background: card, border: `1.5px solid ${cardBdr}`, borderRadius: 14, padding: 16, marginBottom: 12 }}>
              <div style={{ fontSize: 14, fontWeight: "bold", color: textPri, marginBottom: 10 }}>📊 Ingredient Credit Limit</div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 4, color: textSec }}>
                <span>Used: <strong style={{ color: textPri }}>{creditUsed}</strong> / {CREDIT_LIMIT}</span>
                <span style={{ color: utilPct > 70 ? "#b91c1c" : utilPct > 30 ? "#c2410c" : "#16a34a", fontWeight: "bold" }}>{utilPct}% {utilPct > 70 ? "⚠️ Too high!" : utilPct > 30 ? "🌡️ Getting warm" : "✅ Healthy"}</span>
              </div>
              <div style={{ background: "rgba(0,0,0,0.12)", borderRadius: 20, height: 12, position: "relative", overflow: "visible", marginBottom: 4 }}>
                <div style={{ width: `${Math.min(100, utilPct)}%`, height: "100%", borderRadius: 20, background: utilPct > 70 ? "linear-gradient(90deg,#b91c1c,#ef4444)" : utilPct > 30 ? "linear-gradient(90deg,#c2410c,#ea580c)" : "linear-gradient(90deg,#15803d,#16a34a)", transition: "width 0.5s ease" }} />
                <div style={{ position: "absolute", top: -3, left: "30%", width: 2, height: 18, background: "#16a34a88", borderRadius: 1 }} />
                <div style={{ position: "absolute", top: -3, left: "70%", width: 2, height: 18, background: "#c2410c88", borderRadius: 1 }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: textSec }}>
                <span>0%</span>
                <span style={{ color: "#16a34a" }}>30% ideal</span>
                <span style={{ color: "#c2410c" }}>70% warning</span>
                <span>100%</span>
              </div>
              <button onClick={() => setExplainTopic("utilization")} style={explainBtnStyle(textSec, cardBdr)}>❓ What is credit utilization?</button>
            </div>

            {/* Borrow + Pay — two columns, same card style as recipe buttons */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>

              {/* Borrow on credit */}
              <div style={{ background: card, border: `1.5px solid ${cardBdr}`, borderRadius: 14, padding: 14 }}>
                <div style={{ fontSize: 13, fontWeight: "bold", color: textPri, marginBottom: 4 }}>💳 Borrow Ingredients</div>
                <div style={{ fontSize: 11, color: textSec, marginBottom: 10, lineHeight: 1.5 }}>Use credit to buy ingredients. Affects your score.</div>
                <div style={{ display: "grid", gap: 6 }}>
                  {[50, 100, 200].map(amt => {
                    const newUtil = Math.round(((creditUsed + amt) / CREDIT_LIMIT) * 100);
                    const ok = creditUsed + amt <= CREDIT_LIMIT;
                    return (
                      <button key={amt} onClick={() => borrowOnCredit(amt)} disabled={!ok}
                        style={{ padding: "9px 10px", background: ok ? "rgba(180,83,9,0.12)" : "rgba(0,0,0,0.06)", border: `1.5px solid ${ok ? "#b4530944" : cardBdr}`, borderRadius: 10, cursor: ok ? "pointer" : "not-allowed", color: ok ? "#b45309" : textSec, fontSize: 11, opacity: ok ? 1 : 0.5, fontFamily: "'Georgia', serif", textAlign: "left" }}>
                        <div style={{ fontWeight: "bold" }}>Borrow {amt} coins</div>
                        <div style={{ fontSize: 10, marginTop: 2 }}>→ {newUtil}% utilization</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Pay supplier bill */}
              <div style={{ background: card, border: `1.5px solid ${supplierDebt > 0 ? "#b91c1c88" : "#16a34a44"}`, borderRadius: 14, padding: 14 }}>
                <div style={{ fontSize: 13, fontWeight: "bold", color: textPri, marginBottom: 4 }}>
                  {supplierDebt > 0 ? "🚨 Supplier Bill Due" : "✅ No Debt"}
                </div>
                <div style={{ fontSize: 28, fontWeight: "900", color: supplierDebt > 0 ? "#b91c1c" : "#16a34a", fontFamily: "monospace", marginBottom: 4 }}>{supplierDebt} coins</div>
                <div style={{ fontSize: 11, color: textSec, marginBottom: 10 }}>Cash available: {Math.floor(coins)}</div>
                {supplierDebt > 0 ? (
                  <div style={{ display: "grid", gap: 6 }}>
                    <button onClick={() => paySupplier("full")} disabled={coins < supplierDebt}
                      style={{ padding: "9px", background: coins >= supplierDebt ? "rgba(22,163,74,0.18)" : "rgba(0,0,0,0.06)", border: `1.5px solid ${coins >= supplierDebt ? "#16a34a66" : cardBdr}`, borderRadius: 10, cursor: coins < supplierDebt ? "not-allowed" : "pointer", color: coins >= supplierDebt ? "#16a34a" : textSec, fontSize: 11, fontWeight: "bold", fontFamily: "'Georgia', serif", opacity: coins < supplierDebt ? 0.5 : 1 }}>
                      ✅ Pay Full (+20 score)
                    </button>
                    <button onClick={() => paySupplier("partial")} disabled={coins < supplierDebt / 2}
                      style={{ padding: "9px", background: "rgba(194,65,12,0.12)", border: "1.5px solid #c2410c44", borderRadius: 10, cursor: "pointer", color: "#c2410c", fontSize: 11, fontFamily: "'Georgia', serif" }}>
                      ⚠️ Pay Half (−8 score)
                    </button>
                    <button onClick={() => paySupplier("skip")}
                      style={{ padding: "9px", background: "rgba(185,28,28,0.1)", border: "1.5px solid #b91c1c44", borderRadius: 10, cursor: "pointer", color: "#b91c1c", fontSize: 11, fontFamily: "'Georgia', serif" }}>
                      🚨 Miss Payment (−35!)
                    </button>
                  </div>
                ) : <div style={{ fontSize: 12, color: "#16a34a" }}>Borrow ingredients to generate a bill.</div>}
                <button onClick={() => setExplainTopic("payment_history")} style={explainBtnStyle(textSec, cardBdr)}>❓ Why does payment history matter?</button>
              </div>
            </div>

            {/* Loans — same style as upgrade cards */}
            <div style={{ background: card, border: `1.5px solid ${cardBdr}`, borderRadius: 14, padding: 16, marginBottom: 12 }}>
              <div style={{ fontSize: 14, fontWeight: "bold", color: textPri, marginBottom: 4 }}>🏦 Expansion Loan</div>
              <p style={{ fontSize: 12, color: textSec, marginBottom: 12, lineHeight: 1.5 }}>
                Your credit score determines your interest rate. Better score = cheaper money.
              </p>

              {/* Rate comparison — like the recipe info rows */}
              <div style={{ background: "rgba(0,0,0,0.06)", borderRadius: 10, padding: 10, marginBottom: 12 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 6, textAlign: "center" }}>
                  {[{ score: "800+", rate: "6%" }, { score: "740+", rate: "10%" }, { score: "580+", rate: "18%" }, { score: "<580", rate: "25%" }].map(r => {
                    const isYours = (r.score === "800+" && creditScore >= 800) || (r.score === "740+" && creditScore >= 740 && creditScore < 800) || (r.score === "580+" && creditScore >= 580 && creditScore < 740) || (r.score === "<580" && creditScore < 580);
                    return (
                      <div key={r.score} style={{ background: isYours ? band.bg : "transparent", border: isYours ? `1.5px solid ${band.border}` : "1.5px solid transparent", borderRadius: 8, padding: "6px 4px" }}>
                        <div style={{ fontSize: 10, color: textSec }}>{r.score}</div>
                        <div style={{ fontSize: 14, fontWeight: "bold", color: isYours ? band.color : textPri }}>{r.rate}</div>
                      </div>
                    );
                  })}
                </div>
                <div style={{ fontSize: 11, color: textSec, textAlign: "center", marginTop: 8 }}>
                  Your rate: <strong style={{ color: band.color, fontSize: 14 }}>{Math.round(getLoanRate(creditScore) * 100)}%</strong>
                  {creditScore < 740 && <span style={{ color: "#c2410c" }}> — raise your score to unlock lower rates!</span>}
                </div>
              </div>

              {loanBalance > 0 ? (
                <div style={{ background: "rgba(180,83,9,0.1)", border: "1.5px solid #b4530966", borderRadius: 10, padding: 12, textAlign: "center" }}>
                  <div style={{ fontSize: 11, color: textSec, marginBottom: 4 }}>Active loan</div>
                  <div style={{ fontSize: 22, fontWeight: "bold", color: "#b45309", fontFamily: "monospace" }}>{loanBalance} coins</div>
                  <div style={{ fontSize: 11, color: textSec }}>@ {Math.round(loanRate * 100)}% · {totalInterest} interest paid so far</div>
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                  {[500, 1000, 2000].map(amt => (
                    <button key={amt} onClick={() => takeLoan(amt)}
                      style={{ padding: "12px 8px", background: "rgba(180,83,9,0.1)", border: `1.5px solid ${cardBdr}`, borderRadius: 10, cursor: "pointer", color: "#b45309", fontFamily: "'Georgia', serif", textAlign: "center" }}>
                      <div style={{ fontWeight: "bold", fontSize: 14 }}>{amt}</div>
                      <div style={{ fontSize: 10, color: textSec }}>+{Math.round(amt * getLoanRate(creditScore))} interest</div>
                    </button>
                  ))}
                </div>
              )}
              <button onClick={() => setExplainTopic("interest")} style={explainBtnStyle(textSec, cardBdr)}>❓ How do interest rates work?</button>
            </div>

            {/* Emergency Fund — matches sourdough invest card style */}
            <div style={{ background: card, border: `1.5px solid ${cardBdr}`, borderRadius: 14, padding: 16, marginBottom: 12 }}>
              <div style={{ fontSize: 14, fontWeight: "bold", color: textPri, marginBottom: 4 }}>🏦 Emergency Fund</div>
              <p style={{ fontSize: 12, color: textSec, marginBottom: 10 }}>Your safety net. Protects your credit when life happens unexpectedly.</p>
              <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
                <div style={{ fontSize: 36, fontWeight: "900", color: emergencyFund >= 200 ? "#16a34a" : emergencyFund > 0 ? "#c2410c" : "#b91c1c", fontFamily: "monospace" }}>{emergencyFund}</div>
                <div style={{ fontSize: 12, color: emergencyFund >= 200 ? "#16a34a" : emergencyFund > 0 ? "#c2410c" : "#b91c1c" }}>
                  {emergencyFund >= 300 ? "✅ Well cushioned!" : emergencyFund >= 100 ? "⚠️ Building up..." : "❌ Needs attention"}
                </div>
              </div>
              <ResBar value={emergencyFund} max={300} color="#16a34a" icon="🏦" label="Safety cushion" textSec={textSec} textPri={textPri} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 12 }}>
                {[25, 50, 100].map(amt => (
                  <button key={amt} onClick={() => saveToEmergency(amt)} disabled={coins < amt}
                    style={{ padding: "10px 0", background: coins >= amt ? "rgba(22,163,74,0.18)" : "rgba(0,0,0,0.06)", border: `1.5px solid ${coins >= amt ? "#16a34a66" : cardBdr}`, borderRadius: 10, cursor: coins < amt ? "not-allowed" : "pointer", color: coins >= amt ? "#16a34a" : textSec, fontSize: 12, fontFamily: "'Georgia', serif", opacity: coins < amt ? 0.5 : 1 }}>
                    Save {amt}
                  </button>
                ))}
              </div>
            </div>

            {/* Score history chart — same card as sourdough chart */}
            <div style={{ background: card, border: `1.5px solid ${cardBdr}`, borderRadius: 14, padding: 16, marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div style={{ fontSize: 13, fontWeight: "bold", color: textPri }}>📈 Score History</div>
                <div style={{ display: "flex", gap: 8, fontSize: 11 }}>
                  <span style={{ color: textSec }}>Start: {scoreHistory[0]}</span>
                  <span style={{ color: creditScore >= scoreHistory[0] ? "#16a34a" : "#b91c1c", fontWeight: "bold" }}>
                    Now: {creditScore} ({creditScore >= scoreHistory[0] ? "▲" : "▼"}{Math.abs(creditScore - scoreHistory[0])})
                  </span>
                </div>
              </div>
              <Sparkline data={scoreHistory} color={band.color} label="" compact />
            </div>

            {/* Credit factors — same style as mission cards */}
            <div style={{ background: card, border: `1.5px solid ${cardBdr}`, borderRadius: 14, padding: 16, marginBottom: 12 }}>
              <div style={{ fontSize: 13, fontWeight: "bold", color: textPri, marginBottom: 12 }}>🧮 Credit Factors</div>
              {[
                { label: "Payment History",   pct: "35%", status: creditScore >= 700 ? "good" : creditScore >= 640 ? "ok" : "poor", icon: "📅", tip: "Pay your supplier in full every time" },
                { label: "Credit Utilization",pct: "30%", status: utilPct <= 30 ? "good" : utilPct <= 70 ? "ok" : "poor",           icon: "📊", tip: "Keep under 30% of your limit" },
                { label: "Emergency Fund",    pct: "—",   status: emergencyFund >= 200 ? "good" : emergencyFund > 0 ? "ok" : "poor", icon: "🏦", tip: "Build a cushion for unexpected costs" },
                { label: "Loan Management",   pct: "—",   status: loanBalance === 0 ? "good" : totalInterest < 100 ? "ok" : "poor",  icon: "🏛️", tip: "Borrow only what you need" },
              ].map(f => {
                const c = { good: "#16a34a", ok: "#c2410c", poor: "#b91c1c" }[f.status];
                const label = { good: "✅ Good", ok: "⚠️ Fair", poor: "❌ Poor" }[f.status];
                return (
                  <div key={f.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: `1px solid rgba(0,0,0,0.06)` }}>
                    <div>
                      <div style={{ fontSize: 13, color: textPri }}>{f.icon} {f.label}</div>
                      <div style={{ fontSize: 10, color: textSec }}>{f.tip}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 10, color: textSec, marginBottom: 2 }}>{f.pct}</div>
                      <div style={{ fontSize: 11, color: c, fontWeight: "bold" }}>{label}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Real-world impact — warm card style */}
            <div style={{ background: card, border: `1.5px solid ${cardBdr}`, borderRadius: 14, padding: 16, marginBottom: 12 }}>
              <div style={{ fontSize: 13, fontWeight: "bold", color: textPri, marginBottom: 4 }}>🌍 Real-World Impact</div>
              <div style={{ fontSize: 11, color: textSec, marginBottom: 12 }}>How your score ({creditScore}) affects major life moments:</div>
              {[
                { cat: "🏠 Apartment Rental",   yours: creditScore >= 700 ? "✅ Standard deposit"      : creditScore >= 620 ? "⚠️ Larger deposit"     : "❌ Likely denied",     good: "✅ Standard deposit",  poor: "❌ Likely denied" },
                { cat: "🚗 Car Loan APR",        yours: `${Math.round((getLoanRate(creditScore)+0.02)*100)}%`, good: "~4%",  poor: "~20%+" },
                { cat: "🏡 Mortgage (30yr)",     yours: creditScore >= 740 ? "~6.5%" : creditScore >= 670 ? "~7.5%" : "~9%+", good: "~6.5%", poor: "~9%+ or denied" },
                { cat: "💳 Credit Card APR",     yours: creditScore >= 740 ? "~15%" : creditScore >= 670 ? "~24%" : "~29%+", good: "~15%", poor: "~29%+" },
              ].map(row => (
                <div key={row.cat} style={{ display: "grid", gridTemplateColumns: "auto 1fr 1fr 1fr", gap: "6px 10px", alignItems: "center", padding: "8px 0", borderBottom: `1px solid rgba(0,0,0,0.06)`, fontSize: 11 }}>
                  <div style={{ color: textPri, fontWeight: "bold", whiteSpace: "nowrap" }}>{row.cat}</div>
                  <div style={{ background: band.bg, border: `1px solid ${band.border}`, borderRadius: 6, padding: "3px 6px", color: band.color, fontWeight: "bold", textAlign: "center" }}>You: {row.yours}</div>
                  <div style={{ background: "rgba(22,163,74,0.1)", border: "1px solid #16a34a33", borderRadius: 6, padding: "3px 6px", color: "#16a34a", textAlign: "center" }}>740+: {row.good}</div>
                  <div style={{ background: "rgba(185,28,28,0.1)", border: "1px solid #b91c1c33", borderRadius: 6, padding: "3px 6px", color: "#b91c1c", textAlign: "center" }}>580: {row.poor}</div>
                </div>
              ))}
            </div>

            {/* Credit log */}
            <div style={{ background: card, border: `1.5px solid ${cardBdr}`, borderRadius: 14, padding: 14 }}>
              <div style={{ fontSize: 11, color: textSec, fontWeight: "bold", letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>📜 Credit Log</div>
              <div style={{ maxHeight: 180, overflowY: "auto" }}>
                {creditLog.map((e, i) => (
                  <div key={i} style={{ fontSize: 11, color: textSec, padding: "5px 0", borderBottom: `1px solid rgba(0,0,0,0.06)`, opacity: Math.max(0.35, 1 - i * 0.04), borderLeft: `3px solid ${accent}`, paddingLeft: 8 }}>{e}</div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ══ STATS ══ */}
        {tab === "stats" && (
          <div>
            <h3 style={{ fontSize: 15, marginBottom: 14, color: textPri }}>📊 Bakery + Credit Analytics</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
              {[
                { label: "Total Earned",   val: `${totalEarned.toFixed(0)} 💰`, color: "#b45309" },
                { label: "Total Saved",    val: `${savings.toFixed(0)} 💸`,     color: "#16a34a" },
                { label: "Customers",      val: `${customers} 👥`,             color: "#1e6fa0" },
                { label: "Passive Rate",   val: `${passiveRate.toFixed(1)}/min`,color: "#7c3aed" },
                { label: "Credit Score",   val: `${creditScore} ${band.icon}`,  color: band.color },
                { label: "Credit Util",    val: `${utilPct}% 💳`,              color: utilPct > 70 ? "#b91c1c" : "#1e6fa0" },
                { label: "Emergency Fund", val: `${emergencyFund} 🏦`,          color: "#16a34a" },
                { label: "Happiness",      val: `${happiness}% 😊`,           color: "#be185d" },
              ].map((s, i) => (
                <div key={i} style={{ background: card, border: `1.5px solid ${cardBdr}`, borderRadius: 12, padding: "12px 14px" }}>
                  <div style={{ fontSize: 10, color: textSec, marginBottom: 3 }}>{s.label}</div>
                  <div style={{ fontSize: 16, fontWeight: "bold", color: s.color }}>{s.val}</div>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
              {["coins","flour","credit"].map(c => (
                <button key={c} onClick={() => setShowChart(c)} style={{ flex: 1, padding: "8px", border: "none", background: showChart === c ? accent : "rgba(0,0,0,0.1)", color: showChart === c ? "#3d2b1f" : textSec, borderRadius: 8, cursor: "pointer", fontSize: 11, fontWeight: "bold", fontFamily: "'Georgia', serif" }}>
                  {c === "coins" ? "💰 Coins" : c === "flour" ? "🌾 Flour" : "💳 Credit"}
                </button>
              ))}
            </div>
            {showChart === "coins"  && <Sparkline data={coinHistory}   color="#b45309" label="Coins across days" />}
            {showChart === "flour"  && <Sparkline data={flourHistory}  color="#65a30d" label="Flour across days" />}
            {showChart === "credit" && <Sparkline data={scoreHistory}  color={band.color} label="Credit score over time" />}

            <h4 style={{ fontSize: 13, margin: "16px 0 10px", color: textPri }}>📜 Activity Log</h4>
            <div style={{ display: "grid", gap: 5, maxHeight: 280, overflowY: "auto" }}>
              {activityLog.map((e, i) => (
                <div key={i} style={{ background: "rgba(255,255,255,0.4)", borderRadius: 8, padding: "7px 12px", fontSize: 11, borderLeft: `3px solid ${accent}`, opacity: Math.max(0.35, 1 - i * 0.03), color: textPri }}>{e}</div>
              ))}
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes popIn { from { transform: scale(0.85) translateX(40px); opacity:0; } to { transform:scale(1) translateX(0); opacity:1; } }
        button:active { transform: scale(0.97); }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: rgba(180,83,9,0.3); border-radius: 4px; }
      `}</style>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//  SHARED UI COMPONENTS
// ═══════════════════════════════════════════════════════════

const explainBtnStyle = (textSec, cardBdr) => ({
  background: "none", border: `1px solid ${cardBdr}`,
  color: textSec, padding: "7px 12px", borderRadius: 8, cursor: "pointer",
  fontSize: 11, width: "100%", fontFamily: "'Georgia', serif", marginTop: 10,
});

function ResBar({ value, max, color, icon, label, textSec, textPri, suffix = "" }) {
  const pct    = Math.min(100, Math.round((value / max) * 100));
  const barCol = pct < 20 ? "#b91c1c" : pct < 45 ? "#c2410c" : color;
  return (
    <div style={{ flex: 1, minWidth: 80 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, marginBottom: 3, color: textSec }}>
        <span>{icon} {label}</span>
        <span style={{ fontWeight: "bold", color: textPri }}>{Math.floor(value)}{suffix}</span>
      </div>
      <div style={{ background: "rgba(0,0,0,0.15)", borderRadius: 20, height: 9, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", borderRadius: 20, background: `linear-gradient(90deg,${barCol}bb,${barCol})`, transition: "width 0.4s ease" }} />
      </div>
    </div>
  );
}

function Sparkline({ data, color, label, compact }) {
  if (data.length < 2) return null;
  const max = Math.max(...data, 1), min = Math.min(...data, 0), range = max - min || 1;
  const W = 300, H = compact ? 45 : 55;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * W},${H - ((v - min) / range) * (H - 6) - 3}`).join(" ");
  const latest = data[data.length - 1], prev = data[data.length - 2] || latest;
  const trend  = latest > prev ? "▲" : latest < prev ? "▼" : "—";
  const tColor = latest > prev ? "#16a34a" : latest < prev ? "#b91c1c" : "#aaa";
  return (
    <div style={{ background: "rgba(0,0,0,0.06)", borderRadius: 12, padding: compact ? "10px 12px" : "12px 16px" }}>
      {label && (
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 12 }}>
          <span style={{ fontWeight: "bold", color: "#6b4c2a" }}>{label}</span>
          <span style={{ color: tColor, fontWeight: "bold" }}>{trend} {Math.round(latest)}</span>
        </div>
      )}
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: "block", overflow: "visible" }}>
        <polyline points={pts} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" />
        {data.map((v, i) => {
          const x = (i / (data.length - 1)) * W;
          const y = H - ((v - min) / range) * (H - 6) - 3;
          return <circle key={i} cx={x} cy={y} r="3.5" fill={color} />;
        })}
      </svg>
    </div>
  );
}

function ExplainModal({ topic, onClose, textPri, accent }) {
  const data = {
    utilization: {
      title: "Credit Utilization",
      emoji: "📊",
      lines: [
        "Utilization = how much of your credit limit you're using right now.",
        "Limit is 800 coins. Using 240 = 30% utilization.",
        "Lenders see high utilization as over-reliance on debt. Keep it under 30% to keep your score healthy.",
        "This makes up 30% of your total credit score.",
      ],
    },
    payment_history: {
      title: "Payment History",
      emoji: "📅",
      lines: [
        "Payment history is the #1 credit factor — 35% of your score.",
        "Every on-time payment tells lenders you're reliable. Every missed one says the opposite.",
        "In real life, a missed payment can stay on your report for 7 years.",
        "Fix: always pay at least the minimum. Full payment is even better.",
      ],
    },
    interest: {
      title: "Interest Rates & Credit",
      emoji: "🏦",
      lines: [
        "Your credit score determines what interest rate lenders offer you.",
        "On a $10,000 loan: 750+ score = 6% = $600 interest. 620 score = 18% = $1,800.",
        "That's $1,200 extra — for the exact same loan.",
        "Over a 30-year mortgage, this gap can exceed $100,000.",
      ],
    },
  }[topic];

  if (!data) return null;
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 500, padding: 20 }}>
      <div style={{ background: "#fef3e2", border: `2px solid #d4a96a`, borderRadius: 22, padding: 28, maxWidth: 420, width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
        <div style={{ fontSize: 44, textAlign: "center", marginBottom: 10 }}>{data.emoji}</div>
        <h2 style={{ color: "#3d2b1f", textAlign: "center", fontSize: 20, margin: "0 0 18px", fontFamily: "'Georgia', serif" }}>{data.title}</h2>
        {data.lines.map((line, i) => (
          <div key={i} style={{ display: "flex", gap: 10, marginBottom: 12, fontSize: 13, color: "#6b4c2a", lineHeight: 1.7 }}>
            <span style={{ color: accent, flexShrink: 0, marginTop: 1, fontWeight: "bold" }}>→</span>
            <span>{line}</span>
          </div>
        ))}
        <button onClick={onClose} style={{ width: "100%", padding: "13px", background: accent, border: "none", borderRadius: 14, cursor: "pointer", fontWeight: "bold", fontSize: 14, color: "#3d2b1f", marginTop: 8, fontFamily: "'Georgia', serif" }}>Got it! 🧁</button>
      </div>
    </div>
  );
}
