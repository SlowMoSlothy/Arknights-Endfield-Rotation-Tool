import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyDrawing, validateDrawing, DrawingHistory, nearestSegment, snapPoint, exportDrawingSVG, pathGeometry, curveSegments, nearestPathSegment, splitRoad, joinRoads } from '../zzz/vector-model.js';

function fixture() {
 const data = emptyDrawing();
 data.areas.push({ id: 'area1', name: 'Highway <West>', color: '#eebb88', visible: true, locked: false });
 data.paths.push({ id: 'road1', areaId: 'area1', name: 'Straße & Weg', type: 'line', width: 12, points: [{ x: .1, y: .2 }, { x: .8, y: .2 }] });
 return data;
}
test('drawing import rejects invalid geometry, references and unsafe style values', () => {
 const changes = [
  d => d.paths[0].points[0].x = Infinity,
  d => d.paths[0].points[0].x = -1,
  d => d.paths[0].areaId = 'missing',
  d => d.paths[0].id = 'area1',
  d => d.paths[0].type = 'script',
  d => d.paths[0].type = 'polygon',
  d => d.paths[0].width = 0,
  d => d.areas[0].color = 'url(https://example.org)',
  d => d.background.opacity = 2
 ];
 for (const change of changes) { const data = fixture(); change(data); assert.throws(() => validateDrawing(data)); }
 const valid = fixture(); const clean = validateDrawing(valid); clean.paths[0].points[0].x = .9;
 assert.equal(valid.paths[0].points[0].x, .1);
});
test('history restores whole area/path edits without aliases and invalidates abandoned redo', () => {
 const original = fixture(), history = new DrawingHistory(original);
 const changed = fixture(); changed.areas[0].locked = true;
 history.commit(changed); changed.areas[0].name = 'external mutation';
 assert.equal(history.value.areas[0].name, original.areas[0].name);
 assert.equal(history.undo(), true); assert.equal(history.value.areas[0].locked, false);
 assert.equal(history.redo(), true); assert.equal(history.value.areas[0].locked, true);
 history.undo(); const other = fixture(); other.paths = []; history.commit(other);
 assert.equal(history.redo(), false); assert.equal(history.value.paths.length, 0);
 history.undo(); assert.equal(history.value.paths.length, 1);
});
test('segment insertion respects rectangular images and polygon closing edges', () => {
 const pts = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }];
 const edge = nearestSegment(pts, { x: .5, y: .52 }, true, 1200, 600);
 assert.equal(edge.index, 3); assert.ok(edge.distance < 12);
 const line = nearestSegment(pts, { x: .5, y: .52 }, false, 1200, 600);
 assert.equal(line.index, 1); assert.equal(line.distance, 312);
});
test('snapping uses image distance and can exclude the dragged vertex', () => {
 const paths = fixture().paths;
 assert.deepEqual(snapPoint({ x: .101, y: .201 }, paths, 1000, 500, 8), { x: .1, y: .2 });
 const pt = { x: .101, y: .201 };
 assert.deepEqual(snapPoint(pt, paths, 1000, 500, 8, { id: 'road1', index: 0 }), pt);
});
test('SVG export contains visible geometry, escapes names and excludes the template image', () => {
 const data = fixture(); data.areas.push({ id: 'hidden', name: 'Hidden', color: '#ffffff', visible: false, locked: true });
 data.paths.push({ ...data.paths[0], id: 'secret', areaId: 'hidden' });
 const result = exportDrawingSVG(data, 1000, 500);
 assert.match(result, /100\.000,100\.000 800\.000,100\.000/);
 assert.match(result, /Highway &lt;West&gt;/); assert.match(result, /Straße &amp; Weg/);
 assert.doesNotMatch(result, /Hidden|<image|<script/);
 assert.equal((result.match(/<polyline/g) || []).length, 1);
});

