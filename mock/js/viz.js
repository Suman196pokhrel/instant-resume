/* Canvas visualisations, hand-rolled (no libraries, so the mock still opens from file://).
   Every chart: scales for devicePixelRatio, redraws on resize (ResizeObserver), reads colours from CSS
   variables, does its own hit-testing for hover and click, settles without animating under
   prefers-reduced-motion, and returns { update, destroy } so a view's cleanup can stop it. */

const Viz = (function () {
  function palette() {
    const cs = getComputedStyle(document.documentElement);
    const v = (n) => cs.getPropertyValue(n).trim();
    return {
      ink: v('--ink'), ink2: v('--ink-2'), muted: v('--muted'), line: v('--line'), line2: v('--line-2'),
      surface: v('--surface'), surface2: v('--surface-2'), sunken: v('--sunken'), bg: v('--bg'),
      accent: v('--accent'), accentInk: v('--accent-ink'), accentSoft: v('--accent-soft'),
      warn: v('--warn'), warnSoft: v('--warn-soft'), danger: v('--danger'), dangerSoft: v('--danger-soft'), ok: v('--ok'),
      font: v('--font') || 'sans-serif',
    };
  }

  function hexA(hex, a) {
    const h = hex.replace('#', '');
    const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
  }

  // Canvas + tooltip inside a positioned wrapper. draw(ctx, w, h, t) runs on demand or every frame.
  function stage(wrap, { height, animate = false, draw, onMove, onLeave, onClick, onDown, onUp }) {
    wrap.classList.add('viz-wrap');
    const canvas = document.createElement('canvas');
    canvas.className = 'viz-canvas';
    canvas.setAttribute('role', 'img');
    const tip = document.createElement('div');
    tip.className = 'viz-tip';
    tip.hidden = true;
    wrap.append(canvas, tip);
    const ctx = canvas.getContext('2d');
    let w = 0, h = 0, raf = 0, dead = false;
    const t0 = performance.now();

    function size() {
      const dpr = window.devicePixelRatio || 1;
      w = wrap.clientWidth;
      h = typeof height === 'function' ? height(w) : height;
      canvas.style.height = h + 'px';
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      paint();
    }
    function paint() {
      if (dead || !w) return;
      ctx.clearRect(0, 0, w, h);
      draw(ctx, w, h, (performance.now() - t0) / 1000);
    }
    function loop() { paint(); raf = requestAnimationFrame(loop); }
    const ro = new ResizeObserver(size);
    ro.observe(wrap);
    size();
    if (animate && !reducedMotion()) raf = requestAnimationFrame(loop);

    const pos = (e) => { const r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
    canvas.addEventListener('pointermove', (e) => onMove && onMove(pos(e), e));
    canvas.addEventListener('pointerleave', () => { tip.hidden = true; onLeave && onLeave(); });
    canvas.addEventListener('pointerdown', (e) => { if (onDown) { canvas.setPointerCapture(e.pointerId); onDown(pos(e), e); } });
    canvas.addEventListener('pointerup', (e) => onUp && onUp(pos(e), e));
    canvas.addEventListener('click', (e) => onClick && onClick(pos(e), e));

    return {
      canvas, ctx, paint,
      get w() { return w; }, get h() { return h; },
      tip(html, x, y) {
        if (!html) { tip.hidden = true; return; }
        tip.innerHTML = html;
        tip.hidden = false;
        const tw = tip.offsetWidth, th = tip.offsetHeight;
        tip.style.left = Math.max(4, Math.min(w - tw - 4, x + 14)) + 'px';
        tip.style.top = Math.max(4, y - th - 10 < 0 ? y + 16 : y - th - 10) + 'px';
      },
      startLoop() { if (!raf && !reducedMotion()) raf = requestAnimationFrame(loop); },
      stopLoop() { cancelAnimationFrame(raf); raf = 0; paint(); },
      destroy() { dead = true; cancelAnimationFrame(raf); ro.disconnect(); canvas.remove(); tip.remove(); },
    };
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  /* ---------- 1. Filtration funnel (Sankey-style) ----------
     stages: [{ label, value, dropLabel, reasons: [] }]. Kept flow runs left to right along the top;
     what each stage throws out curves down into a labelled sink. Heights use a log scale so
     412 listings and 9 matches are both visible. update({ revealed }) grows it stage by stage during a run. */
  function funnel(wrap, stages, opts = {}) {
    let revealed = opts.revealed ?? stages.length;
    let hover = null;
    let regions = [];
    const C = palette();
    const particles = Array.from({ length: 70 }, (_, i) => ({ seed: (i * 0.6180339) % 1, lane: (i * 0.37) % 1, drop: i % 4 === 0 }));

    const s = stage(wrap, {
      height: (w) => (w < 560 ? 260 : 300), animate: true,
      draw(ctx, w, h, t) {
        regions = [];
        const n = stages.length;
        const padX = 18, top = 46, flowH = h * 0.42;
        const colW = Math.max(10, Math.min(16, w / 60));
        const gap = (w - padX * 2 - colW) / (n - 1);
        const max = stages[0].value || 1;
        const hOf = (v) => (v > 0 ? Math.max(3, (Math.log(v + 1) / Math.log(max + 1)) * flowH) : 0); // log scale: 2,000 and 1 both stay visible
        const xs = stages.map((_, i) => padX + i * gap);
        const sinkY = h - 34;

        stages.forEach((st, i) => {
          const on = i < revealed;
          const x = xs[i], bh = hOf(st.value);
          // ribbons to the next stage
          if (i < n - 1) {
            const next = stages[i + 1];
            const nh = hOf(next.value);
            const x1 = x + colW, x2 = xs[i + 1];
            const live = i + 1 < revealed;
            const midX = (x1 + x2) / 2;
            ctx.beginPath();
            ctx.moveTo(x1, top);
            ctx.bezierCurveTo(midX, top, midX, top, x2, top);
            ctx.lineTo(x2, top + nh);
            ctx.bezierCurveTo(midX, top + nh, midX, top + nh, x1, top + nh);
            ctx.closePath();
            ctx.fillStyle = live ? hexA(C.accent, hover && hover.i === i + 1 ? 0.34 : 0.2) : hexA(C.line2, 0.25);
            ctx.fill();
            // drop ribbon: from the lower part of this column down to its sink
            const dropV = st.value - next.value;
            const dh = bh - nh;
            if (dh > 0.5) {
              const sx = x1 + gap * 0.42;
              const sw = Math.min(dh, gap * 0.4);
              ctx.beginPath();
              ctx.moveTo(x1, top + nh);
              ctx.bezierCurveTo(x1 + gap * 0.3, top + nh, sx - sw / 2, sinkY - 60, sx - sw / 2, sinkY - 6);
              ctx.lineTo(sx + sw / 2, sinkY - 6);
              ctx.bezierCurveTo(sx + sw / 2, sinkY - 60, x1 + gap * 0.3, top + bh, x1, top + bh);
              ctx.closePath();
              const hot = hover && hover.drop === i;
              ctx.fillStyle = live ? hexA(C.danger, hot ? 0.26 : 0.11) : hexA(C.line2, 0.18);
              ctx.fill();
              if (live) {
                ctx.fillStyle = hot ? C.danger : C.muted;
                ctx.font = `500 11px ${C.font}`;
                ctx.textAlign = 'center';
                ctx.fillText('−' + dropV.toLocaleString(), sx, sinkY + 8);
                if (w > 620) { ctx.font = `11px ${C.font}`; ctx.fillText(next.dropLabel || '', sx, sinkY + 22); }
                regions.push({ kind: 'drop', i, x: Math.min(x1, sx - sw / 2 - 6), y: top + nh, w: Math.max(sx + sw / 2, x1 + 8) - Math.min(x1, sx - sw / 2 - 6) + 6, h: sinkY + 24 - top - nh, stage: next, value: dropV });
              }
              // falling particles
              if (live && !reducedMotion()) {
                particles.filter((p) => p.drop).forEach((p) => {
                  const k = (t * 0.35 + p.seed + i * 0.13) % 1;
                  const px = x1 + (sx - x1) * Math.min(1, k * 1.6) + (p.lane - 0.5) * sw * 0.6 * k;
                  const py = top + nh + (sinkY - 10 - top - nh) * (k * k);
                  ctx.fillStyle = hexA(C.danger, 0.55 * (1 - k));
                  ctx.beginPath(); ctx.arc(px, py, 1.6, 0, Math.PI * 2); ctx.fill();
                });
              }
            }
            // flowing particles along the kept ribbon
            if (live && !reducedMotion()) {
              particles.filter((p) => !p.drop).forEach((p) => {
                const k = (t * 0.28 + p.seed) % 1;
                const px = x1 + (x2 - x1) * k;
                const py = top + nh * (0.15 + p.lane * 0.7);
                ctx.fillStyle = hexA(C.accent, 0.7 * Math.sin(Math.PI * k));
                ctx.beginPath(); ctx.arc(px, py, 1.5, 0, Math.PI * 2); ctx.fill();
              });
            }
          }
          // column
          roundRect(ctx, x, top, colW, Math.max(bh, 3), 3);
          ctx.fillStyle = on ? (hover && hover.i === i ? C.accentInk : C.accent) : C.line2;
          ctx.fill();
          if (!on) { ctx.setLineDash([3, 3]); ctx.strokeStyle = C.line2; ctx.strokeRect(x + 0.5, top + 0.5, colW - 1, flowH * 0.5); ctx.setLineDash([]); }
          // labels
          const align = i === 0 ? 'left' : i === n - 1 ? 'right' : 'center';
          const lx = i === 0 ? x : i === n - 1 ? x + colW : x + colW / 2;
          ctx.textAlign = align;
          ctx.fillStyle = on ? C.ink : C.muted;
          ctx.font = `650 ${w < 560 ? 15 : 18}px ${C.font}`;
          ctx.fillText(on ? st.value.toLocaleString() : '…', lx, top - 22);
          ctx.font = `500 11.5px ${C.font}`;
          ctx.fillStyle = C.muted;
          ctx.fillText(w < 560 ? st.short || st.label : st.label, lx, top - 8);
          regions.push({ kind: 'col', i, x: x - 8, y: top - 36, w: colW + 16, h: Math.max(bh, 20) + 36, stage: st, value: st.value });
        });
      },
      onMove(p) {
        const r = regions.find((g) => p.x >= g.x && p.x <= g.x + g.w && p.y >= g.y && p.y <= g.y + g.h && g.kind === 'col')
          || regions.find((g) => p.x >= g.x && p.x <= g.x + g.w && p.y >= g.y && p.y <= g.y + g.h);
        hover = r ? (r.kind === 'col' ? { i: r.i } : { drop: r.i }) : null;
        s.canvas.style.cursor = r ? 'help' : 'default';
        if (!r) return s.tip(null);
        if (r.kind === 'col') {
          const pct = Math.round((r.value / (stages[0].value || 1)) * 1000) / 10;
          s.tip(`<strong>${esc(r.stage.label)}</strong><br>${r.value.toLocaleString()} listings, ${pct}% of crawled${r.stage.how ? `<div class="viz-tip-sub">${esc(r.stage.how)}</div>` : ''}`, p.x, p.y);
        } else {
          s.tip(`<strong>${r.value.toLocaleString()} didn't reach ${esc(r.stage.label.toLowerCase())}</strong>${(r.stage.reasons || []).map((x) => `<div class="viz-tip-sub">${esc(x)}</div>`).join('')}`, p.x, p.y);
        }
        if (reducedMotion()) s.paint();
      },
      onLeave() { hover = null; s.canvas.style.cursor = 'default'; if (reducedMotion()) s.paint(); },
    });
    s.canvas.setAttribute('aria-label', 'Filtration funnel: ' + stages.map((x) => `${x.label} ${x.value}`).join(', '));
    return {
      update(o) { if (o.revealed != null) revealed = o.revealed; if (o.stages) stages = o.stages; s.paint(); },
      destroy: s.destroy,
    };
  }

  /* ---------- 2. Posting heatmap with sweep runs overlaid ----------
     grid[dow 0=Mon][hour] = matching jobs posted. runs = [{ dow, hour, minute, color, name }].
     Answers "does my schedule catch jobs soon after they're posted?" */
  const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  function heatmap(wrap, grid, opts = {}) {
    let runs = opts.runs || [];
    let hover = null;
    const C = palette();
    const max = Math.max(...grid.flat(), 1);
    let geo = null;
    const s = stage(wrap, {
      height: (w) => Math.round(Math.min(250, Math.max(180, w * 0.3))),
      draw(ctx, w, h) {
        const left = 36, top = 8, bottom = 22;
        const cw = (w - left - 4) / 24, ch = (h - top - bottom) / 7;
        geo = { left, top, cw, ch };
        ctx.font = `500 11px ${C.font}`;
        for (let d = 0; d < 7; d++) {
          ctx.fillStyle = C.muted; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
          ctx.fillText(DAYS[d], 0, top + d * ch + ch / 2);
          for (let hr = 0; hr < 24; hr++) {
            const v = grid[d][hr];
            const x = left + hr * cw, y = top + d * ch;
            roundRect(ctx, x + 1, y + 1, cw - 2, ch - 2, 3);
            ctx.fillStyle = v ? hexA(C.accent, 0.08 + 0.85 * (v / max)) : C.surface2;
            ctx.fill();
            if (hover && hover.d === d && hover.hr === hr) { ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5; ctx.stroke(); ctx.lineWidth = 1; }
          }
        }
        ctx.textBaseline = 'alphabetic';
        ctx.textAlign = 'center'; ctx.fillStyle = C.muted;
        [0, 3, 6, 9, 12, 15, 18, 21].forEach((hr) => ctx.fillText(hr === 0 ? '12am' : hr === 12 ? '12pm' : hr < 12 ? hr + 'am' : hr - 12 + 'pm', left + hr * cw + cw / 2, h - 6));
        // runs: a ring per sweep run, offset when several share a cell
        const seen = {};
        runs.forEach((r) => {
          const key = r.dow + ':' + r.hour;
          const k = (seen[key] = (seen[key] || 0) + 1) - 1;
          const cx = left + r.hour * cw + cw * (0.15 + 0.7 * (r.minute / 60)) + k * 4;
          const cy = top + r.dow * ch + ch / 2;
          ctx.beginPath(); ctx.arc(cx, cy, Math.min(5, ch * 0.24), 0, Math.PI * 2);
          ctx.fillStyle = C.surface; ctx.fill();
          ctx.lineWidth = 2; ctx.strokeStyle = r.color || C.ink; ctx.stroke(); ctx.lineWidth = 1;
        });
      },
      onMove(p) {
        if (!geo) return;
        const hr = Math.floor((p.x - geo.left) / geo.cw), d = Math.floor((p.y - geo.top) / geo.ch);
        if (hr < 0 || hr > 23 || d < 0 || d > 6) { hover = null; s.tip(null); s.paint(); return; }
        hover = { d, hr };
        const here = runs.filter((r) => r.dow === d && r.hour === hr);
        const lab = (x) => (x === 0 ? '12am' : x === 12 ? '12pm' : x < 12 ? x + 'am' : x - 12 + 'pm');
        s.tip(`<strong>${DAYS[d]}, ${lab(hr)} to ${lab((hr + 1) % 24)}</strong><br>${grid[d][hr]} matching jobs posted (8-week total)${here.map((r) => `<div class="viz-tip-sub"><span class="viz-dot" style="border-color:${r.color}"></span>${esc(r.name)} runs at ${String(r.hour % 12 || 12)}:${String(r.minute).padStart(2, '0')}${r.hour < 12 ? 'am' : 'pm'}</div>`).join('')}`, p.x, p.y);
        s.paint();
      },
      onLeave() { hover = null; s.paint(); },
    });
    s.canvas.setAttribute('aria-label', 'Heatmap of when matching jobs are posted, by weekday and hour, with your sweep run times marked');
    return { update(o) { if (o.runs) runs = o.runs; s.paint(); }, destroy: s.destroy };
  }

  /* ---------- 3. Schedule lanes: every sweep's runs over the next 7 days ---------- */
  function lanes(wrap, rows, opts = {}) {
    // rows: [{ name, color, active, times: [ms...] }]
    const C = palette();
    let hover = null;
    let ticks = [];
    const span = 7 * 864e5;
    const s = stage(wrap, {
      height: () => 34 + rows.length * 34,
      animate: true,
      draw(ctx, w, h, t) {
        const now = Date.now();
        const start = new Date(now); start.setHours(0, 0, 0, 0);
        const left = Math.min(170, w * 0.32), right = 8, top = 24;
        const X = (ms) => left + ((ms - start) / span) * (w - left - right);
        ticks = [];
        ctx.font = `500 11px ${C.font}`;
        for (let d = 0; d <= 7; d++) {
          const x = X(+start + d * 864e5);
          ctx.strokeStyle = C.line; ctx.beginPath(); ctx.moveTo(x, top - 6); ctx.lineTo(x, h - 4); ctx.stroke();
          if (d < 7) {
            const day = new Date(+start + d * 864e5);
            ctx.fillStyle = C.muted; ctx.textAlign = 'left';
            ctx.fillText(d === 0 ? 'Today' : day.toLocaleDateString('en-AU', { weekday: 'short' }), x + 4, 13);
          }
        }
        rows.forEach((r, i) => {
          const y = top + i * 34 + 15;
          ctx.textAlign = 'left'; ctx.fillStyle = r.active ? C.ink : C.muted; ctx.font = `500 12.5px ${C.font}`;
          let name = r.name;
          while (ctx.measureText(name).width > left - 22 && name.length > 4) name = name.slice(0, -2);
          ctx.fillText(name === r.name ? name : name + '…', 16, y + 4);
          ctx.beginPath(); ctx.arc(6, y, 4, 0, Math.PI * 2); ctx.fillStyle = r.active ? r.color : C.line2; ctx.fill();
          ctx.strokeStyle = C.line; ctx.setLineDash([2, 4]); ctx.beginPath(); ctx.moveTo(left, y); ctx.lineTo(w - right, y); ctx.stroke(); ctx.setLineDash([]);
          r.times.forEach((ms) => {
            const x = X(ms);
            if (x < left || x > w - right) return;
            const past = ms < now;
            const hot = hover && hover.ms === ms && hover.i === i;
            ctx.fillStyle = !r.active ? C.line2 : past ? hexA(r.color, 0.35) : r.color;
            roundRect(ctx, x - (hot ? 2.5 : 1.5), y - (hot ? 9 : 7), hot ? 5 : 3, hot ? 18 : 14, 1.5);
            ctx.fill();
            ticks.push({ x, y, ms, i, r });
          });
        });
        // now line, gently pulsing
        const nx = X(now);
        const a = reducedMotion() ? 1 : 0.6 + 0.4 * Math.sin(t * 3);
        ctx.strokeStyle = hexA(C.danger, a); ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(nx, top - 8); ctx.lineTo(nx, h - 4); ctx.stroke(); ctx.lineWidth = 1;
        ctx.fillStyle = C.danger; ctx.beginPath(); ctx.arc(nx, top - 8, 3, 0, Math.PI * 2); ctx.fill();
      },
      onMove(p) {
        let best = null, bd = 14;
        ticks.forEach((tk) => { const d = Math.hypot(tk.x - p.x, (tk.y - p.y) * 0.5); if (d < bd) { bd = d; best = tk; } });
        hover = best;
        if (!best) return s.tip(null);
        const d = new Date(best.ms);
        s.tip(`<strong>${esc(best.r.name)}</strong><br>${d.toLocaleString('en-AU', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}${best.ms < Date.now() ? ' (ran)' : best.r.active ? '' : ' (paused)'}`, p.x, p.y);
      },
      onLeave() { hover = null; },
    });
    s.canvas.setAttribute('aria-label', 'Timeline of sweep runs over the next seven days');
    return { update(o) { if (o.rows) rows = o.rows; s.paint(); }, destroy: s.destroy };
  }

  /* ---------- 4. Career constellation: force-directed map of jobs, skills and domains ----------
     nodes: { id, kind: 'job'|'skill', label, sub, domain, status, score, href }
     links: { source, target }. Jobs are pulled toward their domain's anchor, skills float between
     the jobs that share them. Hover highlights neighbours, drag pins, click calls opts.onSelect. */
  function constellation(wrap, data, opts = {}) {
    const C = palette();
    const statusColor = {
      offer: C.ok, interview: C.accent, applied: C.ink2, tailored: C.accentInk, rejected: C.danger, ghosted: C.muted, new: C.warn, saved: C.warn,
    };
    let colorBy = opts.colorBy || 'status';
    let showMatches = opts.showMatches ?? true;
    let selected = null, hover = null, drag = null, moved = false;
    let alpha = 1;
    const nodes = data.nodes.map((n, i) => ({ ...n, x: 0, y: 0, vx: 0, vy: 0, i }));
    const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));
    const links = data.links.map((l) => ({ s: byId[l.source], t: byId[l.target] })).filter((l) => l.s && l.t);
    const nbrs = new Map(nodes.map((n) => [n, new Set()]));
    links.forEach((l) => { nbrs.get(l.s).add(l.t); nbrs.get(l.t).add(l.s); });
    nodes.forEach((n) => { n.deg = nbrs.get(n).size; });
    const domainList = [...new Set(nodes.filter((n) => n.kind === 'job').map((n) => n.domain))];
    const domainHue = opts.domainHues || {};
    const radius = (n) => (n.kind === 'job' ? 7 + (n.score || 60) / 14 : 3 + Math.min(n.deg, 8) * 0.9);
    const visible = (n) => showMatches || !(n.kind === 'job' && (n.status === 'new' || n.status === 'saved'));
    let W = 0, H = 0, seeded = false;

    function anchors() {
      const ry = H * 0.36, rx = Math.min(W * 0.4, ry * 1.9);
      return Object.fromEntries(domainList.map((d, i) => {
        const a = (i / domainList.length) * Math.PI * 2 - Math.PI / 2;
        return [d, { x: W / 2 + Math.cos(a) * rx, y: H / 2 + Math.sin(a) * ry }];
      }));
    }
    function seed() {
      const A = anchors();
      nodes.forEach((n, i) => {
        const a = n.kind === 'job' ? A[n.domain] : { x: W / 2, y: H / 2 };
        const ang = i * 2.399963;
        n.x = a.x + Math.cos(ang) * 30; n.y = a.y + Math.sin(ang) * 30;
      });
      seeded = true;
    }
    function tick() {
      const A = anchors();
      const vis = nodes.filter(visible);
      for (let i = 0; i < vis.length; i++) {
        const a = vis[i];
        for (let j = i + 1; j < vis.length; j++) {
          const b = vis[j];
          let dx = b.x - a.x, dy = b.y - a.y;
          let d2 = dx * dx + dy * dy || 0.01;
          const minD = radius(a) + radius(b) + 22;
          const f = (a.kind === 'job' && b.kind === 'job' ? 1800 : a.kind === 'skill' && b.kind === 'skill' ? 1500 : 900) / d2 + (d2 < minD * minD ? 0.3 : 0);
          const d = Math.sqrt(d2);
          dx /= d; dy /= d;
          a.vx -= dx * f; a.vy -= dy * f; b.vx += dx * f; b.vy += dy * f;
        }
      }
      links.forEach(({ s, t }) => {
        if (!visible(s) || !visible(t)) return;
        const dx = t.x - s.x, dy = t.y - s.y, d = Math.hypot(dx, dy) || 1;
        const k = (d - 90) * 0.0025;
        s.vx += (dx / d) * k; s.vy += (dy / d) * k; t.vx -= (dx / d) * k; t.vy -= (dy / d) * k;
      });
      vis.forEach((n) => {
        const a = n.kind === 'job' ? A[n.domain] : { x: W / 2, y: H / 2 };
        const g = n.kind === 'job' ? 0.14 : 0.002;
        n.vx += (a.x - n.x) * g; n.vy += (a.y - n.y) * g;
        if (n === drag) { n.vx = n.vy = 0; return; }
        n.vx *= 0.82; n.vy *= 0.82;
        n.x += n.vx * alpha; n.y += n.vy * alpha;
        const r = radius(n) + 6;
        const padL = n.kind === 'job' ? r + 34 : r, padR = n.kind === 'job' ? r + 34 : r + 70; // room for labels
        n.x = Math.max(padL, Math.min(W - padR, n.x)); n.y = Math.max(r + 4, Math.min(H - r - 12, n.y));
      });
      // collisions: move overlapping nodes apart directly (jobs leave room for their label)
      for (let i = 0; i < vis.length; i++) {
        for (let j = i + 1; j < vis.length; j++) {
          const a = vis[i], b = vis[j];
          const both = a.kind === 'job' && b.kind === 'job';
          const minD = radius(a) + radius(b) + (both ? 40 : a.kind === 'job' || b.kind === 'job' ? 18 : 10);
          let dx = b.x - a.x, dy = b.y - a.y;
          const d = Math.hypot(dx, dy) || 0.01;
          if (d >= minD) continue;
          const push = (minD - d) / 2;
          dx /= d; dy /= d;
          if (a !== drag) { a.x -= dx * push; a.y -= dy * push; }
          if (b !== drag) { b.x += dx * push; b.y += dy * push; }
        }
      }
      alpha = Math.max(0.03, alpha * 0.995);
    }

    function nodeColor(n) {
      if (n.kind === 'skill') return n.gap ? C.warn : C.ink2;
      if (colorBy === 'domain') return `hsl(${domainHue[n.domain] ?? 200} 45% 42%)`;
      return statusColor[n.status] || C.ink2;
    }

    const s = stage(wrap, {
      height: (w) => (w < 600 ? 420 : 540), animate: true,
      draw(ctx, w, h) {
        if (W !== w || H !== h) { const first = !seeded; W = w; H = h; if (first) { seed(); for (let i = 0; i < 500; i++) tick(); alpha = 0.25; } }
        if (!reducedMotion() || drag) tick();
        const focus = hover || selected;
        const near = focus ? nbrs.get(focus) : null;
        const lit = (n) => !focus || n === focus || near.has(n);

        // domain halos around each cluster's centroid
        domainList.forEach((d) => {
          const ns = nodes.filter((n) => n.kind === 'job' && n.domain === d && visible(n));
          if (!ns.length) return;
          const cx = ns.reduce((a, n) => a + n.x, 0) / ns.length, cy = ns.reduce((a, n) => a + n.y, 0) / ns.length;
          const r = Math.max(46, ...ns.map((n) => Math.hypot(n.x - cx, n.y - cy) + radius(n) + 18));
          const hue = domainHue[d] ?? 200;
          const g = ctx.createRadialGradient(cx, cy, r * 0.2, cx, cy, r);
          g.addColorStop(0, `hsla(${hue}, 45%, 55%, 0.13)`);
          g.addColorStop(1, `hsla(${hue}, 45%, 55%, 0)`);
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
          ctx.font = `650 11px ${C.font}`; ctx.textAlign = 'center';
          ctx.fillStyle = `hsl(${hue} 35% 38%)`;
          ctx.fillText(d.toUpperCase(), cx, Math.max(12, cy - r + 14));
        });

        // links
        links.forEach(({ s: a, t: b }) => {
          if (!visible(a) || !visible(b)) return;
          const on = focus && (a === focus || b === focus);
          ctx.strokeStyle = on ? hexA(C.accent, 0.8) : hexA(C.line2, focus ? 0.25 : 0.7);
          ctx.lineWidth = on ? 1.6 : 1;
          ctx.beginPath(); ctx.moveTo(a.x, a.y);
          const mx = (a.x + b.x) / 2 + (a.y - b.y) * 0.08, my = (a.y + b.y) / 2 + (b.x - a.x) * 0.08;
          ctx.quadraticCurveTo(mx, my, b.x, b.y); ctx.stroke();
        });
        ctx.lineWidth = 1;

        // nodes
        nodes.forEach((n) => {
          if (!visible(n)) return;
          const r = radius(n);
          ctx.globalAlpha = lit(n) ? 1 : 0.22;
          const col = nodeColor(n);
          if (n.kind === 'job') {
            const isMatch = n.status === 'new' || n.status === 'saved';
            ctx.beginPath(); ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
            ctx.fillStyle = isMatch ? C.surface : col; ctx.fill();
            if (isMatch) { ctx.setLineDash([3, 2.5]); ctx.lineWidth = 2; ctx.strokeStyle = col; ctx.stroke(); ctx.setLineDash([]); ctx.lineWidth = 1; }
            if (n === selected) { ctx.beginPath(); ctx.arc(n.x, n.y, r + 4, 0, Math.PI * 2); ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5; ctx.stroke(); ctx.lineWidth = 1; }
            if (n.status === 'offer') { ctx.fillStyle = '#fff'; ctx.font = `700 ${r}px ${C.font}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('★', n.x, n.y + 0.5); ctx.textBaseline = 'alphabetic'; }
            ctx.font = `600 11.5px ${C.font}`; ctx.textAlign = 'center';
            ctx.fillStyle = C.ink; ctx.fillText(n.label, n.x, n.y + r + 13);
          } else {
            ctx.beginPath(); ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
            ctx.fillStyle = n.gap ? C.warnSoft : C.surface; ctx.fill();
            ctx.strokeStyle = col; ctx.lineWidth = 1.3; if (n.gap) ctx.setLineDash([2, 2]); ctx.stroke(); ctx.setLineDash([]); ctx.lineWidth = 1;
            ctx.font = `500 11px ${C.font}`; ctx.textAlign = 'left';
            ctx.fillStyle = n.gap ? C.warn : C.ink2;
            ctx.fillText(n.label, n.x + r + 4, n.y + 4);
          }
          ctx.globalAlpha = 1;
        });
      },
      onMove(p) {
        if (drag) { moved = true; drag.x = p.x; drag.y = p.y; alpha = Math.max(alpha, 0.3); if (reducedMotion()) s.paint(); return; }
        const hit = pick(p);
        if (hit !== hover) { hover = hit; if (reducedMotion()) s.paint(); }
        s.canvas.style.cursor = hit ? (hit.kind === 'job' ? 'pointer' : 'grab') : 'default';
        if (!hit) return s.tip(null);
        if (hit.kind === 'job') s.tip(`<strong>${esc(hit.title)}</strong><br>${esc(hit.label)}<div class="viz-tip-sub">${esc(hit.sub)}</div>`, p.x, p.y);
        else s.tip(`<strong>${esc(hit.label)}</strong><br>${hit.deg} ${hit.deg === 1 ? 'job' : 'jobs'}${hit.gap ? '<div class="viz-tip-sub">Not in your knowledge base yet</div>' : ''}${hit.interviews ? `<div class="viz-tip-sub">In ${hit.interviews} of your interviews or offers</div>` : ''}`, p.x, p.y);
      },
      onLeave() { hover = null; if (!drag) s.canvas.style.cursor = 'default'; if (reducedMotion()) s.paint(); },
      onDown(p) { const hit = pick(p); if (hit) { drag = hit; moved = false; s.tip(null); } },
      onUp() { drag = null; },
      onClick(p) {
        if (moved) { moved = false; return; }
        const hit = pick(p);
        selected = hit && hit.kind === 'job' ? hit : null;
        if (opts.onSelect) opts.onSelect(selected);
        if (reducedMotion()) s.paint();
      },
    });
    function pick(p) {
      let best = null, bd = Infinity;
      nodes.forEach((n) => { if (!visible(n)) return; const d = Math.hypot(n.x - p.x, n.y - p.y); if (d < radius(n) + 5 && d < bd) { bd = d; best = n; } });
      return best;
    }
    s.canvas.setAttribute('aria-label', 'Map of your applications and matched jobs, grouped by domain and linked by shared skills. A list version follows.');
    return {
      update(o) {
        if (o.colorBy) colorBy = o.colorBy;
        if (o.showMatches != null) { showMatches = o.showMatches; alpha = 0.6; if (reducedMotion()) for (let i = 0; i < 200; i++) tick(); }
        if (o.select !== undefined) selected = o.select ? byId[o.select] : null;
        s.paint();
      },
      reheat() { alpha = 1; nodes.forEach((n) => { n.vx += (Math.random() - 0.5) * 20; n.vy += (Math.random() - 0.5) * 20; }); if (reducedMotion()) { for (let i = 0; i < 300; i++) tick(); s.paint(); } },
      destroy: s.destroy,
    };
  }

  return { funnel, heatmap, lanes, constellation, palette };
})();
