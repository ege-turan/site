// Ege Turan
// September 17, 2026
// The randomized background animation — five effects, one picked per page load.

(function () {
  'use strict';

  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion) return;

  var canvas = document.getElementById('bg-canvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');

  // ---------- theme colors (read from CSS custom properties so this
  // automatically follows light/dark mode) ----------
  var colors = { ink: '#1c1b18', inkSoft: '#55534c', line: '#d8d5cc', accent: '#3e5c55', accentSoft: '#7a9089' };
  function readColors() {
    var s = getComputedStyle(document.documentElement);
    colors.ink = s.getPropertyValue('--ink').trim() || colors.ink;
    colors.inkSoft = s.getPropertyValue('--ink-soft').trim() || colors.inkSoft;
    colors.line = s.getPropertyValue('--line').trim() || colors.line;
    colors.accent = s.getPropertyValue('--accent').trim() || colors.accent;
    colors.accentSoft = s.getPropertyValue('--accent-soft').trim() || colors.accentSoft;
  }
  readColors();
  var darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
  if (darkModeQuery.addEventListener) darkModeQuery.addEventListener('change', readColors);

  function hexToRgba(hex, alpha) {
    hex = hex.replace('#', '');
    if (hex.length === 3) hex = hex.split('').map(function (c) { return c + c; }).join('');
    var r = parseInt(hex.substring(0, 2), 16);
    var g = parseInt(hex.substring(2, 4), 16);
    var b = parseInt(hex.substring(4, 6), 16);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
  }

  // ---------- canvas sizing ----------
  var W = 0, H = 0, DPR = Math.min(window.devicePixelRatio || 1, 2);
  function resize() {
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = W * DPR;
    canvas.height = H * DPR;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  resize();
  window.addEventListener('resize', resize);

  // ---------- mouse ----------
  var mouse = { x: -9999, y: -9999, active: false };
  function setMouse(x, y) { mouse.x = x; mouse.y = y; mouse.active = true; }
  window.addEventListener('mousemove', function (e) { setMouse(e.clientX, e.clientY); });
  window.addEventListener('touchmove', function (e) {
    if (e.touches && e.touches[0]) setMouse(e.touches[0].clientX, e.touches[0].clientY);
  }, { passive: true });
  window.addEventListener('mouseleave', function () { mouse.active = false; });

  function rand(min, max) { return min + Math.random() * (max - min); }

  // ================= Effect 1: dot grid, magnetic displacement =================
  function dotGrid() {
    var spacing = 46, radius = 130, points = [];
    function build() {
      points = [];
      for (var x = spacing / 2; x < W; x += spacing) {
        for (var y = spacing / 2; y < H; y += spacing) {
          points.push({ bx: x, by: y, x: x, y: y });
        }
      }
    }
    build();
    window.addEventListener('resize', build);
    return function frame() {
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = hexToRgba(colors.inkSoft, 0.32);
      for (var i = 0; i < points.length; i++) {
        var p = points[i];
        var dx = p.bx - mouse.x, dy = p.by - mouse.y;
        var dist = Math.sqrt(dx * dx + dy * dy);
        var tx = p.bx, ty = p.by;
        if (mouse.active && dist < radius) {
          var force = (1 - dist / radius) * 18;
          var ang = Math.atan2(dy, dx);
          tx = p.bx + Math.cos(ang) * force;
          ty = p.by + Math.sin(ang) * force;
        }
        p.x += (tx - p.x) * 0.15;
        p.y += (ty - p.y) * 0.15;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.4, 0, Math.PI * 2);
        ctx.fill();
      }
    };
  }

  // ================= Effect 2: drifting gradient blobs =================
  function blobs() {
    canvas.style.filter = 'blur(50px)';
    var n = 3, list = [];
    for (var i = 0; i < n; i++) {
      list.push({
        x: rand(0, W), y: rand(0, H),
        vx: rand(-0.15, 0.15), vy: rand(-0.15, 0.15),
        r: rand(220, 380),
      });
    }
    // A separate blob that directly follows the cursor, rather than
    // just drifting with a gentle pull like the ambient ones above.
    var tracker = { x: W / 2, y: H / 2, r: rand(200, 260) };

    return function frame() {
      ctx.clearRect(0, 0, W, H);
      for (var i = 0; i < list.length; i++) {
        var b = list[i];
        if (mouse.active) {
          var dx = mouse.x - b.x, dy = mouse.y - b.y;
          var dist = Math.sqrt(dx * dx + dy * dy) || 1;
          if (dist < 700) {
            b.vx += (dx / dist) * 0.0025;
            b.vy += (dy / dist) * 0.0025;
          }
        }
        b.vx *= 0.99; b.vy *= 0.99;
        var speed = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
        var maxSpeed = 0.6;
        if (speed > maxSpeed) { b.vx = (b.vx / speed) * maxSpeed; b.vy = (b.vy / speed) * maxSpeed; }
        b.x += b.vx; b.y += b.vy;
        if (b.x < -b.r) b.x = W + b.r; if (b.x > W + b.r) b.x = -b.r;
        if (b.y < -b.r) b.y = H + b.r; if (b.y > H + b.r) b.y = -b.r;

        var g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
        g.addColorStop(0, hexToRgba(colors.accentSoft, 0.35));
        g.addColorStop(1, hexToRgba(colors.accentSoft, 0));
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
      }

      var targetX = mouse.active ? mouse.x : W / 2;
      var targetY = mouse.active ? mouse.y : H / 2;
      tracker.x += (targetX - tracker.x) * 0.08;
      tracker.y += (targetY - tracker.y) * 0.08;
      var gt = ctx.createRadialGradient(tracker.x, tracker.y, 0, tracker.x, tracker.y, tracker.r);
      gt.addColorStop(0, hexToRgba(colors.accent, 0.4));
      gt.addColorStop(1, hexToRgba(colors.accent, 0));
      ctx.fillStyle = gt;
      ctx.fillRect(0, 0, W, H);
    };
  }

  // ================= Effect 3: constellation =================
  function constellation() {
    var count = Math.round((W * H) / 22000);
    count = Math.max(30, Math.min(count, 90));
    var linkDist = 120, mouseLinkDist = 170;
    var pts = [];
    for (var i = 0; i < count; i++) {
      pts.push({ x: rand(0, W), y: rand(0, H), vx: rand(-0.15, 0.15), vy: rand(-0.15, 0.15) });
    }
    return function frame() {
      ctx.clearRect(0, 0, W, H);
      for (var i = 0; i < pts.length; i++) {
        var p = pts[i];
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > W) p.vx *= -1;
        if (p.y < 0 || p.y > H) p.vy *= -1;
      }
      ctx.lineWidth = 1;
      for (var i = 0; i < pts.length; i++) {
        for (var j = i + 1; j < pts.length; j++) {
          var dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y;
          var d = Math.sqrt(dx * dx + dy * dy);
          if (d < linkDist) {
            ctx.strokeStyle = hexToRgba(colors.line, (1 - d / linkDist) * 0.6);
            ctx.beginPath();
            ctx.moveTo(pts[i].x, pts[i].y);
            ctx.lineTo(pts[j].x, pts[j].y);
            ctx.stroke();
          }
        }
        if (mouse.active) {
          var mdx = pts[i].x - mouse.x, mdy = pts[i].y - mouse.y;
          var md = Math.sqrt(mdx * mdx + mdy * mdy);
          if (md < mouseLinkDist) {
            ctx.strokeStyle = hexToRgba(colors.accent, (1 - md / mouseLinkDist) * 0.7);
            ctx.beginPath();
            ctx.moveTo(pts[i].x, pts[i].y);
            ctx.lineTo(mouse.x, mouse.y);
            ctx.stroke();
          }
        }
      }
      ctx.fillStyle = hexToRgba(colors.inkSoft, 0.5);
      for (var i = 0; i < pts.length; i++) {
        ctx.beginPath();
        ctx.arc(pts[i].x, pts[i].y, 1.6, 0, Math.PI * 2);
        ctx.fill();
      }
    };
  }

  // ================= Effect 4: monospace character drift =================
  function charDrift() {
    var chars = '{}[]/\\<>=+01'.split('');
    var count = Math.max(24, Math.min(Math.round((W * H) / 26000), 60));
    var radius = 110;
    var list = [];
    for (var i = 0; i < count; i++) {
      list.push({
        bx: rand(0, W), by: rand(0, H), x: 0, y: 0,
        vx: rand(-0.12, 0.12), vy: rand(-0.12, 0.12),
        ch: chars[Math.floor(rand(0, chars.length))],
        size: rand(11, 16),
      });
      list[i].x = list[i].bx; list[i].y = list[i].by;
    }
    ctx.font = '12px monospace';
    return function frame() {
      ctx.clearRect(0, 0, W, H);
      for (var i = 0; i < list.length; i++) {
        var p = list[i];
        p.bx += p.vx; p.by += p.vy;
        if (p.bx < 0) p.bx = W; if (p.bx > W) p.bx = 0;
        if (p.by < 0) p.by = H; if (p.by > H) p.by = 0;

        var tx = p.bx, ty = p.by;
        if (mouse.active) {
          var dx = p.bx - mouse.x, dy = p.by - mouse.y;
          var dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < radius) {
            var force = (1 - dist / radius) * 24;
            var ang = Math.atan2(dy, dx);
            tx = p.bx + Math.cos(ang) * force;
            ty = p.by + Math.sin(ang) * force;
          }
        }
        p.x += (tx - p.x) * 0.2;
        p.y += (ty - p.y) * 0.2;

        ctx.font = p.size + 'px "IBM Plex Mono", monospace';
        ctx.fillStyle = hexToRgba(colors.inkSoft, 0.28);
        ctx.fillText(p.ch, p.x, p.y);
      }
    };
  }

  // ================= Effect 5: ripple rings from cursor movement =================
  function ripples() {
    var active = [];
    var lastEmit = 0;
    var SLOW = 1 / 4; // 5x faster than the previous 1/20 setting
    var emitInterval = 220 / SLOW;
    return function frame(time) {
      ctx.clearRect(0, 0, W, H);
      if (mouse.active && time - lastEmit > emitInterval) {
        active.push({ x: mouse.x, y: mouse.y, r: 0, alpha: 0.5 });
        lastEmit = time;
      }
      ctx.lineWidth = 1;
      for (var i = active.length - 1; i >= 0; i--) {
        var ring = active[i];
        ring.r += 1.1 * SLOW;
        ring.alpha *= Math.pow(0.985, SLOW);
        if (ring.alpha < 0.02 || ring.r > 260) { active.splice(i, 1); continue; }
        ctx.strokeStyle = hexToRgba(colors.accentSoft, ring.alpha);
        ctx.beginPath();
        ctx.arc(ring.x, ring.y, ring.r, 0, Math.PI * 2);
        ctx.stroke();
      }
    };
  }

  // ---------- pick one effect at random and run it ----------
  var effects = [dotGrid, blobs, constellation, charDrift, ripples];
  var chosen = effects[Math.floor(Math.random() * effects.length)];
  var frame = chosen();

  function loop(time) {
    frame(time || 0);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();
