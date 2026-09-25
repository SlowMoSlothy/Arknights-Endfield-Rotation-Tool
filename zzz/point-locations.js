export function mapAreas(map) {
 return (map?.vector_data?.areas || []).map(a => ({ ...a,
  floors: a.floors || [{ id: 'ground', name: 'Erdgeschoss', visible: true }]
 }));
}
export function locationLabel(point, areas) {
 if (!point.area_id) return 'Nicht zugeordnet';
 const area = areas.find(a => a.id === point.area_id);
 const name = area?.name || 'Entferntes Gebiet';
 if (!point.floor_id) return name;
 return `${name} · ${area?.floors.find(f => f.id === point.floor_id)?.name || 'Entfernte Etage'}`;
}
export function matchesLocation(point, areaId, floorId) {
 if (areaId === '__unassigned') return !point.area_id;
 if (areaId && point.area_id !== areaId) return false;
 return !floorId || point.floor_id === floorId;
}
