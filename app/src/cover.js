// Vice Sunset Cover Studio — cover renderer.
// Draws a multi-panel GTA-poster-style cover on any canvas: a big hero panel plus
// three smaller panels with diagonal white gutters, a sunset/neon colour grade per
// photo, and a bold Anton caption band. Pure canvas 2D, no network, no libraries.

/** Panel polygons for a cover of size w x h. Returns 4 polygons (arrays of [x, y]). */
export function coverLayout(w, h) {
  const g = Math.max(6, Math.round(w * 0.008)); // white gutter
  const landscape = w / h > 1.3;
  if (landscape) {
    const heroR = 0.6 * w;
    const midY = 0.5 * h;
    const splitX = 0.79 * w;
    return [
      // Hero: tall panel on the left, diagonal right edge.
      [[0, 0], [heroR, 0], [heroR - 0.04 * w, h], [0, h]],
      // Top right.
      [[heroR + g, 0], [w, 0], [w, midY - g / 2], [heroR - 0.04 * w + g, midY - g / 2]],
      // Bottom right, left half.
      [[heroR - 0.04 * w + g, midY + g / 2], [splitX - g / 2, midY + g / 2], [splitX - g / 2, h], [heroR - 0.045 * w + g, h]],
      // Bottom right, right half.
      [[splitX + g / 2, midY + g / 2], [w, midY + g / 2], [w, h], [splitX + g / 2, h]],
    ];
  }
  const heroB = 0.56 * h;
  const rowY = heroB + g;
  const rowH = 0.84 * h - rowY;
  const third = w / 3;
  return [
    // Hero: wide panel on top, diagonal bottom edge.
    [[0, 0], [w, 0], [w, heroB - 0.03 * h], [0, heroB]],
    // Bottom row: three panels side by side.
    [[0, rowY], [third - g / 2, rowY], [third - g / 2, rowY + rowH], [0, rowY + rowH]],
    [[third + g / 2, rowY], [2 * third - g / 2, rowY], [2 * third - g / 2, rowY + rowH], [third + g / 2, rowY + rowH]],
    [[2 * third + g / 2, rowY], [w, rowY], [w, rowY + rowH], [2 * third + g / 2, rowY + rowH]],
  ];
}

/** Point-in-polygon test, used to pick a panel by clicking the preview. */
export function panelAt(polygons, x, y) {
  for (let i = 0; i < polygons.length; i++) {
    const poly = polygons[i];
    let inside = false;
    for (let a = 0, b = poly.length - 1; a < poly.length; b = a++) {
      const [ax, ay] = poly[a];
      const [bx, by] = poly[b];
      if (ay > y !== by > y && x < ((bx - ax) * (y - ay)) / (by - ay) + ax) inside = !inside;
    }
    if (inside) return i;
  }
  return -1;
}

function panelBox(poly) {
  const xs = poly.map((p) => p[0]);
  const ys = poly.map((p) => p[1]);
  return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
}

function clipPoly(ctx, poly) {
  ctx.beginPath();
  ctx.moveTo(poly[0][0], poly[0][1]);
  for (let i = 1; i < poly.length; i++) ctx.lineTo(poly[i][0], poly[i][1]);
  ctx.closePath();
  ctx.clip();
}

