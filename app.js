// ===== Helpers (safe selectors, guards) =====
const $  = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));

function safeRect(el){
  if (!el) return null;
  try { return el.getBoundingClientRect(); } catch { return null; }
}

// ===== Core refs / constants =====
const sentence     = "poppy is a couch.";
const textElement  = $('.typewriter-text-p');
const dotGrid      = $('.dot-grid');
const placedLayer  = $('.placed-layer');
const imageContainer = $('.image-sequence-p');
const bar          = $('#multi-bar');
const priceEl      = $('#mf-price');
const purchaseLink = $('#mf-purchase');

let cellW = 47, cellH = 38;

const PIECES = {
  A: { src: "https://cdn.prod.website-files.com/67e7324b5a3b365fefc2fce4/68aca9e6fb38d895ba8a4ab8_Untitled-15.png", price: 11999 },
  B: { src: "https://cdn.prod.website-files.com/67e7324b5a3b365fefc2fce4/68aca9e6bfa7fea95e7a5303_Untitled-17.png", price: 2999 },
  C: { src: "https://cdn.prod.website-files.com/67e7324b5a3b365fefc2fce4/68aca9e6d049292dd92fc22a_Untitled-16.png", price: 4999 }
};

// ===== State =====
let occupied = new Set();
let placed = [];
let selectedEl = null;
let total = 0;
let anchorDot = null;

// Drag state
let drag = { active:false, el:null, startDotIdx:null, lastDotIdx:null, moved:false, pointerId:null };
let suppressNextClick = false;

// ===== Grid =====
function fillGrid() {
  if (!dotGrid) return;
  dotGrid.innerHTML = "";
  const cols = Math.max(1, Math.ceil(window.innerWidth  / cellW));
  const rows = Math.max(1, Math.ceil(window.innerHeight / cellH));
  dotGrid.style.gridTemplateColumns = `repeat(${cols}, ${cellW}px)`;
  dotGrid.style.gridTemplateRows    = `repeat(${rows}, ${cellH}px)`;
  for (let i = 0; i < cols * rows; i++) {
    const cell = document.createElement("div");
    cell.className = "dot-cell";
    const dot = document.createElement("div");
    dot.className = "dot-visual";
    cell.appendChild(dot);
    dotGrid.appendChild(cell);
  }
  anchorDot = computeAnchorDot();
}
function getDotCenters() {
  const cells = $$('.dot-cell');
  return cells.map((cell, idx) => {
    const r = cell.getBoundingClientRect();
    return { idx, x: r.left + r.width/2 + window.scrollX, y: r.top + r.height/2 + window.scrollY };
  });
}
function nearestDotTo(x, y) {
  const centers = getDotCenters();
  let best=null, bestD=Infinity;
  for (const c of centers) {
    const dx = c.x - x, dy = c.y - y, d2 = dx*dx + dy*dy;
    if (d2 < bestD) { best=c; bestD=d2; }
  }
  return best;
}
function firstFreeDot(){ return getDotCenters().find(c => !occupied.has(c.idx)) || null; }
function nextFreeDotAfter(startIdx, skip=1){
  const centers = getDotCenters();
  const total = centers.length;
  if (!total) return null;
  let i = (startIdx + 1 + skip) % total, scanned=0;
  while (scanned < total) {
    const c = centers[i];
    if (!occupied.has(c.idx)) return c;
    i = (i+1) % total; scanned++;
  }
  return null;
}
function computeAnchorDot() {
  const cx = window.scrollX + window.innerWidth/2;
  const cy = window.scrollY + window.innerHeight/2;
  return nearestDotTo(cx, cy) || firstFreeDot();
}

