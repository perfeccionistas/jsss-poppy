// ===== Core refs / constants =====
const sentence      = "poppy is a couch.";
const textElement   = document.querySelector('.typewriter-text-p');
const dotGrid       = document.querySelector('.dot-grid');
const placedLayer   = document.querySelector('.placed-layer');
const imageContainer= document.querySelector('.image-sequence-p');
const bar           = document.getElementById('multi-bar');
const priceEl       = document.getElementById('mf-price');
const purchaseLink  = document.getElementById('mf-purchase');

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
  const cells = Array.from(document.querySelectorAll('.dot-cell'));
  return cells.map((cell, idx) => {
    const rect = cell.getBoundingClientRect();
    return { idx, x: rect.left + rect.width/2 + window.scrollX, y: rect.top + rect.height/2 + window.scrollY };
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
function nearestDotTo(x, y) { // ignores occupancy
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
  let i = (startIdx + 1 + skip) % total;
  let scanned = 0;
  while (scanned < total) {
    const c = centers[i];
    if (!occupied.has(c.idx)) return c;
    i = (i + 1) % total;
    scanned++;
  }
  return null;
}
function computeAnchorDot() {
  const cx = window.scrollX + window.innerWidth / 2;
  const cy = window.scrollY + window.innerHeight / 2;
  return nearestDotTo(cx, cy);
}

// ===== Align LOOKBOOK pill to C (desktop); float bottom-right on mobile =====
function alignLookbookToC() {
  const lb = document.querySelector('.lookbook-btn');
  const cBtn = document.querySelector('.object-button-column .object-btn[data-popup="popup-3"]');
  if (!lb || !cBtn) return;

  if (window.matchMedia('(max-width: 900px)').matches) {
    lb.style.top = '';
    lb.style.bottom = '16px';
    return;
  }
  const r = cBtn.getBoundingClientRect();
  const desiredTop = r.top + window.scrollY + (r.height / 2) - (lb.offsetHeight / 2);
  lb.style.top = `${desiredTop}px`;
  lb.style.bottom = 'auto';
}

// ===== Intro typewriter + image sequence =====
function typeWriter(text, el, speed = 40, callback) {
  let i = 0;
  (function write(){
    if (i < text.length) { el.textContent += text.charAt(i++); setTimeout(write, speed); }
    else if (callback) callback();
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
  const selected = imagePaths.sort(() => 0.5 - Math.random()).slice(0, 3);
  imageContainer.innerHTML = "";
  const imgs = selected.map(src => {
    const img = document.createElement("img");
    img.src = src;
    img.style.opacity = 0;
    img.style.transition = 'opacity 0.8s ease-in-out';
    imageContainer.appendChild(img);
    return img;
  });
  imageContainer.style.display = "block";
  let i = 0;
  function fadeNext() {
    if (i > 0) imgs[i - 1].style.opacity = 0;
    if (i >= imgs.length) {
      setTimeout(() => {
        imageContainer.style.display = "none";
        imageContainer.innerHTML = "";
        document.querySelector(".object-button-column").style.opacity = 1;

        // Reveal Lookbook button now (with A/B/C)
        const lb = document.querySelector('.lookbook-btn');
        if (lb){
          lb.classList.add('visible');
          lb.removeAttribute('aria-hidden');
          alignLookbookToC();
        }
      }, 600);
      return;
    }
    imgs[i].style.opacity = 1;
    i++;
    setTimeout(fadeNext, 1600);
  }
  setTimeout(fadeNext, 200);
}

// Boot
window.addEventListener("DOMContentLoaded", () => {
  typeWriter(sentence, textElement, 100, () => {
    setTimeout(() => {
      textElement.style.transition = "opacity 0.8s ease";
      textElement.style.opacity = "0";
      setTimeout(() => {
        fillGrid();
        dotGrid.style.display = "grid";
        dotGrid.style.opacity = "0";
        dotGrid.style.transition = "opacity 2s ease";
        requestAnimationFrame(() => { dotGrid.style.opacity = "1"; });
        setTimeout(() => {
          textElement.style.display = "none";
          playImageSequence();
        }, 1000);
      }, 200);
    }, 500);
  });
});
window.addEventListener("resize", () => {
  if (dotGrid.style.display === "grid") fillGrid();
  alignLookbookToC();
});

// ===== Open popup (delegated for A/B/C + Lookbook) =====
document.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-popup]');
  if (!btn) return;

  if (!btn.classList.contains('object-btn') && !btn.classList.contains('lookbook-btn')) return;

  const targetId = btn.dataset.popup;
  const targetPopup = document.getElementById(targetId);
  if (!targetPopup) return;

  // Close all
  document.querySelectorAll('.popup-panel').forEach(p => {
    p.classList.remove('active');
    p.style.display = 'none';
    p.style.top = '';
    p.style.height = '';
  });

  if (targetId !== 'popup-iv') {
    // A/B/C -> match column height
    const btnColumn = document.querySelector('.object-button-column');
    const columnRect = btnColumn.getBoundingClientRect();
    const topOffset = columnRect.top + window.scrollY;
    const totalHeight = columnRect.height;
    targetPopup.style.top = topOffset + 'px';
    targetPopup.style.height = totalHeight + 'px';
  } else {
    // Lookbook full height
    targetPopup.style.top = '0px';
    targetPopup.style.height = '';
  }

  targetPopup.style.display = 'flex';
  requestAnimationFrame(() => { targetPopup.classList.add('active'); });

  dotGrid.style.opacity = '1';
  dotGrid.style.pointerEvents = 'none';
}, true);

// ===== Local video switching per popup (A/B/C only) =====
document.querySelectorAll('.popup-panel').forEach(panel => {
  const localButtons = panel.querySelectorAll('.video-btn');
  const localVideos  = panel.querySelectorAll('.popup-video-mask video');
  localButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = Number(btn.dataset.videoIndex || 0);
      localVideos.forEach((vid, i) => vid.classList.toggle('active', i === idx));
    });
  });
});

