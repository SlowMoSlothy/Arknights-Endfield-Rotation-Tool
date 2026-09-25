import { emptyDrawing, validateDrawing, DrawingHistory, nearestPathSegment, pathGeometry, splitRoad, joinRoads, snapPoint, exportDrawingSVG } from './vector-model.js?v=3';
const $ = id => document.getElementById(id);
const copy = value => JSON.parse(JSON.stringify(value));
const make = (tag, text, className) => { const n = document.createElement(tag); n.textContent = text; if (className) n.className = className; return n; };
const svg = (tag, attrs) => { const n = document.createElementNS('http://www.w3.org/2000/svg', tag); for (const [k,v] of Object.entries(attrs)) n.setAttribute(k, v); return n; };
const uuid = () => crypto.randomUUID();

export function createVectorEditor({ client, getUser, geometry, locate, onSaved, floorHasPoints = () => false }) {
 const history = new DrawingHistory();
 let map = null, canEdit = false, active = false, mode = 'pan', areaId = null, pathId = null, vertex = null;
 let draft = [], pointer = null, preview = null, saved = '', revision = 0, saving = false, ready = false, failed = false, pendingDraft = null;
 const collapsed = new Set();
 let lastClick = null;
 let extending = null;
 let draftMode = null;
 const activeFloors = new Map();
 const drawing = () => history.value;
 const area = () => drawing().areas.find(a => a.id === areaId);
 const path = () => drawing().paths.find(p => p.id === pathId);
 const writable = () => canEdit && ready && !failed;
 const floor = () => area()?.floors.find(f => f.id === activeFloors.get(areaId)) || area()?.floors[0];
 const unlocked = () => writable() && area()?.visible && !area()?.locked && floor()?.visible;
 const floorOptions = (select, floors, selected) => {
  select.replaceChildren(...floors.map(f => { const option = make('option', f.name + (f.visible ? '' : ' (ausgeblendet)')); option.value = f.id; return option; }));
  select.value = selected;
 };
 const dirty = () => JSON.stringify(drawing()) !== saved;
 const storageKey = () => `rotationforge:zzz-vector:${getUser()?.id}:${map?.id}`;
 function message(text, error = false) { $('vector-status').textContent = text; $('vector-status').dataset.error = String(error); }
 function remember() {
  if (!canEdit || !map) return;
  try {
   if (dirty()) localStorage.setItem(storageKey(), JSON.stringify({ revision, drawing: drawing() }));
   else localStorage.removeItem(storageKey());
   message(dirty() ? 'Entwurf lokal gesichert · noch nicht in der Cloud.' : 'Keine ungespeicherten Änderungen.');
  } catch { message('Lokaler Speicher nicht verfügbar. Bitte speichern oder den Entwurf exportieren.', true); }
 }
 function commit(next) {
  try { const clean = validateDrawing(next); if (history.commit(clean)) remember(); render(); }
  catch (e) { preview = null; message(e.message, true); render(); }
 }
 function mutate(fn) { if (!writable()) return; const next = copy(drawing()); fn(next); commit(next); }
 function download(name, body, type) {
  const url = URL.createObjectURL(new Blob([body], { type })); const link = document.createElement('a');
  link.href = url; link.download = name; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
 }
 function cancel() { draft = []; draftMode = null; extending = null; preview = null; pointer = null; render(); }
 function setMode(value) {
  // The hand pauses drawing. Only an explicit cancel discards its vertices.
  if (draft.length && value !== 'pan' && value !== draftMode) {
   if (!finish()) { message('Bitte die begonnene Zeichnung zuerst abschließen oder ausdrücklich abbrechen.', true); return false; }
  }
  preview = null; pointer = null; lastClick = null; mode = value; vertex = null; render(); return true;
 }
 function toggle(value = !active) {
  if (!canEdit || !ready || failed) value = false;
  active = value; setMode('pan');
  $('drawing-editor').hidden = $('vector-tools').hidden = !active;
  $('places-panel').hidden = active;
  $('toggle-editor').textContent = active ? '← Fundstellen anzeigen' : 'Karte zeichnen';
  document.querySelector('.layout').classList.toggle('editing-vectors', active);
  render();
 }
 function renderTools() {
  $('vector-save').disabled = !writable() || saving || (!dirty() && !draft.length);
  document.querySelector('.layout').dataset.tool = mode;
  document.querySelectorAll('[data-tool]').forEach(b => {
   b.setAttribute('aria-pressed', String(b.dataset.tool === mode));
   b.disabled = ['line','polygon'].includes(b.dataset.tool) && !unlocked();
  });
  $('draw-finish').disabled = draft.length < (extending ? extending.points.length + 1 : draftMode === 'polygon' ? 3 : 2);
  $('draw-cancel').disabled = !draft.length;
  $('draw-help').textContent = mode === 'pan' ? (draft.length ? `Zeichnung pausiert (${draft.length} Punkte). ${draftMode === 'polygon' ? 'Fläche' : 'Linie'} zum Weiterzeichnen wählen oder Abschließen drücken.` : 'Ziehen zum Verschieben · Scrollen zum Zoomen.')
   : mode === 'select' ? 'Pfad auswählen · Eckpunkte ziehen · Doppelklick auf eine Kante fügt einen Punkt ein.'
   : `${mode === 'line' ? 'Straße' : 'Fläche'}: klicken setzt Eckpunkte · Enter oder Doppelklick schließt ab · Escape bricht ab (${draft.length} Punkte).`;
 }
 function renderCanvas() {
  const root = $('vector-layer'), { width, height, scale } = geometry();
  root.replaceChildren(); root.setAttribute('viewBox', `0 0 ${width} ${height}`);
  const data = preview || drawing();
  const handles = svg('g', {});
  // View-only users see the saved presentation but can never select or edit geometry.
  $('background').style.opacity = data.background.visible ? String(data.background.opacity) : '0';
  for (const a of data.areas.filter(a => a.visible)) {
   const group = svg('g', { 'data-area-id': a.id });
   const title = svg('title', {}); title.textContent = a.name; group.append(title);
   for (const p of data.paths.filter(p => p.areaId === a.id && a.floors.some(f => f.id === p.floorId && f.visible))) {
    if (extending?.id === p.id) continue;
    const shape = pathGeometry(p, width, height);
    const node = svg(shape.tag, { ...shape.attrs,
     fill: p.type === 'polygon' ? a.color : 'none', stroke: a.color,
     'stroke-width': p.type === 'line' ? p.width : 1, 'stroke-linejoin': 'round', 'stroke-linecap': 'round',
     'data-path-id': p.id, class: 'vector-shape' });
    const title = svg('title', {}); title.textContent = p.name; node.append(title); group.append(node);
    if (active && p.id === pathId && mode === 'select') {
     group.append(svg(shape.tag, { ...shape.attrs, fill: 'none', stroke: '#fc6f02', 'stroke-width': 2 / scale, 'stroke-dasharray': `${5 / scale} ${4 / scale}`, 'pointer-events': 'none' }));
     if (!a.locked) p.points.forEach((pt, index) => handles.append(svg('circle', { cx: pt.x * width, cy: pt.y * height,
      r: (index === vertex ? 6 : 5) / scale, fill: index === vertex ? '#fc6f02' : '#fff', stroke: '#181d1f',
      'stroke-width': 1.5 / scale, class: 'vector-handle', 'data-vertex': index, 'data-path-id': p.id })));
    }
   }
   root.append(group);
  }
  root.append(handles);
  if (active && draft.length) {
   const shape = pathGeometry({ type: 'line', smooth: extending?.smooth, points: draft }, width, height);
   root.append(svg(shape.tag, { ...shape.attrs, fill: 'none', stroke: '#fc6f02', 'stroke-width': 2 / scale, 'stroke-dasharray': `${6 / scale} ${3 / scale}` }));
   for (const p of draft) root.append(svg('circle', { cx: p.x * width, cy: p.y * height, r: 4 / scale, fill: '#fc6f02' }));
  }
 }
 function render() {
  if (pathId && !path()) { pathId = null; vertex = null; }
  if (path()) { areaId = path().areaId; activeFloors.set(areaId, path().floorId); }
  if (areaId && !area()) areaId = null;
  if (!areaId) areaId = drawing().areas[0]?.id || null;
  const a = area(), p = path();
  $('vector-save').disabled = !writable() || saving || !dirty();
  $('vector-save').textContent = saving ? 'Speichert …' : 'Speichern';
  $('vector-undo').disabled = !history.past.length || !writable(); $('vector-redo').disabled = !history.future.length || !writable();
  $('draft-restore').hidden = !pendingDraft;
  const tree = $('area-tree'); tree.replaceChildren();
  for (const folder of drawing().areas) {
   const box = make('div', '', `area-folder${folder.id === areaId ? ' active' : ''}`), row = make('div', '', 'area-row');
   const expand = make('button', collapsed.has(folder.id) ? '▸' : '▾'); expand.setAttribute('aria-label', `${folder.name} ${collapsed.has(folder.id) ? 'aufklappen' : 'zuklappen'}`);
   expand.setAttribute('aria-expanded', String(!collapsed.has(folder.id)));
   expand.onclick = () => { collapsed.has(folder.id) ? collapsed.delete(folder.id) : collapsed.add(folder.id); render(); };
   const title = make('button', `▰ ${folder.name}`, 'area-title'); title.style.color = folder.color;
   title.onclick = () => { cancel(); areaId = folder.id; pathId = null; vertex = null; render(); };
   const visibility = make('button', folder.visible ? '◉' : '○', 'area-toggle'); visibility.setAttribute('aria-label', `${folder.name} ${folder.visible ? 'ausblenden' : 'einblenden'}`);
   visibility.onclick = () => { cancel(); mutate(d => { d.areas.find(a => a.id === folder.id).visible = !folder.visible; }); };
   const lock = make('button', folder.locked ? '🔒' : '🔓', 'area-toggle'); lock.setAttribute('aria-label', `${folder.name} ${folder.locked ? 'entsperren' : 'sperren'}`);
   lock.onclick = () => { cancel(); mutate(d => { d.areas.find(a => a.id === folder.id).locked = !folder.locked; }); };
   row.append(expand, title, visibility, lock); box.append(row);
   if (!collapsed.has(folder.id)) {
    const list = make('div', '', 'area-paths');
    for (const child of drawing().paths.filter(p => p.areaId === folder.id)) {
     const level = folder.floors.find(f => f.id === child.floorId);
     const button = make('button', `${child.type === 'line' ? '╱' : '▱'} ${child.name} · ${level.name}`, child.id === pathId ? 'selected' : '');
     button.onclick = () => { if (!setMode('select')) return; areaId = folder.id; activeFloors.set(areaId, child.floorId); pathId = child.id; vertex = null; render(); };
     list.append(button);
    }
    if (!list.children.length) list.append(make('p', 'Noch keine Pfade.', 'muted'));
    box.append(list);
   }
   tree.append(box);
  }
  if (!drawing().areas.length) tree.append(make('p', 'Lege ein Gebiet an, z. B. Windworn Highway. Zeichne anschließend darin deine Wege.', 'muted'));
  $('area-settings').hidden = !a;
  if (a) { $('area-name').value = a.name; $('area-color').value = a.color; $('area-name').disabled = $('area-color').disabled = $('area-delete').disabled = a.locked; }
  if (a) {
   $('floor-settings').disabled = a.locked || !!extending;
   floorOptions($('floor-select'), a.floors, floor().id);
   $('floor-name').value = floor().name; $('floor-visible').checked = floor().visible;
   $('floor-add').disabled = a.floors.length >= 30;
   $('floor-delete').disabled = a.floors.length <= 1 || floorHasPoints(a.id, floor().id) || drawing().paths.some(p => p.areaId === a.id && p.floorId === floor().id);
  }
  $('path-settings').hidden = !p; $('path-settings').disabled = !unlocked() || !!extending;
  if (p) {
   $('path-name').value = p.name; $('path-width').value = p.width;
   $('path-width-label').hidden = p.type !== 'line';
   $('path-area').replaceChildren(...drawing().areas.map(a => { const option = make('option', a.name); option.value = a.id; option.disabled = a.locked; return option; }));
   $('path-area').value = p.areaId;
   floorOptions($('path-floor'), a.floors, p.floorId);
   $('vertex-delete').disabled = vertex === null || p.points.length <= (p.type === 'polygon' ? 3 : 2);
   $('road-settings').hidden = p.type !== 'line';
   $('path-smooth').checked = !!p.smooth;
   const endpoint = vertex === 0 || vertex === p.points.length - 1;
   $('path-extend').disabled = !endpoint;
   $('path-split').disabled = vertex === null || endpoint;
   $('road-help').textContent = vertex === null ? 'Endpunkt auswählen zum Verlängern oder Verbinden. Inneren Eckpunkt auswählen zum Teilen.'
    : `Ausgewählt: ${endpoint ? (vertex === 0 ? 'Anfang' : 'Ende') : `Eckpunkt ${vertex + 1}`}.`;
   const select = $('path-join-target'), oldTarget = select.value;
   const choices = drawing().paths.filter(other => other.id !== p.id && other.areaId === p.areaId && other.floorId === p.floorId && other.type === 'line')
    .flatMap(other => [0, other.points.length - 1].map(index => {
     const option = make('option', `${other.name} · ${index === 0 ? 'Anfang' : 'Ende'}`);
     option.value = `${other.id}:${index}`; return option;
    }));
   select.replaceChildren(...choices);
   if (choices.some(o => o.value === oldTarget)) select.value = oldTarget;
   select.disabled = !endpoint || !choices.length;
   $('path-join').disabled = !endpoint || !choices.length;
  }
  $('background-visible').checked = drawing().background.visible; $('background-opacity').value = Math.round(drawing().background.opacity * 100);
  renderTools(); renderCanvas();
 }
 function finish() {
  if (!unlocked() || draft.length < (extending ? extending.points.length + 1 : draftMode === 'polygon' ? 3 : 2)) return false;
  if (extending) {
   const id = extending.id, points = copy(draft);
   draft = []; draftMode = null; extending = null; mode = 'select'; vertex = points.length - 1;
   mutate(d => { d.paths.find(p => p.id === id).points = points; }); return true;
  }
  const p = { id: uuid(), areaId, floorId: floor().id, name: `${draftMode === 'line' ? 'Straße' : 'Fläche'} ${drawing().paths.length + 1}`, type: draftMode, width: 10, points: copy(draft) };
  draft = []; draftMode = null; pathId = p.id; mode = 'select'; mutate(d => d.paths.push(p)); return true;
 }
 function removeVertex() {
  const p = path(); if (!unlocked() || !p || vertex === null || p.points.length <= (p.type === 'polygon' ? 3 : 2)) return;
  const index = vertex; vertex = null; mutate(d => d.paths.find(p => p.id === pathId).points.splice(index, 1));
 }
 function snap(point, exclude) {
  if (!$('vector-snap').checked) return point;
  const { width, height, scale } = geometry();
  return snapPoint(point, drawing().paths.filter(p => p.areaId === areaId && p.floorId === floor()?.id), width, height, 8 / scale, exclude);
 }
 async function save() {
  if (draft.length && !finish()) { message('Zum Speichern die begonnene Fläche mit mindestens drei Punkten bzw. Linie mit mindestens zwei Punkten vervollständigen.', true); return; }
  if (!writable() || saving || !dirty()) return;
  const target = map, content = copy(drawing()), startRevision = revision; saving = true; render();
  try {
   const result = await client.from('zzz_maps').update({ vector_data: content, vector_revision: startRevision + 1 })
    .eq('id', target.id).eq('vector_revision', startRevision).select('id,vector_revision').maybeSingle();
   if (result.error) throw result.error;
   if (!result.data) throw Error('Diese Karte wurde inzwischen in einem anderen Fenster geändert. Exportiere deinen Entwurf, lade die Karte neu und gleiche die Versionen ab.');
   if (map !== target) return;
   revision = result.data.vector_revision; saved = JSON.stringify(content); target.vector_data = content; target.vector_revision = revision;
   onSaved(target); remember(); if (!dirty()) message('In der Cloud gespeichert.');
  } catch (e) {
   const missing = /vector_data|vector_revision|schema cache/i.test(e.message || '');
   message(missing ? 'Cloud-Einrichtung fehlt noch. Bitte zzz_map_vectors.sql ausführen. Dein lokaler Entwurf bleibt erhalten.' : `Speichern fehlgeschlagen: ${e.message}`, true);
  } finally { saving = false; render(); }
 }
 const viewport = $('viewport');
 viewport.addEventListener('pointerdown', e => {
  if (!active || mode === 'pan' || e.button !== 0 || e.target.closest('button')) return;
  const point = locate(e); if (!point) return;
  e.stopImmediatePropagation(); e.preventDefault(); viewport.focus({ preventScroll: true });
  const handle = e.target.closest('[data-vertex]'), shape = e.target.closest('[data-path-id]');
  if (mode === 'select') {
   if (shape) { pathId = shape.dataset.pathId; areaId = path().areaId; activeFloors.set(areaId, path().floorId); vertex = handle ? Number(handle.dataset.vertex) : null; }
   else { pathId = null; vertex = null; }
  }
  pointer = { id: e.pointerId, x: e.clientX, y: e.clientY, vertex: handle && unlocked() ? vertex : null };
  viewport.setPointerCapture(e.pointerId); render();
 }, true);
 viewport.addEventListener('pointermove', e => {
  if (!pointer || pointer.id !== e.pointerId || pointer.vertex === null) return;
  e.stopImmediatePropagation(); const point = locate(e); if (!point || !unlocked()) return;
  preview = copy(drawing()); preview.paths.find(p => p.id === pathId).points[pointer.vertex] = snap(point, { id: pathId, index: pointer.vertex }); renderCanvas();
 }, true);
 viewport.addEventListener('pointerup', e => {
  if (!pointer || pointer.id !== e.pointerId) return;
  e.stopImmediatePropagation();
  const p = pointer; pointer = null;
  const clicked = Math.hypot(e.clientX - p.x, e.clientY - p.y) < 5;
  const doubleClick = clicked && lastClick && e.timeStamp - lastClick.time < 400 && Math.hypot(e.clientX - lastClick.x, e.clientY - lastClick.y) < 5;
  lastClick = clicked && !doubleClick ? { time: e.timeStamp, x: e.clientX, y: e.clientY } : null;
  if (preview) { const next = preview; preview = null; commit(next); }
  else if (['line','polygon'].includes(mode) && unlocked() && Math.hypot(e.clientX - p.x, e.clientY - p.y) < 5) {
   const point = locate(e);
   if (point) {
    const next = snap(point), last = draft.at(-1), { width, height, scale } = geometry();
    if (!last || Math.hypot((next.x - last.x) * width, (next.y - last.y) * height) * scale > 3) { draftMode = mode; draft.push(next); }
    renderCanvas(); renderTools();
   }
  }
  if (doubleClick && p.vertex === null) completeDoubleClick(e);
 }, true);
 viewport.addEventListener('pointercancel', () => { pointer = null; preview = null; renderCanvas(); }, true);
 viewport.addEventListener('dblclick', e => {
  if (!active || mode === 'pan') return;
  e.preventDefault(); e.stopPropagation();
 });
 // SVG nodes are rebuilt after selection; native dblclick can lose its target.
 function completeDoubleClick(e) {
  if (['line','polygon'].includes(mode)) return finish();
  const point = locate(e), p = path();
  if (!point || !p || !unlocked() || e.target.closest('[data-vertex]')) return;
  const { width, height, scale } = geometry(); const edge = nearestPathSegment(p, point, width, height);
  if (edge && edge.distance * scale < 16) { vertex = edge.index; mutate(d => d.paths.find(p => p.id === pathId).points.splice(edge.index, 0, edge.position)); }
 }
 document.addEventListener('keydown', e => {
  if (!active || !canEdit || e.target.closest('input,textarea,select,dialog') || document.querySelector('dialog[open]')) return;
  const ctrl = e.ctrlKey || e.metaKey;
  if (ctrl && e.key.toLowerCase() === 's') { e.preventDefault(); save(); }
  else if (ctrl && ['z','y'].includes(e.key.toLowerCase())) {
   e.preventDefault(); cancel(); const redo = e.shiftKey || e.key.toLowerCase() === 'y';
   if (redo ? history.redo() : history.undo()) remember(); render();
  } else if (e.key === 'Escape') { e.preventDefault(); cancel(); }
  else if (e.key === 'Enter' && e.target === viewport) { e.preventDefault(); finish(); }
  else if (e.key === 'Delete' && e.target === viewport) { e.preventDefault(); removeVertex(); }
 });
 $('toggle-editor').onclick = () => toggle();
 document.querySelectorAll('[data-tool]').forEach(b => b.onclick = () => setMode(b.dataset.tool));
 $('draw-finish').onclick = finish; $('draw-cancel').onclick = cancel;
 $('area-add').onclick = () => {
  cancel(); areaId = uuid(); pathId = null;
  mutate(d => d.areas.push({ id: areaId, name: `Gebiet ${d.areas.length + 1}`, color: '#f5f5f0', visible: true, locked: false }));
  $('area-name').focus(); $('area-name').select();
 };
 $('area-name').onchange = e => { if (area() && !area().locked) mutate(d => { d.areas.find(a => a.id === areaId).name = e.target.value; }); };
 $('area-color').onchange = e => { if (area() && !area().locked) mutate(d => { d.areas.find(a => a.id === areaId).color = e.target.value; }); };
 $('area-delete').onclick = () => {
  if (!area() || area().locked || !confirm('Gebiet mit allen enthaltenen Pfaden löschen? Du kannst dies rückgängig machen.')) return;
  cancel(); const id = areaId; mutate(d => { d.areas = d.areas.filter(a => a.id !== id); d.paths = d.paths.filter(p => p.areaId !== id); });
 };
 $('path-name').onchange = e => { if (unlocked() && path()) mutate(d => { d.paths.find(p => p.id === pathId).name = e.target.value; }); };
 $('path-width').onchange = e => { if (unlocked() && path()) mutate(d => { d.paths.find(p => p.id === pathId).width = Number(e.target.value); }); };
 $('path-smooth').onchange = e => { if (unlocked() && path()?.type === 'line') mutate(d => { d.paths.find(p => p.id === pathId).smooth = e.target.checked; }); };
 $('path-split').onclick = () => {
  if (!unlocked() || path()?.type !== 'line' || vertex === null || vertex <= 0 || vertex >= path().points.length - 1) return;
  const parts = splitRoad(path(), vertex, uuid()); vertex = null;
  mutate(d => { const index = d.paths.findIndex(p => p.id === pathId); d.paths.splice(index, 1, ...parts); });
 };
 $('path-join').onclick = () => {
  const p = path(), [id, endpoint] = $('path-join-target').value.split(':');
  const other = drawing().paths.find(p => p.id === id);
  if (!unlocked() || !p || !other || ![0, p.points.length - 1].includes(vertex)) return;
  const joined = joinRoads(p, vertex, other, Number(endpoint)); vertex = null;
  mutate(d => { d.paths = d.paths.filter(p => p.id !== other.id).map(p => p.id === joined.id ? joined : p); });
 };
 $('path-extend').onclick = () => {
  const p = path(); if (!unlocked() || p?.type !== 'line' || ![0, p.points.length - 1].includes(vertex)) return;
  const start = vertex === 0; if (!setMode('line')) return; extending = copy(p);
  draftMode = 'line'; draft = copy(start ? [...p.points].reverse() : p.points); render();
 };
 // Also commit on blur for input methods that update the value without a change event.
 for (const id of ['area-name', 'path-name', 'path-width']) $(id).onblur = $(id).onchange;
 $('path-area').onchange = e => {
  const target = drawing().areas.find(a => a.id === e.target.value);
  if (!unlocked() || !target || target.locked || !path()) return;
  areaId = target.id; mutate(d => { const p = d.paths.find(p => p.id === pathId); p.areaId = target.id; p.floorId = floor().id; });
 };
 $('floor-select').onchange = e => { const id = e.target.value; cancel(); activeFloors.set(areaId, id); pathId = null; vertex = null; render(); };
 $('floor-name').onchange = e => { if (area() && !area().locked) { const name = e.target.value, id = floor().id; mutate(d => { d.areas.find(a => a.id === areaId).floors.find(f => f.id === id).name = name; }); } };
 $('floor-name').onblur = $('floor-name').onchange;
 $('floor-visible').onchange = e => { if (!area() || area().locked) return; const visible = e.target.checked, id = floor().id; cancel(); mutate(d => { d.areas.find(a => a.id === areaId).floors.find(f => f.id === id).visible = visible; }); };
 $('floor-add').onclick = () => {
  if (!area() || area().locked || area().floors.length >= 30) return;
  cancel(); const id = uuid(); activeFloors.set(areaId, id); pathId = null; vertex = null;
  mutate(d => { const a = d.areas.find(a => a.id === areaId); a.floors.push({ id, name: `Etage ${a.floors.length + 1}`, visible: true }); });
 };
 $('floor-delete').onclick = () => {
  if (!area() || area().locked || area().floors.length <= 1) return;
  const id = floor().id;
  if (floorHasPoints(areaId, id) || drawing().paths.some(p => p.areaId === areaId && p.floorId === id)) return;
  cancel(); mutate(d => { const a = d.areas.find(a => a.id === areaId); a.floors = a.floors.filter(f => f.id !== id); });
 };
 $('path-floor').onchange = e => {
  if (!unlocked() || !path()) return; const id = e.target.value;
  cancel(); activeFloors.set(areaId, id); mutate(d => { d.paths.find(p => p.id === pathId).floorId = id; });
 };
 $('path-delete').onclick = () => { if (unlocked() && path()) mutate(d => { d.paths = d.paths.filter(p => p.id !== pathId); }); };
 $('vertex-delete').onclick = removeVertex;
 $('background-visible').onchange = e => mutate(d => { d.background.visible = e.target.checked; });
 $('background-opacity').oninput = e => { $('background').style.opacity = drawing().background.visible ? e.target.value / 100 : '0'; };
 $('background-opacity').onchange = e => mutate(d => { d.background.opacity = Number(e.target.value) / 100; });
 $('vector-undo').onclick = () => { cancel(); if (history.undo()) remember(); render(); };
 $('vector-redo').onclick = () => { cancel(); if (history.redo()) remember(); render(); };
 $('vector-save').onclick = save;
 $('vector-svg').onclick = () => { const { width, height } = geometry(); download('rotationforge-map.svg', exportDrawingSVG(drawing(), width, height), 'image/svg+xml'); };
 $('vector-json').onclick = () => download('rotationforge-map-draft.json', JSON.stringify(drawing(), null, 2), 'application/json');
 $('vector-import').onchange = async e => {
  const file = e.target.files[0]; e.target.value = ''; if (!file || !writable()) return;
  try {
   if (file.size > 2000000) throw Error('Die Entwurfsdatei darf maximal 2 MB groß sein.');
   const data = validateDrawing(JSON.parse(await file.text()));
   if (!confirm('Aktuelle Zeichnung durch diesen Entwurf ersetzen? Rückgängig bleibt möglich.')) return;
   cancel(); commit(data); areaId = null; pathId = null; render();
  } catch (e) { message(`Import fehlgeschlagen: ${e.message}`, true); }
 };
 $('draft-restore').onclick = () => {
  if (!pendingDraft || !writable()) return;
  if (pendingDraft.revision !== revision && !confirm('Der lokale Entwurf basiert auf einem älteren Cloud-Stand. Trotzdem als neue Bearbeitung laden?')) return;
  const data = pendingDraft.drawing; pendingDraft = null; cancel(); commit(data);
 };
 window.addEventListener('beforeunload', e => { if (canEdit && (dirty() || draft.length || saving)) { e.preventDefault(); e.returnValue = ''; } });
 return {
  reset() {
   draft = []; draftMode = null; extending = null;
   ready = false; active = false; toggle(false); map = null; canEdit = false; pendingDraft = null;
   history.reset(emptyDrawing()); saved = JSON.stringify(drawing()); areaId = pathId = vertex = null;
   $('toggle-editor').hidden = true; render();
  },
  load(target, owner) {
   map = target; canEdit = owner; revision = target.vector_revision ?? 0; failed = false; pendingDraft = null;
   try { history.reset(target.vector_data ? validateDrawing(target.vector_data) : emptyDrawing()); }
   catch { failed = true; history.reset(emptyDrawing()); }
   saved = JSON.stringify(drawing()); ready = true; areaId = pathId = vertex = null;
   $('toggle-editor').hidden = !owner || failed;
   if (owner && !failed) {
    try {
     const raw = localStorage.getItem(storageKey());
     if (raw) { const local = JSON.parse(raw); const data = validateDrawing(local.drawing); if (JSON.stringify(data) !== saved) pendingDraft = { revision: local.revision, drawing: data }; }
    } catch { message('Lokaler Entwurf konnte nicht gelesen werden.', true); }
   }
   toggle(false); render();
   if (failed) message('Die gespeicherte Zeichnung ist ungültig. Bearbeitung wurde zum Schutz deiner Daten gesperrt.', true);
   else if (pendingDraft) message('Ein lokaler Entwurf ist verfügbar. Öffne den Zeicheneditor, um ihn wiederherzustellen.');
   else message(target.vector_revision === undefined ? 'Du kannst zeichnen. Cloud-Speicherung benötigt noch zzz_map_vectors.sql.' : 'Zeichnung geladen.');
  },
  transformed: renderCanvas,
  confirmLeave() { return !saving && (!(dirty() || draft.length) || confirm('Karte verlassen? Gesicherte lokale Entwürfe bleiben erhalten; eine gerade begonnene Linie wird verworfen.')); },
  close: () => toggle(false)
 };
}