// ===== Intro typewriter + image sequence =====
function typeWriter(text, el, speed=40, done){
  if (!el) { done && done(); return; }
  let i=0; (function tick(){
    if (i < text.length){ el.textContent += text.charAt(i++); setTimeout(tick, speed); }
    else if (done) done();
  })();
}
function playImageSequence() {
  const imagePaths = [
    'https://cdn.prod.website-files.com/67e7324b5a3b365fefc2fce4/685c8df134511914b60a540c_Untitled-1.png',
    'https://cdn.prod.website-files.com/67e7324b5a3b365fefc2fce4/685c8df11a4cad7075a460a3_Untitled-2.png',
    'https://cdn.prod.website-files.com/67e7324b5a3b365fefc2fce4/685c8df1dd340d07a356767f_Untitled-3.png',
    'https://cdn.prod.website-files.com/67e7324b5a3b365fefc2fce4/685c8df10550a329465104ab_Untitled-4.png',
    'https://cdn.prod.website-files.com/67e7324b5a3b365fefc2fce4/685c8df192baa7eaaaadf3d2_Untitled-5.png',
    'https://cdn.prod.website-files.com/67e7324b5a3b365fefc2fce4/685c8df180991072796519d7_Untitled-6.png'
  ];
  if (!imageContainer) return;
  const selected = imagePaths.sort(() => 0.5 - Math.random()).slice(0,3);
  imageContainer.innerHTML = "";
  const imgs = selected.map(src => {
    const img = document.createElement("img");
    img.src = src; img.style.opacity = 0; img.style.transition = 'opacity .8s ease-in-out';
    imageContainer.appendChild(img); return img;
  });
  imageContainer.style.display = "block";
  let i=0;
  function fadeNext(){
    if (i>0) imgs[i-1].style.opacity = 0;
    if (i >= imgs.length){
      setTimeout(() => {
        imageContainer.style.display = "none";
        imageContainer.innerHTML = "";
        const col = $('.object-button-column');
        if (col) col.style.opacity = 1;
        normalizeLookbookButton();      // reveal & harden pill
        positionLookbook();
      }, 600);
      return;
    }
    imgs[i].style.opacity = 1; i++; setTimeout(fadeNext, 1600);
  }
  setTimeout(fadeNext, 200);
}

// ===== Boot =====
window.addEventListener('DOMContentLoaded', () => {
  typeWriter(sentence, textElement, 100, () => {
    setTimeout(() => {
      if (textElement){ textElement.style.transition = "opacity .8s ease"; textElement.style.opacity = "0"; }
      setTimeout(() => {
        fillGrid();
        if (dotGrid){
          dotGrid.style.display = "grid";
          dotGrid.style.opacity = "0";
          dotGrid.style.transition = "opacity 2s ease";
          requestAnimationFrame(() => { dotGrid.style.opacity = "1"; });
        }
        setTimeout(() => {
          if (textElement) textElement.style.display = "none";
          playImageSequence();
        }, 1000);
      }, 200);
    }, 500);
  });

  normalizeLookbookButton();
  hardenLookbookPanel();
  positionLookbook();
});

window.addEventListener('resize', () => {
  if (dotGrid && dotGrid.style.display === 'grid') fillGrid();
  positionLookbook();
});

// ===== Open popup =====
document.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-popup]');
  if (!btn) return;
  if (!btn.classList.contains('object-btn') && !btn.classList.contains('lookbook-btn')) return;

  const targetId = btn.dataset.popup;
  const targetPopup = document.getElementById(targetId);
  if (!targetPopup) return;

  $$('.popup-panel').forEach(p => { p.classList.remove('active'); p.style.display = 'none'; });

  const btnColumn = $('.object-button-column');
  const r = safeRect(btnColumn);
  const top  = r ? (r.top + window.scrollY) : 20;
  const h    = r ? r.height : Math.max(300, window.innerHeight - 40);

  Object.assign(targetPopup.style, {
    top: `${top}px`,
    height: `${h}px`,
    display: 'flex'
  });
  requestAnimationFrame(() => targetPopup.classList.add('active'));

  if (dotGrid){ dotGrid.style.opacity = '1'; dotGrid.style.pointerEvents = 'none'; }
}, true);

// ===== Local video switching =====
$$('.popup-panel').forEach(panel => {
  const localButtons = $$('.video-btn', panel);
  const localVideos  = $$('.popup-video-mask video', panel);
  localButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = Number(btn.dataset.videoIndex || 0);
      localVideos.forEach((vid, i) => vid.classList.toggle('active', i === idx));
    });
  });
});

