// ===== Core refs / constants =====
const sentence      = "poppy is a couch.";
const textElement   = document.querySelector('.typewriter-text-p');
const dotGrid       = document.querySelector('.dot-grid');
const placedLayer   = document.querySelector('.placed-layer');
const imageContainer= document.querySelector('.image-sequence-p');
const bar           = document.getElementById('multi-bar');
const priceEl       = document.getElementById('mf-price');
const purchaseLink  = document.getElementById('mf-purchase');

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
    const r = cell.getBoundingClientRect();
    return { idx, x: r.left + r.width/2 + window.scrollX, y: r.top + r.height/2 + window.scrollY };
  });
}
function nearestFreeDotTo(x, y) {
  const centers = getDotCenters(); let best=null, d=Infinity;
  for (const c of centers) { if (occupied.has(c.idx)) continue;
    const dx=c.x-x, dy=c.y-y, d2=dx*dx+dy*dy; if (d2<d){best=c; d=d2;}
  } return best;
}
function nearestDotTo(x, y) {
  const centers = getDotCenters(); let best=null, d=Infinity;
  for (const c of centers){ const dx=c.x-x, dy=c.y-y, d2=dx*dx+dy*dy; if (d2<d){best=c; d=d2;} }
  return best;
}
function firstFreeDot(){ const centers=getDotCenters(); for (const c of centers) if(!occupied.has(c.idx)) return c; return null; }
function nextFreeDotAfter(startIdx, skip=1){
  const centers=getDotCenters(), n=centers.length; if(!n) return null;
  let i=(startIdx+1+skip)%n, scanned=0;
  while(scanned<n){ const c=centers[i]; if(!occupied.has(c.idx)) return c; i=(i+1)%n; scanned++; }
  return null;
}
function computeAnchorDot(){ const cx=window.scrollX+innerWidth/2, cy=window.scrollY+innerHeight/2; return nearestDotTo(cx, cy); }

// ===== LOOKBOOK pill alignment to C =====
function positionLookbook(){
  const lb = document.querySelector('.lookbook-btn');
  const cBtn = document.querySelector('.object-button-column .object-btn[data-popup="popup-3"]');
  if (!lb || !cBtn) return;
  if (window.matchMedia('(max-width: 900px)').matches){
    lb.style.top = ''; lb.style.bottom = '16px'; return;
  }
  const r = cBtn.getBoundingClientRect();
  const desiredTop = r.top + window.scrollY + (r.height/2) - (lb.offsetHeight/2);
  lb.style.top = `${desiredTop}px`; lb.style.bottom = 'auto';
}

// ===== Intro typewriter + image sequence =====
function typeWriter(text, el, speed=40, done){ let i=0;(function w(){ if(i<text.length){el.textContent+=text.charAt(i++); setTimeout(w,speed);} else if(done) done(); })(); }
function playImageSequence() {
  const imgsArr = [
    'https://cdn.prod.website-files.com/67e7324b5a3b365fefc2fce4/685c8df134511914b60a540c_Untitled-1.png',
    'https://cdn.prod.website-files.com/67e7324b5a3b365fefc2fce4/685c8df11a4cad7075a460a3_Untitled-2.png',
    'https://cdn.prod.website-files.com/67e7324b5a3b365fefc2fce4/685c8df1dd340d07a356767f_Untitled-3.png',
    'https://cdn.prod.website-files.com/67e7324b5a3b365fefc2fce4/685c8df10550a329465104ab_Untitled-4.png',
    'https://cdn.prod.website-files.com/67e7324b5a3b365fefc2fce4/685c8df192baa7eaaaadf3d2_Untitled-5.png',
    'https://cdn.prod.website-files.com/67e7324b5a3b365fefc2fce4/685c8df180991072796519d7_Untitled-6.png'
  ].sort(()=>0.5-Math.random()).slice(0,3);
  imageContainer.innerHTML = "";
  const imgs = imgsArr.map(src => {
    const img=new Image(); img.src=src; img.style.opacity=0; img.style.transition='opacity .8s'; imageContainer.appendChild(img); return img;
  });
  imageContainer.style.display = "block";
  let i=0; function fadeNext(){
    if(i>0) imgs[i-1].style.opacity = 0;
    if(i>=imgs.length){
      setTimeout(()=>{
        imageContainer.style.display="none"; imageContainer.innerHTML="";
        document.querySelector(".object-button-column").style.opacity = 1;
        document.body.classList.add('ui-ready'); // reveal LOOKBOOK pill
        positionLookbook();
      },600); return;
    }
    imgs[i].style.opacity = 1; i++; setTimeout(fadeNext, 1600);
  }
  setTimeout(fadeNext, 200);
}

