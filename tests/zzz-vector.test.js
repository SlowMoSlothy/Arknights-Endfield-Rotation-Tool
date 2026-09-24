import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyDrawing, validateDrawing, DrawingHistory, nearestSegment, snapPoint, exportDrawingSVG } from '../zzz/vector-model.js';

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
