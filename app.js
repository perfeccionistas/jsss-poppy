// ===== Core refs / constants =====
const sentence = "poppy is a couch.";
const textElement = document.querySelector('.typewriter-text-p');
const dotGrid = document.querySelector('.dot-grid');
const placedLayer = document.querySelector('.placed-layer');
const imageContainer = document.querySelector('.image-sequence-p');
const bar = document.getElementById('multi-bar');
const priceEl = document.getElementById('mf-price');
const purchaseLink = document.getElementById('mf-purchase');

let cellW = 47;
let cellH = 38;

const PIECES = {
  A: { src: "https://cdn.prod.website-files.com/67e7324b5a3b365fefc2fce4/68aca9e6fb38d895ba8a4ab8_Untitled-15.png", price: 11999},
  B: { src: "https://cdn.prod.website-files.com/67e7324b5a3b365fefc2fce4/68aca9e6bfa7fea95e7a5303_Untitled-17.png", price: 2999 },
  C: { src: "https://cdn.prod.website-files.com/67e7324b5a3b365fefc2fce4/68aca9e6d049292dd92fc22a_Untitled-16.png", price: 4999 }
};

// ===== State =====
let occupied = new Set();
let placed = [];
let selectedEl = null;
let total = 0;
let lastPlacedDotIdx = null;
let anchorDot = null;

// Drag state
let drag = { active:false, el:null, startDotIdx:null, lastDotIdx:null, moved:false, pointerId:null };
let suppressNextClick = false;

// ===== Grid =====
function fillGrid() {
  dotGrid.innerHTML = "";
  const cols = Math.ceil(window.innerWidth  / cellW);
  const rows = Math.ceil(window.innerHeight / cellH);
  dotGrid.style.gridTemplateColumns = 'repeat(' + cols + ', ' + cellW + 'px)';
  dotGrid.style.gridTemplateRows    = 'repeat(' + rows + ', ' + cellH + 'px)';
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
  const cells = Array.from(document.querySelectorAll('.dot-cell'));
  return cells.map((cell, idx) => {
    const rect = cell.getBoundingClientRect();
    return { idx, x: rect.left + rect.width / 2 + window.scrollX, y: rect.top + rect.height / 2 + window.scrollY };
  });
}
function nearestFreeDotTo(x, y) {
  const centers = getDotCenters();
  let best = null, bestD = Infinity;
  for (const c of centers) {
    if (occupied.has(c.idx)) continue;
    const dx = c.x - x, dy = c.y - y;
    const d2 = dx*dx + dy*dy;
    if (d2 < bestD) { best = c; bestD = d2; }
  }
  return best;
}
function nearestDotTo(x, y) {
  const centers = getDotCenters();
  let best = null, bestD = Infinity;
  for (const c of centers) {
    const dx = c.x - x, dy = c.y - y;
    const d2 = dx*dx + dy*dy;
    if (d2 < bestD) { best = c; bestD = d2; }
  }
  return best;
}
function firstFreeDot() {
  const centers = getDotCenters();
  for (const c of centers) if (!occupied.has(c.idx)) return c;
  return null;
}
function nextFreeDotAfter(startIdx, skip = 1) {
  const centers = getDotCenters();
  const total = centers.length;
  if (!total) return null;
  let i = (startIdx + 1 + skip) % total, scanned = 0;
  while (scanned < total) {
    const c = centers[i];
    if (!occupied.has(c.idx)) return c;
    i = (i + 1) % total; scanned++;
  }
  return null;
}
function computeAnchorDot() {
  const cx = window.scrollX + window.innerWidth / 2;
  const cy = window.scrollY + window.innerHeight / 2;
  return nearestDotTo(cx, cy);
}

