/* ============================================================
   BLOOM v2 — app.js
   Tamagotchi Sunflower Habit Tracker
   ============================================================ */
'use strict';

// ═══════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════
const DAYS = ['S','M','T','W','T','F','S'];

const SUGGESTIONS = [
  {name:'Read',emoji:'📖'},{name:'Meditate',emoji:'🧘'},{name:'Exercise',emoji:'💪'},
  {name:'Journal',emoji:'✍️'},{name:'Drink water',emoji:'💧'},{name:'Sleep early',emoji:'🌙'},
  {name:'No phone',emoji:'📵'},{name:'Cook',emoji:'🍳'},{name:'Walk outside',emoji:'🚶'},
  {name:'Stretch',emoji:'🤸'},{name:'Gratitude',emoji:'🙏'},{name:'Cold shower',emoji:'🚿'},
];

const STAGES = ['','Seed','Sprouting','Budding','Growing','Blooming','Thriving ✨'];
const MILESTONES = [
  {day:1,label:'First sprout',emoji:'🌱'},
  {day:3,label:'Leaves!',emoji:'🌿'},
  {day:7,label:'One week',emoji:'🌼'},
  {day:14,label:'Two weeks',emoji:'🌻'},
  {day:21,label:'Full bloom',emoji:'🌻✨'},
  {day:30,label:'Thriving',emoji:'💫'},
  {day:60,label:'Legend',emoji:'🏆'},
  {day:100,label:'Century',emoji:'🎖️'},
];

const SPEECHES = {
  happy: ['I feel amazing today! 🌟','You showed up! I love you 🌻','We\'re on a roll! ☀️','This feels so good! 🌈','You\'re my sunshine! 🌞'],
  ok:    ['Let\'s do this together','One day at a time 🌱','I\'m rooting for you!','A little care goes a long way','Still here, still growing 🌿'],
  sad:   ['I missed you yesterday… 🥺','Please come back 💧','I\'m getting a bit droopy','A little water would help…','I\'m still here, waiting 🌧️'],
  wilt:  ['I\'m really struggling… 😢','Please don\'t give up on me','It\'s not too late to come back','I need you…','A streak can be reborn 🌱'],
  seed:  ['Ready to grow with you! 🌱','Plant me and I\'ll flourish','Let\'s start this journey 🌱','I\'m just a seed, but I have dreams'],
};

const CONF_COLORS = ['#F5A020','#4A7C3F','#FFD166','#5DADE2','#E8736A','#7DB85A','#9B8EF5'];

// ═══════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════
const DEFAULTS = {
  v:2, identity:'', habits:[], checkins:{}, streaks:{},
  care:{},    // { name: { 'YYYY-MM-DD': {watered,sunned,talked,fed} } }
  health:{},  // { name: 0-100 }
  mood:{},    // { name: 'happy'|'ok'|'sad'|'wilt' }
  energy:{},  // { name: 0-100 }
  notifEnabled: false,
  onboarded: false,
};
let S = {};

const save = () => { try { localStorage.setItem('bloom_v2', JSON.stringify(S)); } catch(e){} };
function load() {
  try {
    const d = localStorage.getItem('bloom_v2');
    if (d) { S = {...DEFAULTS, ...JSON.parse(d)}; return true; }
  } catch(e){}
  S = {...DEFAULTS};
  return false;
}

