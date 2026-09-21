(function () {
  "use strict";

  /* ---------- content you can edit ---------- */
  var CONFIG = {
    title: "Wedding of Shady & Neveen",
    startISO: "2026-11-22T19:00:00+02:00",       // 7:00 PM, Alexandria (UTC+2 in November)
    startUTC: "20261122T170000Z", endUTC: "20261122T200000Z",
    place: "St. Mary and John the Beloved Church, Janaklees, Alexandria, Egypt",
    mapQuery: "Church of St. Mary and St. John the Beloved Alexandria Egypt",
    // Optional: paste the src="..." link from Google Maps > Share > Embed a map to use that exact pin.
    mapEmbedUrl: "",
    // Optional: a form-service URL (for example from formspree.io) that emails each wish to you.
    // It only works when this file is hosted on your own site; on the claude.ai link it falls back to WhatsApp.
    formEndpoint: "",
    ownerPhone: "201555687219",                               // YOUR WhatsApp number, digits only with country code, e.g. "201001234567". Wishes and RSVPs are sent here privately.
                                                  // (If this is ever left empty, WhatsApp asks the guest to pick a contact.)
    // Music: leave empty to use the built-in soft piano melody, or paste your own song here
    // (a data URI such as "data:audio/mpeg;base64,..." or a URL) and it will play instead.
    musicSrc: "music/music.mp3",
    // YouTube song (its video id from the link). Plays through YouTube's own player, so it needs your own hosting;
    // where embeds are blocked (like the claude.ai link) or the video can't be embedded, the built-in melody plays instead.
    youtubeId: "",
    youtubeStart: 0,
    // Photos: each is { src: data URI, pos: CSS object-position (keeps faces in frame), alt }. Empty list shows placeholders.
    photos: [
      {"src": "photos/photo1.jpg", "pos": "50% 32%", "alt": "Shady and Neveen in white outfits at a cafe"},
      {"src": "photos/photo2.jpg", "pos": "40% 30%", "alt": "Shady placing the ring on Neveen's finger"},
      {"src": "photos/photo3.jpg", "pos": "50% 24%", "alt": "Shady and Neveen holding a bouquet of white roses"},
      {"src": "photos/photo4.jpg", "pos": "45% 32%", "alt": "Shady and Neveen in front of Christmas decorations"}
    ]
  };

  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;


  /* ---------- live Google map (falls back to the drawn map where embeds are blocked) ---------- */
  (function liveMap() {
    var box = document.querySelector(".map"); if (!box) return;
    var src = CONFIG.mapEmbedUrl || ("https://maps.google.com/maps?q=" + encodeURIComponent(CONFIG.mapQuery) + "&z=15&ie=UTF8&iwloc=&output=embed");
    function fallback() {
      var f = box.querySelector("iframe"); if (f) f.remove();
      box.classList.remove("live");
      document.removeEventListener("securitypolicyviolation", onViolation);
    }
    function onViolation(e) { if (/google\.com/.test(e.blockedURI || "") || e.violatedDirective === "frame-src" || e.violatedDirective === "child-src") fallback(); }
    document.addEventListener("securitypolicyviolation", onViolation);
    var f = document.createElement("iframe");
    f.title = "Map of Church of St. Mary and St. John the Beloved, Alexandria";
    f.loading = "lazy"; f.referrerPolicy = "no-referrer-when-downgrade"; f.allowFullscreen = true;
    f.src = src;
    box.insertBefore(f, box.firstChild);
    box.classList.add("live");
  })();

  /* ---------- background music ---------- */
  var Music = (function () {
    var btn = document.getElementById("music");
    var wanted = false, running = false, ctx, master, bus, timer, nextTime = 0, step = 0, fileEl = null;

    // built-in melody (D major, slow arpeggios): four bars, two melody variants
    var BARS = [
      { bass: 38, arp: [50, 57, 62, 66, 69, 66, 62, 57], mel: [[78, 74], [76, 73]] },
      { bass: 45, arp: [45, 52, 57, 61, 64, 61, 57, 52], mel: [[76, 73], [73, 69]] },
      { bass: 47, arp: [47, 54, 59, 62, 66, 62, 59, 54], mel: [[74, 78], [78, 74]] },
      { bass: 43, arp: [43, 50, 55, 59, 62, 59, 55, 50], mel: [[74, 71], [71, 74]] }
    ];
    var STEP = 60 / 72 / 2;

    function mtof(m) { return 440 * Math.pow(2, (m - 69) / 12); }
    function tone(m, t, dur, vol) {
      var f = mtof(m), o = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain(), g2 = ctx.createGain();
      o.type = "triangle"; o.frequency.value = f; o2.type = "sine"; o2.frequency.value = f * 2;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      g2.gain.setValueAtTime(0.0001, t); g2.gain.exponentialRampToValueAtTime(vol * 0.3, t + 0.01); g2.gain.exponentialRampToValueAtTime(0.0001, t + dur * 0.55);
      o.connect(g); o2.connect(g2); g.connect(bus); g2.connect(bus);
      o.start(t); o2.start(t); o.stop(t + dur + 0.05); o2.stop(t + dur + 0.05);
    }
    function scheduleStep(n, t) {
      var bar = BARS[Math.floor(n / 8) % 4], pos = n % 8, variant = Math.floor(n / 32) % 2;
      tone(bar.arp[pos], t, 1.5, 0.11);
      if (pos === 0) tone(bar.bass, t, 3.4, 0.16);
      if (pos === 0) tone(bar.mel[variant][0], t, 2.6, 0.13);
      if (pos === 4) tone(bar.mel[variant][1], t, 2.6, 0.13);
    }
    function pump() {
      while (nextTime < ctx.currentTime + 0.6) { scheduleStep(step, nextTime); nextTime += STEP; step++; }
    }
    function impulse(seconds) {
      var rate = ctx.sampleRate, len = Math.floor(rate * seconds), buf = ctx.createBuffer(2, len, rate);
      for (var c = 0; c < 2; c++) { var d = buf.getChannelData(c); for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6); }
      return buf;
    }
    function startSynth() {
      if (!ctx) {
        var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return false;
        ctx = new AC(); master = ctx.createGain(); master.gain.value = 0; master.connect(ctx.destination);
        bus = ctx.createGain(); bus.gain.value = 1; bus.connect(master);
        var conv = ctx.createConvolver(); conv.buffer = impulse(2.4);
        var wet = ctx.createGain(); wet.gain.value = 0.45; bus.connect(conv); conv.connect(wet); wet.connect(master);
      }
      if (ctx.resume) ctx.resume();
      nextTime = ctx.currentTime + 0.15; if (!timer) timer = setInterval(pump, 100);
      master.gain.cancelScheduledValues(ctx.currentTime); master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
      master.gain.linearRampToValueAtTime(0.85, ctx.currentTime + 1.6);
      return true;
    }
    function stopSynth() {
      if (!ctx) return;
      master.gain.cancelScheduledValues(ctx.currentTime); master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
      master.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.35);
      clearInterval(timer); timer = null;
      setTimeout(function () { if (!running && ctx && ctx.suspend) ctx.suspend(); }, 450);
    }

    // ----- YouTube player (hidden, audio only) -----
    var yt = null, ytFailed = false, ytPlaying = false, ytTimer = null, fadeT = null;
    function ytCmd(func, args) {
      if (yt && yt.contentWindow) yt.contentWindow.postMessage(JSON.stringify({ event: "command", func: func, args: args || [] }), "*");
    }
    function ytFail() {
      ytFailed = true; ytPlaying = false; clearTimeout(ytTimer);
      if (yt) { yt.remove(); yt = null; }
      if (running) play();               // fall back to the built-in melody
    }
    function startYT() {
      if (!yt) {
        var id = CONFIG.youtubeId, q = "autoplay=1&loop=1&playlist=" + id + "&controls=0&disablekb=1&fs=0&modestbranding=1&playsinline=1&rel=0&enablejsapi=1" + (CONFIG.youtubeStart ? "&start=" + CONFIG.youtubeStart : "");
        if (/^https?:/.test(location.origin)) q += "&origin=" + encodeURIComponent(location.origin);
        yt = document.createElement("iframe");
        yt.title = "Background music"; yt.setAttribute("allow", "autoplay; encrypted-media"); yt.setAttribute("aria-hidden", "true"); yt.tabIndex = -1;
        yt.style.cssText = "position:fixed;left:0;bottom:0;width:2px;height:2px;border:0;opacity:.01;pointer-events:none;";
        yt.addEventListener("load", function () { if (yt && yt.contentWindow) yt.contentWindow.postMessage(JSON.stringify({ event: "listening", id: 1, channel: "widget" }), "*"); });
        yt.src = "https://www.youtube.com/embed/" + id + "?" + q;
        document.body.appendChild(yt);
      } else ytCmd("playVideo");
      // if the browser blocks autoplay, show the play icon so one tap starts it
      clearTimeout(ytTimer);
      ytTimer = setTimeout(function () { if (running && !ytPlaying && !ytFailed) { running = false; sync(); } }, 5000);
    }
    window.addEventListener("message", function (e) {
      if (e.origin !== "https://www.youtube.com" || !yt || e.source !== yt.contentWindow) return;
      var d; try { d = typeof e.data === "string" ? JSON.parse(e.data) : e.data; } catch (err) { return; }
      if (!d) return;
      if (d.event === "onError") { ytFail(); return; }
      var st = d.info && typeof d.info.playerState === "number" ? d.info.playerState : (d.event === "onStateChange" ? d.info : null);
      if (st === 1) { ytPlaying = true; if (wanted) { running = true; sync(); } }
      else if (st === 2 || st === 0) { ytPlaying = false; }
    });
    document.addEventListener("securitypolicyviolation", function (e) {
      if (/youtube\.com/.test(e.blockedURI || "") && !ytFailed) ytFail();
    });

    function play() {
      running = true;
      if (CONFIG.youtubeId && !ytFailed) startYT();
      else if (CONFIG.musicSrc) {
        if (!fileEl) { fileEl = new Audio(CONFIG.musicSrc); fileEl.loop = true; fileEl.preload = "auto"; }
        fileEl.volume = 0;
        var pr = fileEl.play(); if (pr && pr.catch) pr.catch(function () { running = false; sync(); });
        clearInterval(fadeT); fadeT = setInterval(function () {
          if (!fileEl) return clearInterval(fadeT);
          fileEl.volume = Math.min(0.85, fileEl.volume + 0.05); if (fileEl.volume >= 0.85) clearInterval(fadeT);
        }, 100);
      } else if (!startSynth()) running = false;
      sync();
    }
    function pause() {
      running = false;
      if (yt) ytCmd("pauseVideo");
      if (fileEl) fileEl.pause();
      stopSynth();
      sync();
    }
    function sync() {
      btn.classList.toggle("on", running);
      btn.setAttribute("aria-pressed", running ? "true" : "false");
      btn.setAttribute("aria-label", running ? "Pause music" : "Play music");
    }
    btn.addEventListener("click", function () { wanted = !running; wanted ? play() : pause(); });
    document.addEventListener("visibilitychange", function () {
      if (document.hidden && running) { pause(); wanted = true; }
      else if (!document.hidden && wanted && !running) play();
    });
    return {
      start: function () { wanted = true; play(); },
      reveal: function () { btn.classList.add("show"); }
    };
  })();

  /* ---------- background flowers (kind, scroll speed, rotation, side, edge offset, top, width) ---------- */
  (function buildBackground() {
    var host = document.getElementById("bgfx"), NS = "http://www.w3.org/2000/svg";
    var box = { peony: [-62, -62, 124, 124], bud: [-50, -70, 100, 140], branch: [-60, -110, 120, 220] };
    [
      ["bud",0.2,-8,"left",10,20,150],
      ["peony",0.3,-10,"left",-140,150,390],
      ["peony",0.26,16,"right",-150,330,400],
      ["branch",0.22,-18,"left",-10,560,190],
      ["peony",0.32,6,"left",-150,520,360],
      ["bud",0.22,14,"right",10,640,150],
      ["peony",0.28,-14,"right",-130,760,340],
      ["branch",0.24,20,"right",20,1000,170],
      ["peony",0.3,10,"left",-150,1180,410],
      ["bud",0.22,-10,"right",0,1500,150],
      ["peony",0.26,-20,"right",-160,1660,430],
      ["branch",0.22,-12,"left",-20,2000,190],
      ["peony",0.3,22,"left",-150,2260,420],
      ["peony",0.28,-6,"right",-140,2640,400],
      ["bud",0.22,10,"left",10,2980,150],
      ["peony",0.32,14,"left",-140,3200,400],
      ["branch",0.24,-16,"right",10,3500,180],
      ["peony",0.26,-12,"right",-150,3720,430],
      ["peony",0.3,8,"left",-140,4180,400]
    ].forEach(function (r) {
      var b = box[r[0]], svg = document.createElementNS(NS, "svg"), use = document.createElementNS(NS, "use");
      svg.setAttribute("viewBox", b.join(" "));
      svg.setAttribute("data-speed", r[1]); svg.setAttribute("data-rot", r[2]);
      svg.style[r[3]] = r[4] + "px"; svg.style.top = r[5] + "px"; svg.style.width = r[6] + "px";
      use.setAttribute("href", "#ghost-" + r[0]);
      ["x", "y", "width", "height"].forEach(function (a, i) { use.setAttribute(a, b[i]); });
      svg.appendChild(use); host.appendChild(svg);
    });
  })();

  /* ---------- parallax background flowers ---------- */
  (function parallax() {
    if (reduceMotion) return;
    var items = Array.prototype.slice.call(document.querySelectorAll("#bgfx svg")), ticking = false;
    function update() {
      var y = window.pageYOffset || document.documentElement.scrollTop || 0;
      items.forEach(function (el) {
        var sp = parseFloat(el.getAttribute("data-speed")), r = parseFloat(el.getAttribute("data-rot"));
        el.style.transform = "translate3d(0," + (y * sp).toFixed(1) + "px,0) rotate(" + (r + y * 0.008).toFixed(2) + "deg)";
      });
      ticking = false;
    }
    window.addEventListener("scroll", function () { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    update();
  })();

  /* ---------- auto scroll (starts after Open; any touch, wheel or key stops it) ---------- */
  var Auto = (function () {
    var btn = document.getElementById("autoscroll"), SPEED = 55;   // pixels per second
    var on = false, raf = 0, last = 0, y = 0, kick = null;
    function maxY() { return Math.max(0, document.documentElement.scrollHeight - window.innerHeight); }
    function sync() {
      btn.classList.toggle("on", on); btn.setAttribute("aria-pressed", on ? "true" : "false");
      btn.setAttribute("aria-label", on ? "Stop auto scroll" : "Start auto scroll");
    }
    function frame(t) {
      if (!on) return;
      var dt = Math.min(0.1, (t - last) / 1000); last = t;
      y += SPEED * dt;
      if (y >= maxY()) { window.scrollTo({ top: maxY(), behavior: "instant" }); stop(); return; }
      window.scrollTo({ top: y, behavior: "instant" });
      raf = requestAnimationFrame(frame);
    }
    function start() {
      if (on) return;
      on = true; y = window.pageYOffset || 0;
      if (y >= maxY() - 2) { y = 0; window.scrollTo({ top: 0, behavior: "instant" }); }
      last = performance.now(); raf = requestAnimationFrame(frame); sync();
    }
    function stop() { on = false; cancelAnimationFrame(raf); clearTimeout(kick); sync(); }
    // anything the guest does by hand takes over
    ["wheel", "touchstart", "keydown"].forEach(function (ev) { window.addEventListener(ev, function () { if (on) stop(); }, { passive: true }); });
    window.addEventListener("pointerdown", function (e) { if (on && !btn.contains(e.target)) stop(); }, { passive: true });
    document.addEventListener("focusin", function (e) { if (on && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) stop(); });
    btn.addEventListener("click", function () { on ? stop() : start(); });
    return {
      reveal: function () { btn.classList.add("show"); },
      startSoon: function () { if (reduceMotion) return; kick = setTimeout(start, 1400); }
    };
  })();

  /* ---------- opening screen ---------- */
  (function intro() {
    var el = document.getElementById("intro"), main = document.getElementById("invite");
    var btn = document.getElementById("openBtn"), fall = document.getElementById("introFall");
    var burstHost = document.getElementById("burstHost"), ghost = document.getElementById("ghostFly");
    var root = document.documentElement;
    root.style.overflow = "hidden";

    function rnd(a, b) { return a + Math.random() * (b - a); }
    function bloom(id, cls) {
      var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("viewBox", "-50 -50 100 100");
      var use = document.createElementNS("http://www.w3.org/2000/svg", "use");
      use.setAttribute("href", id); use.setAttribute("x", "-50"); use.setAttribute("y", "-50"); use.setAttribute("width", "100"); use.setAttribute("height", "100");
      svg.appendChild(use); if (cls) svg.setAttribute("class", cls);
      return svg;
    }

    // ambient falling flowers
    for (var i = 0; i < 16; i++) {
      var f = bloom("#bloom-b"), size = rnd(8, 24);
      f.style.left = rnd(0, 100) + "%"; f.style.width = f.style.height = size + "px";
      f.style.setProperty("--sway", rnd(-25, 25) + "px");
      f.style.animationDuration = rnd(16, 30) + "s"; f.style.animationDelay = "-" + rnd(0, 26) + "s";
      fall.appendChild(f);
    }
    // burst petals (fired on open)
    for (var j = 0; j < 18; j++) {
      var b = document.createElement("div"); b.className = "burst";
      var ang = rnd(0, Math.PI * 2), dist = rnd(90, 240);
      b.style.setProperty("--dx", Math.cos(ang) * dist + "px"); b.style.setProperty("--dy", Math.sin(ang) * dist + "px");
      b.style.setProperty("--rot-start", rnd(-40, 40) + "deg"); b.style.setProperty("--rot-end", rnd(-260, 260) + "deg");
      b.style.animationDelay = rnd(0, .18) + "s";
      var sz = rnd(12, 26); b.style.width = b.style.height = sz + "px";
      b.appendChild(bloom(j % 3 ? "#bloom-n" : "#bloom-b")); burstHost.appendChild(b);
    }
    // large blurred flowers that drift toward the viewer
    [[-8, 4, 1], [72, 10, -1], [34, 58, 1]].forEach(function (c, k) {
      var g = bloom("#bloom-b"); g.style.position = "absolute"; g.style.left = c[0] + "%"; g.style.top = c[1] + "%";
      g.style.width = g.style.height = (150 + k * 30) + "px"; g.style.setProperty("--fly-scale-x", c[2]);
      g.style.animationDelay = (k * .12) + "s"; g.classList.add("ghost-fly-item"); ghost.appendChild(g);
    });
    ghost.style.cssText = "position:absolute;inset:0;pointer-events:none;z-index:1";

    function finish() {
      el.remove(); root.style.overflow = ""; main.removeAttribute("inert"); window.scrollTo(0, 0); Music.reveal(); Auto.reveal(); Auto.startSoon();
    }
    var opened = false;
    function open() {
      if (opened) return; opened = true;
      btn.disabled = true;
      Music.start();
      el.classList.add("opening");
      ghost.querySelectorAll("svg").forEach(function (g) { g.style.animation = "dragon-fly-forward 1.5s " + (parseFloat(g.style.animationDelay) + .2) + "s ease-out forwards"; g.style.opacity = "0"; });
      var wait = reduceMotion ? 0 : 1000;
      setTimeout(function () { el.classList.add("leaving"); main.removeAttribute("inert"); }, wait);
      setTimeout(finish, wait + (reduceMotion ? 700 : 1950));
    }
    btn.addEventListener("click", open);
    btn.focus({ preventScroll: true });
  })();

  /* ---------- links ---------- */
  document.getElementById("addcal").href =
    "https://calendar.google.com/calendar/render?action=TEMPLATE" +
    "&text=" + encodeURIComponent(CONFIG.title) +
    "&dates=" + CONFIG.startUTC + "/" + CONFIG.endUTC +
    "&location=" + encodeURIComponent(CONFIG.place);
  var mapUrl = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(CONFIG.mapQuery);
  var dirUrl = "https://www.google.com/maps/dir/?api=1&destination=" + encodeURIComponent(CONFIG.mapQuery);
  ["mapLink", "mapOpen", "mapFull"].forEach(function (id) { document.getElementById(id).href = mapUrl; });
  ["mapDir", "dirLink"].forEach(function (id) { document.getElementById(id).href = dirUrl; });

  /* ---------- countdown ---------- */
  var cd = document.getElementById("countdown");
  var target = new Date(CONFIG.startISO).getTime();
  function tick() {
    var ms = target - Date.now();
    if (ms <= 0) { cd.textContent = "The celebration has begun"; return; }
    var s = Math.floor(ms / 1000);
    var d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    cd.textContent = d + " days " + h + " hours " + m + " min " + sec + " sec";
  }
  tick(); setInterval(tick, 1000);

  /* ---------- calendar (November 2026, Monday first) ---------- */
  (function buildCalendar() {
    var grid = document.getElementById("cal");
    ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].forEach(function (w) {
      var el = document.createElement("span"); el.className = "wd"; el.textContent = w; grid.appendChild(el);
    });
    var first = new Date(2026, 10, 1).getDay();       // 0 = Sunday
    var lead = (first + 6) % 7;
    for (var i = 0; i < lead; i++) grid.appendChild(document.createElement("span"));
    for (var day = 1; day <= 30; day++) {
      var c = document.createElement("span");
      if (day === 22) {
        c.className = "today";
        c.setAttribute("aria-label", "November 22, the wedding day");
        c.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#1f4a80" d="M12 21.4l-1.5-1.3C5.4 15.5 2 12.4 2 8.6 2 5.5 4.4 3 7.5 3c1.7 0 3.4.8 4.5 2.1C13.1 3.8 14.8 3 16.5 3 19.6 3 22 5.500 22 8.6c0 3.800-3.400 6.900-8.500 11.500L12 21.400z"/></svg><b>22</b>';
      } else c.textContent = day;
      grid.appendChild(c);
    }
  })();

  /* ---------- gallery (3D coverflow) ---------- */
  (function gallery() {
    var stage = document.getElementById("stage");
    var dotsEl = document.getElementById("dots");
    var items = CONFIG.photos.length ? CONFIG.photos.map(function (p) { return typeof p === "string" ? { src: p } : p; })
                                    : [{}, {}, {}, {}];
    var slides = [], dots = [], active = 0, timer = null;

    items.forEach(function (it, i) {
      var fig = document.createElement("figure"); fig.className = "slide";
      fig.setAttribute("role", "group"); fig.setAttribute("aria-roledescription", "slide");
      fig.setAttribute("aria-label", (i + 1) + " of " + items.length);
      if (it.src) {
        var img = document.createElement("img"); img.src = it.src; img.alt = it.alt || ("Shady and Neveen, photo " + (i + 1)); img.draggable = false;
        if (it.pos) img.style.objectPosition = it.pos;
        fig.appendChild(img);
      } else {
        fig.innerHTML = '<div class="ph"><svg width="46" height="46" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><circle cx="17" cy="16" r="6"/><circle cx="32" cy="18" r="5"/><path d="M6 42c0-8 5-13 11-13s11 5 11 13M26 42c1-6 4-10 8-10s8 4 8 10"/></svg><span>Your photo ' + (i + 1) + '</span></div>';
      }
      stage.appendChild(fig); slides.push(fig);

      var b = document.createElement("button"); b.className = "dot"; b.type = "button";
      b.setAttribute("aria-label", "Go to photo " + (i + 1));
      b.addEventListener("click", function () { go(i, true); });
      dotsEl.appendChild(b); dots.push(b);
    });

    function offset(i) {
      var n = items.length, d = i - active;
      if (d > n / 2) d -= n; if (d < -n / 2) d += n;
      return d;
    }
    function render() {
      slides.forEach(function (el, i) {
        var d = offset(i), a = Math.abs(d);
        el.style.transform = "translate(-50%,-50%) translateX(" + (d * 64) + "%) translateZ(" + (-a * 140) + "px) rotateY(" + (-d * 42) + "deg) scale(" + (1 - a * 0.06) + ")";
        el.style.zIndex = String(10 - a);
        el.style.opacity = a > 2 ? "0" : (a === 2 ? ".55" : "1");
        el.setAttribute("aria-hidden", a === 0 ? "false" : "true");
      });
      dots.forEach(function (b, i) { b.setAttribute("aria-current", i === active ? "true" : "false"); });
    }
    function go(i, user) {
      active = (i + items.length) % items.length; render();
      if (user) restart();
    }
    function restart() {
      clearInterval(timer);
      if (!reduceMotion) timer = setInterval(function () { go(active + 1); }, 4500);
    }
    document.getElementById("prev").addEventListener("click", function () { go(active - 1, true); });
    document.getElementById("next").addEventListener("click", function () { go(active + 1, true); });
    stage.addEventListener("keydown", function (e) {
      if (e.key === "ArrowLeft") go(active - 1, true); if (e.key === "ArrowRight") go(active + 1, true);
    });

    var startX = null;
    stage.addEventListener("pointerdown", function (e) { startX = e.clientX; });
    window.addEventListener("pointerup", function (e) {
      if (startX === null) return;
      var dx = e.clientX - startX; startX = null;
      if (Math.abs(dx) > 40) go(active + (dx < 0 ? 1 : -1), true);
    });
    render(); restart();
  })();

  /* ---------- guestbook: private, delivered only to the couple ---------- */
  (function guestbook() {
    var nameEl = document.getElementById("gb-name"), textEl = document.getElementById("gb-text"), sendBtn = document.getElementById("gb-send");
    var label = sendBtn.textContent, busy = false;
    function flag(el) { el.setAttribute("aria-invalid", "true"); el.focus(); }
    [nameEl, textEl].forEach(function (el) { el.addEventListener("input", function () { el.removeAttribute("aria-invalid"); }); });
    function done(text) { sendBtn.textContent = text; setTimeout(function () { sendBtn.textContent = label; busy = false; }, 2600); }

    sendBtn.addEventListener("click", function () {
      if (busy) return;
      var name = nameEl.value.trim(), text = textEl.value.trim();
      if (!name) { flag(nameEl); return; }
      if (!text) { flag(textEl); return; }
      busy = true;

      // Option A: a form service (set CONFIG.formEndpoint). Works when this file is hosted on your own site.
      // Option B (default): open WhatsApp addressed to the couple.
      function viaWhatsApp() {
        var msg = "Wishes for Shady & Neveen\nFrom: " + name + "\n\n" + text;
        window.open("https://wa.me/" + CONFIG.ownerPhone.replace(/\D/g, "") + "?text=" + encodeURIComponent(msg), "_blank", "noopener");
        textEl.value = ""; done("Opening WhatsApp…");
      }
      if (CONFIG.formEndpoint && window.fetch) {
        sendBtn.textContent = "Sending…";
        fetch(CONFIG.formEndpoint, {
          method: "POST", headers: { "Content-Type": "application/json", "Accept": "application/json" },
          body: JSON.stringify({ name: name, message: text, source: "wedding-guestbook" })
        }).then(function (r) { if (!r.ok) throw new Error("bad response"); textEl.value = ""; done("Sent"); })
          .catch(viaWhatsApp);
      } else viaWhatsApp();
    });
  })();

  /* ---------- RSVP ---------- */
  (function rsvp() {
    var dlg = document.getElementById("rsvp"), nameEl = document.getElementById("rsvp-name"), note = document.getElementById("rsvp-note");
    document.getElementById("rsvp-open").addEventListener("click", function () {
      if (typeof dlg.showModal === "function") dlg.showModal(); else dlg.setAttribute("open", "");
      nameEl.focus();
    });
    document.getElementById("rsvp-cancel").addEventListener("click", function () { dlg.close ? dlg.close() : dlg.removeAttribute("open"); });
    dlg.addEventListener("click", function (e) { if (e.target === dlg && dlg.close) dlg.close(); });
    document.getElementById("rsvp-send").addEventListener("click", function () {
      var name = nameEl.value.trim();
      if (!name) { note.textContent = "Please enter your name."; nameEl.focus(); return; }
      var yes = document.querySelector('input[name="att"]:checked').value === "yes";
      var guests = document.getElementById("rsvp-guests").value;
      var msg = yes
        ? "Hello! This is " + name + ". I will happily attend Shady & Neveen's wedding on November 22, 2026" + (guests !== "1" ? " with " + guests + " guests." : ".")
        : "Hello! This is " + name + ". I'm sorry, I won't be able to attend Shady & Neveen's wedding on November 22, 2026. Wishing you both all the happiness.";
      var url = "https://wa.me/" + CONFIG.ownerPhone.replace(/\D/g, "") + "?text=" + encodeURIComponent(msg);
      window.open(url, "_blank", "noopener");
      note.textContent = "";
    });
  })();
})();