/** Paints one photo into a panel polygon: cover-fit, zoom, offset, colour grade. */
export function drawPanelPhoto(ctx, poly, img, panel, grade) {
  if (!img) return;
  const box = panelBox(poly);
  const zoom = panel.zoom ?? 1;
  const scale = Math.max(box.w / img.naturalWidth, box.h / img.naturalHeight) * zoom;
  const pw = img.naturalWidth * scale;
  const ph = img.naturalHeight * scale;
  const ox = ((panel.ox ?? 0) / 100) * box.w;
  const oy = ((panel.oy ?? 0) / 100) * box.h;
  ctx.save();
  clipPoly(ctx, poly);
  ctx.fillStyle = '#241430';
  ctx.fillRect(box.x, box.y, box.w, box.h);
  if (grade === 'duotone') ctx.filter = 'grayscale(1) contrast(1.25) brightness(1.05)';
  else if (grade === 'neon') ctx.filter = 'saturate(1.5) contrast(1.15)';
  else if (grade === 'noir') ctx.filter = 'grayscale(1) contrast(1.15)';
  ctx.drawImage(img, box.x + (box.w - pw) / 2 + ox, box.y + (box.h - ph) / 2 + oy, pw, ph);
  ctx.filter = 'none';
  // Colour grade wash.
  let wash = null;
  if (grade === 'sunset') {
    wash = ctx.createLinearGradient(box.x, box.y, box.x + box.w, box.y + box.h);
    wash.addColorStop(0, 'rgba(255, 122, 60, 0.16)');
    wash.addColorStop(0.6, 'rgba(255, 60, 120, 0.10)');
    wash.addColorStop(1, 'rgba(90, 20, 120, 0.30)');
  } else if (grade === 'neon') {
    wash = ctx.createLinearGradient(box.x, box.y, box.x + box.w, box.y + box.h);
    wash.addColorStop(0, 'rgba(0, 229, 255, 0.20)');
    wash.addColorStop(1, 'rgba(255, 0, 150, 0.28)');
  } else if (grade === 'duotone') {
    wash = ctx.createLinearGradient(box.x, box.y, box.x, box.y + box.h);
    wash.addColorStop(0, 'rgba(255, 140, 40, 0.30)');
    wash.addColorStop(1, 'rgba(120, 0, 140, 0.38)');
  }
  if (wash) {
    ctx.fillStyle = wash;
    ctx.fillRect(box.x, box.y, box.w, box.h);
  }
  // Vignette: darkens the panel edges so the white gutters pop.
  const vig = ctx.createRadialGradient(
    box.x + box.w / 2, box.y + box.h / 2, Math.min(box.w, box.h) * 0.35,
    box.x + box.w / 2, box.y + box.h / 2, Math.max(box.w, box.h) * 0.75,
  );
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(10,0,20,0.35)');
  ctx.fillStyle = vig;
  ctx.fillRect(box.x, box.y, box.w, box.h);
  ctx.restore();
}

/** A small original palm silhouette, drawn with canvas paths (no artwork). */
export function drawPalm(ctx, x, y, s, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(6, -55, 26, -95);
  ctx.stroke();
  ctx.lineWidth = 5;
  for (let i = 0; i < 6; i++) {
    const a = (-160 + i * 52) * (Math.PI / 180);
    ctx.beginPath();
    ctx.moveTo(26, -95);
    ctx.quadraticCurveTo(26 + Math.cos(a) * 45, -95 + Math.sin(a) * 32, 26 + Math.cos(a) * 78, -95 + Math.sin(a) * 52 + 26);
    ctx.stroke();
  }
  ctx.restore();
}

const CAPTION_STYLES = {
  gold: { stops: ['#fff8c9', '#ffc46b', '#ff5e3a'], stroke: '#5c1030', shadow: 'rgba(255, 90, 40, 0.55)' },
  neon: { stops: ['#ffffff', '#ff7ad9', '#00e5ff'], stroke: '#2a0033', shadow: 'rgba(255, 0, 160, 0.65)' },
  ice: { stops: ['#ffffff', '#d8ecff', '#8fc4ff'], stroke: '#06122e', shadow: 'rgba(0, 80, 180, 0.5)' },
  ember: { stops: ['#fff3a0', '#ff9a3d', '#e81e63'], stroke: '#1c0533', shadow: 'rgba(232, 30, 99, 0.5)' },
};

