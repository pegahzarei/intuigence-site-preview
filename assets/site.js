/* IntuigenceAI site behavior: menu, carousel, reveal, demo form. No deps. */
(function () {
  "use strict";

  /* ============================================================
     FORM ENDPOINT — paste your form service URL here to receive
     submissions by email (e.g. Formspree: https://formspree.io/f/XXXXXXXX).
     Leave empty to fall back to composing an email in the visitor's
     mail client addressed to info@intuigence.ai.
     ============================================================ */
  var FORM_ENDPOINT = "https://formspree.io/f/xoeazbjr";

  var AUTOPLAY_MS = 6000;
  var body = document.body;

  /* ---------------- reveal on scroll (disable with ?nofx) ---------------- */
  var fx = !/[?&]nofx\b/.test(location.search) &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (fx) {
    body.classList.add("fx");
    var toReveal = [].slice.call(document.querySelectorAll("main section, .foot-top"));
    toReveal.forEach(function (el) { el.classList.add("rv"); });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px" });
    toReveal.forEach(function (el) { io.observe(el); });
  }

  /* ---------------- dismissible announcement bar ---------------- */
  var ann = document.querySelector(".annbar[data-ann]");
  if (ann) {
    var key = "ann-dismissed-" + ann.getAttribute("data-ann");
    try { if (localStorage.getItem(key)) ann.classList.add("gone"); } catch (e) {}
    var x = ann.querySelector(".ann-x");
    if (x) x.addEventListener("click", function () {
      ann.classList.add("gone");
      try { localStorage.setItem(key, "1"); } catch (e) {}
    });
  }

  /* ---------------- sticky nav state over dark hero ---------------- */
  if (body.classList.contains("overdark")) {
    var onScroll = function () {
      body.classList.toggle("scrolled", window.scrollY > 40);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  /* ---------------- full-screen menu ---------------- */
  var burger = document.querySelector(".burger");
  var menu = document.getElementById("menu");
  if (burger && menu) {
    menu.removeAttribute("hidden");
    var setOpen = function (open) {
      body.classList.toggle("menu-open", open);
      burger.setAttribute("aria-expanded", open ? "true" : "false");
      burger.querySelector(".burger-label").textContent = open ? "Close" : "Menu";
    };
    burger.addEventListener("click", function () {
      setOpen(!body.classList.contains("menu-open"));
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && body.classList.contains("menu-open")) setOpen(false);
    });
    menu.addEventListener("click", function (e) {
      if (e.target.closest("a")) setOpen(false);
    });
  }

  /* ---------------- intuigents carousel: continuous auto-advance
       with a progress fill on the active chip (palantir-style).
       Interaction jumps to the chosen slide and restarts the cycle;
       the cycle pauses while off-screen or when the tab is hidden. */
  var car = document.querySelector("[data-carousel]");
  if (car) {
    var track = car.querySelector(".slides");
    var slides = [].slice.call(track.children);
    var chips = [].slice.call(car.querySelectorAll(".chip"));
    var prev = car.querySelector("[data-prev]");
    var next = car.querySelector("[data-next]");
    var cur = 0, timer = null;
    var autoplay = fx && chips.length > 1;

    var fill = function (i) {
      chips.forEach(function (c) { c.classList.remove("filling"); });
      if (!autoplay) return;
      var c = chips[i];
      c.style.setProperty("--chip-dur", AUTOPLAY_MS + "ms");
      void c.offsetWidth; /* restart the CSS animation */
      c.classList.add("filling");
    };
    var mark = function (i) {
      cur = i;
      chips.forEach(function (c, j) { c.setAttribute("aria-selected", i === j ? "true" : "false"); });
      fill(i);
    };
    var go = function (i, smooth) {
      i = (i + slides.length) % slides.length;
      mark(i);
      track.scrollTo({ left: slides[i].offsetLeft - track.offsetLeft, behavior: smooth === false ? "auto" : "smooth" });
    };
    var restart = function () {
      if (timer) clearInterval(timer);
      if (!autoplay) return;
      timer = setInterval(function () { go(cur + 1); }, AUTOPLAY_MS);
    };

    chips.forEach(function (c, i) {
      c.addEventListener("click", function () { go(i); restart(); });
    });
    if (prev) prev.addEventListener("click", function () { go(cur - 1); restart(); });
    if (next) next.addEventListener("click", function () { go(cur + 1); restart(); });

    /* keep chip state in sync with manual swipes */
    var syncT;
    track.addEventListener("scroll", function () {
      clearTimeout(syncT);
      syncT = setTimeout(function () {
        var i = Math.round(track.scrollLeft / slides[0].offsetWidth);
        if (i !== cur && slides[i]) { mark(i); restart(); }
      }, 90);
    }, { passive: true });

    /* resync the fill with the timer when the tab becomes visible again */
    document.addEventListener("visibilitychange", function () {
      if (!document.hidden) { fill(cur); restart(); }
    });

    mark(0);
    restart();
  }

  /* ---------------- demo form ---------------- */
  var form = document.querySelector("form[data-demo]");
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var msg = form.querySelector(".msg");
      if (form.querySelector('input[name="website"]').value) return; /* honeypot */
      var get = function (n) { return (form.querySelector('[name="' + n + '"]') || {}).value || ""; };
      var name = get("name").trim(), email = get("email").trim(),
          company = get("company").trim(), task = get("task").trim();
      if (!name || !email || !/.+@.+\..+/.test(email)) {
        msg.className = "msg err";
        msg.textContent = "Please add your name and a valid work email.";
        return;
      }
      if (FORM_ENDPOINT) {
        var btn = form.querySelector('button[type="submit"]');
        btn.disabled = true;
        fetch(FORM_ENDPOINT, {
          method: "POST",
          headers: { "Accept": "application/json" },
          body: new FormData(form)
        }).then(function (r) {
          if (!r.ok) throw new Error("bad status " + r.status);
          msg.className = "msg ok";
          msg.textContent = "Received. We will get back to you shortly.";
          form.reset();
        }).catch(function () {
          msg.className = "msg err";
          msg.textContent = "Something went wrong. Write to info@intuigence.ai and we will take it from there.";
        }).finally(function () { btn.disabled = false; });
        return;
      }
      var subject = "Demo request: " + (company || name);
      var lines = ["Name: " + name, "Email: " + email, "Company: " + company, "", "Worst engineering task:", task];
      location.href = "mailto:info@intuigence.ai?subject=" + encodeURIComponent(subject) +
        "&body=" + encodeURIComponent(lines.join("\n"));
      msg.className = "msg ok";
      msg.textContent = "Opening your email client. If nothing happens, write to info@intuigence.ai.";
    });
  }
})();

