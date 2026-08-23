(function () {
  "use strict";

  if (!("serviceWorker" in navigator)) return;

  var refreshing = false;
  navigator.serviceWorker.addEventListener("controllerchange", function () {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });
})();