/** Draws the caption band (bottom strip) with the big poster lettering. */
export function drawCaptionBand(ctx, w, h, caption, tagline, style, position, sizePct) {
  const bandH = h * 0.16;
  const bandY = position === 'top' ? 0 : h - bandH;
  const bg = ctx.createLinearGradient(0, bandY, 0, bandY + bandH);
  bg.addColorStop(0, 'rgba(16, 4, 32, 0.82)');
  bg.addColorStop(1, 'rgba(16, 4, 32, 0.97)');
  ctx.fillStyle = bg;
  ctx.fillRect(0, bandY, w, bandH);
  // Thin neon rule above/below the band.
  ctx.fillStyle = '#ff2ea6';
  ctx.fillRect(0, position === 'top' ? bandY + bandH - 3 : bandY, w, 3);
  ctx.fillStyle = '#00e5ff';
  ctx.fillRect(0, position === 'top' ? bandY + bandH : bandY + bandH - 3, w, 0);
  const palmS = bandH / 130;
  ctx.globalAlpha = 0.85;
  drawPalm(ctx, w * 0.045, bandY + bandH * 0.98, palmS, '#ff7ad9');
  drawPalm(ctx, w * 0.955, bandY + bandH * 0.98, palmS, '#00e5ff');
  ctx.globalAlpha = 1;
  const text = (caption || '').trim().toUpperCase();
  const pal = CAPTION_STYLES[style] ?? CAPTION_STYLES.gold;
  if (text) {
    let size = bandH * 0.62 * ((sizePct ?? 100) / 100);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const fit = (s) => {
      ctx.font = `${s}px Anton, "Archivo Black", sans-serif`;
      try { ctx.letterSpacing = `${Math.max(1, s * 0.02)}px`; } catch { /* older canvas */ }
      return ctx.measureText(text).width;
    };
    while (fit(size) > w * 0.86 && size > 10) size -= 2;
    const grad = ctx.createLinearGradient(0, bandY + bandH * 0.18, 0, bandY + bandH * 0.88);
    pal.stops.forEach((c, i) => grad.addColorStop(i / (pal.stops.length - 1), c));
    ctx.font = `${size}px Anton, "Archivo Black", sans-serif`;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = pal.stroke;
    ctx.lineWidth = Math.max(2, size * 0.09);
    ctx.shadowColor = pal.shadow;
    ctx.shadowBlur = size * 0.28;
    ctx.shadowOffsetY = size * 0.04;
    const cy = bandY + bandH * (tagline && tagline.trim() ? 0.4 : 0.52);
    ctx.strokeText(text, w / 2, cy);
    ctx.fillStyle = grad;
    ctx.fillText(text, w / 2, cy);
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
  }
  const tag = (tagline || '').trim().toUpperCase();
  if (tag) {
    let ts = Math.max(10, bandH * 0.17);
    const setTagFont = (s) => {
      ctx.font = `700 ${s}px "Archivo Black", sans-serif`;
      try { ctx.letterSpacing = `${s * 0.28}px`; } catch { /* older canvas */ }
    };
    setTagFont(ts);
    while (ctx.measureText(tag).width > w * 0.86 && ts > 8) { ts -= 1; setTagFont(ts); }
    ctx.fillStyle = '#ffd9ef';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(tag, w / 2, bandY + bandH * 0.82);
    try { ctx.letterSpacing = '0px'; } catch { /* older canvas */ }
  }
}

/**
 * Renders the whole cover onto `canvas` (at its own pixel size) from the editor state:
 * state = { photos: HTMLImageElement[], panels: [{photo, zoom, ox, oy}], grade,
 *           caption, tagline, captionStyle, captionPosition, captionSize }.
 * Returns the panel polygons in canvas pixels (for click hit-testing).
 */
export function drawCover(canvas, state) {
  const ctx = canvas.getContext('2d');
  const { width: w, height: h } = canvas;
  // Sunset sky base: shows through the white gutters and frames the poster.
  const sky = ctx.createLinearGradient(0, 0, w, h);
  sky.addColorStop(0, '#1b1035');
  sky.addColorStop(0.45, '#7a1e63');
  sky.addColorStop(0.75, '#ff5e3a');
  sky.addColorStop(1, '#ffb347');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);
  const polygons = coverLayout(w, h);
  state.panels.forEach((panel, i) => {
    const img = state.photos[panel.photo] ?? null;
    if (img) drawPanelPhoto(ctx, polygons[i], img, panel, state.grade);
    else {
      ctx.save();
      clipPoly(ctx, polygons[i]);
      ctx.fillStyle = '#2a1840';
      const box = panelBox(polygons[i]);
      ctx.fillRect(box.x, box.y, box.w, box.h);
      ctx.restore();
    }
  });
  // White frame + gutters: stroke each panel outline.
  ctx.save();
  ctx.lineWidth = Math.max(3, w * 0.006);
  ctx.strokeStyle = '#ffffff';
  polygons.forEach((poly) => {
    ctx.beginPath();
    ctx.moveTo(poly[0][0], poly[0][1]);
    for (let i = 1; i < poly.length; i++) ctx.lineTo(poly[i][0], poly[i][1]);
    ctx.closePath();
    ctx.stroke();
  });
  ctx.lineWidth = Math.max(6, w * 0.01);
  ctx.strokeRect(0, 0, w, h);
  ctx.restore();
  drawCaptionBand(ctx, w, h, state.caption, state.tagline, state.captionStyle, state.captionPosition, state.captionSize);
  return polygons;
}
