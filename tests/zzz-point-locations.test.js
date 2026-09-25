import test from 'node:test';
import assert from 'node:assert/strict';
import { mapAreas, locationLabel, matchesLocation } from '../zzz/point-locations.js';
import { filterPoints } from '../zzz/map-model.js';

test('legacy areas expose ground floor and removed assignments stay understandable', () => {
 const areas = mapAreas({ vector_data: { areas: [{ id: 'a', name: 'Highway' }] } });
 assert.equal(locationLabel({ area_id: 'a', floor_id: 'ground' }, areas), 'Highway · Erdgeschoss');
 assert.equal(locationLabel({}, areas), 'Nicht zugeordnet');
 assert.equal(locationLabel({ area_id: 'gone', floor_id: 'old' }, areas), 'Entferntes Gebiet · Entfernte Etage');
 assert.deepEqual(mapAreas(null), []);
});
test('location filters combine with existing filters without hiding legacy points by default', () => {
 const points = [
  { id: 1, title: 'Truhe', category: 'chest', area_id: 'a', floor_id: 'ground' },
  { id: 2, title: 'Truhe', category: 'chest', area_id: 'a', floor_id: 'upper', completed: true },
  { id: 3, title: 'Truhe', category: 'chest' },
  { id: 4, title: 'Portal', category: 'portal', area_id: 'b', floor_id: 'ground' }
 ];
 assert.equal(points.filter(p => matchesLocation(p, '', '')).length, 4);
 assert.deepEqual(points.filter(p => matchesLocation(p, '__unassigned', '')).map(p => p.id), [3]);
 assert.deepEqual(points.filter(p => matchesLocation(p, 'a', 'ground')).map(p => p.id), [1]);
 assert.equal(filterPoints(points, 'Truhe', 'chest', true).filter(p => matchesLocation(p, 'a', '')).length, 1);
 assert.equal(points[2].area_id, undefined);
});
