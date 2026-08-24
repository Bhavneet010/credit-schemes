/* HP Scheme Finder — vanilla PWA. Data comes from data.json (built from the
   verified workbook by tools/build_data.py). */
(function () {
  "use strict";

  var D = null;                 // dataset
  var idx = { sectors: [], schemes: [] };  // search haystacks
  var app = document.getElementById("app");
  var scrollMemory = {};
  var query = "";               // live search text

  // ------------------------------------------------------------- utilities
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function norm(s) {
    return String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  }

  function tokens(s) {
    var t = norm(s).split(" ").filter(Boolean);
    return t;
  }

  function highlight(text, toks) {
    var out = esc(text);
    if (!toks.length) return out;
    var re = new RegExp("(" + toks.map(function (t) {
      return t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }).join("|") + ")", "ig");
    return out.replace(re, "<mark>$1</mark>");
  }

  function pool(name, i) {
    return i >= 0 ? D.pools[name][i] : "";
  }

  function linksFor(si) {
    return D.links[String(si)] || [];
  }

  // Every mapped row also carries why it was mapped, the application sequence
  // and any row-specific condition. Find the row that joins one activity to one
  // scheme so the scheme page can say what it means *for that activity*.
  function linkContext(si, ki) {
    var ls = linksFor(si);
    for (var i = 0; i < ls.length; i++) if (ls[i][0] === ki) return ls[i];
    return null;
  }

  // ------------------------------------------------------- cross-references
  // The workbook's reference sheets (Key Contacts, Component Norms, Legacy &
  // Closed) were only reachable as flat lists under More. These joins pull the
  // rows belonging to one scheme onto that scheme's own page, so a reader who
  // wants more than the summary never has to go hunting for it.

  // Structural words carry no institutional identity, so scoring on them pairs
  // any "... Fund" with any other "... Fund". They are dropped before scoring.
  var XSTOP = {};
  (" hp himachal pradesh department dept the and for to in on scheme schemes portal" +
   " state national india indian ministry route current guidelines index wing yojana" +
   " bank lender agency nodal fund development board mission corporation programme" +
   " program council authority centre center office commissioner directorate general" +
   " division cell unit support assistance promotion services service company limited" +
   " ltd society federation nigam samiti new ").split(" ").forEach(function (w) {
    if (w) XSTOP[w] = 1;
  });

  function idTokens(s) {
    var out = [];
    tokens(s).forEach(function (t) {
      if (t.length > 2 && !XSTOP[t] && out.indexOf(t) < 0) out.push(t);
    });
    return out;
  }

  // Horticulture component themes, keyed by the words a scheme uses when it
  // actually funds that component.
  var NORM_KEYS = {
    "Beekeeping": ["beekeep", "honey", "apicult"],
    "Floriculture": ["floricult", "flower"],
    "Protected floriculture": ["floricult", "flower"],
    "Mushroom": ["mushroom"],
    "Spices": ["spice", "ginger", "turmeric", "garlic"],
    "Medicinal & aromatic plants": ["medicinal", "aromatic"],
    "Protected cultivation": ["polyhouse", "protected cultivation", "greenhouse", "net house"],
    "Nursery & planting material": ["nursery", "planting material"],
    "New gardens / area expansion": ["orchard", "area expansion", "plantation", "new garden"],
    "Orchard rehabilitation": ["orchard", "rejuven"],
    "Orchard protection": ["orchard", "anti hail", "hail net", "fencing"],
    "Post-harvest": ["post harvest", "cold stor", "pack house", "grading", "ripening"],
    "Processing": ["processing"],
    "Market infrastructure": ["market infrastructure", "mandi", "retail outlet"],
    "Water management": ["irrigation", "sprinkler", "drip", "water harvest"],
    "Quality infrastructure": ["testing lab", "quality", "certif"],
    "Good practices & organic inputs": ["organic", "natural farming", "vermicompost"]
  };

  // The cost tables are horticulture and farm norms, so only routes on that
  // side of the catalogue can be sized against them.
  var NORM_ROUTE = /horticult|midh|nhb |agricultur|food process|orchard|garden|krishi|farm/;

  var xref = null;

  function buildXref() {
    var byName = {};
    D.schemes.forEach(function (k, i) {
      var key = norm(k.name);
      if (byName[key] === undefined) byName[key] = i;
    });

    // A Key Contacts row whose "Use it for" names a scheme *is* that scheme's
    // own official page; the rest are department- or portal-level front doors.
    var own = {}, generic = [], gtok = {}, df = {};
    D.contacts.forEach(function (c, j) {
      var i = byName[norm(c.use)];
      if (i !== undefined) { (own[i] = own[i] || []).push(j); return; }
      generic.push(j);
      var t = idTokens(c.name);
      gtok[j] = t;
      t.forEach(function (w) { df[w] = (df[w] || 0) + 1; });
    });

    var legacyByName = {};
    D.legacy.forEach(function (l, j) { legacyByName[norm(l.name)] = j; });

    var byParent = {}, byFamily = {};
    D.schemes.forEach(function (k, i) {
      if (k.parent) (byParent[k.parent] = byParent[k.parent] || []).push(i);
      (byFamily[k.family] = byFamily[k.family] || []).push(i);
    });

    xref = {
      own: own, generic: generic, gtok: gtok, df: df,
      legacy: legacyByName, byName: byName, byParent: byParent, byFamily: byFamily
    };
  }

  // Up to three department or portal contacts, closest institutional match
  // first. A shared rare word ("sericulture") outweighs a shared common one
  // ("agriculture"), which is what inverse document frequency buys here.
  function deptContacts(k) {
    var hay = {};
    idTokens(k.agency + " " + k.name + " " + k.parent).forEach(function (t) { hay[t] = 1; });
    var out = [];
    xref.generic.forEach(function (j) {
      var score = 0;
      xref.gtok[j].forEach(function (t) { if (hay[t]) score += 1 / xref.df[t]; });
      if (score > 0) out.push([score, -D.contacts[j].name.length, j]);
    });
    out.sort(function (a, b) { return b[0] - a[0] || b[1] - a[1]; });
    return out.slice(0, 3).map(function (e) { return e[2]; });
  }

  function schemeNorms(k) {
    var text = norm([k.name, k.parent, k.family, k.label, k.bestFor, k.support,
      k.benefit, k.agency].join(" "));
    if (!NORM_ROUTE.test(text)) return [];
    var themes = {};
    Object.keys(NORM_KEYS).forEach(function (t) {
      var hit = NORM_KEYS[t].some(function (w) { return text.indexOf(w) >= 0; });
      if (hit) themes[t] = 1;
    });
    var out = [];
    D.norms.forEach(function (n, j) { if (themes[n.theme]) out.push(j); });
    return out;
  }

  // Siblings under the same parent programme first, then the rest of the family.
  function relatedSchemes(ki) {
    var k = D.schemes[ki], seen = {}, close = [], family = [];
    function push(bucket, i) {
      if (i === ki || seen[i]) return;
      seen[i] = 1;
      bucket.push(i);
    }
    if (k.parent) {
      (xref.byParent[k.parent] || []).forEach(function (i) { push(close, i); });
      var p = xref.byName[norm(k.parent)];
      if (p !== undefined) push(close, p);
    }
    (xref.byParent[k.name] || []).forEach(function (i) { push(close, i); });
    (xref.byFamily[k.family] || []).forEach(function (i) { push(family, i); });
    return { close: close, family: family };
  }

  // Short, mobile-friendly status label + severity.
  var STATUS = {
    "Open now": ["Open now", "good"],
    "Active - bank or continuous route": ["Bank / continuous route", "good"],
    "Active - annual target or departmental sanction": ["Annual target / sanction", "warn"],
    "Active - cluster or project area": ["Cluster or project area", "warn"],
    "Fresh window closed": ["Fresh window closed", "stop"]
  };

  function statusTag(scheme) {
    var s = STATUS[scheme.status] || [scheme.status, ""];
    return '<span class="tag ' + s[1] + '"><i class="dot"></i>' + esc(s[0]) + "</span>";
  }

  var APP_HINT = {
    Direct: "Targets this activity directly",
    Strong: "Scope aligns with this activity",
    Conditional: "Closest route — confirm eligibility",
    Horizontal: "General finance / enterprise support"
  };

  // ------------------------------------------------------------ search idx
  // Each entry keeps a padded haystack (" word word ") so a leading space marks
  // a word boundary, plus the padded title, so scoring never re-normalises text
  // while the user is typing.
  function entry(title, rest) {
    return { title: " " + norm(title) + " ", hay: " " + norm(title + " " + rest) + " " };
  }

  function buildIndex() {
    idx.sectors = D.sectors.map(function (s) {
      return entry(s.a, [s.sub, D.macros[s.m], D.stages[s.st], D.classes[s.ec]].join(" "));
    });
    // The whole scheme record is searchable, not just its headline fields, so
    // "collateral free", "interest subvention" or "DIC" reach the scheme that
    // says so. Title weighting is unchanged, so existing queries rank as before.
    idx.schemes = D.schemes.map(function (k) {
      return entry(k.name, [k.parent, k.label, k.family, k.gov, k.support, k.bestFor,
        k.benefit, k.eligible, k.margin, k.stage, k.access, k.agency, k.caution].join(" "));
    });
  }

  // Every word the user types is its own keyword. A record is a hit as soon as
  // one keyword matches; records that match more keywords rank above the rest,
  // so adding a word sharpens the order instead of emptying the screen.
  var W_TITLE_START = 120;   // keyword opens the title
  var W_TITLE_WORD = 80;     // keyword opens a word in the title
  var W_TITLE_PART = 45;     // keyword sits inside a title word
  var W_HAY_WORD = 25;       // keyword opens a word elsewhere
  var W_HAY_PART = 10;       // keyword sits inside a word elsewhere
  var W_PHRASE_TITLE = 90;   // the whole query appears in the title
  var W_PHRASE_HAY = 30;     // the whole query appears elsewhere

  function scoreEntry(e, toks, phrase) {
    var matched = 0, score = 0;
    for (var t = 0; t < toks.length; t++) {
      var tok = toks[t];
      var titleWord = e.title.indexOf(" " + tok);
      var hayWord = e.hay.indexOf(" " + tok);
      if (titleWord === 0) score += W_TITLE_START;
      else if (titleWord > 0) score += W_TITLE_WORD;
      else if (e.title.indexOf(tok) >= 0) score += W_TITLE_PART;
      else if (hayWord >= 0) score += W_HAY_WORD;
      else if (e.hay.indexOf(tok) >= 0) score += W_HAY_PART;
      else continue;
      matched++;
    }
    if (!matched) return null;
    if (phrase) {
      if (e.title.indexOf(phrase) >= 0) score += W_PHRASE_TITLE;
      else if (e.hay.indexOf(phrase) >= 0) score += W_PHRASE_HAY;
    }
    return [matched, score];
  }

  function search(q) {
    var toks = tokens(q);
    if (!toks.length) return { sectors: [], schemes: [], toks: toks };
    var phrase = toks.length > 1 ? toks.join(" ") : "";

    function scan(entries) {
      var hits = [];
      for (var i = 0; i < entries.length; i++) {
        var s = scoreEntry(entries[i], toks, phrase);
        if (s) hits.push([s[0], s[1], i]);
      }
      // Most keywords matched first, then the strongest score, then input order.
      hits.sort(function (a, b) { return b[0] - a[0] || b[1] - a[1] || a[2] - b[2]; });
      return hits.map(function (h) { return h[2]; });
    }

    return { toks: toks, sectors: scan(idx.sectors), schemes: scan(idx.schemes) };
  }

  // ------------------------------------------------------------ saved list
  function saved() {
    try { return JSON.parse(localStorage.getItem("hpsf.saved") || "[]"); }
    catch (e) { return []; }
  }

  function isSaved(key) { return saved().indexOf(key) >= 0; }

  function toggleSaved(key) {
    var list = saved(), i = list.indexOf(key);
    if (i >= 0) list.splice(i, 1); else list.unshift(key);
    localStorage.setItem("hpsf.saved", JSON.stringify(list));
    return i < 0;
  }

  // ------------------------------------------------------------ components
  function settingsMenu() {
    return '<div class="settings">' +
      '<button class="iconbtn settings-toggle" data-settings aria-label="Open settings" ' +
      'aria-haspopup="menu" aria-expanded="false">' +
      '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3.2"/>' +
      '<path d="M19.4 15a1.8 1.8 0 0 0 .4 2l.1.1-2.8 2.8-.1-.1a1.8 1.8 0 0 0-2-.4 1.8 1.8 0 0 0-1.1 1.7v.2h-4v-.2A1.8 1.8 0 0 0 8.8 19a1.8 1.8 0 0 0-2 .4l-.1.1-2.8-2.8.1-.1a1.8 1.8 0 0 0 .4-2A1.8 1.8 0 0 0 2.7 13h-.2V9h.2a1.8 1.8 0 0 0 1.7-1.1 1.8 1.8 0 0 0-.4-2l-.1-.1L6.7 3l.1.1a1.8 1.8 0 0 0 2 .4 1.8 1.8 0 0 0 1.1-1.7v-.2h4v.2A1.8 1.8 0 0 0 15 3.5a1.8 1.8 0 0 0 2-.4l.1-.1 2.8 2.8-.1.1a1.8 1.8 0 0 0-.4 2A1.8 1.8 0 0 0 21.1 9h.2v4h-.2a1.8 1.8 0 0 0-1.7 2z"/></svg></button>' +
      '<div class="settings-menu" role="menu" aria-label="Settings" hidden>' +
      '<a href="#/saved" role="menuitem"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 3.5h11a1 1 0 0 1 1 1v16l-6.5-4-6.5 4v-16a1 1 0 0 1 1-1z"/></svg>Saved</a>' +
      '<a href="#/more" role="menuitem"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/></svg>More</a>' +
      "</div></div>";
  }

  function brandMark() {
    return '<a class="brand" href="#/" aria-label="HP Scheme Finder home">' +
      '<svg class="brand-mark" viewBox="0 0 56 48" aria-hidden="true">' +
      '<circle class="sun" cx="28" cy="15" r="9"/><path class="ray" d="M28 1v5M12 7l4 4M44 7l-4 4M6 19h6M44 19h6"/>' +
      '<path class="hill hill-back" d="M3 36c9-10 17-13 25-6 8-7 16-4 25 6-17-4-33-4-50 0z"/>' +
      '<path class="hill hill-front" d="M3 40c10-7 20-8 28-3 7-4 14-3 22 3-17 5-33 5-50 0z"/></svg>' +
      '<span>HP Scheme Finder</span></a>';
  }

  function header(opts) {
    var back = opts.back
      ? '<button class="back" data-back><svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>' + esc(opts.back) + "</button>"
      : "";
    var actions = '<div class="head-actions">' + (opts.action || "") + settingsMenu() + "</div>";
    if (opts.home) {
      return '<header class="head home-head"><div class="head-row">' + brandMark() + actions +
        '</div></header><section class="home-hero' + (opts.compact ? " compact" : "") + '">' +
        '<img class="hero-crest" src="assets/hero-alpine-crest.png" alt="" aria-hidden="true" width="126" height="63">' +
        '<h1>' + esc(opts.title) + "</h1>" +
        (opts.sub ? '<p class="home-sub">' + esc(opts.sub) + "</p>" : "") +
        (opts.extra || "") + "</section>";
    }
    return '<div class="head">' + back +
      '<div class="head-row"><h1>' + esc(opts.title) + "</h1>" + actions + "</div>" +
      (opts.sub ? '<p class="sub">' + esc(opts.sub) + "</p>" : "") +
      (opts.extra || "") + "</div>";
  }

  function saveButton(key) {
    var on = isSaved(key);
    return '<button class="iconbtn' + (on ? " on" : "") + '" data-save="' + key + '" ' +
      'aria-label="' + (on ? "Remove from saved" : "Save") + '">' +
      '<svg viewBox="0 0 24 24"><path d="M6.5 3.5h11a1 1 0 0 1 1 1v16l-6.5-4-6.5 4v-16a1 1 0 0 1 1-1z"/></svg></button>';
  }

  function sectorRow(si, toks, bare) {
    var s = D.sectors[si];
    var context = bare ? "" : "<small>" +
      highlight(s.sub + " · " + D.macros[s.m], toks || []) + "</small>";
    return '<a class="row" href="#/s/' + si + '"><div class="t"><strong>' +
      highlight(s.a, toks || []) + "</strong>" + context +
      '</div><span class="n">' + s.n + '</span><i class="chev"></i></a>';
  }

  function schemeRow(ki, toks, si) {
    var k = D.schemes[ki];
    var st = STATUS[k.status] || [k.status, ""];
    var href = "#/k/" + ki + (si == null ? "" : "/from/" + si);
    return '<a class="row" href="' + href + '"><div class="t"><strong>' +
      highlight(k.name, toks || []) + "</strong><small>" +
      esc(k.gov) + " · " + esc(st[0]) + "</small></div><i class=\"chev\"></i></a>";
  }

  function emptyState(msg) {
    return '<div class="empty"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/>' +
      '<path d="M16 16l4.5 4.5"/></svg><p>' + esc(msg) + "</p></div>";
  }

  function link(url) {
    if (!url) return "";
    var short = url.replace(/^https?:\/\//, "").replace(/\/$/, "");
    if (short.length > 46) short = short.slice(0, 44) + "…";
    return '<a href="' + esc(url) + '" target="_blank" rel="noopener">' + esc(short) + "</a>";
  }

  function facts(pairs) {
    var rows = pairs.filter(function (p) { return p[1]; }).map(function (p) {
      return "<dl class=\"fact\"><dt>" + esc(p[0]) + "</dt><dd>" +
        (p[2] === "html" ? p[1] : esc(p[1])) + "</dd></dl>";
    }).join("");
    return rows ? '<div class="facts">' + rows + "</div>" : "";
  }

  // ----------------------------------------------------------------- views
  var views = {};

  // The results body is rendered on its own so typing can repaint it without
  // rebuilding the search field — recreating a focused input is what made the
  // mobile keyboard flicker and swallow keystrokes.
  function homeBody() {
    if (!query.trim()) {
      return '<section class="start-here"><h2>Start here</h2><div class="start-list">' +
        '<a class="start-route route-schemes" href="#/schemes"><span class="route-icon">' +
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 18V8l5-3 6 3 5-3v10l-5 4-6-3-5 2zM9 5v11M15 8v11"/></svg></span>' +
        '<span class="route-copy"><strong>All schemes and routes</strong><small>' +
        D.meta.counts.schemes + ' central and state routes</small></span>' +
        '<svg class="route-arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg></a>' +
        '<a class="start-route route-contacts" href="#/contacts"><span class="route-icon">' +
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9h18M5 9v9M9 9v9M15 9v9M19 9v9M3 19h18M2 21h20M12 3l9 4H3l9-4z"/></svg></span>' +
        '<span class="route-copy"><strong>Departments and portals</strong><small>Where to apply and who to ask</small></span>' +
        '<svg class="route-arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg></a>' +
        "</div></section>";
    }

    var r = search(query);
    var CAP = 40;
    var more = function (n) {
      return n > CAP ? '<p class="hint">Showing the closest ' + CAP + " of " + n +
        ". Add a more specific word to sharpen the ranking.</p>" : "";
    };

    // Schemes lead the results; matching activities follow.
    var parts = "";
    if (r.schemes.length) {
      parts += '<div class="section"><h2>Schemes · ' + r.schemes.length + "</h2>" +
        '<div class="list">' + r.schemes.slice(0, CAP).map(function (ki) {
          return schemeRow(ki, r.toks);
        }).join("") + "</div>" + more(r.schemes.length) + "</div>";
    }
    if (r.sectors.length) {
      parts += '<div class="section"><h2>Business activities · ' + r.sectors.length + "</h2>" +
        '<div class="list">' + r.sectors.slice(0, CAP).map(function (si) {
          return sectorRow(si, r.toks);
        }).join("") + "</div>" + more(r.sectors.length) + "</div>";
    }

    return parts || emptyState("Nothing matched \u201C" + query.trim() +
      "\u201D. Try a simpler word such as apple, dairy, bakery or loan.");
  }

  views.home = function () {
    return header({
      home: true,
      compact: !!query.trim(),
      title: "Find the right scheme",
      sub: D.meta.counts.sectors + " business activities · " + D.meta.counts.schemes + " schemes",
      extra: '<div class="searchwrap"><div class="search">' +
        '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5" fill="none"/><path d="M16 16l4.5 4.5"/></svg>' +
        '<input id="q" type="search" inputmode="search" autocomplete="off" ' +
        'autocorrect="off" autocapitalize="none" spellcheck="false" ' +
        'placeholder="Your activity, e.g. apple orchard" value="' + esc(query) + '">' +
        '<button class="clear" data-clear aria-label="Clear"' + (query ? "" : " hidden") + ">\u00d7</button>" +
        "</div></div>"
    }) + '<main class="home-main' + (query.trim() ? " search-results" : "") + '">' + homeBody() + "</main>";
  };

  // Repaints results in place, leaving the focused input untouched.
  function renderHomeResults() {
    var main = document.querySelector(".home-main");
    if (!main) return;
    var active = !!query.trim();
    main.className = "home-main" + (active ? " search-results" : "");
    main.innerHTML = homeBody();
    var hero = document.querySelector(".home-hero");
    if (hero) hero.classList.toggle("compact", active);
    var clear = document.querySelector("[data-clear]");
    if (clear) clear.hidden = !query;
  }

  views.sectors = function () {
    return header({ title: "Sectors", sub: "Pick the group your work belongs to" }) +
      "<main><div class=\"list\">" + D.macros.map(function (m, i) {
        var n = D.sectors.filter(function (s) { return s.m === i; }).length;
        return '<a class="row" href="#/m/' + i + '"><div class="t"><strong>' + esc(m) +
          '</strong></div><span class="n">' + n + '</span><i class="chev"></i></a>';
      }).join("") + "</div></main>";
  };

  views.macro = function (mi) {
    mi = +mi;
    var list = [];
    D.sectors.forEach(function (s, i) { if (s.m === mi) list.push(i); });
    var groups = {};
    list.forEach(function (i) {
      (groups[D.sectors[i].sub] = groups[D.sectors[i].sub] || []).push(i);
    });
    var body = Object.keys(groups).sort().map(function (sub) {
      return '<div class="section"><h2>' + esc(sub) + "</h2><div class=\"list\">" +
        groups[sub].map(function (i) { return sectorRow(i, null, true); }).join("") + "</div></div>";
    }).join("");

    return header({ back: "Sectors", title: D.macros[mi], sub: list.length + " business activities" }) +
      "<main>" + body + "</main>";
  };

  views.sector = function (si) {
    si = +si;
    var s = D.sectors[si];
    if (!s) return views.notfound();
    var ls = linksFor(si);

    var groups = { Direct: [], Strong: [], Conditional: [], Horizontal: [] };
    ls.forEach(function (e) { groups[D.applicability[e[1]]].push(e); });

    var body = '<div class="tags">' +
      '<span class="tag">' + esc(D.stages[s.st]) + "</span>" +
      '<span class="tag">' + esc(D.classes[s.ec]) + "</span></div>";

    body += facts([
      ["Udyam / MSME", D.treatments[s.ms]],
      ["Who applies", pool("applicants", s.ap)],
      ["First contact", pool("contacts", s.ct)],
      ["Approvals", pool("regulators", s.rg)],
      ["HP gate", pool("gates", s.gt)],
      ["Source", link(pool("sources", s.sr)), "html"]
    ]);

    ["Direct", "Strong", "Conditional", "Horizontal"].forEach(function (kind) {
      var g = groups[kind];
      if (!g.length) return;
      body += '<div class="section"><h2>' + kind + " · " + g.length + "</h2>" +
        '<p class="hint">' + esc(APP_HINT[kind]) + "</p><div class=\"list\">" +
        g.map(function (e) { return schemeRow(e[0], null, si); }).join("") + "</div></div>";
    });

    if (!ls.length) body += emptyState("No routes mapped for this activity.");

    return header({
      back: "Back",
      title: s.a,
      action: saveButton("s" + si),
      sub: s.sub + " · " + D.macros[s.m] + " · " + ls.length + " schemes"
    }) + "<main>" + body + "</main>";
  };

  // A collapsed panel. The summary layer above stays exactly as short as it is
  // now; everything a reader might want next sits behind one tap.
  function panel(title, count, body, open) {
    if (!body) return "";
    return '<details class="acc"' + (open ? " open" : "") + "><summary>" +
      esc(title) + (count ? " \u00b7 " + count : "") +
      '</summary><div class="body">' + body + "</div></details>";
  }

  function contactBlock(j) {
    var c = D.contacts[j];
    return "<p><b>" + esc(c.name) + "</b><br>" + esc(c.use) +
      (c.note ? "<br>" + esc(c.note) : "") +
      (c.url ? "<br>" + link(c.url) : "") + "</p>";
  }

  function normBlock(j) {
    var n = D.norms[j];
    return "<p><b>" + esc(n.item) + "</b> \u00b7 " + esc(n.theme) + "<br>" +
      esc(n.norm) + " \u2014 " + esc(n.pattern) +
      (n.cap ? "<br><b>Ceiling:</b> " + esc(n.cap) : "") +
      (n.cond ? "<br>" + esc(n.cond) : "") + "</p>";
  }

  // What the workbook recorded about this scheme *for the activity the reader
  // arrived from*: the grade, why it was mapped, the order to do things in and
  // any condition that differs from the scheme's own caution.
  function contextPanel(si, ki) {
    var s = D.sectors[si];
    var e = s && linkContext(si, ki);
    if (!e) return "";
    var kind = D.applicability[e[1]];
    return '<div class="section"><h2>For ' + esc(s.a) + "</h2>" +
      '<div class="tags"><span class="tag' + (e[1] < 2 ? " good" : "") + '">' +
      esc(kind) + " match</span></div>" +
      facts([
        ["Why mapped", pool("why", e[2])],
        ["Do this first", pool("seq", e[3])],
        ["Condition", e.length > 4 ? pool("cond", e[4]) : ""]
      ]) +
      '<a class="row" href="#/s/' + si + '"><div class="t"><strong>' + esc(s.a) +
      "</strong><small>Back to the activity and its other " + (s.n - 1) +
      " routes</small></div><i class=\"chev\"></i></a></div>";
  }

  // Everything below the summary, each part rendered only when the workbook
  // actually has rows for this scheme.
  function schemePanels(ki) {
    var k = D.schemes[ki];
    var out = "";

    var own = xref.own[ki] || [];
    var dept = deptContacts(k);
    if (own.length || dept.length) {
      out += panel("Official pages and who to ask", own.length + dept.length,
        (own.length ? "<p><b>This scheme's own page</b></p>" +
          own.map(contactBlock).join("") : "") +
        (dept.length ? "<p><b>Department or portal to ask</b></p>" +
          dept.map(contactBlock).join("") : "") +
        '<p><a href="#/contacts">All ' + D.contacts.length + " departments and portals</a></p>");
    }

    var norms = schemeNorms(k);
    if (norms.length) {
      var shown = norms.slice(0, 8);
      out += panel("Benchmark cost norms", norms.length,
        "<p>Indicative norms the department uses to size assistance. Confirm the " +
        "component is admissible on this route before costing a project.</p>" +
        shown.map(normBlock).join("") +
        (norms.length > shown.length
          ? '<p><a href="#/norms">' + (norms.length - shown.length) +
            " more, and the full cost tables</a></p>"
          : '<p><a href="#/norms">All ' + D.norms.length + " cost norms and caps</a></p>"));
    }

    var lg = xref.legacy[norm(k.name)];
    if (lg !== undefined) {
      var l = D.legacy[lg];
      out += panel("Why this route is flagged", 0,
        "<p><b>Position:</b> " + esc(l.position) + "</p><p>" + esc(l.why) + "</p>" +
        (l.alt ? "<p><b>Instead:</b> " + esc(l.alt) + "</p>" : "") +
        (l.src ? "<p>" + link(l.src) + "</p>" : ""), true);
    }

    var rel = relatedSchemes(ki);
    var fam = rel.family.slice(0, 6);
    if (rel.close.length || fam.length) {
      out += panel("Related routes", rel.close.length + fam.length,
        (rel.close.length
          ? "<p><b>Same programme</b></p><div class=\"list\">" +
            rel.close.map(function (i) { return schemeRow(i); }).join("") + "</div>"
          : "") +
        (fam.length
          ? "<p><b>Same family</b></p><div class=\"list\">" +
            fam.map(function (i) { return schemeRow(i); }).join("") + "</div>"
          : "") +
        '<p><a href="#/schemes/' + esc(encodeURIComponent(k.family)) + '">All ' +
        rel.family.length + " in " + esc(k.family) + "</a></p>");
    }

    return out ? '<div class="section"><h2>Go deeper</h2>' + out + "</div>" : "";
  }

  views.scheme = function (ki, si) {
    ki = +ki;
    var k = D.schemes[ki];
    if (!k) return views.notfound();
    si = si == null ? null : +si;
    var from = si != null && D.sectors[si] ? D.sectors[si] : null;
    var st = STATUS[k.status] || [k.status, ""];

    var body = '<div class="tags">' + statusTag(k) +
      '<span class="tag">' + esc(k.gov) + "</span></div>";

    if (st[1] === "stop") {
      body += '<div class="note"><strong>Do not plan a new project on this</strong>' +
        "The published window has ended. Use it only after an official successor or extension is confirmed in writing.</div>";
    }

    body += facts([
      ["Best for", k.bestFor],
      ["Support type", k.support],
      ["Key benefit", k.benefit],
      ["Your share", k.margin],
      ["Who is eligible", k.eligible],
      ["Unit stage", k.stage],
      ["Bank linked", k.bank],
      ["Parent", k.parent]
    ]);

    body += '<div class="section"><h2>How to access</h2>' +
      facts([["Route", k.access], ["Agency", k.agency], ["Official page", link(k.src), "html"]]) +
      "</div>";

    if (k.caution) {
      body += '<div class="note"><strong>Before you spend money</strong>' + esc(k.caution) + "</div>";
    }

    if (from) body += contextPanel(si, ki);
    body += schemePanels(ki);

    body += '<div class="note plain"><strong>Stacking</strong>' + esc(D.stacking) + "</div>";

    if (k.src) {
      body += '<a class="btn" href="' + esc(k.src) + '" target="_blank" rel="noopener">' +
        "Open official page" +
        '<svg viewBox="0 0 24 24"><path d="M7 17L17 7M9 7h8v8"/></svg></a>';
    }
    body += '<a class="btn ghost" href="#/k/' + ki + '/where">Where it applies \u00b7 ' + k.reach + " activities</a>";

    return header({
      back: from ? from.a : "Back",
      title: k.name,
      action: saveButton("k" + ki),
      sub: k.family + (k.label ? " \u00b7 " + k.label : "")
    }) + "<main>" + body + "</main>";
  };

  views.schemeWhere = function (ki) {
    ki = +ki;
    var k = D.schemes[ki];
    if (!k) return views.notfound();
    var byMacro = {};
    Object.keys(D.links).forEach(function (si) {
      D.links[si].forEach(function (e) {
        if (e[0] !== ki) return;
        var s = D.sectors[+si];
        (byMacro[D.macros[s.m]] = byMacro[D.macros[s.m]] || []).push([+si, D.applicability[e[1]]]);
      });
    });
    var body = Object.keys(byMacro).sort().map(function (m) {
      return '<div class="section"><h2>' + esc(m) + " · " + byMacro[m].length + "</h2><div class=\"list\">" +
        byMacro[m].map(function (p) {
          var s = D.sectors[p[0]];
          return '<a class="row" href="#/s/' + p[0] + '"><div class="t"><strong>' + esc(s.a) +
            "</strong><small>" + esc(p[1]) + " match · " + esc(s.sub) + "</small></div><i class=\"chev\"></i></a>";
        }).join("") + "</div></div>";
    }).join("") || emptyState("This scheme is not mapped to a catalogue activity.");

    return header({ back: "Scheme", title: "Where it applies", sub: k.name }) + "<main>" + body + "</main>";
  };

  views.schemes = function (fam) {
    var families = D.schemes.map(function (k) { return k.family; })
      .filter(function (v, i, a) { return a.indexOf(v) === i; }).sort();
    var active = fam ? decodeURIComponent(fam) : "";
    var list = [];
    D.schemes.forEach(function (k, i) { if (!active || k.family === active) list.push(i); });
    list.sort(function (a, b) { return D.schemes[a].name.localeCompare(D.schemes[b].name); });

    var chips = '<div class="chips"><button class="chip' + (active ? "" : " on") +
      '" data-fam="">All</button>' + families.map(function (f) {
        return '<button class="chip' + (f === active ? " on" : "") + '" data-fam="' +
          esc(encodeURIComponent(f)) + '">' + esc(f) + "</button>";
      }).join("") + "</div>";

    return header({ title: "Schemes", sub: list.length + " routes", extra: "" }) +
      "<main>" + chips + '<div class="list">' +
      list.map(function (i) { return schemeRow(i); }).join("") + "</div></main>";
  };

  views.saved = function () {
    var keys = saved();
    if (!keys.length) {
      return header({ title: "Saved" }) + "<main>" +
        emptyState("Nothing saved yet. Tap the bookmark on any activity or scheme to keep it here for offline reference.") +
        "</main>";
    }
    var secs = keys.filter(function (k) { return k[0] === "s"; });
    var schs = keys.filter(function (k) { return k[0] === "k"; });
    var body = "";
    if (secs.length) {
      body += '<div class="section"><h2>Activities</h2><div class="list">' +
        secs.map(function (k) { return sectorRow(+k.slice(1)); }).join("") + "</div></div>";
    }
    if (schs.length) {
      body += '<div class="section"><h2>Schemes</h2><div class="list">' +
        schs.map(function (k) { return schemeRow(+k.slice(1)); }).join("") + "</div></div>";
    }
    return header({ title: "Saved", sub: keys.length + (keys.length === 1 ? " item" : " items") }) +
      "<main>" + body + "</main>";
  };

  views.more = function () {
    return header({ title: "More" }) + "<main><div class=\"list\">" +
      '<a class="row" href="#/contacts"><div class="t"><strong>Departments and portals</strong>' +
      "<small>" + D.contacts.length + " official contacts</small></div><i class=\"chev\"></i></a>" +
      '<a class="row" href="#/norms"><div class="t"><strong>Cost norms and caps</strong>' +
      "<small>" + D.norms.length + " horticulture and infrastructure benchmarks</small></div><i class=\"chev\"></i></a>" +
      '<a class="row" href="#/legacy"><div class="t"><strong>Closed and legacy schemes</strong>' +
      "<small>" + D.legacy.length + " routes to stop relying on</small></div><i class=\"chev\"></i></a>" +
      '<a class="row" href="#/about"><div class="t"><strong>About and disclaimer</strong>' +
      "<small>Sources, verification date, limits</small></div><i class=\"chev\"></i></a>" +
      "</div></main>";
  };

  views.contacts = function () {
    return header({ back: "More", title: "Departments and portals" }) + "<main>" +
      D.contacts.map(function (c) {
        return '<details class="acc"><summary>' + esc(c.name) + '</summary><div class="body">' +
          "<p><b>Use it for:</b> " + esc(c.use) + "</p>" +
          (c.note ? "<p>" + esc(c.note) + "</p>" : "") +
          (c.url ? "<p>" + link(c.url) + "</p>" : "") + "</div></details>";
      }).join("") + "</main>";
  };

  views.norms = function () {
    var themes = {};
    D.norms.forEach(function (n) { (themes[n.theme] = themes[n.theme] || []).push(n); });
    var body = Object.keys(themes).map(function (t) {
      return '<div class="section"><h2>' + esc(t) + "</h2>" + themes[t].map(function (n) {
        return '<details class="acc"><summary>' + esc(n.item) + '</summary><div class="body">' +
          "<p><b>Norm:</b> " + esc(n.norm) + "</p>" +
          "<p><b>Assistance:</b> " + esc(n.pattern) + "</p>" +
          (n.cap ? "<p><b>Ceiling:</b> " + esc(n.cap) + "</p>" : "") +
          (n.who ? "<p><b>Applicant:</b> " + esc(n.who) + "</p>" : "") +
          (n.route ? "<p><b>Route:</b> " + esc(n.route) + "</p>" : "") +
          (n.cond ? "<p><b>Conditions:</b> " + esc(n.cond) + "</p>" : "") +
          (n.src ? "<p>" + link(n.src) + "</p>" : "") + "</div></details>";
      }).join("") + "</div>";
    }).join("");
    return header({ back: "More", title: "Cost norms and caps", sub: "Benchmark costs used to size a subsidy" }) +
      "<main>" + body + "</main>";
  };

  views.legacy = function () {
    return header({ back: "More", title: "Closed and legacy", sub: "Do not build a new project on these" }) +
      "<main>" + D.legacy.map(function (l) {
        return '<details class="acc"><summary>' + esc(l.name) + '</summary><div class="body">' +
          "<p><b>Position:</b> " + esc(l.position) + "</p>" +
          "<p>" + esc(l.why) + "</p>" +
          (l.alt ? "<p><b>Instead:</b> " + esc(l.alt) + "</p>" : "") +
          (l.src ? "<p>" + link(l.src) + "</p>" : "") + "</div></details>";
      }).join("") + "</main>";
  };

  views.about = function () {
    var body = '<div class="note plain"><strong>What this is</strong>' +
      "A searchable copy of a verified Himachal Pradesh MSME and agriculture scheme guide: " +
      D.meta.counts.sectors + " business activities, " + D.meta.counts.schemes + " schemes and " +
      D.meta.counts.links + " activity-to-scheme matches. Official-source research cutoff " +
      esc(D.meta.verified) + ".</div>";

    body += '<div class="section"><h2>Reading a match</h2><div class="facts">' +
      ["Direct", "Strong", "Conditional", "Horizontal"].map(function (k) {
        return '<dl class="fact"><dt>' + k + "</dt><dd>" + esc(APP_HINT[k]) + "</dd></dl>";
      }).join("") + "</div></div>";

    body += '<div class="section"><h2>Reading a status</h2><div class="facts">' +
      Object.keys(STATUS).map(function (s) {
        return '<dl class="fact"><dt>' + esc(STATUS[s][0]) + "</dt><dd>" + esc({
          "Open now": "A current window exists, but sanction and budget are never guaranteed.",
          "Active - bank or continuous route": "Operational product or portal; appraisal and compliance still apply.",
          "Active - annual target or departmental sanction": "Access depends on allocation, target, call or written sanction.",
          "Active - cluster or project area": "Available only inside a notified cluster or project area.",
          "Fresh window closed": "Published period has ended; use only after a confirmed successor."
        }[s]) + "</dd></dl>";
      }).join("") + "</div></div>";

    body += '<div class="note"><strong>Disclaimer</strong>' +
      "This app is a reference, not an approval. Scheme terms, ceilings and district targets change. " +
      "Confirm eligibility and live intake in writing with the department, lender or portal before " +
      "committing money to a project.</div>";

    body += '<div class="note plain"><strong>Offline</strong>' +
      "Everything is stored on your device after the first load, so search works without a network. " +
      "Official pages still need a connection.</div>";

    return header({ back: "More", title: "About" }) + "<main>" + body + "</main>";
  };

  views.notfound = function () {
    return header({ title: "Not found" }) + "<main>" + emptyState("That page does not exist.") + "</main>";
  };

  // ---------------------------------------------------------------- router
  function route() {
    if (!D) return;
    var hash = location.hash.replace(/^#\/?/, "");
    var parts = hash.split("/").filter(function (p) { return p !== ""; });
    var head = parts[0] || "";
    var html;

    switch (head) {
      case "": html = views.home(); break;
      case "sectors": html = views.sectors(); break;
      case "m": html = views.macro(parts[1]); break;
      case "s": html = views.sector(parts[1]); break;
      case "k":
        html = parts[2] === "where" ? views.schemeWhere(parts[1])
          : views.scheme(parts[1], parts[2] === "from" ? parts[3] : null);
        break;
      case "schemes": html = views.schemes(parts[1]); break;
      case "saved": html = views.saved(); break;
      case "more": html = views.more(); break;
      case "contacts": html = views.contacts(); break;
      case "norms": html = views.norms(); break;
      case "legacy": html = views.legacy(); break;
      case "about": html = views.about(); break;
      default: html = views.notfound();
    }

    app.innerHTML = html;

    var q = document.getElementById("q");
    if (q) {
      q.addEventListener("input", onQuery);
      if (query) { q.focus(); q.setSelectionRange(q.value.length, q.value.length); }
    }

    window.scrollTo(0, scrollMemory[hash] || 0);
  }

  // Coalesce bursts of keystrokes into one repaint per frame. The input itself
  // is never re-rendered, so there is no focus or caret to restore and the
  // on-screen keyboard stays up.
  var queryFrame = 0;
  function onQuery(e) {
    query = e.target.value;
    if (queryFrame) return;
    queryFrame = requestAnimationFrame(function () {
      queryFrame = 0;
      renderHomeResults();
    });
  }

  // -------------------------------------------------------------- listeners
  document.addEventListener("click", function (e) {
    var settings = e.target.closest("[data-settings]");
    if (settings) {
      var menu = settings.parentNode.querySelector(".settings-menu");
      var open = menu.hidden;
      menu.hidden = !open;
      settings.setAttribute("aria-expanded", String(open));
      return;
    }

    var openMenu = document.querySelector('.settings-menu:not([hidden])');
    if (openMenu && !e.target.closest(".settings-menu")) {
      openMenu.hidden = true;
      var openToggle = document.querySelector('[data-settings][aria-expanded="true"]');
      if (openToggle) openToggle.setAttribute("aria-expanded", "false");
    }

    var back = e.target.closest("[data-back]");
    if (back) { history.back(); return; }

    var clear = e.target.closest("[data-clear]");
    if (clear) {
      query = "";
      var input = document.getElementById("q");
      if (input) { input.value = ""; input.focus(); }
      renderHomeResults();
      return;
    }

    var fam = e.target.closest("[data-fam]");
    if (fam) {
      location.hash = fam.dataset.fam ? "#/schemes/" + fam.dataset.fam : "#/schemes";
      return;
    }

    var save = e.target.closest("[data-save]");
    if (save) {
      var on = toggleSaved(save.dataset.save);
      save.classList.toggle("on", on);
      save.setAttribute("aria-label", on ? "Remove from saved" : "Save");
      return;
    }
  });

  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    var menu = document.querySelector('.settings-menu:not([hidden])');
    if (!menu) return;
    menu.hidden = true;
    var toggle = document.querySelector('[data-settings][aria-expanded="true"]');
    if (toggle) {
      toggle.setAttribute("aria-expanded", "false");
      toggle.focus();
    }
  });

  window.addEventListener("scroll", function () {
    var h = document.querySelector(".head");
    if (h) h.classList.toggle("stuck", window.scrollY > 4);
    scrollMemory[location.hash.replace(/^#\/?/, "")] = window.scrollY;
  }, { passive: true });

  window.addEventListener("hashchange", route);

  // ------------------------------------------------------------------ boot
  fetch("data.json")
    .then(function (r) { return r.json(); })
    .then(function (json) {
      D = json;
      buildIndex();
      buildXref();
      route();
    })
    .catch(function () {
      app.innerHTML = '<div class="empty"><p>Could not load the scheme data. ' +
        "Check your connection and reload.</p></div>";
    });

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("sw.js").catch(function () {});
    });
  }
})();
