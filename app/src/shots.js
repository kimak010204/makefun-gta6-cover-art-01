// Fixed scenes for screenshots, driven by `?shot=`:
//   ?shot=cover&size=wide|portrait|square&photo=boulevard&photo2=pier&caption=...
//     — cover only, controls hidden, canvas at export aspect.
//   ?shot=editor&photo=boulevard&caption=...
//     — the editor with a photo loaded.
// Sets window.__shotReady once the cover is painted (fonts included).
import { SIZES } from './main.js';

function finish() {
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}

export async function runShot(shot, query, state, redraw, addPhoto) {
  const caption = query.get('caption') ?? 'Sunset Heist';
  const grade = query.get('grade') ?? 'sunset';
  const style = query.get('style') ?? 'gold';
  state.caption = caption;
  state.tagline = query.get('tagline') ?? 'A story in neon and gold';
  state.grade = grade;
  state.captionStyle = style;
  try { await document.fonts.ready; } catch { /* fonts are optional */ }
  await addPhoto(`${query.get('photo') ?? 'boulevard'}.jpg`, `samples/${query.get('photo') ?? 'boulevard'}.jpg`);
  await addPhoto(`${query.get('photo2') ?? 'pier'}.jpg`, `samples/${query.get('photo2') ?? 'pier'}.jpg`);
  if (query.get('zoom')) state.panels.forEach((p) => { p.zoom = Number(query.get('zoom')); });
  if (shot === 'cover') {
    state.sizeKey = query.get('size') ?? 'wide';
    const s = SIZES[state.sizeKey];
    document.body.classList.add('shot-cover');
    document.getElementById('cover').style.aspectRatio = `${s.w} / ${s.h}`;
    redraw();
    finish();
    return;
  }
  // Editor scene: keep the controls visible, photo loaded, caption set.
  document.getElementById('caption').value = caption;
  redraw();
  finish();
}
