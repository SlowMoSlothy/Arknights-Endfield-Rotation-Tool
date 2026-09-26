const layout = document.querySelector('.layout');
const button = document.getElementById('fullscreen');
let fallback = false, busy = false, previousOverflow = '';

// Dialogs must belong to the fullscreen subtree to stay usable there.
for (const id of ['point-dialog', 'new-map']) layout.append(document.getElementById(id));

function update() {
 const active = fallback || document.fullscreenElement === layout;
 layout.classList.toggle('map-fullscreen', active);
 button.setAttribute('aria-pressed', String(active));
 const label = active ? 'Vollbild verlassen' : 'Vollbild öffnen';
 button.setAttribute('aria-label', label); button.title = label;
}
function leaveFallback() {
 fallback = false;
 document.body.style.overflow = previousOverflow;
 update(); button.focus({ preventScroll: true });
}
button.addEventListener('click', async () => {
 if (busy) return;
 busy = true;
 try {
  if (fallback) leaveFallback();
  else if (document.fullscreenElement === layout) await document.exitFullscreen();
  else {
   try {
    if (!layout.requestFullscreen || !document.fullscreenEnabled) throw Error('Unavailable');
    await layout.requestFullscreen();
   } catch {
    previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden'; fallback = true;
   }
  }
 } finally { busy = false; update(); }
});
document.addEventListener('fullscreenchange', update);
document.addEventListener('keydown', e => {
 if (e.key !== 'Escape' || (!fallback && document.fullscreenElement !== layout) || document.querySelector('dialog[open]')) return;
 e.preventDefault(); e.stopImmediatePropagation();
 if (fallback) leaveFallback();
 else document.exitFullscreen().catch(() => {});
}, true);
update();
