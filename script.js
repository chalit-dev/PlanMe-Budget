let sets = [];
let view = 'list';   // 'list' | 'orbit'

const REDUCED_MOTION =
  !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

/* ---------- Navigation ---------- */
function goAllCal() {
  document.getElementById('sc-home').classList.remove('active');
  document.getElementById('sc-allcal').classList.add('active');
}

/* ---------- Helpers ---------- */
function fmt(n) {
  const v = Math.round(Number(n) || 0);
  return (v < 0 ? '-' : '') + '฿' + Math.abs(v).toLocaleString('th-TH');
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

/* ---------- View switching (list / orbit) ---------- */
function setView(v) {
  view = v;
  document.getElementById('set-list').classList.toggle('is-hidden', v !== 'list');
  document.getElementById('view-orbit').classList.toggle('is-hidden', v !== 'orbit');

  ['list', 'orbit'].forEach(k => {
    const b = document.getElementById('seg-' + k);
    b.classList.toggle('active', k === v);
    b.setAttribute('aria-selected', String(k === v));
  });

  if (v === 'orbit') startOrbit(); else stopOrbit();
}

/* ---------- Set management ---------- */
function addSet() {
  const idx = sets.length;
  sets.push({ name: 'รายการ ' + (idx + 1), expenses: [], open: true });
  renderSets();
  updateSummary();

  // In orbit view, open the new group's card straight away
  if (view === 'orbit') { openOrbitNode(idx); return; }

  setTimeout(() => {
    const nameInput = document.querySelector(`#set-${idx} .set-name-input`);
    if (nameInput) { nameInput.focus(); nameInput.select(); }
  }, 50);
}

function toggleSet(idx) {
  sets[idx].open = !sets[idx].open;
  const body = document.querySelector(`#set-${idx} .set-body`);
  const chev = document.querySelector(`#set-${idx} .chevron`);
  if (body) body.classList.toggle('collapsed', !sets[idx].open);
  if (chev) chev.classList.toggle('open', sets[idx].open);
}

function deleteSet(idx) {
  sets.splice(idx, 1);
  orbitExpanded = null;
  orbitAuto = !REDUCED_MOTION;
  renderSets();
  updateSummary();
}

function updateSetName(sIdx, v) {
  sets[sIdx].name = v;
}

/* ---------- Expense management ---------- */
function addExp(idx) {
  sets[idx].expenses.push({ name: '', price: 0 });
  renderSetBody(idx);
}

function deleteExp(sIdx, eIdx) {
  sets[sIdx].expenses.splice(eIdx, 1);
  renderSetBody(sIdx);
  calcSetTotal(sIdx);
}

function updateExpName(sIdx, eIdx, v) {
  sets[sIdx].expenses[eIdx].name = v;
}

function updateExpPrice(sIdx, eIdx, v) {
  sets[sIdx].expenses[eIdx].price = Number(v) || 0;
  calcSetTotal(sIdx);
}

/* ---------- Calculations ---------- */
function calcSetTotal(sIdx) {
  const total = sets[sIdx].expenses.reduce((s, e) => s + (Number(e.price) || 0), 0);
  sets[sIdx].total = total;

  const badge = document.querySelector(`#set-${sIdx} .set-total-badge`);
  if (badge) badge.textContent = fmt(total);

  const sum = document.querySelector(`#set-${sIdx} .set-sum span`);
  if (sum) sum.textContent = fmt(total);

  updateSummary();
}

function updateSummary() {
  const budget = Number(document.getElementById('budget-input').value) || 0;
  const total  = sets.reduce((s, ev) => s + (ev.total || 0), 0);
  const rem    = budget - total;

  document.getElementById('total-amount').textContent = fmt(total);

  const remEl = document.getElementById('remaining-amount');
  remEl.textContent = fmt(rem);
  remEl.className   = 'sum-val ' + (rem < 0 ? 'over' : 'ok');

  if (view === 'orbit') renderOrbit(false);
}

/* ---------- Rendering (list view) ---------- */
function renderSetBody(sIdx) {
  const body = document.querySelector(`#set-${sIdx} .set-body`);
  if (!body) return;

  const exps = sets[sIdx].expenses;
  let html = '';

  exps.forEach((exp, eIdx) => {
    html += `
      <div class="exp-row">
        <input type="text" placeholder="ชื่อรายการ" value="${esc(exp.name)}"
          oninput="updateExpName(${sIdx}, ${eIdx}, this.value)" />
        <input type="number" placeholder="฿0" value="${exp.price || ''}" min="0"
          oninput="updateExpPrice(${sIdx}, ${eIdx}, this.value)" />
        <button class="btn btn-del" onclick="deleteExp(${sIdx}, ${eIdx})" title="ลบรายการ">
          <i class="ti ti-x" aria-hidden="true"></i>
        </button>
      </div>`;
  });

  if (exps.length === 0) {
    html += '<p class="empty-msg">ยังไม่มีรายการ</p>';
  }

  html += `
    <div class="set-footer">
      <span class="set-sum">รวมรายการนี้: <span>${fmt(sets[sIdx].total || 0)}</span></span>
      <button class="btn" onclick="addExp(${sIdx})">
        <i class="ti ti-plus" aria-hidden="true"></i> เพิ่มรายการ
      </button>
    </div>`;

  body.innerHTML = html;
}

function renderSets() {
  const list = document.getElementById('set-list');
  list.innerHTML = '';

  sets.forEach((set, idx) => {
    const block  = document.createElement('div');
    block.className = 'set-block';
    block.id        = `set-${idx}`;

    const isOpen = set.open !== false;

    block.innerHTML = `
      <div class="set-header" onclick="toggleSet(${idx})">
        <div class="set-header-left">
          <input class="set-name-input" type="text" value="${esc(set.name)}"
            oninput="updateSetName(${idx}, this.value)"
            onclick="event.stopPropagation()" />
          <span class="set-total-badge">${fmt(set.total || 0)}</span>
        </div>
        <div class="set-header-right">
          <button class="btn btn-del" onclick="event.stopPropagation(); deleteSet(${idx})" title="ลบเซท">
            <i class="ti ti-trash" aria-hidden="true"></i>
          </button>
          <i class="ti ti-chevron-down chevron ${isOpen ? 'open' : ''}" aria-hidden="true"></i>
        </div>
      </div>
      <div class="set-body ${isOpen ? '' : 'collapsed'}"></div>`;

    list.appendChild(block);
    renderSetBody(idx);
  });
}


/* ==================================================================
   Orbit view
   Ported from the 21st.dev "Radial Orbital Timeline" React component.
   Each expense group is a node orbiting the centre; tapping a node
   rotates it to the top and opens a detail card.
================================================================== */
const ORBIT_ICONS = [
  'ti-wallet', 'ti-shopping-cart', 'ti-home', 'ti-plane',
  'ti-coffee', 'ti-heart', 'ti-gift', 'ti-book'
];

// Pick an icon from the group name; fall back to cycling through the list
const ORBIT_KEYWORDS = [
  [/อาหาร|กิน|ข้าว|คาเฟ่|กาแฟ|ขนม|เครื่องดื่ม|food|eat|cafe/i,            'ti-tools-kitchen-2'],
  [/เดินทาง|รถ|น้ำมัน|แท็กซี่|ค่าโดยสาร|travel|car|taxi/i,                  'ti-car'],
  [/เที่ยว|ทริป|โรงแรม|ที่พัก|เครื่องบิน|trip|hotel|flight/i,               'ti-plane'],
  [/บ้าน|ห้อง|เช่า|ค่าน้ำ|ค่าไฟ|home|rent|house/i,                          'ti-home'],
  [/ช็อป|ซื้อ|ของใช้|เสื้อผ้า|shop|buy/i,                                    'ti-shopping-cart'],
  [/สุขภาพ|ยา|หมอ|ฟิตเนส|health|gym/i,                                      'ti-heart'],
  [/ของขวัญ|ปาร์ตี้|งานเลี้ยง|วันเกิด|gift|party/i,                         'ti-gift'],
  [/เรียน|หนังสือ|คอร์ส|study|book|course/i,                                 'ti-book'],
  [/บันเทิง|หนัง|เกม|เพลง|movie|game|music/i,                                'ti-movie'],
  [/งาน|ธุรกิจ|ออฟฟิศ|work|office/i,                                        'ti-briefcase']
];

let orbitAngle    = 0;
let orbitAuto     = !REDUCED_MOTION;
let orbitExpanded = null;
let orbitRadius   = 168;
let orbitRaf      = null;
let orbitLast     = 0;
let orbitTween    = null;

function orbitIconFor(set, idx) {
  const name = set.name || '';
  for (const [re, icon] of ORBIT_KEYWORDS) {
    if (re.test(name)) return icon;
  }
  return ORBIT_ICONS[idx % ORBIT_ICONS.length];
}

function orbitRelated(i) {
  const n = sets.length;
  if (n <= 1) return [];
  if (n === 2) return [1 - i];
  return [(i - 1 + n) % n, (i + 1) % n];
}

function orbitShare(set, budget, grand) {
  const base = budget > 0 ? budget : grand;
  return base > 0 ? Math.round(((set.total || 0) / base) * 100) : 0;
}

/* Sizes: radius follows panel width; the canvas grows when a card is open */
function sizeOrbit() {
  const panel  = document.getElementById('view-orbit');
  const canvas = document.getElementById('orbit-canvas');
  const w = panel.clientWidth || 360;

  orbitRadius = Math.max(96, Math.min(168, (w - 110) / 2));
  const cy      = orbitRadius + 70;
  const compact = orbitRadius * 2 + 140;
  const height  = orbitExpanded !== null ? Math.max(compact, 500) : compact;

  canvas.style.setProperty('--cy', cy + 'px');
  canvas.style.height = Math.round(height) + 'px';
  panel.classList.toggle('has-open', orbitExpanded !== null);
}

function orbitCardHTML(set, i, budget, grand, animate) {
  const exps  = set.expenses;
  const total = set.total || 0;
  const share = orbitShare(set, budget, grand);

  let statusKey = 'active', statusText = 'มีรายการ';
  if (exps.length === 0)                  { statusKey = 'pending'; statusText = 'ว่าง'; }
  else if (budget > 0 && share > 100)     { statusKey = 'over';    statusText = 'เกินงบ'; }

  const shown = exps.slice(0, 3);
  const more  = exps.length - shown.length;

  const itemsHTML = exps.length
    ? `<ul class="orb-items">
        ${shown.map(e => `<li><span>${esc(e.name || '(ไม่มีชื่อ)')}</span><b>${fmt(e.price)}</b></li>`).join('')}
       </ul>
       ${more > 0 ? `<div class="orb-more">และอีก ${more} รายการ</div>` : ''}`
    : `<div class="orb-none">ยังไม่มีรายการในกลุ่มนี้</div>`;

  const related = orbitRelated(i);
  const relatedHTML = related.length
    ? `<div class="orb-related">
         <h4><i class="ti ti-link" aria-hidden="true"></i> กลุ่มที่อยู่ติดกัน</h4>
         ${related.map(j => `
           <button class="orb-chip" type="button"
             onclick="event.stopPropagation(); openOrbitNode(${j})">
             ${esc(sets[j].name)} <i class="ti ti-chevron-right" aria-hidden="true"></i>
           </button>`).join('')}
       </div>`
    : '';

  return `
    <div class="orb-card ${animate ? 'enter' : ''}" onclick="event.stopPropagation()">
      <div class="orb-card-head">
        <span class="orb-badge ${statusKey}">${statusText}</span>
        <span class="orb-meta">${exps.length} รายการ</span>
      </div>
      <div class="orb-card-title">${esc(set.name)}</div>
      ${itemsHTML}
      <div class="orb-total"><span>รวมกลุ่มนี้</span><b>${fmt(total)}</b></div>
      <div class="orb-share">
        <div class="orb-share-row">
          <span>${budget > 0 ? 'สัดส่วนของงบทั้งหมด' : 'สัดส่วนของยอดรวม'}</span>
          <b>${share}%</b>
        </div>
        <div class="orb-bar"><i style="width:${Math.min(100, share)}%"></i></div>
      </div>
      ${relatedHTML}
      <button class="orb-edit" type="button" onclick="event.stopPropagation(); editFromOrbit(${i})">
        <i class="ti ti-pencil" aria-hidden="true"></i> แก้ไขรายการ
      </button>
    </div>`;
}

function renderOrbit(animateCard) {
  const canvas = document.getElementById('orbit-canvas');
  if (!canvas) return;

  if (orbitExpanded !== null && !sets[orbitExpanded]) orbitExpanded = null;
  sizeOrbit();

  const budget = Number(document.getElementById('budget-input').value) || 0;
  const grand  = sets.reduce((s, x) => s + (x.total || 0), 0);
  const rem    = budget - grand;
  const R      = orbitRadius;

  const coreLabel = budget > 0 ? 'คงเหลือ' : 'ยอดรวม';
  const coreValue = budget > 0 ? rem : grand;
  const coreText  = fmt(coreValue);
  const coreSize  = coreText.length <= 7 ? 22 : coreText.length <= 9 ? 18 : coreText.length <= 11 ? 15 : 12;

  let html = `
    <div class="orb-ring" style="width:${R * 2}px;height:${R * 2}px"></div>
    <div class="orb-ring inner" style="width:${R * 1.1}px;height:${R * 1.1}px"></div>
    <div class="orb-core">
      <span class="orb-ping"></span>
      <div class="orb-core-inner">
        <small>${coreLabel}</small>
        <strong class="${budget > 0 && rem < 0 ? 'over' : ''}" style="font-size:${coreSize}px">${coreText}</strong>
      </div>
    </div>`;

  if (sets.length === 0) {
    html += `<div class="orb-empty-note">กด “สร้างกลุ่มรายการใหม่” เพื่อเริ่มต้น</div>`;
  }

  const related = orbitExpanded !== null ? orbitRelated(orbitExpanded) : [];

  sets.forEach((set, i) => {
    const isExp = i === orbitExpanded;
    const isRel = related.includes(i);
    const share = orbitShare(set, budget, grand);
    const glow  = Math.round(44 + Math.min(100, share) * 0.6);

    html += `
      <div class="orb-node ${isExp ? 'is-expanded' : ''} ${isRel ? 'is-related' : ''}"
           data-i="${i}" role="button" tabindex="0"
           aria-label="${esc(set.name)} ${fmt(set.total || 0)}"
           onclick="event.stopPropagation(); toggleOrbitNode(${i})"
           onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();toggleOrbitNode(${i});}">
        <span class="orb-glow" style="width:${glow}px;height:${glow}px;left:${-glow / 2}px;top:${-glow / 2}px"></span>
        <span class="orb-dot ${isExp && animateCard ? 'pop' : ''}"><i class="ti ${orbitIconFor(set, i)}" aria-hidden="true"></i></span>
        <span class="orb-label">${esc(set.name)}</span>
        ${isExp ? orbitCardHTML(set, i, budget, grand, animateCard) : ''}
      </div>`;
  });

  canvas.innerHTML = html;
  positionOrbitNodes();
}

function positionOrbitNodes() {
  const nodes = document.querySelectorAll('#orbit-canvas .orb-node');
  const n = nodes.length;
  const R = orbitRadius;

  nodes.forEach(el => {
    const i   = Number(el.dataset.i);
    const rad = ((((i / n) * 360 + orbitAngle) % 360) * Math.PI) / 180;
    const exp = i === orbitExpanded;

    el.style.transform = `translate(${(R * Math.cos(rad)).toFixed(2)}px, ${(R * Math.sin(rad)).toFixed(2)}px)`;
    el.style.zIndex    = exp ? 200 : Math.round(100 + 50 * Math.cos(rad));
    el.style.opacity   = exp ? 1 : Math.max(0.4, Math.min(1, 0.4 + 0.6 * ((1 + Math.sin(rad)) / 2)));
  });
}

/* Rotate so that node i sits at the top (270°), taking the shortest way round */
function centerOrbitOn(i) {
  const n = sets.length;
  if (!n) return;

  const target = 270 - (i / n) * 360;
  const diff   = ((((target - orbitAngle) % 360) + 540) % 360) - 180;

  if (REDUCED_MOTION) {
    orbitAngle += diff;
    orbitTween = null;
    return;
  }
  orbitTween = { from: orbitAngle, to: orbitAngle + diff, start: performance.now(), dur: 700 };
}

function openOrbitNode(i) {
  orbitExpanded = i;
  orbitAuto = !REDUCED_MOTION;
  centerOrbitOn(i);
  syncOrbitCtl();
  renderOrbit(true);
}

function closeOrbitNode() {
  orbitExpanded = null;
  orbitAuto = !REDUCED_MOTION;
  syncOrbitCtl();
  renderOrbit(false);
}

function toggleOrbitNode(i) {
  if (orbitExpanded === i) closeOrbitNode(); else openOrbitNode(i);
}

function toggleOrbitAuto() {
  if (orbitExpanded !== null) { closeOrbitNode(); return; }
  orbitAuto = !orbitAuto;
  syncOrbitCtl();
}

function syncOrbitCtl() {
  const b = document.getElementById('orb-auto');
  if (!b) return;
  const label = orbitAuto ? 'หยุดหมุน' : 'หมุนต่อ';
  b.innerHTML = `<i class="ti ${orbitAuto ? 'ti-player-pause' : 'ti-player-play'}" aria-hidden="true"></i>`;
  b.title = label;
  b.setAttribute('aria-label', label);
}

/* Jump from the orbit card to the editable list */
function editFromOrbit(i) {
  if (!sets[i]) return;
  sets[i].open = true;
  setView('list');
  renderSets();

  const el = document.getElementById('set-' + i);
  if (el) {
    el.scrollIntoView({ behavior: REDUCED_MOTION ? 'auto' : 'smooth', block: 'center' });
    el.classList.add('flash');
    setTimeout(() => el.classList.remove('flash'), 1400);
  }
}

function orbitFrame(t) {
  orbitRaf = requestAnimationFrame(orbitFrame);
  const dt = Math.min(0.064, (t - orbitLast) / 1000);
  orbitLast = t;

  if (orbitTween) {
    const p = Math.max(0, Math.min(1, (t - orbitTween.start) / orbitTween.dur));
    const e = 1 - Math.pow(1 - p, 3);
    orbitAngle = orbitTween.from + (orbitTween.to - orbitTween.from) * e;
    if (p >= 1) orbitTween = null;
  } else if (orbitAuto && sets.length) {
    orbitAngle = (orbitAngle + 6 * dt) % 360;   // 6°/s, same pace as the original
  } else {
    return;
  }
  positionOrbitNodes();
}

function startOrbit() {
  syncOrbitCtl();
  renderOrbit(false);
  cancelAnimationFrame(orbitRaf);
  orbitLast = performance.now();
  orbitRaf = requestAnimationFrame(orbitFrame);
}

function stopOrbit() {
  cancelAnimationFrame(orbitRaf);
  orbitRaf = null;
}

// Tap empty space to close the open card
document.getElementById('orbit-canvas').addEventListener('click', e => {
  if (e.target.id === 'orbit-canvas' && orbitExpanded !== null) closeOrbitNode();
});

window.addEventListener('resize', () => {
  if (view === 'orbit') renderOrbit(false);
});

syncOrbitCtl();


/* ---------- Export ---------- */
async function saveAsImage() {
  const area   = document.getElementById('sc-allcal').querySelector('.wrap');
  const canvas = await html2canvas(area, {
    backgroundColor: '#F1F3F5',
    scale: 2,
    // Always export the list view, whichever view is on screen
    onclone: doc => {
      doc.getElementById('set-list').classList.remove('is-hidden');
      doc.getElementById('view-orbit').classList.add('is-hidden');
      doc.head.insertAdjacentHTML('beforeend',
        '<style>*{animation:none!important;transition:none!important}</style>');
      doc.querySelector('#sc-allcal .wrap').style.padding = '28px';
    }
  });
  const link   = document.createElement('a');
  link.download = 'planme-budget.png';
  link.href     = canvas.toDataURL();
  link.click();
}

function saveAsNote() {
  const budget = document.getElementById('budget-input').value || '0';
  let txt = 'PlanMe Budget\n' + '='.repeat(30) + '\n\n';
  txt += `งบทั้งหมด: ${budget} บาท\n\n`;

  sets.forEach(s => {
    txt += `【${s.name}】\n`;
    s.expenses.forEach(e => {
      txt += `  - ${e.name || '(ไม่มีชื่อ)'}: ${e.price} บาท\n`;
    });
    txt += `  รวมเซท: ${s.total || 0} บาท\n\n`;
  });

  txt += '='.repeat(30) + '\n';
  txt += `ยอดรวมทั้งหมด: ${document.getElementById('total-amount').textContent}\n`;
  txt += `ยอดคงเหลือ: ${document.getElementById('remaining-amount').textContent}\n`;

  const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.href     = url;
  link.download = 'planme-budget.txt';
  link.click();
  URL.revokeObjectURL(url);
}