/* v3: text-rise reveals, stagger indices, testimonial carousel */
(function () {
  "use strict";
  var fx = !/[?&]nofx\b/.test(location.search) &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* headline rise: mask-wrap plain-text headings */
  if (fx) {
    [].slice.call(document.querySelectorAll(".sechead h2, .pagehead h1, .ctaband h2")).forEach(function (el) {
      if (el.querySelector("img, svg")) return;
      el.innerHTML = '<span class="fxm"><span class="fxi">' + el.innerHTML + "</span></span>";
    });
    /* stagger indices for card/stat/step groups */
    [".prodgrid", ".stats", ".steps"].forEach(function (sel) {
      [].slice.call(document.querySelectorAll(sel)).forEach(function (grp) {
        [].slice.call(grp.children).forEach(function (child, i) {
          child.style.setProperty("--i", Math.min(i, 8));
        });
      });
    });
  }

  /* testimonials */
  var q = document.querySelector("[data-quotes]");
  if (q) {
    var slides = [].slice.call(q.querySelectorAll(".qslide"));
    var count = q.querySelector("[data-qcount]");
    var cur = 0, timer = null;
    var pad = function (n) { return (n < 10 ? "0" : "") + n; };
    var show = function (i) {
      cur = (i + slides.length) % slides.length;
      slides.forEach(function (s, j) { s.classList.toggle("is-on", j === cur); });
      if (count) count.textContent = pad(cur + 1) + " / " + pad(slides.length);
    };
    var restart = function () {
      if (timer) clearInterval(timer);
      if (!fx) return;
      timer = setInterval(function () { show(cur + 1); }, 7000);
    };
    var prev = q.querySelector("[data-qprev]"), next = q.querySelector("[data-qnext]");
    if (prev) prev.addEventListener("click", function () { show(cur - 1); restart(); });
    if (next) next.addEventListener("click", function () { show(cur + 1); restart(); });
    document.addEventListener("visibilitychange", function () { if (!document.hidden) restart(); });
    show(0);
    restart();
  }
})();

/* v4: cycling step list + table row stagger */
(function () {
  "use strict";
  var fx = !/[?&]nofx\b/.test(location.search) &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  [].slice.call(document.querySelectorAll("[data-steps]")).forEach(function (grp) {
    var steps = [].slice.call(grp.querySelectorAll(".step"));
    if (steps.length < 2) return;
    var cur = 0, timer = null;
    var set = function (i) {
      cur = (i + steps.length) % steps.length;
      steps.forEach(function (s, j) { s.classList.toggle("on", j === cur); });
    };
    var restart = function () {
      if (timer) clearInterval(timer);
      if (!fx) { steps.forEach(function (s) { s.classList.add("on"); }); return; }
      timer = setInterval(function () { set(cur + 1); }, 6000);
    };
    steps.forEach(function (s, i) {
      s.addEventListener("click", function () { set(i); restart(); });
    });
    set(0);
    restart();
  });

  if (fx) {
    [].slice.call(document.querySelectorAll("tbody")).forEach(function (tb) {
      [].slice.call(tb.rows).forEach(function (r, i) { r.style.setProperty("--i", Math.min(i, 6)); });
    });
  }
})();

