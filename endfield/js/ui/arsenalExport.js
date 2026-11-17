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
    onclone: async (doc, clone) => {
      Object.assign(clone.style, {
        width: `${width}px`, maxWidth: 'none', margin: '0', padding: '24px', background: '#1b2123',
      });
      const footer = clone.querySelector('footer');
      const details = doc.createElement('div');
      const address = doc.createElement('strong');
      address.textContent = 'rotationforge.gg/endfield/arsenal/';
      const timestamp = doc.createElement('div');
      timestamp.textContent = `Exported ${capturedAt} (Berlin time)`;
      details.append(address, timestamp);

      const qr = doc.createElement('img');
      qr.src = new URL('/assets/arsenal-exchange-qr.png', page.ownerDocument.baseURI).href;
      qr.alt = 'Scan to open Arsenal Exchange';
      qr.width = 111;
      qr.height = 111;
      Object.assign(footer.style, {
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        textAlign: 'left', gap: '20px', borderTop: '1px solid #3c4547', padding: '16px 0 0',
      });
      footer.replaceChildren(details, qr);
      await qr.decode();
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