// ===== Intro typewriter + image sequence =====
function typeWriter(text, el, speed = 40, cb) {
  let i = 0;
  (function write(){ if(i<text.length){ el.textContent += text.charAt(i++); setTimeout(write, speed);} else if(cb) cb(); })();
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
  const selected = imagePaths.sort(function(){ return 0.5 - Math.random(); }).slice(0, 3);
  imageContainer.innerHTML = "";
  const imgs = selected.map(function(src){
    const img = document.createElement("img");
    img.src = src; img.style.opacity = 0; img.style.transition = 'opacity 0.8s ease-in-out';
    imageContainer.appendChild(img); return img;
  });
  imageContainer.style.display = "block";
  let i = 0;
  function fadeNext(){
    if(i>0) imgs[i-1].style.opacity = 0;
    if(i>=imgs.length){
      setTimeout(function(){ imageContainer.style.display="none"; imageContainer.innerHTML=""; document.querySelector(".object-button-column").style.opacity = 1; }, 600);
      return;
    }
    imgs[i].style.opacity = 1; i++; setTimeout(fadeNext,1600);
  }
  setTimeout(fadeNext,200);
}

// Boot
window.addEventListener("DOMContentLoaded", function(){
  typeWriter(sentence, textElement, 100, function(){
    setTimeout(function(){
      textElement.style.transition = "opacity 0.8s ease";
      textElement.style.opacity = "0";
      setTimeout(function(){
        fillGrid();
        dotGrid.style.display = "grid";
        dotGrid.style.opacity = "0";
        dotGrid.style.transition = "opacity 2s ease";
        requestAnimationFrame(function(){ dotGrid.style.opacity = "1"; });
        setTimeout(function(){ textElement.style.display = "none"; playImageSequence(); }, 1000);
      }, 200);
    }, 500);
  });
});
window.addEventListener("resize", function(){ if (dotGrid.style.display === "grid") fillGrid(); });

// ===== Popups (A/B/C + Lookbook share this handler) =====
document.querySelectorAll('.object-btn').forEach(function(btn){
  btn.addEventListener('click', function(){
    const targetId = btn.getAttribute('data-popup');
    const targetPopup = document.getElementById(targetId);
    document.querySelectorAll('.popup-panel').forEach(function(p){ p.classList.remove('active'); p.style.display='none'; });
    const columnRect = document.querySelector('.object-button-column').getBoundingClientRect();
    targetPopup.style.top = (columnRect.top + window.scrollY) + 'px';
    targetPopup.style.height = columnRect.height + 'px';
    targetPopup.style.display = 'flex';
    requestAnimationFrame(function(){ targetPopup.classList.add('active'); });
    dotGrid.style.opacity = '1'; dotGrid.style.pointerEvents = 'none';
  });
});

// Local video switching per popup
document.querySelectorAll('.popup-panel').forEach(function(panel){
  const localButtons = panel.querySelectorAll('.video-btn');
  const localVideos  = panel.querySelectorAll('.popup-video-mask video');
  localButtons.forEach(function(btn){
    btn.addEventListener('click', function(){
      const idx = Number(btn.getAttribute('data-video-index') || 0);
      localVideos.forEach(function(vid, i){ vid.classList.toggle('active', i===idx); });
    });
  });
});

// ===== Placing (full natural size) =====
function placePiece(type, atDot) {
  const conf = PIECES[type]; if (!conf) return;
  const loader = new Image(); loader.crossOrigin = 'anonymous';
  loader.onload = function(){
    const el = document.createElement('div');
    el.className = 'placed-item blend-multiply';
    el.setAttribute('data-type', type);
    el.setAttribute('data-dot', String(atDot.idx));
    el.style.left = atDot.x + 'px'; el.style.top = atDot.y + 'px';
    el.style.width = loader.naturalWidth + 'px'; el.style.height = loader.naturalHeight + 'px';
    el.style.transform = 'translate(-50%,-50%) rotate(0deg)';
    el.style.transformOrigin = (type === 'A') ? 'calc(100% + 40px) 50%' : '50% 50%';
    const img = document.createElement('img'); img.crossOrigin='anonymous'; img.alt='Piece '+type; img.src = conf.src; el.appendChild(img);
    el.addEventListener('click', function(e){ e.stopPropagation(); selectPlaced(el, { bringToFront: true }); });
    placedLayer.appendChild(el); placed.push(el); occupied.add(atDot.idx); lastPlacedDotIdx = atDot.idx;
    selectPlaced(el, { bringToFront: true }); ensureToolbarVisible(); incrementTotal(conf.price);
  };
  loader.src = conf.src;
}

