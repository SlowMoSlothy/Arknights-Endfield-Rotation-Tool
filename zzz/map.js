import { categories, mapPosition, filterPoints, validateImage } from './map-model.js';
import { createVectorEditor } from './vector-editor.js?v=5';
import { mapAreas, locationLabel, matchesLocation } from './point-locations.js';
const $ = id => document.getElementById(id);
const client = typeof supabaseClient !== 'undefined' ? supabaseClient : null;
const bucket = client?.storage.from('zzz-maps');
let user, admin = false, maps = [], current, points = [], editing, placing = false;
let view = { x: 0, y: 0, scale: 1 }, width = 1, height = 1, generation = 0;
const blobURLs = new Set();
const vectorEditor = createVectorEditor({ client, getUser: () => user,
 floorHasPoints: (areaId, floorId) => points.some(p => p.area_id === areaId && p.floor_id === floorId),
 geometry: () => ({ width, height, scale: view.scale }),
 locate: event => mapPosition(event.clientX, event.clientY, $('viewport').getBoundingClientRect(), view, width, height),
 onSaved: map => { maps = maps.map(item => item.id === map.id ? map : item); refreshLocationFilters(); render(); }
});
const editable = () => admin && current?.owner_id === user?.id;
const status = text => { $('status').textContent = text; };
function unwrap(result) { if (result.error) throw result.error; return result.data; }
function element(tag, text, className) {
 const node = document.createElement(tag); node.textContent = text;
 if (className) node.className = className;
 return node;
}
function setOptions(id, options, value = '') {
 $(id).replaceChildren(...options.map(([key, label]) => { const o = element('option', label); o.value = key; return o; }));
 $(id).value = options.some(([key]) => key === value) ? value : '';
}
function areaOptions(extras = []) {
 const result = mapAreas(current).map(a => [a.id, a.name]);
 for (const id of extras.filter(Boolean)) if (!result.some(([key]) => key === id)) result.push([id, 'Entferntes Gebiet']);
 return result;
}
function floorOptions(areaId, extras = []) {
 const result = (mapAreas(current).find(a => a.id === areaId)?.floors || []).map(f => [f.id, f.name]);
 for (const id of extras.filter(Boolean)) if (!result.some(([key]) => key === id)) result.push([id, 'Entfernte Etage']);
 return result;
}
function refreshFloorFilter() {
 const areaId = $('point-area-filter').value;
 setOptions('point-floor-filter', [['', 'Alle Etagen'], ...floorOptions(areaId, points.filter(p => p.area_id === areaId).map(p => p.floor_id))], $('point-floor-filter').value);
 $('point-floor-filter').disabled = !areaId || areaId === '__unassigned';
 if ($('point-floor-filter').disabled) $('point-floor-filter').value = '';
}
function refreshLocationFilters() {
 setOptions('point-area-filter', [['', 'Alle Gebiete'], ['__unassigned', 'Nicht zugeordnet'], ...areaOptions(points.map(p => p.area_id))], $('point-area-filter').value);
 refreshFloorFilter();
}
function refreshPointFloors(value = '') {
 const areaId = $('point-area').value;
 setOptions('point-floor', [['', 'Keine Etage'], ...floorOptions(areaId, areaId === editing?.area_id ? [editing.floor_id] : [])], value);
 $('point-floor').disabled = !areaId;
}
async function action(form, work) {
 const buttons = [...form.querySelectorAll('button')];
 buttons.forEach(b => b.disabled = true);
 const error = form.querySelector('.error'); if (error) error.textContent = '';
 try { await work(); } catch (e) { if (error) error.textContent = e.message; else status(e.message); }
 finally { buttons.forEach(b => b.disabled = false); }
}
async function imageURL(path) {
 const blob = unwrap(await bucket.download(path));
 const url = URL.createObjectURL(blob); blobURLs.add(url); return url;
}
function releaseImages() { blobURLs.forEach(url => URL.revokeObjectURL(url)); blobURLs.clear(); }
async function upload(file, mapId) {
 validateImage(file);
 const ext = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' }[file.type];
 const path = `${mapId}/${crypto.randomUUID()}.${ext}`;
 unwrap(await bucket.upload(path, file)); return path;
}
function transform() {
 $('world').style.transform = `translate(${view.x}px,${view.y}px) scale(${view.scale})`;
 document.querySelectorAll('.marker').forEach(n => n.style.transform = `translate(-50%,-50%) scale(${1 / view.scale})`);
 vectorEditor.transformed();
}
function fit() {
 const rect = $('viewport').getBoundingClientRect();
 view.scale = Math.min(rect.width / width, rect.height / height) * .95;
 view.x = (rect.width - width * view.scale) / 2; view.y = (rect.height - height * view.scale) / 2;
 transform();
}
function zoom(factor, x = $('viewport').clientWidth / 2, y = $('viewport').clientHeight / 2) {
 const next = Math.max(.08, Math.min(8, view.scale * factor));
 view.x = x - (x - view.x) * next / view.scale; view.y = y - (y - view.y) * next / view.scale;
 view.scale = next; transform();
}
function setPlacing(value) {
 placing = value; $('viewport').classList.toggle('placing', value);
 $('add').textContent = value ? 'Platzieren abbrechen' : '+ Punkt setzen';
 $('hint').textContent = value ? 'Klicke auf die Karte, um einen Punkt zu setzen.' : 'Punkt anklicken, um Details zu öffnen.';
}
function render() {
 $('markers').replaceChildren(); $('points').replaceChildren();
 const visible = filterPoints(points, $('search').value, $('filter').value, $('hide-completed').checked)
  .filter(p => matchesLocation(p, $('point-area-filter').value, $('point-floor-filter').value));
 $('count').textContent = `${visible.length} / ${points.length}`;
 for (const point of visible) {
  const kind = categories[point.category];
  const marker = element('button', point.completed ? '✓' : kind.symbol, `marker${point.completed ? ' done' : ''}`);
  marker.style.left = `${point.x * 100}%`; marker.style.top = `${point.y * 100}%`; marker.style.background = kind.color;
  marker.title = point.title; marker.setAttribute('aria-label', point.title);
  marker.onclick = () => openPoint(point);
  $('markers').append(marker);
  const item = element('button', `${point.completed ? '✓ ' : ''}${point.title}`);
  item.append(element('small', `${kind.label} · ${locationLabel(point, mapAreas(current))}`));
  item.onclick = () => { view.x = $('viewport').clientWidth / 2 - point.x * width * view.scale; view.y = $('viewport').clientHeight / 2 - point.y * height * view.scale; transform(); openPoint(point); };
  $('points').append(item);
 }
 if (!visible.length) $('points').append(element('p', points.length ? 'Keine passenden Orte.' : 'Noch keine eigenen Punkte.', 'muted'));
 transform();
}
async function loadMap(id) {
 const ticket = ++generation;
 vectorEditor.reset();
 current = maps.find(m => m.id === id); points = []; setPlacing(false); releaseImages();
 $('point-area-filter').value = ''; $('point-floor-filter').value = ''; refreshLocationFilters();
 $('background').removeAttribute('src'); $('markers').replaceChildren(); $('points').replaceChildren();
 $('add').hidden = $('publish').hidden = true;
 if (!current) { $('credit').textContent = ''; status(admin ? 'Lege deine erste private Karte an.' : 'Keine freigegebenen Karten verfügbar.'); return; }
 status('Karte wird geladen …');
 try {
  const selected = current;
  const [url, rows] = await Promise.all([imageURL(selected.image_path), client.from('zzz_map_points').select('*').eq('map_id', id).order('created_at').then(unwrap)]);
  if (ticket !== generation) return;
  $('background').src = url; await $('background').decode();
  if (ticket !== generation) return;
  width = $('background').naturalWidth; height = $('background').naturalHeight;
  $('world').style.width = `${width}px`; $('world').style.height = `${height}px`;
  points = rows; $('credit').textContent = selected.attribution;
  refreshLocationFilters();
  $('visibility').textContent = selected.is_public ? 'Öffentlich · Nur Besitzer kann bearbeiten' : 'Privat · Nur für dich sichtbar';
  $('publish').textContent = selected.is_public ? 'Wieder privat machen' : 'Für alle freigeben';
  $('add').hidden = $('publish').hidden = !editable();
  vectorEditor.load(selected, editable());
  fit(); render(); status(`${selected.title} · ${points.length} eigene Punkte`);
 } catch (e) { status(`Karte konnte nicht geladen werden: ${e.message}`); }
}
async function refresh(selectedId = current?.id) {
 maps = unwrap(await client.from('zzz_maps').select('*').order('created_at'));
 $('maps').replaceChildren(...maps.map(m => { const option = element('option', m.title); option.value = m.id; return option; }));
 $('workspace').hidden = !admin && !maps.length;
 $('create').hidden = !admin; $('logout').hidden = !user;
 $('maps').value = maps.some(m => m.id === selectedId) ? selectedId : maps[0]?.id || '';
 await loadMap($('maps').value);
}
async function initialize() {
 try {
  if (!client) throw new Error('Verbindung nicht verfügbar. Bitte Seite erneut laden.');
  user = unwrap(await client.auth.getUser())?.user;
 } catch { user = null; }
 try {
  admin = user ? unwrap(await client.rpc('is_app_admin')) === true : false;
  $('login').hidden = admin;
  if (!client) throw new Error('Supabase konnte nicht geladen werden.');
  await refresh();
 } catch (e) { status(`Kartenbereich noch nicht verfügbar: ${e.message}. Die Datenbank-Einrichtung steht möglicherweise noch aus.`); }
}
async function renderScreenshots() {
 const target = editing;
 $('screenshots').replaceChildren();
 for (const path of target.screenshots) {
  if (editing !== target) return;
  const row = element('div', ''); const image = document.createElement('img'); image.alt = `Screenshot zu ${target.title || 'diesem Ort'}`;
  row.append(image); $('screenshots').append(row);
  if (editable()) {
   const remove = element('button', 'Bild entfernen'); remove.type = 'button';
   remove.onclick = () => { editing.screenshots = editing.screenshots.filter(p => p !== path); row.remove(); };
   row.append(remove);
  }
  try { const url = await imageURL(path); if (editing === target) image.src = url; }
  catch { image.replaceWith(element('p', 'Screenshot konnte nicht geladen werden.')); }
 }
}
function openPoint(point) {
 editing = { ...point, screenshots: [...(point.screenshots || [])] };
 const form = $('point-form'); form.reset(); form.querySelector('.error').textContent = '';
 for (const name of ['title','category','notes']) form.elements[name].value = point[name] || (name === 'category' ? 'note' : '');
 form.elements.completed.checked = !!point.completed;
 const areaId = point.id ? point.area_id || '' : ($('point-area-filter').value === '__unassigned' ? '' : $('point-area-filter').value);
 setOptions('point-area', [['', 'Nicht zugeordnet'], ...areaOptions([point.area_id])], areaId);
 refreshPointFloors(point.id ? point.floor_id || '' : $('point-floor-filter').value);
 $('point-fields').disabled = !editable();
 $('upload-label').hidden = $('save').hidden = !editable(); $('delete').hidden = !editable() || !point.id;
 $('point-heading').textContent = editable() ? (point.id ? 'Ort bearbeiten' : 'Neuer Ort') : point.title;
 $('point-dialog').showModal(); renderScreenshots();
}
for (const [key, kind] of Object.entries(categories)) {
 for (const id of ['filter','category']) { const option = element('option', kind.label); option.value = key; $(id).append(option); }
}
document.querySelectorAll('[data-close]').forEach(b => b.onclick = () => b.closest('dialog').close());
$('login-form').onsubmit = e => { e.preventDefault(); action(e.target, async () => {
 unwrap(await client.auth.signInWithPassword({ email: $('email').value, password: $('password').value }));
 $('password').value = ''; await initialize();
 if (!admin) status('Dieses Konto hat keinen Admin-Zugriff.');
}); };
$('logout').onclick = () => action($('workspace'), async () => { if (!vectorEditor.confirmLeave()) return; unwrap(await client.auth.signOut()); location.reload(); });
client?.auth.onAuthStateChange(event => { if (event === 'SIGNED_OUT') location.reload(); });
$('create').onclick = () => { if (!vectorEditor.confirmLeave()) return; $('map-form').querySelector('.error').textContent = ''; $('new-map').showModal(); };
$('map-form').onsubmit = e => { e.preventDefault(); action(e.target, async () => {
 if (!admin) throw new Error('Admin-Zugriff erforderlich.');
 const form = e.target, file = form.elements.image.files[0]; validateImage(file);
 const title = form.elements.title.value.trim(); if (!title) throw new Error('Bitte einen Namen eingeben.');
 const id = crypto.randomUUID();
 // Create the private owner row first so storage policies can authorize this map's upload.
 unwrap(await client.from('zzz_maps').insert({ id, title, attribution: form.elements.attribution.value.trim(), image_path: `${id}/pending`, owner_id: user.id }));
 let path;
 try {
  path = await upload(file, id);
  unwrap(await client.from('zzz_maps').update({ image_path: path }).eq('id', id).select().single());
 } catch (error) {
  if (path) await bucket.remove([path]);
  await client.from('zzz_maps').delete().eq('id', id); throw error;
 }
 $('new-map').close(); await refresh(id);
}); };
$('point-form').onsubmit = e => { e.preventDefault(); action(e.target, async () => {
 if (!editable()) throw new Error('Bearbeitung nicht erlaubt.');
 const form = e.target, title = form.elements.title.value.trim();
 if (!title) throw new Error('Bitte einen Titel eingeben.');
 const files = [...$('uploads').files]; files.forEach(validateImage);
 const uploaded = [], old = points.find(p => p.id === editing.id);
 let saved;
 try {
  for (const file of files) uploaded.push(await upload(file, current.id));
  const row = { map_id: current.id, title, category: form.elements.category.value, notes: form.elements.notes.value,
   completed: form.elements.completed.checked, x: editing.x, y: editing.y, screenshots: [...editing.screenshots, ...uploaded] };
  // Keep ordinary unassigned points compatible before the optional migration.
  if (form.elements.area_id.value || old && Object.hasOwn(old, 'area_id')) {
   row.area_id = form.elements.area_id.value || null;
   row.floor_id = row.area_id ? form.elements.floor_id.value || null : null;
  }
  saved = unwrap(await (editing.id ? client.from('zzz_map_points').update(row).eq('id', editing.id) : client.from('zzz_map_points').insert(row)).select().single());
 } catch (error) {
  if (uploaded.length) await bucket.remove(uploaded);
  if (/area_id|floor_id/.test(error.message || '')) throw Error('Bitte zuerst zzz_point_locations.sql in Supabase ausführen. Deine Eingaben bleiben geöffnet.');
  throw error;
 }
 points = old ? points.map(p => p.id === saved.id ? saved : p) : [...points, saved];
 $('point-dialog').close(); refreshLocationFilters(); render(); status('Punkt gespeichert.');
 const removed = old?.screenshots.filter(p => !saved.screenshots.includes(p)) || [];
 if (removed.length) { const result = await bucket.remove(removed); if (result.error) status('Punkt gespeichert. Entfernte Bilddateien konnten noch nicht bereinigt werden.'); }
}); };
$('delete').onclick = () => action($('point-form'), async () => {
 if (!editable() || !editing.id || !confirm('Diesen Punkt mit seinen Screenshots löschen?')) return;
 const old = points.find(p => p.id === editing.id);
 unwrap(await client.from('zzz_map_points').delete().eq('id', editing.id).select().single());
 points = points.filter(p => p.id !== editing.id); $('point-dialog').close(); render(); status('Punkt gelöscht.');
 if (old.screenshots.length) { const result = await bucket.remove(old.screenshots); if (result.error) status('Punkt gelöscht. Bilddateien konnten noch nicht bereinigt werden.'); }
});
$('publish').onclick = () => action($('workspace'), async () => {
 if (!editable()) return;
 if (!vectorEditor.confirmLeave()) return;
 if (!current.is_public && !confirm('Diese Karte einschließlich aller Notizen und Screenshots für alle Besucher freigeben?')) return;
 unwrap(await client.from('zzz_maps').update({ is_public: !current.is_public }).eq('id', current.id).select().single()); await refresh();
});
$('maps').onchange = () => { if (vectorEditor.confirmLeave()) loadMap($('maps').value); else $('maps').value = current?.id || ''; };
for (const id of ['search','filter','hide-completed']) $(id).addEventListener('input', render);
 $('point-area-filter').onchange = () => { $('point-floor-filter').value = ''; refreshFloorFilter(); render(); };
 $('point-floor-filter').onchange = render;
 $('point-area').onchange = () => refreshPointFloors();