// ═══════════════════════════════════════════════
// DATE HELPERS
// ═══════════════════════════════════════════════
const todayKey = () => new Date().toISOString().slice(0,10);
const fmtDate  = k => new Date(k+'T12:00:00').toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'});
const fmtShort = k => new Date(k+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'});

function weekKeys() {
  const out = [], now = new Date();
  for (let i=6; i>=0; i--) {
    const d = new Date(now); d.setDate(now.getDate()-i);
    out.push({key:d.toISOString().slice(0,10), day:DAYS[d.getDay()], isToday:i===0});
  }
  return out;
}

// ═══════════════════════════════════════════════
// GAME MECHANICS
// ═══════════════════════════════════════════════
function recalcStreak(name) {
  const ci = (S.checkins[name]||[]).slice().sort();
  let streak = 0;
  const now = new Date();
  for (let i=0; i<365; i++) {
    const d = new Date(now); d.setDate(now.getDate()-i);
    if (ci.includes(d.toISOString().slice(0,10))) streak++;
    else if (i>0) break;
  }
  S.streaks[name] = streak;
}

function getMood(name) {
  const streak = S.streaks[name]||0;
  const ci = S.checkins[name]||[];
  const today = todayKey();
  const doneToday = ci.includes(today);
  const yesterday = new Date(); yesterday.setDate(yesterday.getDate()-1);
  const yKey = yesterday.toISOString().slice(0,10);
  const doneYest = ci.includes(yKey);
  if (ci.length === 0) return 'seed';
  if (streak===0 && !doneYest && ci.length>0) {
    const last = [...ci].sort().pop();
    const daysSince = Math.floor((new Date(today)-new Date(last+'T12:00:00'))/(1000*60*60*24));
    return daysSince>=3 ? 'wilt' : 'sad';
  }
  if (doneToday) return 'happy';
  if (streak>=1) return 'ok';
  return 'sad';
}

function recalcVitals(name) {
  const streak = S.streaks[name]||0;
  const mood = getMood(name);
  const today = todayKey();
  const todayCare = (S.care[name]||{})[today]||{};
  const doneToday = (S.checkins[name]||[]).includes(today);

  let hp = Math.min(100, 20 + streak*6);
  if (doneToday)       hp = Math.min(100, hp+15);
  if (todayCare.watered) hp = Math.min(100, hp+8);
  if (todayCare.sunned)  hp = Math.min(100, hp+6);
  if (todayCare.talked)  hp = Math.min(100, hp+5);
  if (todayCare.fed)     hp = Math.min(100, hp+6);
  if (mood==='sad')  hp = Math.max(10, hp-15);
  if (mood==='wilt') hp = Math.max(5,  hp-30);

  let en = Math.min(100, 30 + streak*4);
  if (doneToday)         en = Math.min(100, en+20);
  if (todayCare.watered) en = Math.min(100, en+10);
  if (todayCare.fed)     en = Math.min(100, en+12);
  if (mood==='wilt')     en = Math.max(5, en-25);

  let mo = {happy:85, ok:60, sad:35, wilt:15, seed:50}[mood];
  if (todayCare.talked)  mo = Math.min(100, mo+15);
  if (todayCare.sunned)  mo = Math.min(100, mo+10);

  S.health[name] = Math.round(hp);
  S.energy[name] = Math.round(en);
  S.mood[name]   = mood;
}

function getStage(name) {
  const s = S.streaks[name]||0;
  if (s>=21) return 6;
  if (s>=14) return 5;
  if (s>=7)  return 4;
  if (s>=3)  return 3;
  if (s>=1)  return 2;
  return 1;
}

function nextMilestone(streak) {
  for (const m of MILESTONES) if (streak < m.day) return `${m.day-streak}d to "${m.label}" ${m.emoji}`;
  return 'Century bloom achieved 🏆';
}

function getSpeech(name) {
  const mood = getMood(name);
  const pool = SPEECHES[mood] || SPEECHES.ok;
  return pool[Math.floor(Math.random()*pool.length)];
}

// ═══════════════════════════════════════════════
// SVG SUNFLOWER ENGINE
// ═══════════════════════════════════════════════
function sunflowerSVG(name, size=80, opts={}) {
  const stage  = opts.stage  ?? getStage(name);
  const mood   = opts.mood   ?? getMood(name);
  const glowing = mood === 'happy';
  const wilting = mood === 'wilt';
  const sad     = mood === 'sad';

  const S2 = size, cx = S2/2;
  const stemTop = stage<=1 ? S2*.80 : S2*.26;
  const sw = Math.max(2, S2*.055);
  const stemColor = wilting ? '#7B6030' : (sad ? '#5A7040' : '#3B6D11');
  const leafColor = wilting ? '#8B9060' : (sad ? '#5A8040' : '#4A7C3F');

  // Stem — wilting = curved
  let stem;
  if (wilting && stage>=2) {
    const mx = cx+S2*.12, my = stemTop+(S2-stemTop)*.4;
    stem = `<path d="M${cx} ${S2} Q${mx} ${my} ${cx-S2*.05} ${stemTop+S2*.08}" fill="none" stroke="${stemColor}" stroke-width="${sw}" stroke-linecap="round"/>`;
  } else {
    stem = `<line x1="${cx}" y1="${S2}" x2="${cx}" y2="${stemTop}" stroke="${stemColor}" stroke-width="${sw}" stroke-linecap="round"/>`;
  }

  // Leaves
  let leaves = '';
  if (stage>=3) {
    const ly = stemTop+(S2-stemTop)*.42;
    const op = wilting ? .5 : 1;
    leaves += `<ellipse cx="${cx-S2*.21}" cy="${ly}" rx="${S2*.155}" ry="${S2*.075}" fill="${leafColor}" opacity="${op}" transform="rotate(-32 ${cx-S2*.21} ${ly})"/>`;
  }
  if (stage>=4) {
    const ly2 = stemTop+(S2-stemTop)*.62;
    const op = wilting ? .4 : 1;
    leaves += `<ellipse cx="${cx+S2*.19}" cy="${ly2}" rx="${S2*.135}" ry="${S2*.067}" fill="${leafColor}" opacity="${op}" transform="rotate(28 ${cx+S2*.19} ${ly2})"/>`;
  }
  if (stage>=5) {
    const ly3 = stemTop+(S2-stemTop)*.78;
    leaves += `<ellipse cx="${cx-S2*.16}" cy="${ly3}" rx="${S2*.11}" ry="${S2*.055}" fill="${leafColor}" opacity="${wilting?.3:1}" transform="rotate(-20 ${cx-S2*.16} ${ly3})"/>`;
  }

  // Flower head
  let head = '';
  if (stage<=1) {
    // Seed mound
    head += `<ellipse cx="${cx}" cy="${stemTop+3}" rx="${S2*.11}" ry="${S2*.075}" fill="#7B5534"/>`;
    head += `<ellipse cx="${cx}" cy="${stemTop+1}" rx="${S2*.06}" ry="${S2*.04}" fill="#9B7054" opacity=".5"/>`;
  } else {
    // Head position — drooping when wilting
    const hx = wilting ? cx-S2*.06 : cx;
    const hy = wilting ? stemTop+S2*.1 : stemTop;
    const fr = S2*([0,.1,.13,.17,.205,.245,.285][Math.min(stage,6)]);
    const pl = fr*.82;

    const pAngles = stage>=5 ? Array.from({length:16},(_,i)=>i*22.5)
                  : stage>=4 ? Array.from({length:12},(_,i)=>i*30)
                  : stage>=3 ? [0,45,90,135,180,225,270,315]
                  : [0,90,180,270];

    const pc1 = wilting ? '#C8A060' : (glowing ? '#FFD166' : '#F5A020');
    const pc2 = wilting ? '#A08040' : (glowing ? '#F5A623' : '#C17010');
    if (glowing) head += `<circle cx="${hx}" cy="${hy}" r="${fr+S2*.09}" fill="#FFD166" opacity=".18"/>`;

    // Petals
    pAngles.forEach((a,i) => {
      const rad = a*Math.PI/180;
      const px = hx+Math.cos(rad)*(fr+pl*.42);
      const py = hy+Math.sin(rad)*(fr+pl*.42);
      const op = wilting ? .65 : 1;
      head += `<ellipse cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" rx="${(pl*.28).toFixed(1)}" ry="${(pl*.52).toFixed(1)}" fill="${i%2===0?pc1:pc2}" opacity="${op}" transform="rotate(${a} ${px.toFixed(1)} ${py.toFixed(1)})"/>`;
    });

    // Center
    const cFill = wilting ? '#7B5030' : '#5C3D1E';
    const cFill2 = wilting ? '#604020' : '#3D2B1F';
    head += `<circle cx="${hx}" cy="${hy}" r="${fr}" fill="${cFill}"/>`;
    head += `<circle cx="${hx}" cy="${hy}" r="${fr*.62}" fill="${cFill2}"/>`;
    if (stage>=5) head += `<circle cx="${hx}" cy="${hy}" r="${fr*.28}" fill="#7B5534"/>`;

    // Face — tamagotchi expressions
    const er = Math.max(1.5, fr*.095);
    const ex = [cx-fr*.27, cx+fr*.27];
    const eyY = hy-fr*.12;

    if (mood==='happy') {
      // Happy eyes (^)
      head += `<path d="M${ex[0]-er} ${eyY+er} A${er} ${er} 0 0 1 ${ex[0]+er} ${eyY+er}" fill="${pc1}" stroke="none"/>`;
      head += `<path d="M${ex[1]-er} ${eyY+er} A${er} ${er} 0 0 1 ${ex[1]+er} ${eyY+er}" fill="${pc1}" stroke="none"/>`;
      // Smile
      head += `<path d="M${hx-fr*.22} ${hy+fr*.18} Q${hx} ${hy+fr*.38} ${hx+fr*.22} ${hy+fr*.18}" fill="none" stroke="${pc1}" stroke-width="${er*1.4}" stroke-linecap="round"/>`;
      // Blush
      head += `<ellipse cx="${hx-fr*.38}" cy="${hy+fr*.15}" rx="${fr*.12}" ry="${fr*.07}" fill="#F5A020" opacity=".35"/>`;
      head += `<ellipse cx="${hx+fr*.38}" cy="${hy+fr*.15}" rx="${fr*.12}" ry="${fr*.07}" fill="#F5A020" opacity=".35"/>`;
    } else if (mood==='sad' || mood==='wilt') {
      // Sad eyes (dots with tear)
      head += `<circle cx="${ex[0]}" cy="${eyY}" r="${er}" fill="#C4956A"/>`;
      head += `<circle cx="${ex[1]}" cy="${eyY}" r="${er}" fill="#C4956A"/>`;
      // Frown
      head += `<path d="M${hx-fr*.2} ${hy+fr*.28} Q${hx} ${hy+fr*.14} ${hx+fr*.2} ${hy+fr*.28}" fill="none" stroke="#C4956A" stroke-width="${er*1.2}" stroke-linecap="round"/>`;
      if (mood==='wilt') {
        // Tear drops
        head += `<ellipse cx="${ex[0]+er*.2}" cy="${eyY+er*2.2}" rx="${er*.4}" ry="${er*.7}" fill="#88CCFF" opacity=".8"/>`;
      }
    } else if (mood==='ok') {
      // Neutral eyes
      head += `<circle cx="${ex[0]}" cy="${eyY}" r="${er}" fill="#C4956A"/>`;
      head += `<circle cx="${ex[1]}" cy="${eyY}" r="${er}" fill="#C4956A"/>`;
      // Flat mouth
      head += `<line x1="${hx-fr*.18}" y1="${hy+fr*.22}" x2="${hx+fr*.18}" y2="${hy+fr*.22}" stroke="#C4956A" stroke-width="${er*1.2}" stroke-linecap="round"/>`;
    } else {
      // Seed — hopeful little eyes
      head += `<circle cx="${hx-fr*.2}" cy="${eyY}" r="${er*.8}" fill="#9B7054"/>`;
      head += `<circle cx="${hx+fr*.2}" cy="${eyY}" r="${er*.8}" fill="#9B7054"/>`;
    }
  }

  return `<svg width="${S2}" height="${S2}" viewBox="0 0 ${S2} ${S2}" xmlns="http://www.w3.org/2000/svg">
    <defs><filter id="gf${stage}"><feGaussianBlur stdDeviation="2.5" result="b"/><feComposite in="SourceGraphic" in2="b" operator="over"/></filter></defs>
    <g ${glowing?`filter="url(#gf${stage})"`:''}>${stem}${leaves}${head}</g>
  </svg>`;
}

// ═══════════════════════════════════════════════
// DOM SHORTCUTS
// ═══════════════════════════════════════════════
const el = id => document.getElementById(id);
const qs = (s,c=document) => c.querySelector(s);

// ═══════════════════════════════════════════════
// GARDEN TAB
// ═══════════════════════════════════════════════
function renderGarden() {
  renderFlowers();
  renderProgress();
  renderHabitList();
}

function renderFlowers() {
  const row = el('garden-flowers');
  if (!row) return;
  row.innerHTML = '';
  const today = todayKey();
  S.habits.forEach(h => {
    const done  = (S.checkins[h.name]||[]).includes(today);
    const mood  = getMood(h.name);
    const stage = getStage(h.name);
    const btn   = document.createElement('button');
    btn.className = 'flower-btn';
    btn.setAttribute('aria-label', `${h.name} — ${STAGES[stage]}`);
    btn.innerHTML = `<span class="flower-label">${h.emoji} ${h.name}</span>${sunflowerSVG(h.name,60)}`;
    btn.addEventListener('click', () => openDetail(h.name));
    row.appendChild(btn);
  });
}

function renderProgress() {
  const today = todayKey();
  const total = S.habits.length;
  const done  = S.habits.filter(h=>(S.checkins[h.name]||[]).includes(today)).length;
  const pct   = total ? Math.round(done/total*100) : 0;
  const fill  = el('prog-fill');
  const ptxt  = el('prog-text');
  const ppct  = el('prog-pct');
  if (fill) fill.style.width = pct+'%';
  if (ptxt) ptxt.textContent = `${done}/${total} done today`;
  if (ppct) ppct.textContent = pct+'%';
}

function renderHabitList() {
  const list = el('habit-list');
  if (!list) return;
  list.innerHTML = '';
  if (!S.habits.length) {
    list.innerHTML = `<div class="jrnl-empty"><div class="jrnl-empty-ico">🌱</div><div class="jrnl-empty-txt">No habits yet.<br>Add your first seed!</div></div>`;
    return;
  }
  const today = todayKey();
  const wk    = weekKeys();
  S.habits.forEach(h => {
    const ci    = S.checkins[h.name]||[];
    const done  = ci.includes(today);
    const mood  = getMood(h.name);
    const streak= S.streaks[h.name]||0;
    const stage = getStage(h.name);
    const hp    = S.health[h.name]||10;
    const moodTag = {happy:{cls:'mood-happy',txt:'Happy 😊'},ok:{cls:'mood-ok',txt:'Okay 🙂'},sad:{cls:'mood-sad',txt:'Missing you 😔'},wilt:{cls:'mood-sad',txt:'Wilting… 😢'},seed:{cls:'mood-ok',txt:'Ready 🌱'}}[mood];

    const card = document.createElement('div');
    card.className = 'habit-card'+(done?' done':'')+(mood==='wilt'?' wilting':'');
    card.innerHTML = `
      <div class="check-ring">${done?'✓':''}</div>
      <div class="hc-info">
        <div class="hc-name">${h.emoji} ${h.name}</div>
        <div class="hc-meta">
          🔥 ${streak}d · ${STAGES[stage]}
          <span class="mood-tag ${moodTag.cls}">${moodTag.txt}</span>
        </div>
        <div class="wdots">${wk.map(w=>{
          const d2 = ci.includes(w.key);
          const miss = !d2 && !w.isToday && w.key<today && ci.length>0;
          return `<div class="wd ${d2?'done':''} ${w.isToday?'today':''} ${miss?'miss':''}" title="${w.key}">${w.day}</div>`;
        }).join('')}</div>
      </div>
      <div class="hc-right">
        <div class="lv-pill">Lv ${Math.floor(streak/3)+1}</div>
        <div class="hp-mini">❤️ ${hp}%</div>
      </div>`;
    card.addEventListener('click', () => toggleCheckin(h.name));
    list.appendChild(card);
  });
}

// ═══════════════════════════════════════════════
// CHECK-IN
// ═══════════════════════════════════════════════
function toggleCheckin(name) {
  const today = todayKey();
  if (!S.checkins[name]) S.checkins[name] = [];
  const idx = S.checkins[name].indexOf(today);
  const isChecking = idx === -1;
  if (isChecking) {
    S.checkins[name].push(today);
    recalcStreak(name);
    recalcVitals(name);
    const streak = S.streaks[name];
    popConfetti();
    showToast(encourageMsg(streak));
    checkMilestone(name, streak);
  } else {
    S.checkins[name].splice(idx,1);
    recalcStreak(name);
    recalcVitals(name);
  }
  save();
  renderGarden();
  renderCareTab();
  updateHeader();
  if (el('care-habit-select') && el('care-habit-select').value === name) renderCareHabit(name);
}

function encourageMsg(streak) {
  if (streak===1)  return '🌱 First check-in! Your seed is planted!';
  if (streak===3)  return '🌿 3 days! Hello little sprout!';
  if (streak===7)  return '🌼 One whole week! You\'re blooming!';
  if (streak===14) return '🌻 Two weeks strong! Almost there!';
  if (streak===21) return '🌻✨ FULL BLOOM! You\'re thriving!';
  if (streak===30) return '💫 30 days! Absolute legend!';
  return ['Great job! 🌱','Keep it up! 🌿','You\'re on a roll! ☀️','Incredible! 🌻','Your flower loves you! 💛'][streak%5];
}

function checkMilestone(name, streak) {
  const m = MILESTONES.find(m => m.day===streak);
  if (m) setTimeout(() => showToast(`🏆 Milestone: "${m.label}" — ${streak} days!`), 2500);
}

// ═══════════════════════════════════════════════
// CARE TAB
// ═══════════════════════════════════════════════
function renderCareTab() {
  const sel = el('care-habit-select');
  if (!sel) return;
  const prev = sel.value;
  sel.innerHTML = S.habits.map(h=>`<option value="${h.name}">${h.emoji} ${h.name}</option>`).join('');
  if (prev && S.habits.find(h=>h.name===prev)) sel.value = prev;
  const name = sel.value;
  if (name) renderCareHabit(name);
}

function renderCareHabit(name) {
  const h = S.habits.find(h=>h.name===name);
  if (!h) return;
  const today   = todayKey();
  const care    = (S.care[name]||{})[today]||{};
  const mood    = getMood(name);
  const stage   = getStage(name);
  const streak  = S.streaks[name]||0;
  const hp      = S.health[name]||10;
  const energy  = S.energy[name]||10;
  const done    = (S.checkins[name]||[]).includes(today);
  const moodPct = {happy:90,ok:65,sad:35,wilt:15,seed:55}[mood];

  // Portrait
  const portrait = el('care-portrait-svg');
  if (portrait) {
    portrait.innerHTML = sunflowerSVG(name,130,{stage,mood});
    portrait.className = 'portrait-svg '+(mood==='happy'?'portrait-float':mood==='wilt'?'portrait-wilt':'portrait-sad');
  }
  const fnEl = el('care-flower-name-txt'); if (fnEl) fnEl.textContent = `${h.emoji} ${h.name}`;
  const stEl = el('care-stage-txt');
  if (stEl) stEl.textContent = STAGES[stage]+(done?' · Checked in today ✓':'');

  // Speech bubble
  const sb = el('speech-bubble');
  if (sb) sb.textContent = `"${getSpeech(name)}"`;

  // Care buttons
  const btns = [
    {id:'btn-water', key:'watered', emoji:'💧', label:'Water',   sub:'Hydration +8'},
    {id:'btn-sun',   key:'sunned',  emoji:'☀️', label:'Sunshine',sub:'Mood +10'},
    {id:'btn-talk',  key:'talked',  emoji:'🗣️', label:'Talk',    sub:'Happiness +15'},
    {id:'btn-feed',  key:'fed',     emoji:'🌿', label:'Fertilise',sub:'Energy +12'},
  ];
  btns.forEach(b => {
    const btn = el(b.id); if (!btn) return;
    btn.classList.toggle('used', !!care[b.key]);
    qs('.care-sub', btn).textContent = care[b.key] ? 'Done today ✓' : b.sub;
  });

  // Check-in button state
  const cBtn = el('btn-checkin'); if (cBtn) {
    qs('.care-icon', cBtn).textContent = done ? '✅' : '☑️';
    qs('.care-label', cBtn).textContent = done ? 'Done today!' : 'Check In';
    qs('.care-sub', cBtn).textContent   = done ? 'Come back tomorrow' : 'Mark habit done';
    cBtn.classList.toggle('used', done);
  }

  // Vitals bars
  const setBar = (id,pct,cls) => {
    const b = el(id); if (b) { b.style.width=Math.round(pct)+'%'; b.className='vbar '+cls; }
  };
  setBar('vbar-health', hp,     'health');
  setBar('vbar-energy', energy, 'energy');
  setBar('vbar-mood',   moodPct,'mood');

  const vv = (id,val) => { const e=el(id); if(e) e.textContent=val; };
  vv('vval-health', hp+'%');
  vv('vval-energy', energy+'%');
  vv('vval-mood',   {happy:'😊',ok:'🙂',sad:'😔',wilt:'😢',seed:'🌱'}[mood]);

  // Milestones
  renderMilestones(name, streak);
}

function renderMilestones(name, streak) {
  const row = el('milestones-row'); if (!row) return;
  row.innerHTML = MILESTONES.map(m => `
    <div class="milestone ${streak>=m.day?'reached':''}">
      <div class="ms-icon">${streak>=m.day?m.emoji:'⬜'}</div>
      <div class="ms-day">${m.day}d</div>
      <div class="ms-label">${m.label}</div>
    </div>`).join('');
}

function doCare(action) {
  const name = el('care-habit-select')?.value; if (!name) return;
  const today = todayKey();
  if (!S.care[name]) S.care[name]={};
  if (!S.care[name][today]) S.care[name][today]={};
  if (S.care[name][today][action]) return;
  S.care[name][today][action] = true;
  recalcVitals(name);
  save();
  renderCareHabit(name);
  miniSparks();
  const msgs = {
    watered: '💧 Watered! Your flower is drinking happily.',
    sunned:  '☀️ Sunshine given! Soaking up the rays.',
    talked:  '🗣️ Encouraged! Your flower feels loved 🌻',
    fed:     '🌿 Fertilised! Extra growth boost!',
  };
  showToast(msgs[action]);
}

function careCheckin() {
  const name = el('care-habit-select')?.value; if (!name) return;
  toggleCheckin(name);
}

// ═══════════════════════════════════════════════
// JOURNAL TAB
// ═══════════════════════════════════════════════
function renderJournal() {
  const list = el('journal-list'); if (!list) return;
  const entries = [];
  S.habits.forEach(h => {
    (S.checkins[h.name]||[]).forEach(d => entries.push({h, date:d}));
  });
  entries.sort((a,b) => b.date.localeCompare(a.date));
  if (!entries.length) {
    list.innerHTML = `<div class="jrnl-empty"><div class="jrnl-empty-ico">📖</div><div class="jrnl-empty-txt">Your garden journal is empty.<br>Check in on a habit to begin your story.</div></div>`;
    return;
  }
  let html = '', lastDate = '';
  entries.slice(0,80).forEach(e => {
    if (e.date !== lastDate) {
      html += `<div class="date-div">${fmtDate(e.date)}</div>`;
      lastDate = e.date;
    }
    html += `<div class="jrnl-entry"><div class="je-left"><div class="je-habit">${e.h.emoji} ${e.h.name}</div><div class="je-date">Streak at time: ${S.streaks[e.h.name]||0} days · ${STAGES[getStage(e.h.name)]}</div></div><span class="je-icon">🌻</span></div>`;
  });
  list.innerHTML = html;
}

// ═══════════════════════════════════════════════
// SETTINGS TAB
// ═══════════════════════════════════════════════
function renderSettings() {
  const ni = el('notif-toggle'); if (ni) ni.checked = S.notifEnabled;
}

async function requestNotifications() {
  if (!('Notification' in window)) { showToast('Notifications not supported'); return; }
  const perm = await Notification.requestPermission();
  S.notifEnabled = perm === 'granted';
  save();
  renderSettings();
  if (S.notifEnabled) {
    showToast('🔔 Notifications enabled! We\'ll remind you daily.');
    scheduleReminder();
  } else {
    showToast('Notifications blocked. Enable in browser settings.');
  }
}

function scheduleReminder() {
  // Register a daily check via SW if supported — basic version
  if ('serviceWorker' in navigator && S.notifEnabled) {
    navigator.serviceWorker.ready.then(sw => {
      // Real push needs a push server; this fires a local notification
      if (Notification.permission==='granted') {
        setTimeout(() => {
          new Notification('🌻 Bloom reminder', {
            body: 'Your flowers are waiting for you! Check in today.',
            icon: '/icons/icon-192.png',
            badge: '/icons/icon-192.png',
          });
        }, 5000); // demo: 5s delay
      }
    }).catch(()=>{});
  }
}

function resetData() {
  if (!confirm('Reset all habit data? This cannot be undone.')) return;
  localStorage.removeItem('bloom_v2');
  location.reload();
}

// ═══════════════════════════════════════════════
// FLOWER DETAIL SHEET
// ═══════════════════════════════════════════════
function openDetail(name) {
  const h     = S.habits.find(h=>h.name===name); if (!h) return;
  const today = todayKey();
  const done  = (S.checkins[h.name]||[]).includes(today);
  const streak= S.streaks[h.name]||0;
  const stage = getStage(name);
  const total = (S.checkins[h.name]||[]).length;
  const hp    = S.health[h.name]||0;
  const mood  = getMood(name);

  el('det-name').textContent  = `${h.emoji} ${h.name}`;
  el('det-stage').textContent = STAGES[stage]+' · '+{happy:'Thriving',ok:'Growing',sad:'Missing you',wilt:'Struggling',seed:'Just planted'}[mood];
  el('det-svg').innerHTML     = `<div class="${mood==='happy'?'portrait-float':''}">${sunflowerSVG(name,130,{stage,mood})}</div>`;
  el('det-streak').textContent= streak;
  el('det-total').textContent = total;
  el('det-hp').textContent    = hp+'%';
  el('det-next').textContent  = nextMilestone(streak);
  el('det-speech').textContent= `"${getSpeech(name)}"`;
  el('detail-sheet').classList.add('open');
}

function closeDetail() { el('detail-sheet').classList.remove('open'); }

// ═══════════════════════════════════════════════
// TABS & NAVIGATION
// ═══════════════════════════════════════════════
function switchTab(tab) {
  document.querySelectorAll('.tab-pane').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));
  el(`tab-${tab}`).classList.add('active');
  el(`nav-${tab}`).classList.add('active');
  if (tab==='care')     renderCareTab();
  if (tab==='journal')  renderJournal();
  if (tab==='settings') renderSettings();
}