// ===== Selection / UI =====
function selectPlaced(el, opts){ opts = opts || {}; if (selectedEl) selectedEl.classList.remove('selected'); selectedEl = el || null; if(selectedEl){ selectedEl.classList.add('selected'); if(opts.bringToFront) bringToFront(selectedEl); ensureToolbarVisible(); } }
function bringToFront(el){ if (el && el.parentNode) el.parentNode.appendChild(el); }
function ensureToolbarVisible(){ if (bar.classList.contains('hidden')) { bar.classList.remove('hidden'); bar.setAttribute('aria-hidden','false'); } }
placedLayer.addEventListener('click', function(e){ const el = e.target.closest('.placed-item'); if(el){ e.stopPropagation(); selectPlaced(el, { bringToFront: true }); } });
document.addEventListener('click', function(e){ if(!e.target.closest('.placed-item') && !e.target.closest('#multi-bar')){ if(selectedEl) selectedEl.classList.remove('selected'); selectedEl = null; } });

// ===== Pricing / purchase =====
function incrementTotal(amount){ total += amount; priceEl.textContent = total.toLocaleString(); buildPurchaseLink(); }
function decrementTotal(amount){ total = Math.max(0, total - amount); priceEl.textContent = total.toLocaleString(); buildPurchaseLink(); }
function buildPurchaseLink(){
  const counts = {}; placed.forEach(function(p){ const t=p.getAttribute('data-type'); counts[t]=(counts[t]||0)+1; });
  const parts = []; for (var k in counts) parts.push('Piece ' + k + ': ' + counts[k]);
  const summary = parts.join('\n');
  const subject = encodeURIComponent('Order (Total $' + total.toLocaleString() + ')');
  const body = encodeURIComponent("I'd like to purchase:\n\n" + (summary || '—') + "\n\nTotal: $" + total.toLocaleString() + "\n\n— sent from the configurator");
  purchaseLink.href = 'mailto:ideas@perfeccionistas.studio?subject=' + subject + '&body=' + body;
}

// ===== PLACE button =====
document.querySelectorAll('.place-btn').forEach(function(btn){
  btn.addEventListener('click', function(e){
    e.stopPropagation();
    const popup = btn.getAttribute('data-popup') ? document.getElementById(btn.getAttribute('data-popup')) : btn.closest('.popup-panel');
    if (popup) { popup.classList.remove('active'); setTimeout(function(){ popup.style.display='none'; }, 300); }
    const piece = btn.getAttribute('data-piece') || 'A';
    if (anchorDot) { placePiece(piece, anchorDot); }
    else {
      const cx = window.scrollX + window.innerWidth/2; const cy = window.scrollY + window.innerHeight/2;
      const fallback = nearestDotTo(cx, cy) || firstFreeDot() || nearestFreeDotTo(cx, cy);
      if (fallback) placePiece(piece, fallback);
    }
  });
});

