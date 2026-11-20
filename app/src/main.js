// Vice Sunset Cover Studio — editor wiring.
// Live preview canvas, four panels (click to pick one, drag to move its photo,
// wheel to zoom), caption controls, and PNG export in 1080x1080 / 1080x1350 /
// 1920x1080. Photos never leave the machine. A `?shot=` query sets up a fixed
// scene for screenshots instead (see shots.js).
import { drawCover, panelAt } from './cover.js';
import { runShot } from './shots.js';

export const SIZES = {
  square: { w: 1080, h: 1080, label: '1080 x 1080' },
  portrait: { w: 1080, h: 1350, label: '1080 x 1350' },
  wide: { w: 1920, h: 1080, label: '1920 x 1080' },
};

const PANEL_NAMES = ['Hero', 'Panel 2', 'Panel 3', 'Panel 4'];

const state = {
  photos: [], // { name, img }
  panels: [
    { photo: 0, zoom: 1.1, ox: 0, oy: -8 },
    { photo: 1, zoom: 1.1, ox: 0, oy: 0 },
    { photo: 0, zoom: 1.3, ox: 0, oy: 0 },
    { photo: 1, zoom: 1.3, ox: 0, oy: 0 },
  ],
  grade: 'sunset',
  caption: 'Sunset Heist',
  tagline: 'A story in neon and gold',
  captionStyle: 'gold',
  captionPosition: 'bottom',
  captionSize: 100,
  sizeKey: 'wide',
};

let selectedPanel = 0;
let polygons = [];
let drag = null;

const $ = (id) => document.getElementById(id);
const canvas = $('cover');
const status = $('status');

function previewSize() {
  const s = SIZES[state.sizeKey];
  const scale = 900 / Math.max(s.w, s.h);
  return { w: Math.round(s.w * scale), h: Math.round(s.h * scale) };
}

function redraw() {
  const { w, h } = previewSize();
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  polygons = drawCover(canvas, {
    photos: state.photos.map((p) => p.img),
    panels: state.panels,
    grade: state.grade,
    caption: state.caption,
    tagline: state.tagline,
    captionStyle: state.captionStyle,
    captionPosition: state.captionPosition,
    captionSize: state.captionSize,
  });
  document.querySelectorAll('.panel-card').forEach((card, i) => {
    card.classList.toggle('selected', i === selectedPanel);
  });
}

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

async function addPhoto(name, url) {
  const img = await loadImage(url);
  state.photos.push({ name, img });
  refreshPhotoSelects();
  redraw();
  return state.photos.length - 1;
}