function updateHeader() {
  const max = S.habits.length ? Math.max(...S.habits.map(h=>S.streaks[h.name]||0)) : 0;
  const sb  = el('streak-pill'); if (sb) sb.textContent=`🔥 ${max}d`;
}

// ═══════════════════════════════════════════════
// SCREENS
// ═══════════════════════════════════════════════
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  el(id).classList.add('active');
}

// ═══════════════════════════════════════════════
// BUILD DOM
// ═══════════════════════════════════════════════
function buildDOM() {
  el('app').innerHTML = `

<!-- ── ONBOARDING ── -->
<div class="screen active" id="screen-onboard">
  <div class="ob-hero">
    <div class="ob-logo">🌻 Bloom</div>
    <div class="ob-tag">grow your habits like a tamagotchi</div>
    <div id="ob-hero-flower" style="margin-top:1.25rem"></div>
  </div>
  <div class="ob-panel">
    <div class="step active" id="step-1">
      <div class="step-h">Who do you want to become?</div>
      <div class="step-sub">Your identity is the seed. Your habits are the water. Be specific — it matters.</div>
      <div class="id-field"><span class="id-prefix">I am a person who</span><input class="id-input" id="id-input" type="text" placeholder="reads every morning…" autocomplete="off"/></div>
      <button class="btn-primary" id="btn-s1" disabled>Choose my habits →</button>
    </div>
    <div class="step" id="step-2">
      <div class="step-h">Pick your seeds 🌱</div>
      <div class="step-sub">Up to 5 habits. Each one grows its own sunflower you'll need to care for daily.</div>
      <div class="habits-grid" id="habits-grid"></div>
      <div class="custom-row"><input class="c-input" id="c-input" placeholder="Add your own habit…"/><button class="btn-plus" id="btn-plus">+</button></div>
      <div id="sel-count" style="font-size:.75rem;color:var(--text-muted);margin-bottom:.8rem;text-align:right"></div>
      <button class="btn-primary" id="btn-s2" disabled>Plant my garden 🌱</button>
    </div>
  </div>
</div>

<!-- ── SEED CEREMONY ── -->
<div class="screen" id="screen-seed">
  <div class="cer-title">Planting your seeds…</div>
  <div class="cer-sub" id="cer-sub"></div>
  <div class="seed-stage">
    <div class="rain-wrap" id="rain-wrap"></div>
    <div class="seeds-row" id="seeds-row"></div>
    <div class="seed-ground"></div>
  </div>
  <div class="cer-note">Each flower needs your daily attention. Water it. Talk to it. Show up for it — just like it'll show up for you.</div>
  <button class="btn-cer" id="btn-cer" style="margin-top:1.5rem">Begin growing →</button>
</div>

<!-- ── MAIN APP ── -->
<div class="screen" id="screen-main">
  <header class="app-header">
    <div class="hdr-row">
      <div class="hdr-logo">🌻 Bloom</div>
      <div class="hdr-right">
        <div class="streak-pill" id="streak-pill">🔥 0d</div>
        <button class="settings-btn" onclick="switchTab('settings')" aria-label="Settings">⚙️</button>
      </div>
    </div>
    <div class="hdr-id" id="hdr-id"></div>
  </header>

  <div class="tab-content">

    <!-- GARDEN -->
    <div class="tab-pane active" id="tab-garden">
      <div class="garden-wrap">
        <div class="garden-sky" id="garden-sky">
          <!-- Sun -->
          <div class="g-sun">
            <svg class="sun-body" width="52" height="52" viewBox="0 0 52 52">
              ${Array.from({length:8},(_,i)=>{const a=i*45,r=a*Math.PI/180,x1=26+14*Math.cos(r),y1=26+14*Math.sin(r),x2=26+22*Math.cos(r),y2=26+22*Math.sin(r);return`<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="#F5C842" stroke-width="2.5" stroke-linecap="round"/>`;}).join('')}
              <circle cx="26" cy="26" r="11" fill="#F5C842"/><circle cx="26" cy="26" r="8" fill="#E8A020"/>
            </svg>
          </div>
          <!-- Cloud -->
          <div class="g-cloud" style="top:16px;left:10px">
            <svg width="72" height="32" viewBox="0 0 72 32"><ellipse cx="36" cy="24" rx="30" ry="11" fill="rgba(255,255,255,.75)"/><ellipse cx="26" cy="18" rx="17" ry="13" fill="rgba(255,255,255,.75)"/><ellipse cx="48" cy="20" rx="15" ry="11" fill="rgba(255,255,255,.75)"/></svg>
          </div>
          <div class="garden-flowers" id="garden-flowers"></div>
        </div>
        <div class="garden-ground"></div>
      </div>
      <div class="prog-wrap">
        <div class="prog-row"><span id="prog-text">0/0 done today</span><span id="prog-pct">0%</span></div>
        <div class="prog-track"><div class="prog-fill" id="prog-fill" style="width:0%"></div></div>
      </div>
      <div class="s-head">🌱 Today's habits</div>
      <div id="habit-list"></div>
    </div>

    <!-- CARE -->
    <div class="tab-pane" id="tab-care">
      <div class="s-head">🫧 Care for your flower</div>
      <div class="care-select-wrap">
        <select class="care-select" id="care-habit-select" onchange="renderCareHabit(this.value)"></select>
      </div>
      <div class="care-portrait">
        <div id="care-portrait-svg"></div>
      </div>
      <div class="care-flower-name" id="care-flower-name-txt"></div>
      <div class="care-stage" id="care-stage-txt"></div>
      <div class="speech-bubble" id="speech-bubble"></div>

      <div class="care-grid">
        <button class="care-btn" id="btn-water" onclick="doCare('watered')">
          <div class="care-icon">💧</div><div class="care-label">Water</div><div class="care-sub">Hydration +8</div>
        </button>
        <button class="care-btn" id="btn-sun" onclick="doCare('sunned')">
          <div class="care-icon">☀️</div><div class="care-label">Sunshine</div><div class="care-sub">Mood +10</div>
        </button>
        <button class="care-btn" id="btn-talk" onclick="doCare('talked')">
          <div class="care-icon">🗣️</div><div class="care-label">Talk to it</div><div class="care-sub">Happiness +15</div>
        </button>
        <button class="care-btn highlight" id="btn-feed" onclick="doCare('fed')">
          <div class="care-icon">🌿</div><div class="care-label">Fertilise</div><div class="care-sub">Energy +12</div>
        </button>
      </div>

      <div class="care-grid" style="grid-template-columns:1fr">
        <button class="care-btn" id="btn-checkin" onclick="careCheckin()">
          <div class="care-icon" style="font-size:1.5rem">☑️</div><div class="care-label">Check In</div><div class="care-sub">Mark habit done</div>
        </button>
      </div>

      <div class="vitals-card" style="margin-bottom:1.1rem">
        <div class="vital-row"><div class="vital-ico">❤️</div><div class="vital-name">Health</div><div class="vbar-wrap"><div class="vbar health" id="vbar-health" style="width:10%"></div></div><div class="vital-val" id="vval-health">10%</div></div>
        <div class="vital-row"><div class="vital-ico">⚡</div><div class="vital-name">Energy</div><div class="vbar-wrap"><div class="vbar energy" id="vbar-energy" style="width:10%"></div></div><div class="vital-val" id="vval-energy">10%</div></div>
        <div class="vital-row"><div class="vital-ico">😊</div><div class="vital-name">Mood</div><div class="vbar-wrap"><div class="vbar mood" id="vbar-mood" style="width:50%"></div></div><div class="vital-val" id="vval-mood">🙂</div></div>
      </div>

      <div class="s-head">🏆 Milestones</div>
      <div class="milestones-row" id="milestones-row"></div>
    </div>

    <!-- JOURNAL -->
    <div class="tab-pane" id="tab-journal">
      <div class="s-head">📖 Garden Journal</div>
      <div id="journal-list"></div>
    </div>

    <!-- SETTINGS -->
    <div class="tab-pane" id="tab-settings">
      <div class="s-head">⚙️ Settings</div>

      <div id="notif-request-card" class="notif-card" style="display:none">
        <span style="font-size:1.5rem">🔔</span>
        <div class="notif-card-text"><b>Daily reminders</b>Get nudged when your flowers need you.</div>
        <button class="btn-allow-notif" onclick="requestNotifications()">Allow</button>
      </div>

      <div class="settings-section">
        <div class="settings-label">Your identity</div>
        <div class="settings-card">
          <div class="settings-row" style="cursor:default">
            <div class="sr-icon">🌱</div>
            <div class="sr-text"><div class="sr-title" id="identity-display">—</div><div class="sr-sub">Your north star</div></div>
          </div>
        </div>
      </div>

      <div class="settings-section">
        <div class="settings-label">Notifications</div>
        <div class="settings-card">
          <div class="settings-row" style="cursor:default">
            <div class="sr-icon">🔔</div>
            <div class="sr-text"><div class="sr-title">Daily reminder</div><div class="sr-sub">Nudge when flowers need care</div></div>
            <label class="toggle-wrap"><input type="checkbox" class="toggle-input" id="notif-toggle" onchange="if(this.checked)requestNotifications()"><div class="toggle-slider"></div></label>
          </div>
        </div>
      </div>

      <div class="settings-section">
        <div class="settings-label">Garden</div>
        <div class="settings-card">
          <div class="settings-row" onclick="resetData()">
            <div class="sr-icon">🗑️</div>
            <div class="sr-text"><div class="sr-title" style="color:var(--danger)">Reset all data</div><div class="sr-sub">Start fresh — cannot be undone</div></div>
            <div class="sr-caret">›</div>
          </div>
        </div>
      </div>

      <div style="text-align:center;font-size:.75rem;color:var(--text-muted);padding:1rem 0;font-style:italic;font-family:var(--f-serif)">
        Bloom v2 · Made with 🌱 and stubbornness
      </div>
    </div>
  </div><!-- /tab-content -->

  <nav class="bottom-nav">
    <button class="nav-btn active" id="nav-garden" onclick="switchTab('garden')"><div class="nav-ico">🏡</div><span>Garden</span></button>
    <button class="nav-btn" id="nav-care"    onclick="switchTab('care')"><div class="nav-ico">🫧</div><span>Care</span></button>
    <button class="nav-btn" id="nav-journal" onclick="switchTab('journal')"><div class="nav-ico">📖</div><span>Journal</span></button>
    <button class="nav-btn" id="nav-settings" onclick="switchTab('settings')"><div class="nav-ico">⚙️</div><span>Settings</span></button>
  </nav>

  <!-- Detail sheet -->
  <div class="sheet-overlay" id="detail-sheet" onclick="if(event.target===this)closeDetail()">
    <div class="sheet">
      <div class="sheet-handle"></div>
      <div class="detail-name" id="det-name"></div>
      <div class="detail-stage" id="det-stage"></div>
      <div class="detail-svg" id="det-svg"></div>
      <div class="speech-bubble" id="det-speech" style="margin-bottom:1rem"></div>
      <div class="detail-stats">
        <div class="ds"><div class="ds-val" id="det-streak">0</div><div class="ds-key">day streak</div></div>
        <div class="ds"><div class="ds-val" id="det-total">0</div><div class="ds-key">total check-ins</div></div>
        <div class="ds"><div class="ds-val" id="det-hp">0%</div><div class="ds-key">health</div></div>
      </div>
      <div class="detail-milestone-txt" id="det-next"></div>
      <button class="btn-close" onclick="closeDetail()">Close</button>
    </div>
  </div>
</div><!-- /screen-main -->

<!-- Install banner -->
<div class="install-banner" id="install-banner">
  <span style="font-size:1.4rem">🌻</span>
  <div class="ib-text"><b>Add Bloom to your home screen</b>Grow your habits anywhere, anytime.</div>
  <button class="btn-install" id="btn-install">Install</button>
  <button class="btn-dismiss" id="btn-dismiss">✕</button>
</div>
`;
}

