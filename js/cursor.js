/* Custom cursor: a dot in the site's black (--ink). Over anything clickable,
   a ring grows out of the dot. Over dark pictures the dot turns light so it never
   disappears. Only on a computer; phones and tablets (iPad included) keep their normal behaviour.
   Over text fields the normal text cursor comes back, so typing feels normal. */
(function () {
  "use strict";

  // Only on a computer with a mouse or trackpad. Phones and tablets never get it,
  // including an iPad with a trackpad or keyboard case: any touch screen opts out.
  var mm = window.matchMedia;
  var computer = mm("(hover: hover) and (pointer: fine)").matches &&
    !mm("(any-pointer: coarse)").matches &&
    !(navigator.maxTouchPoints > 0);
  if (!computer) return;

  var CLICKABLE = "a, button, summary, label, select, [role='button'], input[type='submit'], input[type='checkbox'], input[type='radio']";
  var TYPING = "input:not([type='submit']):not([type='checkbox']):not([type='radio']), textarea";
  var DARK = ".cs-hero, .cs-next, .tile__media, .st-type, .px-mark--word, .st-films, .cs-colors .is-black";

  var root = document.documentElement;
  var el = document.createElement("div");
  el.className = "cursor";
  el.setAttribute("aria-hidden", "true");
  el.innerHTML = '<span class="cursor__ring"></span><span class="cursor__dot"></span>';
  document.body.appendChild(el);
  root.classList.add("has-cursor");

  var x = -100, y = -100, queued = false;

  function draw() {
    queued = false;
    el.style.transform = "translate3d(" + x + "px," + y + "px,0)";
  }

  document.addEventListener("pointermove", function (e) {
    if (e.pointerType && e.pointerType !== "mouse") return;
    x = e.clientX;
    y = e.clientY;
    el.classList.add("is-on");
    if (!queued) { queued = true; requestAnimationFrame(draw); }
  }, { passive: true });

  document.addEventListener("pointerover", function (e) {
    var t = e.target;
    if (!t || !t.closest) return;
    el.classList.toggle("is-link", !!t.closest(CLICKABLE));
    el.classList.toggle("is-typing", !!t.closest(TYPING));
    el.classList.toggle("is-light", !!t.closest(DARK));
  }, { passive: true });

  document.addEventListener("pointerdown", function () { el.classList.add("is-down"); });
  document.addEventListener("pointerup", function () { el.classList.remove("is-down"); });

  // Hide the dot when the pointer leaves the window, show it again when it comes back.
  document.addEventListener("mouseleave", function () { el.classList.remove("is-on"); });
  document.addEventListener("mouseenter", function () { el.classList.add("is-on"); });
})();