// ===== Boot =====
window.addEventListener("DOMContentLoaded", () => {
  typeWriter(sentence, textElement, 100, () => {
    setTimeout(() => {
      textElement.style.transition = "opacity .8s"; textElement.style.opacity = "0";
      setTimeout(() => {
        fillGrid();
        dotGrid.style.display = "grid";
        dotGrid.style.opacity = "0";
        dotGrid.style.transition = "opacity 2s";
        requestAnimationFrame(()=>{ dotGrid.style.opacity = "1"; });
        setTimeout(() => { textElement.style.display = "none"; playImageSequence(); }, 1000);
      }, 200);
    }, 500);
  });
});
window.addEventListener("resize", () => {
  if (dotGrid.style.display === "grid") fillGrid();
  positionLookbook();
});

// ===== Open popup (delegated; works for A/B/C and LOOKBOOK) =====
document.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-popup]');
  if (!btn) return;

  const targetId = btn.dataset.popup;
  const targetPopup = document.getElementById(targetId);
  if (!targetPopup) return;

  // Close all popups
  document.querySelectorAll('.popup-panel').forEach(p => { p.classList.remove('active'); p.style.display='none'; });

  // Align with the left column if present
  const btnColumn = document.querySelector('.object-button-column');
  if (btnColumn){
    const r = btnColumn.getBoundingClientRect();
    targetPopup.style.top = (r.top + window.scrollY) + 'px';
    targetPopup.style.height = r.height + 'px';
  }

  targetPopup.style.display = 'flex';
  requestAnimationFrame(() => targetPopup.classList.add('active'));

  dotGrid.style.opacity = '1';
  dotGrid.style.pointerEvents = 'none';

  // small re-align after layout shift
  positionLookbook();
}, true);

// ===== Local video switching per popup =====
document.querySelectorAll('.popup-panel').forEach(panel => {
  const buttons = panel.querySelectorAll('.video-btn');
  const videos  = panel.querySelectorAll('.popup-video-mask video');
  buttons.forEach(btn => btn.addEventListener('click', () => {
    const idx = +btn.dataset.videoIndex || 0;
    videos.forEach((v,i)=>v.classList.toggle('active', i===idx));
  }));
});

// ===== Placing (full natural size) =====
function placePiece(type, atDot) {
  const conf = PIECES[type]; if(!conf) return;
  const loader = new Image(); loader.crossOrigin='anonymous';
  loader.onload = () => {
    const el = document.createElement('div');
    el.className = 'placed-item blend-multiply';
    el.dataset.type = type; el.dataset.dot = String(atDot.idx);
    el.style.left = `${atDot.x}px`; el.style.top = `${atDot.y}px`;
    el.style.width = `${loader.naturalWidth}px`; el.style.height = `${loader.naturalHeight}px`;
    el.style.transform = 'translate(-50%,-50%) rotate(0deg)';
    el.style.transformOrigin = (type === 'A') ? 'calc(100% + 40px) 50%' : '50% 50%';
    const img = new Image(); img.crossOrigin='anonymous'; img.alt='Piece '+type; img.src=conf.src; el.appendChild(img);
    el.addEventListener('click', (e)=>{ e.stopPropagation(); selectPlaced(el,{bringToFront:true}); });
    placedLayer.appendChild(el); placed.push(el); occupied.add(atDot.idx); lastPlacedDotIdx = atDot.idx;
    selectPlaced(el,{bringToFront:true}); ensureToolbarVisible(); incrementTotal(conf.price);
  };
  loader.src = conf.src;
}

// ===== Selection / UI =====
function selectPlaced(el, opts={}){ if(selectedEl) selectedEl.classList.remove('selected'); selectedEl = el||null;
  if(selectedEl){ selectedEl.classList.add('selected'); if(opts.bringToFront) bringToFront(selectedEl); ensureToolbarVisible(); } }
function bringToFront(el){ if(el && el.parentNode) el.parentNode.appendChild(el); }
function ensureToolbarVisible(){ if(bar.classList.contains('hidden')){ bar.classList.remove('hidden'); bar.setAttribute('aria-hidden','false'); } }
placedLayer.addEventListener('click', (e)=>{ const el=e.target.closest('.placed-item'); if(el){ e.stopPropagation(); selectPlaced(el,{bringToFront:true}); }});
document.addEventListener('click', (e)=>{ if(!e.target.closest('.placed-item') && !e.target.closest('#multi-bar')){ if(selectedEl) selectedEl.classList.remove('selected'); selectedEl=null; }});