// ===== Placing (full natural size) =====
function placePiece(type, atDot) {
  const conf = PIECES[type];
  if (!conf) return;

  const loader = new Image();
  loader.crossOrigin = 'anonymous';
  loader.onload = () => {
    const el = document.createElement('div');
    el.className = 'placed-item blend-multiply';
    el.dataset.type = type;
    el.dataset.dot = String(atDot.idx);
    el.style.left = `${atDot.x}px`;
    el.style.top  = `${atDot.y}px`;
    el.style.width  = `${loader.naturalWidth}px`;
    el.style.height = `${loader.naturalHeight}px`;
    el.style.transform = 'translate(-50%,-50%) rotate(0deg)';
    el.style.transformOrigin = (type === 'A') ? 'calc(100% + 40px) 50%' : '50% 50%';

    const img = document.createElement('img');
    img.crossOrigin = 'anonymous';
    img.alt = 'Piece ' + type;
    img.src = conf.src;
    el.appendChild(img);

    el.addEventListener('click', (e) => {
      e.stopPropagation();
      selectPlaced(el, { bringToFront: true });
    });

    placedLayer.appendChild(el);
    placed.push(el);
    occupied.add(atDot.idx);
    lastPlacedDotIdx = atDot.idx;

    selectPlaced(el, { bringToFront: true });
    ensureToolbarVisible();
    incrementTotal(conf.price);
  };
  loader.src = conf.src;
}

// ===== Selection / UI =====
function selectPlaced(el, opts = {}) {
  if (selectedEl) selectedEl.classList.remove('selected');
  selectedEl = el || null;
  if (selectedEl) {
    selectedEl.classList.add('selected');
    if (opts.bringToFront) bringToFront(selectedEl);
    ensureToolbarVisible();
  }
}
function bringToFront(el) { if (el && el.parentNode) el.parentNode.appendChild(el); }
function ensureToolbarVisible() {
  if (bar.classList.contains('hidden')) {
    bar.classList.remove('hidden');
    bar.setAttribute('aria-hidden', 'false');
  }
}
placedLayer.addEventListener('click', (e) => {
  const el = e.target.closest('.placed-item');
  if (el) {
    e.stopPropagation();
    selectPlaced(el, { bringToFront: true });
  }
});
document.addEventListener('click', (e) => {
  if (!e.target.closest('.placed-item') && !e.target.closest('#multi-bar')) {
    if (selectedEl) selectedEl.classList.remove('selected');
    selectedEl = null;
  }
});