// ===== Place piece =====
function placePiece(type, atDot) {
  const conf = PIECES[type]; if (!conf || !placedLayer) return;
  const loader = new Image(); loader.crossOrigin = 'anonymous';
  loader.onload = () => {
    const el = document.createElement('div');
    el.className = 'placed-item blend-multiply';
    el.dataset.type = type;
    el.dataset.dot  = String(atDot.idx);
    Object.assign(el.style, {
      left: `${atDot.x}px`, top: `${atDot.y}px`,
      width: `${loader.naturalWidth}px`, height: `${loader.naturalHeight}px`,
      transform: 'translate(-50%,-50%) rotate(0deg)',
      transformOrigin: (type === 'A') ? 'calc(100% + 40px) 50%' : '50% 50%'
    });
    const img = document.createElement('img');
    img.crossOrigin = 'anonymous'; img.alt = `Piece ${type}`; img.src = conf.src;
    el.appendChild(img);

    el.addEventListener('click', (e) => { e.stopPropagation(); selectPlaced(el, { bringToFront:true }); });

    placedLayer.appendChild(el); placed.push(el);
    occupied.add(atDot.idx);
    selectPlaced(el, { bringToFront:true });
    ensureToolbarVisible(); incrementTotal(conf.price);
  };
  loader.src = conf.src;
}

// ===== Selection & toolbar =====
function selectPlaced(el, opts={}){
  if (selectedEl) selectedEl.classList.remove('selected');
  selectedEl = el || null;
  if (selectedEl){
    selectedEl.classList.add('selected');
    if (opts.bringToFront) bringToFront(selectedEl);
    ensureToolbarVisible();
  }
}
function bringToFront(el){ if (el && el.parentNode) el.parentNode.appendChild(el); }
function ensureToolbarVisible(){
  if (!bar) return;
  if (bar.classList.contains('hidden')) { bar.classList.remove('hidden'); bar.setAttribute('aria-hidden','false'); }
}
if (placedLayer){
  placedLayer.addEventListener('click', (e) => {
    const el = e.target.closest('.placed-item'); if (!el) return;
    e.stopPropagation(); selectPlaced(el, { bringToFront:true });
  });
}
document.addEventListener('click', (e) => {
  if (e.target.closest('.placed-item') || e.target.closest('#multi-bar')) return;
  if (selectedEl) selectedEl.classList.remove('selected'); selectedEl = null;
});

// ===== Pricing / purchase =====
function incrementTotal(a){ total += a; if (priceEl) priceEl.textContent = total.toLocaleString(); buildPurchaseLink(); }
function decrementTotal(a){ total = Math.max(0, total - a); if (priceEl) priceEl.textContent = total.toLocaleString(); buildPurchaseLink(); }
function buildPurchaseLink(){
  if (!purchaseLink) return;
  const counts = {};
  placed.forEach(p => { counts[p.dataset.type] = (counts[p.dataset.type]||0) + 1; });
  const summary = Object.entries(counts).map(([t,c]) => `Piece ${t}: ${c}`).join('\n');
  const subject = encodeURIComponent(`Order (Total $${total.toLocaleString()})`);
  const body = encodeURIComponent(`I'd like to purchase:\n\n${summary || '—'}\n\nTotal: $${total.toLocaleString()}\n\n— sent from the configurator`);
  purchaseLink.href = `mailto:ideas@perfeccionistas.studio?subject=${subject}&body=${body}`;
}

// ===== PLACE button =====
document.addEventListener('click', (e) => {
  const btn = e.target.closest('.place-btn'); if (!btn) return;
  const popup = btn.dataset.popup ? document.getElementById(btn.dataset.popup) : btn.closest('.popup-panel');
  if (popup){ popup.classList.remove('active'); setTimeout(() => { popup.style.display = 'none'; }, 300); }
  const piece = btn.dataset.piece || 'A';
  const ref = anchorDot || computeAnchorDot() || firstFreeDot();
  if (ref) placePiece(piece, ref);
}, true);