test('legacy roads remain straight; curves survive validation and SVG export', () => {
 const data = fixture(); data.version = 1;
 assert.equal(validateDrawing(data).paths[0].smooth, false);
 data.paths[0].smooth = true;
 data.paths[0].points.splice(1, 0, { x: .4, y: .6 });
 const clean = validateDrawing(data);
 assert.equal(clean.version, 3);
 assert.equal(clean.paths[0].smooth, true);
 const geometry = pathGeometry(clean.paths[0], 1000, 500);
 assert.equal(geometry.tag, 'path');
 assert.match(geometry.attrs.d, /^M 100.000,100.000 C /);
 assert.match(geometry.attrs.d, /800.000,100.000$/);
 assert.ok(exportDrawingSVG(clean, 1000, 500).includes(`d="${geometry.attrs.d}"`));
 data.paths[0].smooth = 'yes'; assert.throws(() => validateDrawing(data));
});
test('curve controls stay within image and insertion follows the visible curve', () => {
 const points = [{ x: 0, y: 0 }, { x: .5, y: 1 }, { x: 1, y: 0 }];
 const segments = curveSegments(points);
 assert.ok(segments.flat().every(p => p.x >= 0 && p.x <= 1 && p.y >= 0 && p.y <= 1));
 const s = segments[0];
 const midpoint = { x: (s[0].x + 3*s[1].x + 3*s[2].x + s[3].x)/8, y: (s[0].y + 3*s[1].y + 3*s[2].y + s[3].y)/8 };
 const hit = nearestPathSegment({ type: 'line', smooth: true, points }, midpoint, 1600, 700);
 assert.equal(hit.index, 1); assert.ok(hit.distance < .001);
});
test('joining supports all endpoint directions, removes shared vertex and preserves source data', () => {
 const first = fixture().paths[0], second = { ...structuredClone(first), id: 'road2', points: [{ x: .8, y: .2 }, { x: .9, y: .7 }] };
 for (const a of [0, 1]) for (const b of [0, 1]) {
  const joined = joinRoads(first, a, second, b);
  assert.deepEqual(joined.points[0], first.points[1-a]);
  assert.deepEqual(joined.points.at(-1), second.points[1-b]);
  assert.equal(joined.id, first.id);
 }
 assert.equal(joinRoads(first, 1, second, 0).points.length, 3);
 assert.equal(first.points.length, 2);
 assert.throws(() => joinRoads(first, 1, first, 0));
 assert.throws(() => joinRoads(first, 1, { ...second, areaId: 'other' }, 0));
});
test('split keeps both halves editable and undo restores the entire original road', () => {
 const data = fixture(); data.paths[0].smooth = true;
 data.paths[0].points.splice(1, 0, { x: .5, y: .5 });
 const original = structuredClone(data), history = new DrawingHistory(data);
 data.paths = splitRoad(data.paths[0], 1, 'new-road');
 assert.deepEqual(data.paths[0].points.at(-1), data.paths[1].points[0]);
 assert.ok(data.paths.every(p => p.smooth && p.points.length === 2));
 history.commit(validateDrawing(data)); history.undo();
 assert.deepEqual(history.value, original);
 assert.throws(() => splitRoad(original.paths[0], 0, 'new-road'));
});

test('floors migrate legacy geometry and reject invalid references', () => {
 const data = fixture(); data.version = 2;
 const clean = validateDrawing(data);
 assert.equal(clean.areas[0].floors[0].name, 'Erdgeschoss');
 assert.equal(clean.paths[0].floorId, 'ground');
 clean.paths[0].floorId = 'missing'; assert.throws(() => validateDrawing(clean));
 const bad = validateDrawing(data); bad.areas[0].floors.push({...bad.areas[0].floors[0]});
 assert.throws(() => validateDrawing(bad));
});
test('hidden floors are excluded from SVG and roads cannot join across floors', () => {
 const data = validateDrawing(fixture());
 data.areas[0].floors.push({id:'upper',name:'Obergeschoss',visible:false});
 const other = {...structuredClone(data.paths[0]),id:'up-road',floorId:'upper',name:'Upper road'};
 data.paths.push(other);
 assert.doesNotMatch(exportDrawingSVG(data,1000,500), /Upper road/);
 assert.throws(() => joinRoads(data.paths[0],1,other,0));
 data.areas[0].floors[1].visible = true;
 assert.match(exportDrawingSVG(data,1000,500), /Upper road/);
 const history = new DrawingHistory(data);
 const moved = structuredClone(data); moved.paths[0].floorId = 'upper'; history.commit(moved); history.undo();
 assert.equal(history.value.paths[0].floorId, 'ground');
});
