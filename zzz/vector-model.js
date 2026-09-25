const clone = value => JSON.parse(JSON.stringify(value));
export const emptyDrawing = () => ({ version: 3, areas: [], paths: [], background: { visible: true, opacity: .65 } });

export function validateDrawing(value) {
 if (!value || ![1, 2, 3].includes(value.version) || !Array.isArray(value.areas) || !Array.isArray(value.paths)) throw Error('Ungültige Zeichnungsdatei.');
 if (value.areas.length > 200 || value.paths.length > 2000) throw Error('Maximal 200 Gebiete und 2000 Pfade erlaubt.');
 const ids = new Set();
 const id = v => {
  if (typeof v !== 'string' || !/^[a-zA-Z0-9_-]{1,80}$/.test(v) || ids.has(v)) throw Error('Ungültige oder doppelte ID.');
  ids.add(v); return v;
 };
 const name = v => { if (typeof v !== 'string' || !v.trim() || v.length > 120) throw Error('Namen müssen 1–120 Zeichen lang sein.'); return v.trim(); };
 const areas = value.areas.map(a => {
  if (!a || !/^#[0-9a-f]{6}$/i.test(a.color)) throw Error('Ungültige Gebietsfarbe.');
  const rawFloors = a.floors ?? [{ id: 'ground', name: 'Erdgeschoss', visible: true }];
  if (!Array.isArray(rawFloors) || !rawFloors.length || rawFloors.length > 30) throw Error('Ein Gebiet benötigt 1–30 Etagen.');
  const floorIds = new Set();
  const floors = rawFloors.map(f => {
   if (!f || typeof f.id !== 'string' || !/^[a-zA-Z0-9_-]{1,80}$/.test(f.id) || floorIds.has(f.id)) throw Error('Ungültige oder doppelte Etage.');
   floorIds.add(f.id); return { id: f.id, name: name(f.name), visible: f.visible !== false };
  });
  return { id: id(a.id), name: name(a.name), color: a.color, visible: a.visible !== false, locked: a.locked === true, floors };
 });
 const areaIds = new Set(areas.map(a => a.id)); let vertices = 0;
 const paths = value.paths.map(p => {
  if (!p || !areaIds.has(p.areaId) || !['line', 'polygon'].includes(p.type)) throw Error('Pfad gehört zu keinem gültigen Gebiet.');
  if (!Number.isFinite(p.width) || p.width < 1 || p.width > 100) throw Error('Pfadbreite muss zwischen 1 und 100 liegen.');
  if (!Array.isArray(p.points) || p.points.length < (p.type === 'polygon' ? 3 : 2) || p.points.length > 2000) throw Error('Ungültige Anzahl an Eckpunkten.');
  const floorId = p.floorId ?? 'ground';
  if (!areas.find(a => a.id === p.areaId).floors.some(f => f.id === floorId)) throw Error('Pfad gehört zu keiner gültigen Etage.');
  vertices += p.points.length;
  if (p.smooth !== undefined && typeof p.smooth !== 'boolean') throw Error('Ungültiger Kurvenmodus.');
  return { id: id(p.id), areaId: p.areaId, floorId, name: name(p.name), type: p.type, width: p.width, smooth: p.type === 'line' && p.smooth === true,
   points: p.points.map(pt => {
    if (!pt || ![pt.x, pt.y].every(n => Number.isFinite(n) && n >= 0 && n <= 1)) throw Error('Eckpunkte müssen innerhalb der Karte liegen.');
    return { x: pt.x, y: pt.y };
   }) };
 });
 if (vertices > 20000) throw Error('Maximal 20.000 Eckpunkte erlaubt.');
 const opacity = value.background?.opacity;
 if (!Number.isFinite(opacity) || opacity < 0 || opacity > 1) throw Error('Ungültige Deckkraft.');
 return { version: 3, areas, paths, background: { visible: value.background.visible !== false, opacity } };
}

// Interpolating cubic curves: each editable vertex lies on the road.
// Clamped controls keep the curve inside the image even along its edges.
export function curveSegments(points) {
 const clamp = n => Math.max(0, Math.min(1, n));
 return points.slice(1).map((b, i) => {
  const a = points[i], before = points[Math.max(0, i - 1)], after = points[Math.min(points.length - 1, i + 2)];
  return [a, { x: clamp(a.x + (b.x - before.x) / 6), y: clamp(a.y + (b.y - before.y) / 6) },
   { x: clamp(b.x - (after.x - a.x) / 6), y: clamp(b.y - (after.y - a.y) / 6) }, b];
 });
}
export function pathGeometry(path, width, height) {
 const xy = pt => `${(pt.x * width).toFixed(3)},${(pt.y * height).toFixed(3)}`;
 if (path.type === 'line' && path.smooth) return { tag: 'path', attrs: {
  d: `M ${xy(path.points[0])} ` + curveSegments(path.points).map(s => `C ${xy(s[1])} ${xy(s[2])} ${xy(s[3])}`).join(' ')
 } };
 return { tag: path.type === 'line' ? 'polyline' : 'polygon', attrs: { points: path.points.map(xy).join(' ') } };
}
export function nearestPathSegment(path, point, width, height) {
 if (!path.smooth || path.type !== 'line') return nearestSegment(path.points, point, path.type === 'polygon', width, height);
 let best = null;
 curveSegments(path.points).forEach((s, index) => {
  const samples = Array.from({ length: 65 }, (_, i) => {
   const t = i / 64, u = 1 - t;
   const at = k => u ** 3 * s[0][k] + 3 * u ** 2 * t * s[1][k] + 3 * u * t ** 2 * s[2][k] + t ** 3 * s[3][k];
   return { x: at('x'), y: at('y') };
  });
  const edge = nearestSegment(samples, point, false, width, height);
  if (!best || edge.distance < best.distance) best = { ...edge, index: index + 1 };
 });
 return best;
}
export function splitRoad(path, index, newId) {
 if (path.type !== 'line' || !Number.isInteger(index) || index <= 0 || index >= path.points.length - 1) throw Error('Zum Teilen einen inneren Eckpunkt auswählen.');
 return [{ ...clone(path), points: clone(path.points.slice(0, index + 1)) },
  { ...clone(path), id: newId, name: `${path.name.slice(0, 110)} · Teil 2`, points: clone(path.points.slice(index)) }];
}
export function joinRoads(first, firstEnd, second, secondEnd) {
 if (first.type !== 'line' || second.type !== 'line' || first.id === second.id || first.areaId !== second.areaId || (first.floorId ?? 'ground') !== (second.floorId ?? 'ground') ||
  ![0, first.points.length - 1].includes(firstEnd) || ![0, second.points.length - 1].includes(secondEnd)) throw Error('Zwei Endpunkte verschiedener Straßen im selben Gebiet auswählen.');
 const a = clone(firstEnd === 0 ? [...first.points].reverse() : first.points);
 const b = clone(secondEnd === 0 ? second.points : [...second.points].reverse());
 if (a.at(-1).x === b[0].x && a.at(-1).y === b[0].y) b.shift();
 return { ...clone(first), points: a.concat(b) };
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
  const paths = data.paths.filter(p => p.areaId === a.id && a.floors.some(f => f.id === p.floorId && f.visible)).map(p => {
   const shape = pathGeometry(p, width, height);
   const attrs = Object.entries(shape.attrs).map(([key, value]) => `${key}="${value}"`).join(' ');
   return `<${shape.tag} ${attrs} fill="${p.type === 'line' ? 'none' : a.color}" stroke="${a.color}" stroke-width="${p.type === 'line' ? p.width : 1}" stroke-linejoin="round" stroke-linecap="round"><title>${escape(p.name)}</title></${shape.tag}>`;
  }).join('\n');
  return `<g id="${a.id}"><title>${escape(a.name)}</title>\n${paths}\n</g>`;
 }).join('\n');
 return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">\n${groups}\n</svg>`;
}