// ===== Multifunction bar =====
if (bar){
  bar.addEventListener('click', (e) => {
    e.stopPropagation();
    const b = e.target.closest('.mf-btn'); if (!b || !selectedEl) return;
    const action = b.dataset.action; const type = selectedEl.dataset.type;

    if (action === 'add'){
      const fromIdx = Number(selectedEl.dataset.dot);
      const next = nextFreeDotAfter(fromIdx, 1) || firstFreeDot();
      if (next) placePiece(type, next);
    }
    if (action === 'remove'){
      const price = PIECES[type]?.price || 0;
      const dotIdx = Number(selectedEl.dataset.dot);
      selectedEl.remove(); placed = placed.filter(p => p !== selectedEl);
      if (!placed.some(p => Number(p.dataset.dot) === dotIdx)) occupied.delete(dotIdx);
      selectedEl = null; decrementTotal(price);
    }
    if (action === 'rotate'){
      const current = getRotation(selectedEl);
      const snapped = (type === 'B' || type === 'C') ? (Math.round(current / 60) * 60 + 60) % 360 : (current + 15) % 360;
      selectedEl.style.transform = `translate(-50%,-50%) rotate(${snapped}deg)`;
    }
  });
}
function getRotation(el){ const m = /rotate\(([-\d.]+)deg\)/.exec(el.style.transform||''); return m ? parseFloat(m[1]) : 0; }

/* ==================== Alpha-aware picking (kept) ==================== */
const _imgCanvasCache = new Map();
let _alphaHitCorsBroken = false;
function getImageCanvas(img){
  const key = img.currentSrc || img.src, w = img.naturalWidth||0, h = img.naturalHeight||0;
  if (!w || !h) return null;
  let cached = _imgCanvasCache.get(key);
  if (cached && cached.w===w && cached.h===h) return cached.canvas;
  const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently:true }); ctx.drawImage(img,0,0,w,h);
  _imgCanvasCache.set(key, { canvas, w, h }); return canvas;
}
function getTransformOriginPx(el, rect){
  const cs = window.getComputedStyle(el); const parts = (cs.transformOrigin||'').split(' ');
  const ox = parseFloat(parts[0]) || rect.width/2, oy = parseFloat(parts[1]) || rect.height/2; return { ox, oy };
}
function pointToImagePixel(el, img, clientX, clientY){
  const rect = el.getBoundingClientRect(); if (!rect.width || !rect.height) return null;
  const { ox, oy } = getTransformOriginPx(el, rect);
  const angle = (getRotation(el)||0) * Math.PI/180;
  const px = rect.left + ox, py = rect.top + oy;
  const lx = clientX - px, ly = clientY - py;
  const rx =  lx * Math.cos(-angle) - ly * Math.sin(-angle);
  const ry =  lx * Math.sin(-angle) + ly * Math.cos(-angle);
  const ex = rx + ox, ey = ry + oy;
  if (ex<0 || ey<0 || ex>rect.width || ey>rect.height) return null;
  const scaleX = img.naturalWidth/rect.width, scaleY = img.naturalHeight/rect.height;
  const pxImg = Math.floor(ex*scaleX), pyImg = Math.floor(ey*scaleY);
  if (pxImg<0 || pyImg<0 || pxImg>=img.naturalWidth || pyImg>=img.naturalHeight) return null;
  return { px:pxImg, py:pyImg };
}
function alphaHit(el, clientX, clientY){
  if (_alphaHitCorsBroken) return true;
  const img = el.querySelector('img'); if (!img || !img.naturalWidth || !img.naturalHeight) return true;
  const coords = pointToImagePixel(el, img, clientX, clientY); if (!coords) return false;
  try {
    const canvas = getImageCanvas(img); if (!canvas) return true;
    const ctx = canvas.getContext('2d', { willReadFrequently:true });
    const data = ctx.getImageData(coords.px, coords.py, 1, 1).data; return data[3] > 10;
  } catch { _alphaHitCorsBroken = true; return true; }
}

// Alpha-aware selection
document.addEventListener('click', (e) => {
  if (suppressNextClick) { suppressNextClick=false; return; }
  if (e.target.closest('#multi-bar') || e.target.closest('.popup-panel')) return;
  const stack = document.elementsFromPoint(e.clientX, e.clientY).filter(el => el?.classList?.contains('placed-item'));
  if (stack.length === 0) return;
  e.preventDefault(); e.stopImmediatePropagation();
  if (e.altKey){ const i = stack.indexOf(selectedEl); const next = stack[(i>=0 ? i+1 : 0) % stack.length]; selectPlaced(next, { bringToFront:false }); return; }
  let picked = null; for (const el of stack){ if (alphaHit(el, e.clientX, e.clientY)) { picked = el; break; } }
  selectPlaced(picked || stack[0], { bringToFront:true });
}, true);

