const clone = value => JSON.parse(JSON.stringify(value));
export const emptyDrawing = () => ({ version: 1, areas: [], paths: [], background: { visible: true, opacity: .65 } });

export function validateDrawing(value) {
 if (!value || value.version !== 1 || !Array.isArray(value.areas) || !Array.isArray(value.paths)) throw Error('Ungültige Zeichnungsdatei.');
 if (value.areas.length > 200 || value.paths.length > 2000) throw Error('Maximal 200 Gebiete und 2000 Pfade erlaubt.');
 const ids = new Set();
 const id = v => {
  if (typeof v !== 'string' || !/^[a-zA-Z0-9_-]{1,80}$/.test(v) || ids.has(v)) throw Error('Ungültige oder doppelte ID.');
  ids.add(v); return v;
 };
 const name = v => { if (typeof v !== 'string' || !v.trim() || v.length > 120) throw Error('Namen müssen 1–120 Zeichen lang sein.'); return v.trim(); };
 const areas = value.areas.map(a => {
  if (!a || !/^#[0-9a-f]{6}$/i.test(a.color)) throw Error('Ungültige Gebietsfarbe.');
  return { id: id(a.id), name: name(a.name), color: a.color, visible: a.visible !== false, locked: a.locked === true };
 });
 const areaIds = new Set(areas.map(a => a.id)); let vertices = 0;
 const paths = value.paths.map(p => {
  if (!p || !areaIds.has(p.areaId) || !['line', 'polygon'].includes(p.type)) throw Error('Pfad gehört zu keinem gültigen Gebiet.');
  if (!Number.isFinite(p.width) || p.width < 1 || p.width > 100) throw Error('Pfadbreite muss zwischen 1 und 100 liegen.');
  if (!Array.isArray(p.points) || p.points.length < (p.type === 'polygon' ? 3 : 2) || p.points.length > 2000) throw Error('Ungültige Anzahl an Eckpunkten.');
  vertices += p.points.length;
  return { id: id(p.id), areaId: p.areaId, name: name(p.name), type: p.type, width: p.width,
   points: p.points.map(pt => {
    if (!pt || ![pt.x, pt.y].every(n => Number.isFinite(n) && n >= 0 && n <= 1)) throw Error('Eckpunkte müssen innerhalb der Karte liegen.');
    return { x: pt.x, y: pt.y };
   }) };
 });
 if (vertices > 20000) throw Error('Maximal 20.000 Eckpunkte erlaubt.');
 const opacity = value.background?.opacity;
 if (!Number.isFinite(opacity) || opacity < 0 || opacity > 1) throw Error('Ungültige Deckkraft.');
 return { version: 1, areas, paths, background: { visible: value.background.visible !== false, opacity } };
}

export function nearestSegment(points, point, closed, width, height) {
 let best = null;
 for (let i = 0; i < points.length - (closed ? 0 : 1); i++) {
  const a = points[i], b = points[(i + 1) % points.length];
  const dx = (b.x - a.x) * width, dy = (b.y - a.y) * height;
  const length = dx * dx + dy * dy;
  const t = length ? Math.max(0, Math.min(1, ((point.x - a.x) * width * dx + (point.y - a.y) * height * dy) / length)) : 0;
  const position = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
  const distance = Math.hypot((point.x - position.x) * width, (point.y - position.y) * height);
  if (!best || distance < best.distance) best = { index: i + 1, position, distance };
 }
 return best;
}

export function snapPoint(point, paths, width, height, threshold, exclude) {
 let result = point, distance = threshold;
 for (const path of paths) path.points.forEach((p, i) => {
  if (exclude?.id === path.id && exclude.index === i) return;
  const d = Math.hypot((point.x - p.x) * width, (point.y - p.y) * height);
  if (d < distance) { distance = d; result = { ...p }; }
 });
 return result;
}

export class DrawingHistory {
 constructor(value = emptyDrawing()) { this.reset(value); }
 reset(value) { this.value = clone(value); this.past = []; this.future = []; }
 commit(value) {
  if (JSON.stringify(value) === JSON.stringify(this.value)) return false;
  this.past.push(clone(this.value)); if (this.past.length > 80) this.past.shift();
  this.value = clone(value); this.future = []; return true;
 }
 undo() { if (!this.past.length) return false; this.future.push(this.value); this.value = this.past.pop(); return true; }
 redo() { if (!this.future.length) return false; this.past.push(this.value); this.value = this.future.pop(); return true; }
}

export function exportDrawingSVG(drawing, width, height) {
 const data = validateDrawing(drawing);
 if (![width, height].every(n => Number.isFinite(n) && n > 0)) throw Error('Ungültige Kartengröße.');
 const escape = text => text.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]));
 const groups = data.areas.filter(a => a.visible).map(a => {
  const paths = data.paths.filter(p => p.areaId === a.id).map(p => {
   const pts = p.points.map(pt => `${(pt.x * width).toFixed(3)},${(pt.y * height).toFixed(3)}`).join(' ');
   return `<${p.type === 'line' ? 'polyline' : 'polygon'} points="${pts}" fill="${p.type === 'line' ? 'none' : a.color}" stroke="${a.color}" stroke-width="${p.type === 'line' ? p.width : 1}" stroke-linejoin="round" stroke-linecap="round"><title>${escape(p.name)}</title></${p.type === 'line' ? 'polyline' : 'polygon'}>`;
  }).join('\n');
  return `<g id="${a.id}"><title>${escape(a.name)}</title>\n${paths}\n</g>`;
 }).join('\n');
 return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">\n${groups}\n</svg>`;
}