// ═══════════════════════════════════════════════
// ONBOARDING LOGIC
// ═══════════════════════════════════════════════
const selectedHabits = new Set();

function setupOnboarding() {
  // Hero flower
  const hero = el('ob-hero-flower');
  if (hero) hero.innerHTML = `<div class="portrait-float">${sunflowerSVG('_demo',90,{stage:5,mood:'happy'})}</div>`;

  // Chips
  const grid = el('habits-grid');
  SUGGESTIONS.forEach(h => {
    const chip = document.createElement('button');
    chip.className = 'h-chip';
    chip.innerHTML = `<span class="ce">${h.emoji}</span><span>${h.name}</span>`;
    chip.addEventListener('click', () => {
      if (selectedHabits.has(h.name)) { selectedHabits.delete(h.name); chip.classList.remove('sel'); }
      else if (selectedHabits.size<5) { selectedHabits.add(h.name); chip.classList.add('sel'); }
      else showToast('Max 5 habits — remove one first!');
      updSelCount();
    });
    grid.appendChild(chip);
  });

  // Identity
  const inp = el('id-input');
  inp.addEventListener('input', () => { el('btn-s1').disabled = inp.value.trim().length<2; });
  el('btn-s1').addEventListener('click', () => {
    S.identity = inp.value.trim();
    el('step-1').classList.remove('active');
    el('step-2').classList.add('active');
  });

  // Custom
  el('btn-plus').addEventListener('click', addCustom);
  el('c-input').addEventListener('keydown', e => { if(e.key==='Enter') addCustom(); });

  // Plant
  el('btn-s2').addEventListener('click', () => {
    S.habits=[]; S.checkins={}; S.streaks={}; S.care={}; S.health={}; S.energy={}; S.mood={};
    selectedHabits.forEach(name => {
      const found = SUGGESTIONS.find(h=>h.name===name);
      S.habits.push({name, emoji: found?found.emoji:'🌱'});
      S.streaks[name]=0; S.health[name]=20; S.energy[name]=30;
    });
    S.onboarded = true;
    save();
    showCeremony();
  });
}

