/* ==================== app.js ==================== */
(function () {
  "use strict";

  // -------- small helpers --------
  const log = (...a) => console.log("[poppy]", ...a);
  const qs  = (sel, root=document) => root.querySelector(sel);
  const qsa = (sel, root=document) => Array.from(root.querySelectorAll(sel));

  // Wait for a selector to exist. Times out quietly after maxMs.
  function waitFor(sel, { interval=80, maxMs=8000 } = {}) {
    return new Promise(resolve => {
      const start = performance.now();
      const tick = () => {
        const el = qs(sel);
        if (el) return resolve(el);
        if (performance.now() - start >= maxMs) return resolve(null);
        setTimeout(tick, interval);
      };
      tick();
    });
  }

  async function waitForAll(selectors, opts) {
    const found = {};
    for (const key of Object.keys(selectors)) {
      found[key] = await waitFor(selectors[key], opts);
    }
    return found;
  }

  // -------- state --------
  let cellW = 47, cellH = 38;
  const PIECES = {
    A: { src: "https://cdn.prod.website-files.com/67e7324b5a3b365fefc2fce4/68aca9e6fb38d895ba8a4ab8_Untitled-15.png", price: 11999 },
    B: { src: "https://cdn.prod.website-files.com/67e7324b5a3b365fefc2fce4/68aca9e6bfa7fea95e7a5303_Untitled-17.png", price: 2999 },
    C: { src: "https://cdn.prod.website-files.com/67e7324b5a3b365fefc2fce4/68aca9e6d049292dd92fc22a_Untitled-16.png", price: 4999 }
  };

  let occupied = new Set();
  let placed = [];
  let selectedEl = null;
  let total = 0;
  let lastPlacedDotIdx = null;
  let anchorDot = null;

  // refs (filled after we detect DOM)
  let textElement, dotGrid, placedLayer, imageContainer, bar, priceEl, purchaseLink;

  // Drag state
  let drag = { active:false, el:null, startDotIdx:null, lastDotIdx:null, moved:false, pointerId:null };
  let suppressNextClick = false;

  // ==================== GRID ====================
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
    const cells = qsa('.dot-cell');
    return cells.map((cell, idx) => {
      const r = cell.getBoundingClientRect();
      return { idx, x: r.left + r.width/2 + window.scrollX, y: r.top + r.height/2 + window.scrollY };
    });
  }
  function nearestFreeDotTo(x, y) {
    const centers = getDotCenters();
    let best = null, bestD = Infinity;
    for (const c of centers) {
      if (occupied.has(c.idx)) continue;
      const dx = c.x - x, dy = c.y - y, d2 = dx*dx + dy*dy;
      if (d2 < bestD) { best = c; bestD = d2; }
    }
    return best;
  }
  function nearestDotTo(x, y) {
    const centers = getDotCenters();
    let best = null, bestD = Infinity;
    for (const c of centers) {
      const dx = c.x - x, dy = c.y - y, d2 = dx*dx + dy*dy;
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
    const total = centers.length; if (!total) return null;
    let i = (startIdx + 1 + skip) % total, scanned = 0;
    while (scanned < total) {
      const c = centers[i];
      if (!occupied.has(c.idx)) return c;
      i = (i + 1) % total; scanned++;
    }
    return null;
  }
  function computeAnchorDot() {
    const cx = window.scrollX + window.innerWidth  / 2;
    const cy = window.scrollY + window.innerHeight / 2;
    return nearestDotTo(cx, cy);
  }

  // ==================== INTRO ====================
  function typeWriter(text, el, speed = 40, done) {
    let i = 0;
    (function write(){
      if (i < text.length) { el.textContent += text.charAt(i++); setTimeout(write, speed); }
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
    const selected = imagePaths.sort(() => 0.5 - Math.random()).slice(0, 3);
    imageContainer.innerHTML = "";
    const imgs = selected.map(src => {
      const img = document.createElement("img");
      img.src = src; img.style.opacity = 0; img.style.transition = 'opacity 0.8s ease-in-out';
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
          const col = qs(".object-button-column");
          if (col) col.style.opacity = 1;
        }, 600);
        return;
      }
      imgs[i].style.opacity = 1; i++; setTimeout(fadeNext, 1600);
    }
    setTimeout(fadeNext, 200);
  }

  // ==================== POPUPS / LOOKBOOK ====================
  function wirePopups() {
    qsa('.object-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetId = btn.dataset.popup;
        const targetPopup = qs('#' + targetId);
        qsa('.popup-panel').forEach(p => { p.classList.remove('active'); p.style.display = 'none'; });

        const btnColumn = qs('.object-button-column');
        const columnRect = btnColumn ? btnColumn.getBoundingClientRect() : { top: 0, height: window.innerHeight };
        const topOffset = columnRect.top + window.scrollY;
        const totalHeight = columnRect.height;

        if (targetPopup) {
          targetPopup.style.top = topOffset + 'px';
          targetPopup.style.height = totalHeight + 'px';
          targetPopup.style.display = 'flex';
          requestAnimationFrame(() => targetPopup.classList.add('active'));
        }

        if (dotGrid) {
          dotGrid.style.opacity = '1';
          dotGrid.style.pointerEvents = 'none';
        }
      });
    });

    qsa('.popup-panel').forEach(panel => {
      const localButtons = panel.querySelectorAll('.video-btn');
      const localVideos  = panel.querySelectorAll('.popup-video-mask video');
      localButtons.forEach(btn => {
        btn.addEventListener('click', () => {
          const idx = Number(btn.dataset.videoIndex || 0);
          localVideos.forEach((vid, i) => vid.classList.toggle('active', i === idx));
        });
      });
    });

    document.addEventListener('click', (e) => {
      const minBtn = e.target.closest('.iv-minimize'); if (!minBtn) return;
      const panel = minBtn.closest('.popup-panel'); if (!panel) return;
      panel.classList.remove('active'); setTimeout(() => { panel.style.display = 'none'; }, 300);
    });
  }

  // ==================== PLACING / SELECTION ====================
  function placePiece(type, atDot) {
    const conf = PIECES[type]; if (!conf) return;
    const loader = new Image(); loader.crossOrigin = 'anonymous';
    loader.onload = () => {
      const el = document.createElement('div');
      el.className = 'placed-item blend-multiply';
      el.dataset.type = type; el.dataset.dot = String(atDot.idx);
      el.style.left = atDot.x + 'px'; el.style.top = atDot.y + 'px';
      el.style.width = loader.naturalWidth + 'px'; el.style.height = loader.naturalHeight + 'px';
      el.style.transform = 'translate(-50%,-50%) rotate(0deg)';
      el.style.transformOrigin = (type === 'A') ? 'calc(100% + 40px) 50%' : '50% 50%';

      const img = document.createElement('img');
      img.crossOrigin = 'anonymous'; img.alt = 'Piece ' + type; img.src = conf.src;
      el.appendChild(img);

      el.addEventListener('click', (e) => { e.stopPropagation(); selectPlaced(el, { bringToFront: true }); });
      placedLayer.appendChild(el); placed.push(el); occupied.add(atDot.idx); lastPlacedDotIdx = atDot.idx;
      selectPlaced(el, { bringToFront: true }); ensureToolbarVisible(); incrementTotal(conf.price);
    };
    loader.src = conf.src;
  }

  function selectPlaced(el, opts = {}) {
    if (selectedEl) selectedEl.classList.remove('selected');
    selectedEl = el || null;
    if (selectedEl) { selectedEl.classList.add('selected'); if (opts.bringToFront) bringToFront(selectedEl); ensureToolbarVisible(); }
  }
  function bringToFront(el) { if (el && el.parentNode) el.parentNode.appendChild(el); }
  function ensureToolbarVisible() { if (bar && bar.classList.contains('hidden')) { bar.classList.remove('hidden'); bar.setAttribute('aria-hidden', 'false'); } }

  // click-through and clear selection
  function wireSelection() {
    if (placedLayer) {
      placedLayer.addEventListener('click', (e) => {
        const el = e.target.closest('.placed-item'); if (!el) return;
        e.stopPropagation(); selectPlaced(el, { bringToFront: true });
      });
    }
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.placed-item') && !e.target.closest('#multi-bar')) { if (selectedEl) selectedEl.classList.remove('selected'); selectedEl = null; }
    });
  }

  // ==================== TOTAL / PURCHASE ====================
  function incrementTotal(amount){ total += amount; if (priceEl) priceEl.textContent = total.toLocaleString(); buildPurchaseLink(); }
  function decrementTotal(amount){ total = Math.max(0, total - amount); if (priceEl) priceEl.textContent = total.toLocaleString(); buildPurchaseLink(); }
  function buildPurchaseLink(){
    if (!purchaseLink) return;
    const counts = {};
    placed.forEach(p => { counts[p.dataset.type] = (counts[p.dataset.type]||0) + 1; });
    const summary = Object.entries(counts).map(([t,c]) => `Piece ${t}: ${c}`).join('\n');
    const subject = encodeURIComponent(`Order (Total $${total.toLocaleString()})`);
    const body = encodeURIComponent(`I'd like to purchase:\n\n${summary || '—'}\n\nTotal: $${total.toLocaleString()}\n\n— sent from the configurator`);
    purchaseLink.href = `mailto:ideas@perfeccionistas.studio?subject=${subject}&body=${body}`;
  }

  // ==================== MF BAR / DRAG / ROTATE ====================
  function wirePlaceButtons() {
    qsa('.place-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const popup = btn.dataset.popup ? qs('#' + btn.dataset.popup) : btn.closest('.popup-panel');
        if (popup) { popup.classList.remove('active'); setTimeout(() => { popup.style.display = 'none'; }, 300); }
        const piece = btn.dataset.piece || 'A';
        if (anchorDot) { placePiece(piece, anchorDot); }
        else {
          const cx = window.scrollX + window.innerWidth/2, cy = window.scrollY + window.innerHeight/2;
          const fallback = nearestDotTo(cx, cy) || firstFreeDot() || nearestFreeDotTo(cx, cy);
          if (fallback) placePiece(piece, fallback);
        }
      });
    });
  }

  function wireMultiBar() {
    if (!bar) return;
    bar.addEventListener('click', (e) => {
      e.stopPropagation();
      const b = e.target.closest('.mf-btn'); if (!b) return;
      const action = b.dataset.action;

      if (action === 'add') {
        if (!selectedEl) return;
        const type = selectedEl.dataset.type, fromIdx = Number(selectedEl.dataset.dot);
        const nextDot = nextFreeDotAfter(fromIdx, 1) || firstFreeDot();
        if (nextDot) placePiece(type, nextDot);
      }

      if (action === 'remove') {
        if (!selectedEl) return;
        const type = selectedEl.dataset.type, price = PIECES[type]?.price || 0;
        const dotIdx = Number(selectedEl.dataset.dot);
        selectedEl.remove();
        placed = placed.filter(p => p !== selectedEl);
        const stillUsed = placed.some(p => Number(p.dataset.dot) === dotIdx);
        if (!stillUsed) occupied.delete(dotIdx);
        selectedEl = null; decrementTotal(price);
      }

      if (action === 'rotate') {
        if (!selectedEl) return;
        const type = selectedEl.dataset.type, current = getRotation(selectedEl);
        if (type === 'B' || type === 'C') {
          const snapped = Math.round(current / 60) * 60; const next = (snapped + 60) % 360;
          selectedEl.style.transform = `translate(-50%,-50%) rotate(${next}deg)`;
        } else {
          const next = (current + 15) % 360;
          selectedEl.style.transform = `translate(-50%,-50%) rotate(${next}deg)`;
        }
      }
    });
  }
  function getRotation(el){ const m = /rotate\(([-\d.]+)deg\)/.exec(el.style.transform || ''); return m ? parseFloat(m[1]) : 0; }

  // Alpha-aware picking
  const _imgCanvasCache = new Map(); let _alphaHitCorsBroken = false;
  function getImageCanvas(img) {
    const key = img.currentSrc || img.src, naturalW = img.naturalWidth || 0, naturalH = img.naturalHeight || 0;
    if (!naturalW || !naturalH) return null;
    let cached = _imgCanvasCache.get(key);
    if (cached && cached.w === naturalW && cached.h === naturalH) return cached.canvas;
    const c = document.createElement('canvas'); c.width = naturalW; c.height = naturalH;
    const ctx = c.getContext('2d', { willReadFrequently: true }); ctx.drawImage(img, 0, 0, naturalW, naturalH);
    _imgCanvasCache.set(key, { canvas: c, w: naturalW, h: naturalH }); return c;
  }
  function getTransformOriginPx(el, rect) {
    const cs = window.getComputedStyle(el); const parts = (cs.transformOrigin || '').split(' ');
    const ox = parseFloat(parts[0]) || rect.width / 2; const oy = parseFloat(parts[1]) || rect.height / 2; return { ox, oy };
  }
  function pointToImagePixel(el, img, clientX, clientY) {
    const rect = el.getBoundingClientRect(); if (rect.width === 0 || rect.height === 0) return null;
    const { ox, oy } = getTransformOriginPx(el, rect); const angle = (getRotation(el) || 0) * Math.PI / 180;
    const px = rect.left + ox, py = rect.top + oy;
    const lx = clientX - px, ly = clientY - py;
    const rx =  lx * Math.cos(-angle) - ly * Math.sin(-angle);
    const ry =  lx * Math.sin(-angle) + ly * Math.cos(-angle);
    const ex = rx + ox, ey = ry + oy;
    if (ex < 0 || ey < 0 || ex > rect.width || ey > rect.height) return null;
    const scaleX = img.naturalWidth / rect.width, scaleY = img.naturalHeight / rect.height;
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
      const data = ctx.getImageData(coords.px, coords.py, 1, 1).data; return data[3] > 10;
    } catch (_) { _alphaHitCorsBroken = true; return true; }
  }

  // ==================== BOOT (robust) ====================
  async function start() {
    // 1) Wait for the critical nodes to exist (handles late Webflow embed injection)
    log("waiting for nodes…");
    const nodes = await waitForAll({
      text: '.typewriter-text-p',
      grid: '.dot-grid',
      placed: '.placed-layer',
      imgs: '.image-sequence-p',
      bar:  '#multi-bar',
      price:'#mf-price',
      link: '#mf-purchase'
    }, { maxMs: 12000 });

    textElement   = nodes.text;
    dotGrid       = nodes.grid;
    placedLayer   = nodes.placed;
    imageContainer= nodes.imgs;
    bar           = nodes.bar;
    priceEl       = nodes.price;
    purchaseLink  = nodes.link;

    if (!textElement || !dotGrid || !placedLayer || !imageContainer) {
      log("required nodes missing; aborting safe (Webflow embed not present?).");
      return;
    }
    log("nodes ready.");

    // 2) Intro → grid → images
    typeWriter("poppy is a couch.", textElement, 100, () => {
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

    // 3) Wiring UI
    window.addEventListener("resize", () => { if (dotGrid && dotGrid.style.display === "grid") fillGrid(); });
    wirePopups();
    wirePlaceButtons();
    wireSelection();
    wireMultiBar();

    log("boot complete.");
  }

  // run after DOM (but we also handle late embeds)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