// ===== Multifunction bar =====
bar.addEventListener('click', function(e){
  e.stopPropagation();
  const b = e.target.closest('.mf-btn'); if (!b) return;
  const action = b.getAttribute('data-action');
  if (action === 'add') {
    if (!selectedEl) return;
    const type = selectedEl.getAttribute('data-type');
    const fromIdx = Number(selectedEl.getAttribute('data-dot'));
    const nextDot = nextFreeDotAfter(fromIdx, 1) || firstFreeDot();
    if (nextDot) placePiece(type, nextDot);
  }
  if (action === 'remove') {
    if (!selectedEl) return;
    const type = selectedEl.getAttribute('data-type');
    const price = (PIECES[type] && PIECES[type].price) || 0;
    const dotIdx = Number(selectedEl.getAttribute('data-dot'));
    selectedEl.remove();
    placed = placed.filter(function(p){ return p !== selectedEl; });
    const stillUsed = placed.some(function(p){ return Number(p.getAttribute('data-dot')) === dotIdx; });
    if (!stillUsed) occupied.delete(dotIdx);
    selectedEl = null; decrementTotal(price);
  }
  if (action === 'rotate') {
    if (!selectedEl) return;
    const type = selectedEl.getAttribute('data-type');
    const current = getRotation(selectedEl);
    if (type === 'B' || type === 'C') {
      const snapped = Math.round(current / 60) * 60;
      const next = (snapped + 60) % 360;
      selectedEl.style.transform = 'translate(-50%,-50%) rotate(' + next + 'deg)';
    } else {
      const next = (current + 15) % 360;
      selectedEl.style.transform = 'translate(-50%,-50%) rotate(' + next + 'deg)';
    }
  }
});
function getRotation(el){ const m = /rotate\(([-\d.]+)deg\)/.exec(el.style.transform || ''); return m ? parseFloat(m[1]) : 0; }

/* ==================== Alpha-aware picking ==================== */
const _imgCanvasCache = new Map();
let _alphaHitCorsBroken = false;
function getImageCanvas(img) {
  const key = img.currentSrc || img.src;
  const naturalW = img.naturalWidth || 0, naturalH = img.naturalHeight || 0;
  if (!naturalW || !naturalH) return null;
  let cached = _imgCanvasCache.get(key);
  if (cached && cached.w === naturalW && cached.h === naturalH) return cached.canvas;
  const canvas = document.createElement('canvas'); canvas.width = naturalW; canvas.height = naturalH;
  const ctx = canvas.getContext('2d', { willReadFrequently: true }); ctx.drawImage(img, 0, 0, naturalW, naturalH);
  _imgCanvasCache.set(key, { canvas: canvas, w: naturalW, h: naturalH }); return canvas;
}
function getTransformOriginPx(el, rect) {
  const cs = window.getComputedStyle(el);
  const parts = (cs.transformOrigin || '').split(' ');
  const ox = parseFloat(parts[0]) || rect.width / 2;
  const oy = parseFloat(parts[1]) || rect.height / 2;
  return { ox: ox, oy: oy };
}
function pointToImagePixel(el, img, clientX, clientY) {
  const rect = el.getBoundingClientRect(); if (rect.width === 0 || rect.height === 0) return null;
  const to = getTransformOriginPx(el, rect);
  const angle = (getRotation(el) || 0) * Math.PI / 180;
  const px = rect.left + to.ox, py = rect.top + to.oy;
  const lx = clientX - px, ly = clientY - py;
  const rx =  lx * Math.cos(-angle) - ly * Math.sin(-angle);
  const ry =  lx * Math.sin(-angle) + ly * Math.cos(-angle);
  const ex = rx + to.ox, ey = ry + to.oy;
  if (ex < 0 || ey < 0 || ex > rect.width || ey > rect.height) return null;
  const scaleX = img.naturalWidth  / rect.width;
  const scaleY = img.naturalHeight / rect.height;
  const pxImg = Math.floor(ex * scaleX), pyImg = Math.floor(ey * scaleY);
  if (pxImg < 0 || pyImg < 0 || pxImg >= img.naturalWidth || pyImg >= img.naturalHeight) return null;
  return { px: pxImg, py: pyImg };
}
function alphaHit(el, clientX, clientY) {
  if (_alphaHitCorsBroken) return true;
  const img = el.querySelector('img'); if (!img || !img.naturalWidth || !img.naturalHeight) return true;
  const coords = pointToImagePixel(el, img, clientX, clientY); if (!coords) return false;
  try {
    const canvas = getImageCanvas(img); if (!canvas) return true;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const data = ctx.getImageData(coords.px, coords.py, 1, 1).data;
    return data[3] > 10;
  } catch (err) { _alphaHitCorsBroken = true; return true; }
}

