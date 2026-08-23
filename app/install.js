/* Install prompt. Every visit that is not already installed opens with a banner
   offering the app: the native prompt where the browser gives us one, otherwise
   the manual "add to home screen" steps for that platform. */
(function () {
  "use strict";

  var INSTALLED_KEY = "hpsf.installed";     // survives visits — never nag again
  var SNOOZE_KEY = "hpsf.installSnoozed";   // this visit only — "Not now"

  var deferred = null;   // beforeinstallprompt event, when the browser fires one
  var banner = null;

  function store(kind) {
    try { return kind === "session" ? window.sessionStorage : window.localStorage; }
    catch (e) { return null; }   // private mode / storage blocked
  }

  function flag(kind, key) {
    var s = store(kind);
    try { return !!(s && s.getItem(key)); } catch (e) { return false; }
  }

  function setFlag(kind, key) {
    var s = store(kind);
    try { if (s) s.setItem(key, "1"); } catch (e) {}
  }

  function standalone() {
    return (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) ||
      window.navigator.standalone === true ||
      document.referrer.indexOf("android-app://") === 0;
  }

  // Which manual steps to show when there is no native prompt to fire.
  function platform() {
    var ua = navigator.userAgent || "";
    var touch = navigator.maxTouchPoints > 1;
    if (/iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && touch)) return "ios";
    if (/Android/.test(ua)) return "android";
    return "desktop";
  }

  var STEPS = {
    ios: 'Tap the <b>Share</b> button in the browser bar, then choose ' +
      '<b>Add to Home Screen</b>.',
    android: 'Open the browser <b>menu</b> (⋮), then choose ' +
      '<b>Install app</b> or <b>Add to Home screen</b>.',
    desktop: 'Click the <b>install</b> icon at the right of the address bar, or open the ' +
      'browser <b>menu</b> and choose <b>Install HP Scheme Finder</b>.'
  };

  function build() {
    var el = document.createElement("div");
    el.className = "install-banner";
    el.id = "install-banner";
    el.setAttribute("role", "dialog");
    el.setAttribute("aria-modal", "false");
    el.setAttribute("aria-labelledby", "install-title");
    el.innerHTML =
      '<img class="install-icon" src="icons/icon-192.png" alt="" width="48" height="48">' +
      '<div class="install-copy">' +
        '<p class="install-title" id="install-title">Install HP Scheme Finder</p>' +
        '<p class="install-sub">Add it to your home screen — opens like an app and works ' +
          'offline, with no data use after the first load.</p>' +
        '<p class="install-steps" hidden></p>' +
      '</div>' +
      '<div class="install-actions">' +
        '<button class="btn primary" type="button" data-install>Install</button>' +
        '<button class="btn ghost" type="button" data-install-dismiss>Not now</button>' +
      '</div>' +
      '<button class="install-close" type="button" data-install-dismiss ' +
        'aria-label="Dismiss">&times;</button>';
    return el;
  }

  // The sheet is fixed to the bottom, so the page needs matching padding or its
  // last card sits under it — and the sheet grows when the manual steps open.
  function syncOffset() {
    var h = banner ? banner.offsetHeight : 0;
    document.documentElement.style.setProperty("--install-h", h + "px");
  }

  function show() {
    if (banner || standalone()) return;
    if (flag("local", INSTALLED_KEY) || flag("session", SNOOZE_KEY)) return;

    banner = build();
    document.body.appendChild(banner);
    document.body.classList.add("install-open");
    // Paint once before animating in, so the entrance transition actually runs.
    syncOffset();
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { if (banner) banner.classList.add("in"); });
    });
  }

  function hide(persist) {
    if (persist) setFlag("session", SNOOZE_KEY);
    document.body.classList.remove("install-open");
    document.documentElement.style.removeProperty("--install-h");
    if (!banner) return;
    var el = banner;
    banner = null;
    el.classList.remove("in");
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 260);
  }

  function showSteps() {
    if (!banner) return;
    var steps = banner.querySelector(".install-steps");
    steps.innerHTML = STEPS[platform()];
    steps.hidden = false;
    banner.classList.add("guided");
    var btn = banner.querySelector("[data-install]");
    if (btn) btn.textContent = "Got it";
    syncOffset();
  }

  document.addEventListener("click", function (e) {
    if (e.target.closest("[data-install-dismiss]")) { hide(true); return; }

    var install = e.target.closest("[data-install]");
    if (!install) return;

    if (banner && banner.classList.contains("guided")) { hide(true); return; }

    if (!deferred) { showSteps(); return; }

    var evt = deferred;
    deferred = null;
    evt.prompt();
    evt.userChoice.then(function (choice) {
      // Dismissing the native sheet leaves the banner up; the browser will not
      // hand us a second prompt event this visit, so fall back to the steps.
      if (choice && choice.outcome === "accepted") hide(false);
      else showSteps();
    }).catch(function () { showSteps(); });
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && banner) hide(true);
  });

  window.addEventListener("resize", syncOffset);

  window.addEventListener("beforeinstallprompt", function (e) {
    e.preventDefault();
    deferred = e;
    show();   // no-op if the banner is already up; the button now fires natively
  });

  window.addEventListener("appinstalled", function () {
    setFlag("local", INSTALLED_KEY);
    deferred = null;
    hide(false);
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", show);
  } else {
    show();
  }
})();
