export function withMobileLandingNav(html) {
  if (html.includes('mobileLandingNav.css')) return html;
  return html.replace('</head>', '<link rel="stylesheet" href="/endfield/css/mobileLandingNav.css?v=3"></head>')
    .replace('</body>', '<script src="/endfield/js/ui/mobileLandingNav.js?v=3" defer></script></body>');
}
