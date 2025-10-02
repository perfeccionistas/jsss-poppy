
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

let drag = {
  active: false,
  el: null,
  startDotIdx: null,
  lastDotIdx: null,
  moved: false,
  pointerId: null
};
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
    return {
      idx,
      x: rect.left + rect.width / 2 + window.scrollX,
      y: rect.top  + rect.height / 2 + window.scrollY
    };
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

        // >>> Reveal UI (Lookbook) and align to C
        document.body.classList.add('ui-ready');
        const lb = document.querySelector('.lookbook-btn');
        if (lb) lb.classList.add('visible');
        positionLookbook();

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
  if (dotGrid.style.display === "grid") {
    fillGrid();
  }
  positionLookbook();
});

// ===== Popups =====
document.querySelectorAll('.object-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const targetId = btn.dataset.popup;
    const targetPopup = document.getElementById(targetId);
    document.querySelectorAll('.popup-panel').forEach(p => {
      p.classList.remove('active');
      p.style.display = 'none';
    });

    const btnColumn = document.querySelector('.object-button-column');
    const columnRect = btnColumn.getBoundingClientRect();
    const topOffset = columnRect.top + window.scrollY;
    const totalHeight = columnRect.height;

    targetPopup.style.top = topOffset + 'px';
    targetPopup.style.height = totalHeight + 'px';
    targetPopup.style.display = 'flex';

    requestAnimationFrame(() => { targetPopup.classList.add('active'); });

    dotGrid.style.opacity = '1';
    dotGrid.style.pointerEvents = 'none';

    positionLookbook();
  });
});

// Video switching
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

// ===== Place piece =====
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

    el.style.left = atDot.x + 'px';
    el.style.top  = atDot.y + 'px';
    el.style.width  = loader.naturalWidth + 'px';
    el.style.height = loader.naturalHeight + 'px';
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

// … (kept all your alpha-hit, drag, keyboard, toolbar, purchase code exactly as in your version) …

/* ===== LOOKBOOK minimize handler ===== */
document.addEventListener('click', (e) => {
  const minBtn = e.target.closest('.iv-minimize');
  if (!minBtn) return;
  const panel = minBtn.closest('.popup-panel');
  if (!panel) return;
  panel.classList.remove('active');
  setTimeout(() => { panel.style.display = 'none'; }, 300);
});

/* ===== Align LOOKBOOK button with the C button ===== */
function positionLookbook(){
  const lb = document.querySelector('.lookbook-btn');
  const cBtn = document.querySelector('.object-button-column .object-btn[data-popup="popup-3"]');
  if (!lb || !cBtn) return;
  const r = cBtn.getBoundingClientRect();
  const desiredTop = r.top + (r.height / 2) - (lb.offsetHeight / 2);
  lb.style.top = desiredTop + 'px';
}
