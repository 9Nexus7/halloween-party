/* Löst die aktuelle Server-Adresse auf (Gist oder Fallback) und leitet dorthin
   weiter. Wird sowohl von index.html (Startseite) als auch von 404.html
   (alle Unterseiten wie admin.html oder door.html) benutzt. */
(function () {
  var CFG = window.HW_REDIRECT || {};
  var $ = function (id) { return document.getElementById(id); };

  function show(title, text, retry) {
    $('title').textContent = title;
    $('text').textContent = text;
    $('retry').hidden = !retry;
  }

  function fetchWithTimeout(url, ms) {
    var ctrl = new AbortController();
    var timer = setTimeout(function () { ctrl.abort(); }, ms);
    return fetch(url, { cache: 'no-store', signal: ctrl.signal }).finally(function () { clearTimeout(timer); });
  }

  function resolveTarget() {
    if (!CFG.GIST_RAW_URL) return Promise.resolve(CFG.TARGET);
    var url = CFG.GIST_RAW_URL + (CFG.GIST_RAW_URL.indexOf('?') >= 0 ? '&' : '?') + 't=' + Date.now();
    return fetchWithTimeout(url, 7000)
      .then(function (r) { return r.text(); })
      .then(function (t) { t = t.trim(); return (t.indexOf('https://') === 0) ? t : CFG.TARGET; })
      .catch(function () { return CFG.TARGET; });
  }

  // Bei 404.html (Unterseiten) den ursprünglich aufgerufenen Pfad mitnehmen,
  // z. B. /halloween-party/door.html -> /door.html. Bei index.html gibt es
  // keinen Unterpfad, dann bleibt REST leer.
  function restPath() {
    if (!window.HW_KEEP_PATH) return '';
    var segs = location.pathname.split('/');
    return '/' + segs.slice(2).join('/'); // segs[0]='', segs[1]=Repo-Name
  }

  window.hwGo = function () {
    resolveTarget().then(function (target) {
      if (!target || target.indexOf('HIER-DIE') !== -1) {
        show('Wird eingerichtet', 'Die Party-Seite ist gleich da. Schau bitte bald noch einmal vorbei.', false);
        return;
      }
      show('Einen Moment …', 'Die Party-Seite wird geöffnet.', false);
      var path = restPath();
      fetchWithTimeout(target + '/api', 9000)
        .then(function (r) { return r.json(); })
        .then(function (j) {
          if (j && j.ok) { location.replace(target + path + location.search + location.hash); }
          else { throw new Error('nicht bereit'); }
        })
        .catch(function () {
          show('Gerade nicht erreichbar', 'Die Party-Seite ist kurz offline. Bitte versuche es in ein paar Minuten noch einmal.', true);
        });
    });
  };

  document.addEventListener('DOMContentLoaded', function () {
    var r = $('retry');
    if (r) r.addEventListener('click', window.hwGo);
    window.hwGo();
  });
})();
