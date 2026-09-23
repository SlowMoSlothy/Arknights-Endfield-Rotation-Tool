export const categories = {
 chest: { label: 'Truhe', color: '#ff974f', symbol: '■' },
 gear: { label: 'Ausrüstung', color: '#f5f5f0', symbol: '◆' },
 medical: { label: 'Medizin', color: '#ff6371', symbol: '+' },
 portal: { label: 'Portal', color: '#41d6dc', symbol: '◎' },
 quest: { label: 'Quest', color: '#dab0ff', symbol: '?' },
 note: { label: 'Notiz', color: '#ffe27a', symbol: '•' }
};
export function mapPosition(clientX, clientY, rect, view, width, height) {
 const x = (clientX - rect.left - view.x) / (width * view.scale);
 const y = (clientY - rect.top - view.y) / (height * view.scale);
 return x >= 0 && x <= 1 && y >= 0 && y <= 1 ? { x, y } : null;
}
export function filterPoints(points, search, category, hideCompleted) {
 const term = search.trim().toLocaleLowerCase();
 return points.filter(p => (!category || p.category === category) && (!hideCompleted || !p.completed)
  && `${p.title} ${p.notes}`.toLocaleLowerCase().includes(term));
}
export function validateImage(file) {
 if (!file || !['image/png','image/jpeg','image/webp'].includes(file.type) || file.size > 10485760 || !file.size)
  throw new Error('Bitte PNG, JPG oder WebP mit maximal 10 MB auswählen.');
}
