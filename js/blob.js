/* Green glass shape behind the page.
   The outline is a circle pushed in and out by a few slow waves, so it keeps
   bulging and denting in new ways and never repeats. Drift and rotation come
   from CSS (blob-drift in styles.css). Still when reduced motion is asked. */
(function () {
  "use strict";

  var path = document.getElementById("blob-path");
  var shine = document.getElementById("blob-shine");
  if (!path) return;

  var CENTER = 500;   /* the SVG is 1000 x 1000 */
  var RADIUS = 330;
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
      pts.push([CENTER + RADIUS * r * Math.cos(angle), CENTER + RADIUS * r * Math.sin(angle)]);
    }

    /* Smooth closed curve through every point (Catmull-Rom turned into Bezier curves). */
    var n = pts.length;
    var d = "M" + pts[0][0].toFixed(1) + " " + pts[0][1].toFixed(1);
    for (var k = 0; k < n; k++) {
      var p0 = pts[(k - 1 + n) % n], p1 = pts[k], p2 = pts[(k + 1) % n], p3 = pts[(k + 2) % n];
      d += " C" + (p1[0] + (p2[0] - p0[0]) / 6).toFixed(1) + " " + (p1[1] + (p2[1] - p0[1]) / 6).toFixed(1) +
           " " + (p2[0] - (p3[0] - p1[0]) / 6).toFixed(1) + " " + (p2[1] - (p3[1] - p1[1]) / 6).toFixed(1) +
           " " + p2[0].toFixed(1) + " " + p2[1].toFixed(1);
    }
    return d + "Z";
  }

  function draw(t) {
    var d = outline(t);
    path.setAttribute("d", d);
    if (shine) shine.setAttribute("d", d);
  }

  var still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  draw(0);
  if (still) return;

  var start = null;
  function frame(now) {
    if (start === null) start = now;
    draw((now - start) / 1000);
    window.requestAnimationFrame(frame);
  }
  window.requestAnimationFrame(frame);
})();