// ===== Pricing / purchase =====
function incrementTotal(a){ total += a; priceEl.textContent = total.toLocaleString(); buildPurchaseLink(); }
function decrementTotal(a){ total = Math.max(0,total-a); priceEl.textContent = total.toLocaleString(); buildPurchaseLink(); }
function buildPurchaseLink(){
  const counts = {}; placed.forEach(p=>{ counts[p.dataset.type]=(counts[p.dataset.type]||0)+1; });
  const summary = Object.entries(counts).map(([t,c])=>`Piece ${t}: ${c}`).join('\n');
  const subject = encodeURIComponent(`Order (Total $${total.toLocaleString()})`);
  const body = encodeURIComponent(`I'd like to purchase:\n\n${summary || '—'}\n\nTotal: $${total.toLocaleString()}\n\n— sent from the configurator`);
  purchaseLink.href = `mailto:ideas@perfeccionistas.studio?subject=${subject}&body=${body}`;
}

// ===== PLACE buttons =====
document.addEventListener('click', (e)=>{
  const btn = e.target.closest('.place-btn'); if(!btn) return;
  const popup = btn.dataset.popup ? document.getElementById(btn.dataset.popup) : btn.closest('.popup-panel');
  if(popup){ popup.classList.remove('active'); setTimeout(()=>{ popup.style.display='none'; },300); }
  const piece = btn.dataset.piece || 'A';
  const start = anchorDot || nearestDotTo(window.scrollX+innerWidth/2, window.scrollY+innerHeight/2) || firstFreeDot();
  if(start) placePiece(piece, start);
}, true);

// ===== Multifunction bar =====
bar.addEventListener('click', (e)=>{
  e.stopPropagation();
  const b = e.target.closest('.mf-btn'); if(!b) return;
  const action = b.dataset.action;
  if(action==='add'){ if(!selectedEl) return; const type=selectedEl.dataset.type; const fromIdx=+selectedEl.dataset.dot; const next=nextFreeDotAfter(fromIdx,1)||firstFreeDot(); if(next) placePiece(type,next); }
  if(action==='remove'){ if(!selectedEl) return; const type=selectedEl.dataset.type; const price=PIECES[type]?.price||0; const dotIdx=+selectedEl.dataset.dot;
    selectedEl.remove(); placed = placed.filter(p=>p!==selectedEl);
    const stillUsed = placed.some(p=>+p.dataset.dot===dotIdx); if(!stillUsed) occupied.delete(dotIdx);
    selectedEl=null; decrementTotal(price);
  }
  if(action==='rotate'){ if(!selectedEl) return; const type=selectedEl.dataset.type; const cur=getRotation(selectedEl);
    if(type==='B'||type==='C'){ const snapped=Math.round(cur/60)*60; const next=(snapped+60)%360; selectedEl.style.transform=`translate(-50%,-50%) rotate(${next}deg)`; }
    else{ const next=(cur+15)%360; selectedEl.style.transform=`translate(-50%,-50%) rotate(${next}deg)`; }
  }
});
function getRotation(el){ const m=/rotate\(([-\d.]+)deg\)/.exec(el.style.transform||''); return m?parseFloat(m[1]):0; }

// ===== Alpha-aware picking =====
const _imgCanvasCache = new Map(); let _alphaHitCorsBroken=false;
function getImageCanvas(img){ const key=img.currentSrc||img.src, w=img.naturalWidth||0, h=img.naturalHeight||0; if(!w||!h) return null;
  let cached=_imgCanvasCache.get(key); if(cached && cached.w===w && cached.h===h) return cached.canvas;
  const c=document.createElement('canvas'); c.width=w; c.height=h; const ctx=c.getContext('2d',{willReadFrequently:true}); ctx.drawImage(img,0,0,w,h); _imgCanvasCache.set(key,{canvas:c,w,h}); return c; }
