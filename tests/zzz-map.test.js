import test from 'node:test';
import assert from 'node:assert/strict';
import { mapPosition, filterPoints, validateImage } from '../zzz/map-model.js';

test('map coordinates stay accurate after zoom and pan; outside clicks are ignored', () => {
 const rect = { left: 100, top: 50 }, view = { x: -200, y: 80, scale: 2 };
 assert.deepEqual(mapPosition(400, 630, rect, view, 1000, 500), { x: .25, y: .5 });
 assert.equal(mapPosition(-200, 630, rect, view, 1000, 500), null);
 assert.equal(mapPosition(400, 1200, rect, view, 1000, 500), null);
});
test('search, category and completion filters combine without changing source points', () => {
 const points = [
  { title: 'Portal', notes: 'Beim Turm', category: 'portal', completed: false },
  { title: 'Truhe', notes: 'Beim Turm', category: 'chest', completed: true },
  { title: 'Andere Truhe', notes: '', category: 'chest', completed: false }
 ];
 assert.deepEqual(filterPoints(points, ' TURM ', '', true), [points[0]]);
 assert.deepEqual(filterPoints(points, 'turm', 'chest', false), [points[1]]);
 assert.deepEqual(filterPoints(points, 'turm', 'chest', true), []);
 assert.equal(points.length, 3);
});
test('uploads reject active content and oversized files', () => {
 for (const file of [{ type: 'image/svg+xml', size: 10 }, { type: 'image/png', size: 10485761 }, { type: 'image/png', size: 0 }, null])
  assert.throws(() => validateImage(file));
 assert.doesNotThrow(() => validateImage({ type: 'image/webp', size: 10485760 }));
});
