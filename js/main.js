(function () {
  "use strict";

  var DICT = window.IGGY_I18N;
  var SUPPORTED = ["fr", "nl", "en"];
  var current = "fr";
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Language ---------- */

  function t(key) {
    return (DICT[current] && DICT[current][key]) || DICT.fr[key] || "";
  }

  function pickLanguage() {
    var fromUrl = new URLSearchParams(window.location.search).get("lang");
    if (SUPPORTED.indexOf(fromUrl) > -1) return fromUrl;

    try {
      var saved = window.localStorage.getItem("iggy-lang");
      if (SUPPORTED.indexOf(saved) > -1) return saved;
    } catch (e) { /* storage can be blocked, fall through */ }

    var browser = (navigator.language || "fr").slice(0, 2).toLowerCase();
    return SUPPORTED.indexOf(browser) > -1 ? browser : "fr";
  }

  function applyLanguage(lang, remember) {
    current = lang;
    document.documentElement.lang = lang;

    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      el.textContent = t(el.getAttribute("data-i18n"));
    });
    document.querySelectorAll("[data-i18n-html]").forEach(function (el) {
      el.innerHTML = t(el.getAttribute("data-i18n-html"));
    });
    document.querySelectorAll("[data-i18n-alt]").forEach(function (el) {
      el.setAttribute("alt", t(el.getAttribute("data-i18n-alt")));
    });
    document.querySelectorAll("[data-i18n-aria]").forEach(function (el) {
      el.setAttribute("aria-label", t(el.getAttribute("data-i18n-aria")));
    });

    /* A page can name its own title and description keys (star.html does). */
    document.title = t(document.body.getAttribute("data-title") || "meta.title");
    var desc = document.querySelector('meta[name="description"]');
    if (desc) desc.setAttribute("content", t(document.body.getAttribute("data-desc") || "meta.desc"));

    document.querySelectorAll(".lang button").forEach(function (btn) {
      btn.setAttribute("aria-pressed", btn.getAttribute("data-lang") === lang ? "true" : "false");
    });

    splitWords();

    if (remember) {
      try { window.localStorage.setItem("iggy-lang", lang); } catch (e) { /* ignore */ }
    }
  }

  /* ---------- Headings that appear word by word ---------- */

  function splitWords() {
    document.querySelectorAll("[data-reveal]").forEach(function (el) {
      var text = el.textContent.trim();
      el.setAttribute("aria-label", text);
      el.innerHTML = text.split(/\s+/).map(function (word, i) {
        return '<span class="w" aria-hidden="true" style="--i:' + i + '">' + word + "</span>";
      }).join(" ");
    });
  }

  function watchReveals() {
    var targets = document.querySelectorAll("[data-reveal]");
    if (reduceMotion || !("IntersectionObserver" in window)) {
      targets.forEach(function (el) { el.classList.add("is-in"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-in");
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: "0px 0px -15% 0px" });
    targets.forEach(function (el) { io.observe(el); });
  }

  document.querySelectorAll(".lang button").forEach(function (btn) {
    btn.addEventListener("click", function () {
      applyLanguage(btn.getAttribute("data-lang"), true);
    });
  });

  applyLanguage(pickLanguage(), false);
  watchReveals();

  /* ---------- Smooth scroll ----------
     Wheel and trackpad: the page glides and slows down gently (no snapping).
     Links to a section: ease in and ease out over about 1.4 seconds.
     Phones keep their own touch scrolling. Off when reduced motion is asked. */

  var lenis = null;
  if (!reduceMotion && window.Lenis) {
    lenis = new window.Lenis({
      lerp: 0.085,
      wheelMultiplier: 0.9,
      smoothWheel: true,
      syncTouch: false,
      autoRaf: true,
      /* Horizontal swipe over the work strip scrolls the strip, not the page. */
      allowNestedScroll: true
    });
  }

  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  document.querySelectorAll('a[href^="#"]').forEach(function (link) {
    link.addEventListener("click", function (e) {
      var id = link.getAttribute("href");
      var target = id === "#top" ? document.body : document.querySelector(id);
      if (!target || !lenis) return;
      e.preventDefault();
      if (id === "#top") {
        lenis.scrollTo(0, { duration: 1.4, easing: easeInOutCubic });
      } else {
        var inner = target.querySelector(".section__inner") || target;
        lenis.scrollTo(inner, { offset: -96, duration: 1.4, easing: easeInOutCubic });
      }
      history.replaceState(null, "", id);
    });
  });

  /* ---------- Menu on small screens ---------- */

  var nav = document.getElementById("nav");
  var menuBtn = nav.querySelector(".nav__menu");

  function setMenu(open) {
    nav.classList.toggle("is-open", open);
    menuBtn.setAttribute("aria-expanded", open ? "true" : "false");
  }

  menuBtn.addEventListener("click", function () {
    setMenu(!nav.classList.contains("is-open"));
  });

  nav.querySelectorAll(".nav__links a").forEach(function (link) {
    link.addEventListener("click", function () { setMenu(false); });
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && nav.classList.contains("is-open")) {
      setMenu(false);
      menuBtn.focus();
    }
  });

  /* ---------- Greeting in four languages ---------- */

  var hello = document.querySelector(".hello__word");
  var greetings = ["Bonjour.", "Hallo.", "Hello.", "Olá."];
  if (hello && !reduceMotion) {
    var g = 0;
    window.setInterval(function () {
      hello.classList.add("is-out");
      window.setTimeout(function () {
        g = (g + 1) % greetings.length;
        hello.textContent = greetings[g];
        hello.classList.remove("is-out");
      }, 450);
    }, 2600);
  }

  /* ---------- Moving strip of work pictures ---------- */

  var strip = document.getElementById("work-strip");
  var pictures = window.IGGY_WORK || [];

  function esc(text) {
    return String(text).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  function renderStrip() {
    if (!strip || !pictures.length) return;
    var track = strip.querySelector(".strip__track");
    var html = pictures.map(function (p) {
      return '<figure class="shot">' +
        '<div class="shot__frame"><img src="' + esc(p.src) + '" alt="' + esc(p.name) + '" loading="lazy" decoding="async"></div>' +
        '<figcaption><span class="shot__name">' + esc(p.name) + '</span>' +
        '<span class="shot__type">' + esc(t("work.type." + p.type)) + "</span></figcaption></figure>";
    }).join("");
    /* Second copy makes the loop seamless; it is hidden from screen readers. */
    track.innerHTML = '<div class="strip__set">' + html + '</div><div class="strip__set" aria-hidden="true">' + html + "</div>";
    track.querySelectorAll('[aria-hidden="true"] img').forEach(function (img) { img.alt = ""; });
    strip.hidden = false;
  }

  renderStrip();
  document.querySelectorAll(".lang button").forEach(function (btn) {
    btn.addEventListener("click", renderStrip);
  });

  /* The strip rolls on its own. Hover pauses it so a horizontal swipe
     (trackpad, or shift + wheel) can move through the pictures.
     Two copies of the set sit side by side; the scroll position stays
     inside the first copy so the loop has no seam. */
  if (strip) {
    var stripPaused = false;
    var stripLast = 0;

    function stripLoopWidth() {
      var set = strip.querySelector(".strip__set");
      return set ? set.offsetWidth : 0;
    }

    function wrapStrip() {
      var half = stripLoopWidth();
      if (half <= 0) return;
      var x = strip.scrollLeft % half;
      /* Stay inside (0, one set]. Jumping by one set looks the same,
         and keeps a little room so a left swipe is not stuck at the edge. */
      if (x <= 0) x += half;
      if (x !== strip.scrollLeft) strip.scrollLeft = x;
    }

    strip.addEventListener("mouseenter", function () { stripPaused = true; });
    strip.addEventListener("mouseleave", function () { stripPaused = false; });
    strip.addEventListener("scroll", wrapStrip, { passive: true });
    strip.addEventListener("wheel", function (e) {
      if (!stripPaused) return;
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
      e.preventDefault();
      var delta = e.deltaX;
      if (e.deltaMode === 1) delta *= 16;
      else if (e.deltaMode === 2) delta *= strip.clientWidth;
      strip.scrollLeft += delta;
      wrapStrip();
    }, { passive: false });

    /* The strip also waits while the page scrolls, so scrolling stays smooth. */
    var pageScrolledAt = -1000;
    window.addEventListener("scroll", function () { pageScrolledAt = performance.now(); }, { passive: true });

    if (!reduceMotion) {
      window.requestAnimationFrame(function roll(now) {
        if (!stripLast) stripLast = now;
        var dt = now - stripLast;
        stripLast = now;
        if (!stripPaused && !strip.hidden && now - pageScrolledAt > 250) {
          var half = stripLoopWidth();
          if (half > 0) {
            /* Same pace as the old 50s loop across one set of pictures. */
            strip.scrollLeft += (half / 50000) * dt;
            wrapStrip();
          }
        }
        window.requestAnimationFrame(roll);
      });
    }
  }

  /* ---------- Contact form ---------- */

  /* Case study pages: the opening film stays still when reduced motion is asked. */
  var heroFilm = document.querySelector(".cs-hero__film");
  if (heroFilm && reduceMotion) {
    heroFilm.removeAttribute("autoplay");
    heroFilm.pause();
  }

  var form = document.getElementById("contact-form");
  if (!form) return;
  var statusEl = document.getElementById("form-status");
  var submitBtn = form.querySelector('button[type="submit"]');

  function setStatus(key) { statusEl.textContent = t(key); }

  form.addEventListener("submit", function (e) {
    e.preventDefault();

    var data = new FormData(form);

    /* Hidden field that only bots fill in. */
    if (data.get("company_site")) {
      setStatus("status.ok");
      return;
    }

    var endpoint = form.getAttribute("data-endpoint");
    if (!endpoint) {
      setStatus("status.notready");
      return;
    }

    data.delete("company_site");
    data.append("language", current);

    submitBtn.disabled = true;
    setStatus("status.sending");

    fetch(endpoint, {
      method: "POST",
      headers: { Accept: "application/json" },
      body: data
    })
      .then(function (res) {
        if (!res.ok) throw new Error("bad status");
        form.reset();
        setStatus("status.ok");
      })
      .catch(function () { setStatus("status.error"); })
      .then(function () { submitBtn.disabled = false; });
  });
})();
