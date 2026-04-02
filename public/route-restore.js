(function () {
  var l = window.location;
  var params = new URLSearchParams(l.search);
  var p = params.get('p');
  if (!p) return;

  var q = params.get('q');
  var newUrl = p + (q ? ('?' + q) : '') + l.hash;
  window.history.replaceState(null, '', newUrl);
})();
