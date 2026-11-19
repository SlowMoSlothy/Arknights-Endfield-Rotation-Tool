export function withMobileLandingNav(html) {
  if (html.includes('mobileLandingNav.css')) return html;
  return html.replace('</head>', '<link rel="stylesheet" href="/endfield/css/mobileLandingNav.css?v=4"></head>')
    .replace('</body>', '<script src="/endfield/js/ui/mobileLandingNav.js?v=4" defer></script></body>');
}
