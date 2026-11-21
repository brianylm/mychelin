// Next's test hook prevents Google Fonts downloads. Screenshots use the app's
// existing system fallbacks; no production CSS or font configuration changes.
module.exports = {
  'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&display=swap': '/* Offline: system sans fallback. */',
  'https://fonts.googleapis.com/css2?family=Newsreader:wght@400;500;600&display=swap': '/* Offline: system serif fallback. */',
  'https://fonts.googleapis.com/css2?family=Newsreader:wght@400;500&display=swap': '/* Offline: system serif fallback. */',
  'https://fonts.googleapis.com/css2?family=Libre+Baskerville:wght@700&display=swap': '/* Offline: system serif fallback. */',
};