function refreshPhotoSelects() {
  document.querySelectorAll('.panel-photo').forEach((sel) => {
    const current = Number(sel.value);
    sel.innerHTML = state.photos
      .map((p, i) => `<option value="${i}">${escapeHtml(p.name)}</option>`)
      .join('');
    if (state.photos[current]) sel.value = String(current);
  });
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/** Builds the four panel control cards (photo, zoom, offset, flip). */
function buildPanelCards() {
  const wrap = $('panels');
  wrap.innerHTML = '';
  state.panels.forEach((panel, i) => {
    const card = document.createElement('div');
    card.className = 'panel-card';
    card.innerHTML = `
      <div class="panel-head"><strong>${PANEL_NAMES[i]}</strong><span class="pick">click preview to pick</span></div>
      <label>Photo <select class="panel-photo" data-i="${i}"></select></label>
      <label>Zoom <input class="panel-zoom" data-i="${i}" type="range" min="1" max="2.5" step="0.05" value="${panel.zoom}"></label>
      <label>Move X <input class="panel-ox" data-i="${i}" type="range" min="-50" max="50" step="1" value="${panel.ox}"></label>
      <label>Move Y <input class="panel-oy" data-i="${i}" type="range" min="-50" max="50" step="1" value="${panel.oy}"></label>`;
    card.addEventListener('click', () => { selectedPanel = i; redraw(); });
    wrap.appendChild(card);
  });
  wrap.querySelectorAll('.panel-photo').forEach((sel) => {
    sel.addEventListener('change', () => {
      state.panels[Number(sel.dataset.i)].photo = Number(sel.value);
      redraw();
    });
  });
  wrap.querySelectorAll('.panel-zoom').forEach((el) => {
    el.addEventListener('input', () => {
      state.panels[Number(el.dataset.i)].zoom = Number(el.value);
      redraw();
    });
  });
  wrap.querySelectorAll('.panel-ox').forEach((el) => {
    el.addEventListener('input', () => {
      state.panels[Number(el.dataset.i)].ox = Number(el.value);
      redraw();
    });
  });
  wrap.querySelectorAll('.panel-oy').forEach((el) => {
    el.addEventListener('input', () => {
      state.panels[Number(el.dataset.i)].oy = Number(el.value);
      redraw();
    });
  });
  refreshPhotoSelects();
  // Restore each select to its panel's photo.
  wrap.querySelectorAll('.panel-photo').forEach((sel) => {
    sel.value = String(state.panels[Number(sel.dataset.i)].photo);
  });
}

/** Renders the cover at full export size and downloads it as a PNG. */
export function exportCover() {
  const s = SIZES[state.sizeKey];
  const off = document.createElement('canvas');
  off.width = s.w;
  off.height = s.h;
  drawCover(off, {
    photos: state.photos.map((p) => p.img),
    panels: state.panels,
    grade: state.grade,
    caption: state.caption,
    tagline: state.tagline,
    captionStyle: state.captionStyle,
    captionPosition: state.captionPosition,
    captionSize: state.captionSize,
  });
  off.toBlob((blob) => {
    if (!blob) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `vice-cover-${s.w}x${s.h}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    status.textContent = `Saved vice-cover-${s.w}x${s.h}.png`;
  }, 'image/png');
}

function canvasPoint(e) {
  const r = canvas.getBoundingClientRect();
  return {
    x: ((e.clientX - r.left) / r.width) * canvas.width,
    y: ((e.clientY - r.top) / r.height) * canvas.height,
  };
}

canvas.addEventListener('pointerdown', (e) => {
  const p = canvasPoint(e);
  const hit = panelAt(polygons, p.x, p.y);
  if (hit < 0) return;
  selectedPanel = hit;
  drag = { panel: state.panels[hit], x: p.x, y: p.y, ox: state.panels[hit].ox, oy: state.panels[hit].oy };
  canvas.setPointerCapture(e.pointerId);
  redraw();
});
canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const p = canvasPoint(e);
  const box = { w: canvas.width, h: canvas.height };
  drag.panel.ox = drag.ox + ((p.x - drag.x) / box.w) * 100 * 2;
  drag.panel.oy = drag.oy + ((p.y - drag.y) / box.h) * 100 * 2;
  drag.panel.ox = Math.max(-60, Math.min(60, drag.panel.ox));
  drag.panel.oy = Math.max(-60, Math.min(60, drag.panel.oy));
  syncPanelInputs();
  redraw();
});
canvas.addEventListener('pointerup', () => { drag = null; });
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const panel = state.panels[selectedPanel];
  panel.zoom = Math.max(1, Math.min(2.5, panel.zoom - Math.sign(e.deltaY) * 0.1));
  syncPanelInputs();
  redraw();
}, { passive: false });

function syncPanelInputs() {
  document.querySelectorAll('.panel-zoom').forEach((el) => { el.value = state.panels[Number(el.dataset.i)].zoom; });
  document.querySelectorAll('.panel-ox').forEach((el) => { el.value = state.panels[Number(el.dataset.i)].ox; });
  document.querySelectorAll('.panel-oy').forEach((el) => { el.value = state.panels[Number(el.dataset.i)].oy; });
}

function bindControls() {
  $('photos').addEventListener('change', async (e) => {
    for (const file of e.target.files) {
      await addPhoto(file.name, URL.createObjectURL(file));
    }
    status.textContent = `${state.photos.length} photo(s) loaded — pick a panel, drag the preview to position it.`;
  });
  document.querySelectorAll('[data-sample]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      await addPhoto(btn.dataset.sample, `samples/${btn.dataset.sample}.jpg`);
      status.textContent = `Sample ${btn.dataset.sample}.jpg loaded.`;
    });
  });
  $('grade').addEventListener('change', (e) => { state.grade = e.target.value; redraw(); });
  $('caption').addEventListener('input', (e) => { state.caption = e.target.value; redraw(); });
  $('tagline').addEventListener('input', (e) => { state.tagline = e.target.value; redraw(); });
  $('captionStyle').addEventListener('change', (e) => { state.captionStyle = e.target.value; redraw(); });
  $('captionPosition').addEventListener('change', (e) => { state.captionPosition = e.target.value; redraw(); });
  $('captionSize').addEventListener('input', (e) => { state.captionSize = Number(e.target.value); redraw(); });
  document.querySelectorAll('[data-size]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.sizeKey = btn.dataset.size;
      document.querySelectorAll('[data-size]').forEach((b) => b.classList.toggle('active', b === btn));
      redraw();
    });
  });
  $('export').addEventListener('click', exportCover);
  $('clear').addEventListener('click', () => {
    state.photos = [];
    state.panels.forEach((p) => { p.photo = 0; });
    refreshPhotoSelects();
    redraw();
  });
}

buildPanelCards();
bindControls();

const shot = new URLSearchParams(location.search).get('shot');
if (shot) {
  runShot(shot, new URLSearchParams(location.search), state, redraw, addPhoto);
} else {
  // Default scene: both free sample photos loaded so the first paint already looks like a cover.
  (async () => {
    try { await document.fonts.ready; } catch { /* fonts are optional */ }
    await addPhoto('boulevard.jpg', 'samples/boulevard.jpg');
    await addPhoto('pier.jpg', 'samples/pier.jpg');
    redraw();
  })();
}