// ===== Pricing / purchase =====
function incrementTotal(amount){ total += amount; priceEl.textContent = total.toLocaleString(); buildPurchaseLink(); }
function decrementTotal(amount){ total = Math.max(0, total - amount); priceEl.textContent = total.toLocaleString(); buildPurchaseLink(); }
function buildPurchaseLink(){
  const counts = {};
  placed.forEach(p => { counts[p.dataset.type] = (counts[p.dataset.type]||0) + 1; });
  const summary = Object.entries(counts).map(([t,c]) => `Piece ${t}: ${c}`).join('\n');
  const subject = encodeURIComponent(`Order (Total $${total.toLocaleString()})`);
  const body = encodeURIComponent(`I'd like to purchase:\n\n${summary || '—'}\n\nTotal: $${total.toLocaleString()}\n\n— sent from the configurator`);
  purchaseLink.href = `mailto:ideas@perfeccionistas.studio?subject=${subject}&body=${body}`;
}

// ===== PLACE button =====
document.addEventListener('click', (e) => {
  const btn = e.target.closest('.place-btn');
  if (!btn) return;

  const popup = btn.dataset.popup ? document.getElementById(btn.dataset.popup) : btn.closest('.popup-panel');
  if (popup) {
    popup.classList.remove('active');
    setTimeout(() => { popup.style.display = 'none'; }, 300);
  }

  const piece = btn.dataset.piece || 'A';
  if (anchorDot) {
    placePiece(piece, anchorDot);
  } else {
    const cx = window.scrollX + window.innerWidth/2;
    const cy = window.scrollY + window.innerHeight/2;
    const fallback = nearestDotTo(cx, cy) || firstFreeDot() || nearestFreeDotTo(cx, cy);
    if (fallback) placePiece(piece, fallback);
  }
}, true);

// ===== Multifunction bar =====
bar.addEventListener('click', (e) => {
  e.stopPropagation();
  const b = e.target.closest('.mf-btn');
  if (!b) return;
  const action = b.dataset.action;

  if (action === 'add') {
    if (!selectedEl) return;
    const type = selectedEl.dataset.type;
    const fromIdx = Number(selectedEl.dataset.dot);
    const nextDot = nextFreeDotAfter(fromIdx, 1) || firstFreeDot();
    if (nextDot) placePiece(type, nextDot);
  }

  if (action === 'remove') {
    if (!selectedEl) return;
    const type = selectedEl.dataset.type;
    const price = PIECES[type]?.price || 0;
    const dotIdx = Number(selectedEl.dataset.dot);
    selectedEl.remove();
    placed = placed.filter(p => p !== selectedEl);
    const stillUsed = placed.some(p => Number(p.dataset.dot) === dotIdx);
    if (!stillUsed) occupied.delete(dotIdx);
    selectedEl = null;
    decrementTotal(price);
  }

  if (action === 'rotate') {
    if (!selectedEl) return;
    const type = selectedEl.dataset.type;
    const current = getRotation(selectedEl);
    if (type === 'B' || type === 'C') {
      const snapped = Math.round(current / 60) * 60;
      const next = (snapped + 60) % 360;
      selectedEl.style.transform = `translate(-50%,-50%) rotate(${next}deg)`;
    } else {
      const next = (current + 15) % 360;
      selectedEl.style.transform = `translate(-50%,-50%) rotate(${next}deg)`;
    }
  }
});
function getRotation(el){
  const m = /rotate\(([-\d.]+)deg\)/.exec(el.style.transform || '');
  return m ? parseFloat(m[1]) : 0;
}

// ===== Lookbook minimize =====
document.addEventListener('click', (e) => {
  const minBtn = e.target.closest('.iv-minimize');
  if (!minBtn) return;
  const panel = minBtn.closest('.popup-panel');
  if (!panel) return;
  panel.classList.remove('active');
  setTimeout(() => { panel.style.display = 'none'; }, 300);
});