function addCustom() {
  const val = el('c-input').value.trim(); if (!val) return;
  if (selectedHabits.size>=5) { showToast('Max 5 habits!'); return; }
  if (selectedHabits.has(val)) return;
  selectedHabits.add(val);
  const chip = document.createElement('button');
  chip.className='h-chip sel';
  chip.innerHTML=`<span class="ce">🌱</span><span>${val}</span>`;
  chip.addEventListener('click',()=>{selectedHabits.delete(val);chip.remove();updSelCount();});
  el('habits-grid').appendChild(chip);
  el('c-input').value='';
  updSelCount();
}

function updSelCount() {
  el('btn-s2').disabled = selectedHabits.size===0;
  el('sel-count').textContent = selectedHabits.size ? `${selectedHabits.size}/5 selected` : '';
}

// ═══════════════════════════════════════════════
// CEREMONY
// ═══════════════════════════════════════════════
function showCeremony() {
  showScreen('screen-seed');
  el('cer-sub').textContent = `"I am a person who ${S.identity}"`;

  const row = el('seeds-row');
  row.innerHTML = '';
  S.habits.forEach((h,i) => {
    const d = document.createElement('div');
    d.className='seed-item';
    d.style.animationDelay=(0.2+i*.22)+'s';
    d.innerHTML=`<svg width="26" height="34" viewBox="0 0 26 34">
      <ellipse cx="13" cy="23" rx="9" ry="10" fill="#7B5534"/>
      <ellipse cx="13" cy="21" rx="6" ry="7.5" fill="#9B7054" opacity=".45"/>
      <line x1="13" y1="14" x2="13" y2="2" stroke="#4A7C3F" stroke-width="2" stroke-linecap="round"/>
      <ellipse cx="9" cy="7" rx="6" ry="2.8" fill="#4A7C3F" transform="rotate(-25 9 7)"/>
    </svg><div style="font-size:.55rem;color:#fff;text-align:center;margin-top:2px">${h.emoji}</div>`;
    row.appendChild(d);
  });

  const rain = el('rain-wrap');
  rain.innerHTML='';
  for(let i=0;i<12;i++){
    const d=document.createElement('div');
    d.className='raindrop';
    d.style.left=(5+Math.random()*90)+'%';
    d.style.animationDelay=(Math.random()*2)+'s';
    d.style.animationDuration=(1.2+Math.random()*.8)+'s';
    rain.appendChild(d);
  }

  el('btn-cer').onclick = launchApp;
}

