(function () {
  var l = window.location;
  var path = l.pathname;
  var search = l.search ? l.search.substring(1) : '';
  var target =
    l.protocol +
    '//' +
    l.host +
    '/?p=' +
    encodeURIComponent(path) +
    (search ? '&q=' + encodeURIComponent(search) : '') +
    l.hash;

  l.replace(target);
})();