$('add').onclick = () => { vectorEditor.close(); setPlacing(!placing); };
$('toggle-editor').addEventListener('click', () => setPlacing(false));
$('fit').onclick = fit; $('zoom-in').onclick = () => zoom(1.25); $('zoom-out').onclick = () => zoom(.8);
const viewport = $('viewport'); let drag;
viewport.addEventListener('wheel', e => { e.preventDefault(); const rect = viewport.getBoundingClientRect(); zoom(Math.exp(-e.deltaY * .001), e.clientX - rect.left, e.clientY - rect.top); }, { passive: false });
viewport.onpointerdown = e => {
 if (e.target.closest('button') || e.button !== 0) return;
 // Keep native selection/focus scrolling from competing with map dragging.
 e.preventDefault();
 viewport.focus({ preventScroll: true });
 drag = { id: e.pointerId, x: e.clientX, y: e.clientY, vx: view.x, vy: view.y, moved: false };
 viewport.setPointerCapture(e.pointerId);
};
viewport.onpointermove = e => {
 if (!drag || drag.id !== e.pointerId) return;
 const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
 if (Math.hypot(dx, dy) > 5) drag.moved = true;
 if (drag.moved) { view.x = drag.vx + dx; view.y = drag.vy + dy; transform(); }
};
viewport.onpointerup = e => {
 if (!drag || drag.id !== e.pointerId) return;
 if (!drag.moved && placing && editable()) {
  const position = mapPosition(e.clientX, e.clientY, viewport.getBoundingClientRect(), view, width, height);
  if (position) { setPlacing(false); openPoint({ ...position, category: 'note', screenshots: [] }); }
 }
 drag = null;
};
viewport.onpointercancel = viewport.onlostpointercapture = () => { drag = null; };
viewport.onkeydown = e => {
 if (e.target !== viewport) return;
 if (e.key === '+' || e.key === '=') zoom(1.25); else if (e.key === '-') zoom(.8);
 else if (e.key === 'Escape') setPlacing(false);
 else if (e.key.startsWith('Arrow')) { view.x += ({ ArrowLeft: 40, ArrowRight: -40 }[e.key] || 0); view.y += ({ ArrowUp: 40, ArrowDown: -40 }[e.key] || 0); transform(); }
 else return; e.preventDefault();
};
let viewportSize = { width: viewport.clientWidth, height: viewport.clientHeight };
new ResizeObserver(() => {
 const next = { width: viewport.clientWidth, height: viewport.clientHeight };
 if (current && viewportSize.width && viewportSize.height && next.width && next.height) {
  // Retain zoom and the point at the center when the sidebar/browser changes size.
  view.x += (next.width - viewportSize.width) / 2;
  view.y += (next.height - viewportSize.height) / 2;
  transform();
 }
 viewportSize = next;
}).observe(viewport);
initialize();