// ═══════════════════════════════════════════════
// LAUNCH
// ═══════════════════════════════════════════════
function launchApp() {
  showScreen('screen-main');
  S.habits.forEach(h=>{ recalcStreak(h.name); recalcVitals(h.name); });
  const hdrId = el('hdr-id');
  if (hdrId) hdrId.innerHTML=`I am a person who <b>${S.identity}</b>`;
  const idDisplay = el('identity-display');
  if (idDisplay) idDisplay.textContent = S.identity;
  updateHeader();
  renderGarden();
  renderCareTab();
  checkNotifPrompt();
  save();
}

function checkNotifPrompt() {
  if ('Notification' in window && Notification.permission==='default' && !S.notifEnabled) {
    const card = el('notif-request-card');
    if (card) card.style.display='flex';
  }
}

// ═══════════════════════════════════════════════
// FX
// ═══════════════════════════════════════════════
function popConfetti() {
  const root = el('fx-root');
  for(let i=0;i<40;i++){
    const p=document.createElement('div');
    p.className='conf';
    p.style.cssText=`background:${CONF_COLORS[i%CONF_COLORS.length]};left:${15+Math.random()*70}%;top:${25+Math.random()*20}%;width:${7+Math.random()*5}px;height:${7+Math.random()*5}px;animation-delay:${Math.random()*.35}s;border-radius:${Math.random()>.5?'50%':'2px'}`;
    root.appendChild(p);
  }
  setTimeout(()=>root.innerHTML='',1600);
}

