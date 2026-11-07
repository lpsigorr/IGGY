/* Green glass shape behind the page.
   The outline is a circle pushed in and out by a few slow waves, so it keeps
   bulging and denting in new ways and never repeats. It also drifts and turns
   slowly across the screen (DRIFT below). Still when reduced motion is asked.

   Everything is drawn on one low-resolution canvas that covers the screen and
   is scaled up by CSS. The shape is soft, so the low resolution does not show,
   and the page around it never has to be redrawn: scrolling stays smooth.

   Size: .ambient__blob width in styles.css (desktop and phone).
   Colour: GREEN and the three opacities in FILL below. */
(function () {
  "use strict";

  var canvas = document.getElementById("blob");
  var probe = document.querySelector(".ambient__blob");
  if (!canvas || !canvas.getContext || !probe) return;
  /* Off when the .ambient box in index.html has the word hidden: nothing is drawn at all. */
  if (canvas.closest(".ambient").hidden) return;
  var ctx = canvas.getContext("2d");

  var GREEN = "12, 124, 89";               /* #0C7C59 */
  var FILL = [[0, 0.22], [0.55, 0.13], [1, 0.05]];
  var SHINE = 0.3;                          /* white highlight, top left */
  var RES = 1 / 3;                          /* canvas pixels per screen pixel */

  /* Where the shape goes, as in the old CSS animation: position of its centre from
     the middle of the screen (in shape widths), turn in degrees, and size.
     It goes from the first step to the last in 48 seconds, then comes back. */
  var DURATION = 48;
  var DRIFT = [
    { at: 0,    x: 0.35,  y: -0.20, turn: 0,   size: 1 },
    { at: 0.35, x: -0.10, y: 0.15,  turn: 70,  size: 1.08 },
    { at: 0.70, x: 0.20,  y: 0.35,  turn: 150, size: 0.94 },
    { at: 1,    x: -0.25, y: -0.05, turn: 220, size: 1.04 }
  ];

  var RADIUS = 330;   /* shape coordinates run from -500 to 500 */
  var POINTS = 72;

  /* k: how many bumps around the shape, a: how deep, w: how fast (per second), p: start offset */
  var WAVES = [
    { k: 2, a: 0.12, w: 0.11, p: 0.3 },
    { k: 3, a: 0.10, w: -0.08, p: 1.7 },
    { k: 4, a: 0.06, w: 0.13, p: 4.1 },
    { k: 5, a: 0.04, w: -0.17, p: 2.6 }
  ];

  function outline(t) {
    var pts = [];
    for (var i = 0; i < POINTS; i++) {
      var angle = (i / POINTS) * Math.PI * 2;
      var r = 1;
      for (var j = 0; j < WAVES.length; j++) {
        var wv = WAVES[j];
        r += wv.a * Math.sin(wv.k * angle + wv.w * t + wv.p);
      }
      pts.push([RADIUS * r * Math.cos(angle), RADIUS * r * Math.sin(angle)]);
    }

    /* Smooth closed curve through every point (Catmull-Rom turned into Bezier curves). */
    var n = pts.length;
    var path = new Path2D();
    path.moveTo(pts[0][0], pts[0][1]);
    for (var k = 0; k < n; k++) {
      var p0 = pts[(k - 1 + n) % n], p1 = pts[k], p2 = pts[(k + 1) % n], p3 = pts[(k + 2) % n];
      path.bezierCurveTo(
        p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6,
        p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6,
        p2[0], p2[1]);
    }
    path.closePath();
    return path;
  }

  /* Position along DRIFT at time t, with a soft start and stop between steps. */
  function drift(t) {
    var phase = (t / DURATION) % 2;
    if (phase > 1) phase = 2 - phase;
    for (var i = 0; i < DRIFT.length - 1; i++) {
      var a = DRIFT[i], b = DRIFT[i + 1];
      if (phase <= b.at) {
        var u = (phase - a.at) / (b.at - a.at);
        u = 0.5 - 0.5 * Math.cos(u * Math.PI);
        return {
          x: a.x + (b.x - a.x) * u,
          y: a.y + (b.y - a.y) * u,
          turn: a.turn + (b.turn - a.turn) * u,
          size: a.size + (b.size - a.size) * u
        };
      }
    }
    return DRIFT[DRIFT.length - 1];
  }

  var fill = ctx.createRadialGradient(0, 50, 0, 0, 50, 430);
  FILL.forEach(function (s) { fill.addColorStop(s[0], "rgba(" + GREEN + ", " + s[1] + ")"); });
  var shine = ctx.createRadialGradient(-105, -130, 0, -105, -130, 250);
  shine.addColorStop(0, "rgba(255, 255, 255, " + SHINE + ")");
  shine.addColorStop(1, "rgba(255, 255, 255, 0)");

  var viewW = 0, viewH = 0, blobW = 0;
  function resize() {
    viewW = window.innerWidth;
    viewH = window.innerHeight;
    blobW = probe.offsetWidth;   /* width set in styles.css */
    canvas.width = Math.ceil(viewW * RES);
    canvas.height = Math.ceil(viewH * RES);
  }

  function draw(t) {
    var d = drift(t);
    var s = (blobW / 1000) * d.size * RES;
    var rad = d.turn * Math.PI / 180;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(
      s * Math.cos(rad), s * Math.sin(rad), -s * Math.sin(rad), s * Math.cos(rad),
      (viewW / 2 + d.x * blobW) * RES, (viewH / 2 + d.y * blobW) * RES);
    var shape = outline(t);
    ctx.fillStyle = fill;
    ctx.fill(shape);
    ctx.fillStyle = shine;
    ctx.fill(shape);
  }

  var still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var start = null;
  var lastT = 0;

  resize();
  draw(0);
  window.addEventListener("resize", function () { resize(); draw(lastT); });
  if (still) return;

  /* While the page is scrolling, the shape waits: the scroll gets all the power,
     and the shape is too slow for the pause to show. */
  var scrolledAt = -1000;
  window.addEventListener("scroll", function () { scrolledAt = performance.now(); }, { passive: true });

  var last = 0;
  function frame(now) {
    if (start === null) start = now;
    if (now - scrolledAt > 250 && now - last >= 40) {   /* 25 times a second: the shape moves slowly */
      last = now;
      lastT = (now - start) / 1000;
      draw(lastT);
    }
    window.requestAnimationFrame(frame);
  }
  window.requestAnimationFrame(frame);
})();