/* v5: cycling comparison tabs */
(function () {
  "use strict";
  var fx = !/[?&]nofx\b/.test(location.search) &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  [].slice.call(document.querySelectorAll("[data-tabs]")).forEach(function (grp) {
    var tabs = [].slice.call(grp.querySelectorAll(".verses-list button"));
    var panels = [].slice.call(grp.querySelectorAll(".vpanel"));
    if (tabs.length < 2 || tabs.length !== panels.length) return;
    var cur = 0, timer = null;
    var set = function (i) {
      cur = (i + tabs.length) % tabs.length;
      tabs.forEach(function (b, j) { b.classList.toggle("on", j === cur); });
      panels.forEach(function (p, j) { p.classList.toggle("on", j === cur); });
    };
    var restart = function () {
      if (timer) clearInterval(timer);
      if (!fx) return;
      timer = setInterval(function () { set(cur + 1); }, 5200);
    };
    tabs.forEach(function (b, i) {
      b.addEventListener("click", function () { set(i); restart(); });
    });
    set(0);
    restart();
  });
})();

/* v7: layout-shift lock for swap components + stat counters */
(function () {
  "use strict";
  var fx = !/[?&]nofx\b/.test(location.search) &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* lock swap containers to their tallest child so the page never jumps */
  var lock = function () {
    [].slice.call(document.querySelectorAll(".qtrack, .verses-panels")).forEach(function (tr) {
      if (tr.getBoundingClientRect().width < 80) { tr.style.minHeight = ""; return; }
      var h = 0;
      [].slice.call(tr.children).forEach(function (s) { h = Math.max(h, s.scrollHeight); });
      if (h) tr.style.minHeight = h + "px";
    });
  };
  document.addEventListener("visibilitychange", function () { if (!document.hidden) lock(); });
  if (document.readyState === "complete") lock();
  else window.addEventListener("load", lock);
  var rT;
  window.addEventListener("resize", function () { clearTimeout(rT); rT = setTimeout(lock, 150); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { setTimeout(lock, 60); });

  /* count-up on stat figures */
  if (fx && "IntersectionObserver" in window) {
    var ease = function (t) { return 1 - Math.pow(1 - t, 3); };
    [].slice.call(document.querySelectorAll(".stats b")).forEach(function (el) {
      var m = el.textContent.match(/^([^0-9]*)([0-9][0-9.,]*)(.*)$/);
      if (!m) return;
      var target = parseFloat(m[2].replace(/,/g, ""));
      var dec = (m[2].split(".")[1] || "").length;
      var io = new IntersectionObserver(function (es) {
        if (!es[0].isIntersecting) return;
        io.disconnect();
        var t0 = performance.now(), D = 1100;
        var tick = function (now) {
          var p = Math.min(1, (now - t0) / D);
          el.textContent = m[1] + (target * ease(p)).toFixed(dec) + m[3];
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }, { threshold: 0.4 });
      io.observe(el);
      var r = el.getBoundingClientRect();
      if (window.innerHeight > 0 && r.top < window.innerHeight && r.bottom > 0) {
        io.disconnect();
        el.textContent = m[1] + m[2] + m[3];
      }
    });
  }
})();


/* v12: rotating hero headlines */
(function () {
  "use strict";
  var fx = !/[?&]nofx\b/.test(location.search) &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var rot = document.querySelector("[data-hero-rotate]");
  if (!rot) return;
  var slides = [].slice.call(rot.querySelectorAll(".hslide"));
  if (slides.length < 2 || !fx) return;
  var cur = 0;
  var next = function () {
    slides[cur].classList.remove("on");
    cur = (cur + 1) % slides.length;
    slides[cur].classList.add("on");
    schedule();
  };
  var schedule = function () {
    var dur = parseInt(slides[cur].getAttribute("data-dur"), 10) || 5000;
    setTimeout(next, dur);
  };
  schedule();
})();

/* v19: in-page anchor clicks land exactly, even if layout shifts mid-scroll */
(function () {
  "use strict";
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  document.addEventListener("click", function (e) {
    var a = e.target.closest ? e.target.closest('a[href^="#"]') : null;
    if (!a) return;
    var id = a.getAttribute("href").slice(1);
    var el = id && document.getElementById(id);
    if (!el) return;
    e.preventDefault();
    history.pushState(null, "", "#" + id);
    var target = function () {
      var sm = parseFloat(getComputedStyle(el).scrollMarginTop) || 0;
      return el.getBoundingClientRect().top + window.scrollY - sm;
    };
    window.scrollTo({ top: target(), behavior: reduced ? "auto" : "smooth" });
    var settle = function () {
      var t = target();
      var drift = Math.abs(window.scrollY - t);
      /* correct small landing drift only; never fight the user's own scrolling */
      if (drift > 1 && drift < 120) window.scrollTo({ top: t, behavior: "auto" });
    };
    if ("onscrollend" in window) window.addEventListener("scrollend", settle, { once: true });
    setTimeout(settle, 1100);
  });
})();