function miniSparks() {
  const root = el('fx-root');
  for(let i=0;i<14;i++){
    const p=document.createElement('div');
    p.className='spark';
    p.style.cssText=`background:${CONF_COLORS[i%3]};left:${28+Math.random()*44}%;top:${30+Math.random()*25}%;animation-delay:${Math.random()*.2}s`;
    root.appendChild(p);
  }
  setTimeout(()=>root.innerHTML='',700);
}

// ═══════════════════════════════════════════════
// TOAST
// ═══════════════════════════════════════════════
let toastT;
function showToast(msg) {
  let t = qs('.toast');
  if (!t) { t=document.createElement('div'); t.className='toast'; el('toast-root').appendChild(t); }
  clearTimeout(toastT);
  t.textContent=msg; t.classList.add('show');
  toastT=setTimeout(()=>t.classList.remove('show'),2800);
}

// ═══════════════════════════════════════════════
// PWA INSTALL
// ═══════════════════════════════════════════════
let deferredInstall=null;
window.addEventListener('beforeinstallprompt',e=>{
  e.preventDefault(); deferredInstall=e;
  setTimeout(()=>el('install-banner')?.classList.add('show'),4000);
});

function setupInstall() {
  el('btn-install')?.addEventListener('click',async()=>{
    if(deferredInstall){deferredInstall.prompt();await deferredInstall.userChoice;deferredInstall=null;}
    el('install-banner').classList.remove('show');
  });
  el('btn-dismiss')?.addEventListener('click',()=>el('install-banner').classList.remove('show'));
}

// ═══════════════════════════════════════════════
// SERVICE WORKER
// ═══════════════════════════════════════════════
function registerSW() {
  if ('serviceWorker' in navigator)
    navigator.serviceWorker.register('/sw.js').catch(()=>{});
}

// ═══════════════════════════════════════════════
// BOOT
// ═══════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  buildDOM();
  load();

  if (S.onboarded && S.habits?.length) {
    launchApp();
  } else {
    setupOnboarding();
    showScreen('screen-onboard');
  }

  setupInstall();
  registerSW();
});