// Drag to any dot
document.addEventListener('pointerdown', (e) => {
  if (e.button !== 0) return;
  if (e.target.closest('#multi-bar') || e.target.closest('.popup-panel')) return;
  const stack = document.elementsFromPoint(e.clientX, e.clientY).filter(el => el?.classList?.contains('placed-item'));
  if (stack.length === 0) return;
  let picked = null; for (const el of stack){ if (alphaHit(el, e.clientX, e.clientY)) { picked = el; break; } }
  picked = picked || stack[0]; selectPlaced(picked, { bringToFront:true });
  drag.active = true; drag.el = picked; drag.startDotIdx = Number(picked.dataset.dot); drag.lastDotIdx = drag.startDotIdx; drag.moved=false; drag.pointerId=e.pointerId;
  try { picked.setPointerCapture(e.pointerId); } catch {}
  e.preventDefault();
}, true);
document.addEventListener('pointermove', (e) => {
  if (!drag.active || !drag.el) return;
  const dot = nearestDotTo(e.pageX, e.pageY); if (!dot) return;
  if (dot.idx !== drag.lastDotIdx){
    const oldIdx = Number(drag.el.dataset.dot);
    drag.el.style.left = `${dot.x}px`; drag.el.style.top = `${dot.y}px`; drag.el.dataset.dot = String(dot.idx);
    if (!placed.some(p => Number(p.dataset.dot) === oldIdx)) occupied.delete(oldIdx);
    occupied.add(dot.idx); drag.lastDotIdx = dot.idx; drag.moved = true;
  }
});
function endDrag(){
  if (!drag.active) return;
  if (drag.moved) suppressNextClick = true;
  drag = { active:false, el:null, startDotIdx:null, lastDotIdx:null, moved:false, pointerId:null };
}
document.addEventListener('pointerup', endDrag, true);
document.addEventListener('pointercancel', endDrag, true);

// ===== Lookbook minimize =====
document.addEventListener('click', (e) => {
  const minBtn = e.target.closest('.iv-minimize'); if (!minBtn) return;
  const panel = minBtn.closest('.popup-panel'); if (!panel) return;
  panel.classList.remove('active'); setTimeout(() => { panel.style.display = 'none'; }, 300);
});

// ===== LOOKBOOK utilities =====
function normalizeLookbookButton(){
  const lb = $('.lookbook-btn'); if (!lb) return;
  // strip accidental inheritance from .object-btn
  lb.classList.remove('object-btn');
  lb.style.width = ''; lb.style.height = '';   // avoid stretched “rectangle” look
  lb.classList.add('visible');                 // show it
}
function hardenLookbookPanel(){
  const pnl = $('#popup-lookbook'); if (!pnl) return;
  pnl.style.transformOrigin = 'right center';
  const minBtn = $('.iv-minimize', pnl);
  if (minBtn){
    Object.assign(minBtn.style, {
      right: 'max(16px, env(safe-area-inset-right, 0px))',
      bottom:'max(14px, calc(env(safe-area-inset-bottom, 0px) + 10px))'
    });
  }
}
function positionLookbook(){
  const lb = $('.lookbook-btn'); if (!lb) return;
  const cBtn = $('.object-button-column .object-btn[data-popup="popup-3"]');
  if (!cBtn){
    // keep default bottom-right pill if C isn’t on the page yet
    lb.style.top = ''; lb.style.bottom = '22px'; lb.style.right = '22px';
    return;
  }
  // Align vertically with C button
  const r = safeRect(cBtn); if (!r){ lb.style.top=''; lb.style.bottom='22px'; return; }
  const desiredTop = r.top + (r.height/2) - (lb.offsetHeight/2);
  lb.style.top = `${desiredTop}px`; lb.style.bottom = '';
}