/* ==================== Alpha-aware selection (click, capture) ==================== */
document.addEventListener('click', function(e){
  if (suppressNextClick) { suppressNextClick = false; return; }
  if (e.target.closest('#multi-bar') || e.target.closest('.popup-panel')) return;
  const stack = document.elementsFromPoint(e.clientX, e.clientY).filter(function(el){ return el.classList && el.classList.contains('placed-item'); });
  if (stack.length === 0) return;
  e.preventDefault(); e.stopImmediatePropagation();
  if (e.altKey) { const i = stack.indexOf(selectedEl); const next = stack[(i >= 0 ? i + 1 : 0) % stack.length]; selectPlaced(next, { bringToFront:false }); return; }
  var picked = null; for (var k=0; k<stack.length; k++){ var el = stack[k]; if (alphaHit(el, e.clientX, e.clientY)) { picked = el; break; } }
  selectPlaced(picked || stack[0], { bringToFront: true });
}, true);

/* ==================== Drag to any dot (pointer events) ==================== */
function countItemsAtDot(idx) { let n = 0; for (const p of placed) if (Number(p.getAttribute('data-dot')) === idx) n++; return n; }
function movePlacedToDot(el, dot) {
  const oldIdx = Number(el.getAttribute('data-dot')); if (oldIdx === dot.idx) return;
  el.style.left = dot.x + 'px'; el.style.top = dot.y + 'px';
  el.setAttribute('data-dot', String(dot.idx));
  if (countItemsAtDot(oldIdx) === 0) { occupied.delete(oldIdx); }
  occupied.add(dot.idx);
}
document.addEventListener('pointerdown', function(e){
  if (e.button !== 0) return;
  if (e.target.closest('#multi-bar') || e.target.closest('.popup-panel')) return;
  const stack = document.elementsFromPoint(e.clientX, e.clientY).filter(function(el){ return el.classList && el.classList.contains('placed-item'); });
  if (stack.length === 0) return;
  var picked = null; for (var k=0; k<stack.length; k++){ var el = stack[k]; if (alphaHit(el, e.clientX, e.clientY)) { picked = el; break; } }
  picked = picked || stack[0];
  selectPlaced(picked, { bringToFront: true });
  drag.active = true; drag.el = picked; drag.startDotIdx = Number(picked.getAttribute('data-dot')); drag.lastDotIdx = drag.startDotIdx; drag.moved=false; drag.pointerId = e.pointerId;
  try { picked.setPointerCapture(e.pointerId); } catch(_) {}
  e.preventDefault();
}, true);
document.addEventListener('pointermove', function(e){
  if (!drag.active || !drag.el) return;
  const dot = nearestDotTo(e.pageX, e.pageY); if (!dot) return;
  if (dot.idx !== drag.lastDotIdx) { movePlacedToDot(drag.el, dot); drag.lastDotIdx = dot.idx; drag.moved = true; }
});
function endDrag(){ if (!drag.active) return; if (drag.moved) suppressNextClick = true; drag.active=false; drag.el=null; drag.pointerId=null; drag.moved=false; }
document.addEventListener('pointerup', endDrag, true);
document.addEventListener('pointercancel', endDrag, true);

// ===== Keyboard helpers =====
document.addEventListener('keydown', function(e){
  if (!selectedEl) return;
  if (e.key === ']') bringToFront(selectedEl);
  if (e.key === '[') { const parent = selectedEl.parentNode; const prev = selectedEl.previousElementSibling; if (parent && prev) parent.insertBefore(selectedEl, prev); }
  if (e.key.toLowerCase() === 'm') selectedEl.classList.toggle('blend-multiply');
});

/* ===== LOOKBOOK minimize handler ===== */
document.addEventListener('click', function(e){
  const minBtn = e.target.closest('.iv-minimize'); if (!minBtn) return;
  const panel = minBtn.closest('.popup-panel'); if (!panel) return;
  panel.classList.remove('active'); setTimeout(function(){ panel.style.display = 'none'; }, 300);
});