function getTransformOriginPx(el, rect){ const cs=getComputedStyle(el); const parts=(cs.transformOrigin||'').split(' '); const ox=parseFloat(parts[0])||rect.width/2; const oy=parseFloat(parts[1])||rect.height/2; return {ox,oy}; }
function pointToImagePixel(el,img,clientX,clientY){ const rect=el.getBoundingClientRect(); if(rect.width===0||rect.height===0) return null;
  const {ox,oy}=getTransformOriginPx(el,rect); const ang=(getRotation(el)||0)*Math.PI/180; const px=rect.left+ox, py=rect.top+oy;
  const lx=clientX-px, ly=clientY-py; const rx=lx*Math.cos(-ang)-ly*Math.sin(-ang), ry=lx*Math.sin(-ang)+ly*Math.cos(-ang);
  const ex=rx+ox, ey=ry+oy; if(ex<0||ey<0||ex>rect.width||ey>rect.height) return null;
  const sx=img.naturalWidth/rect.width, sy=img.naturalHeight/rect.height; const pxI=Math.floor(ex*sx), pyI=Math.floor(ey*sy);
  if(pxI<0||pyI<0||pxI>=img.naturalWidth||pyI>=img.naturalHeight) return null; return {px:pxI, py:pyI}; }
function alphaHit(el, clientX, clientY){
  if(_alphaHitCorsBroken) return true; const img=el.querySelector('img'); if(!img||!img.naturalWidth||!img.naturalHeight) return true;
  const coords=pointToImagePixel(el,img,clientX,clientY); if(!coords) return false;
  try{ const canvas=getImageCanvas(img); if(!canvas) return true; const ctx=canvas.getContext('2d',{willReadFrequently:true}); const data=ctx.getImageData(coords.px,coords.py,1,1).data; return data[3]>10; }
  catch(e){ _alphaHitCorsBroken=true; return true; }
}

// ===== Alpha-aware selection & drag =====
document.addEventListener('click', (e)=>{
  if(suppressNextClick){ suppressNextClick=false; return; }
  if(e.target.closest('#multi-bar') || e.target.closest('.popup-panel')) return;
  const stack = document.elementsFromPoint(e.clientX, e.clientY).filter(el => el.classList && el.classList.contains('placed-item'));
  if(stack.length===0) return;
  e.preventDefault(); e.stopImmediatePropagation();
  if(e.altKey){ const i=stack.indexOf(selectedEl); const next=stack[(i>=0?i+1:0)%stack.length]; selectPlaced(next,{bringToFront:false}); return; }
  let picked=null; for(const el of stack){ if(alphaHit(el,e.clientX,e.clientY)){ picked=el; break; } } selectPlaced(picked||stack[0], {bringToFront:true});
}, true);

function countItemsAtDot(idx){ let n=0; for(const p of placed) if(+p.dataset.dot===idx) n++; return n; }
function movePlacedToDot(el, dot){
  const oldIdx=+el.dataset.dot; if(oldIdx===dot.idx) return;
  el.style.left=`${dot.x}px`; el.style.top=`${dot.y}px`; el.dataset.dot=String(dot.idx);
  if(countItemsAtDot(oldIdx)===0) occupied.delete(oldIdx); occupied.add(dot.idx);
}
document.addEventListener('pointerdown', (e)=>{
  if(e.button!==0) return; if(e.target.closest('#multi-bar') || e.target.closest('.popup-panel')) return;
  const stack = document.elementsFromPoint(e.clientX, e.clientY).filter(el => el.classList && el.classList.contains('placed-item'));
  if(stack.length===0) return;
  let picked=null; for(const el of stack){ if(alphaHit(el,e.clientX,e.clientY)){ picked=el; break; } } picked=picked||stack[0];
  selectPlaced(picked,{bringToFront:true});
  drag.active=true; drag.el=picked; drag.startDotIdx=+picked.dataset.dot; drag.lastDotIdx=drag.startDotIdx; drag.moved=false; drag.pointerId=e.pointerId;
  try{ picked.setPointerCapture(e.pointerId);}catch(_){}
  e.preventDefault();
}, true);
document.addEventListener('pointermove', (e)=>{
  if(!drag.active||!drag.el) return;
  const dot=nearestDotTo(e.pageX, e.pageY); if(!dot) return;
  if(dot.idx!==drag.lastDotIdx){ movePlacedToDot(drag.el, dot); drag.lastDotIdx=dot.idx; drag.moved=true; }
});
function endDrag(){ if(!drag.active) return; if(drag.moved) suppressNextClick=true; drag.active=false; drag.el=null; drag.pointerId=null; drag.moved=false; }
document.addEventListener('pointerup', endDrag, true);
document.addEventListener('pointercancel', endDrag, true);

// ===== Lookbook minimize =====
document.addEventListener('click', (e)=>{
  const minBtn = e.target.closest('.iv-minimize'); if(!minBtn) return;
  const panel = minBtn.closest('.popup-panel'); if(!panel) return;
  panel.classList.remove('active'); setTimeout(()=>{ panel.style.display='none'; }, 300);
});
