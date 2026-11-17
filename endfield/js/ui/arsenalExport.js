const snapshotTime = new Intl.DateTimeFormat('en-GB', {
  dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/Berlin',
});

export async function downloadArsenalImage(page) {
  const { default: html2canvas } = await import('https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.esm.js');
  const capturedAt = snapshotTime.format(new Date());
  const rowSizes = Array.from(page.querySelectorAll('.arsenal-offers'), list => list.children.length);
  const columns = Math.min(4, Math.max(2, ...rowSizes));
  const width = 48 + columns * 200 + (columns - 1) * 16;
  const canvas = await html2canvas(page, {
    backgroundColor: '#1b2123',
    windowWidth: 1200,
    scale: 2,
    scrollX: 0,
    scrollY: 0,
    useCORS: true,
    imageTimeout: 8000,
    logging: false,
    ignoreElements: element => element.matches(
      '.top, .breadcrumbs, .arsenal-jump-links, .arsenal-toolbar, .arsenal-countdown, noscript, .barcode',
    ),
    onclone: (_doc, clone) => {
      Object.assign(clone.style, {
        width: `${width}px`, maxWidth: 'none', margin: '0', padding: '24px', background: '#1b2123',
      });
      clone.querySelector('footer').textContent = `RotationForge.gg · Exported ${capturedAt} (Berlin time)`;
    },
  });
  const png = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
  if (!png) throw new Error('Could not encode the Arsenal image');

  const url = URL.createObjectURL(png);
  const link = page.ownerDocument.createElement('a');
  link.download = 'rotationforge-arsenal-exchange.png';
  link.href = url;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
