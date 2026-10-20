/* Lift — app UI. Data lives in localStorage on this phone only. */
(function () {
  'use strict';
  var P = window.Plan, EX = P.EX;
  var VERSION = '1.0.0';
  var KEY = 'lift.v1';
  var $app = document.getElementById('app');

  // ---------------- storage ----------------
  function load() {
    try { var s = JSON.parse(localStorage.getItem(KEY)); if (s && s.logs) return s; } catch (e) {}
    return { logs: [], daily: {}, draft: null, meta: { created: new Date().toISOString() } };
  }
  var S = load();
  S.meta = S.meta || {}; S.daily = S.daily || {}; S.logs = S.logs || [];
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(S)); }
    catch (e) { toast('Could not save — storage full?'); }
  }
  if (navigator.storage && navigator.storage.persist) { navigator.storage.persist().catch(function () {}); }

  // ---------------- helpers ----------------
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function num(v) { if (v == null || v === '') return null; var n = parseFloat(String(v).replace(',', '.')); return isFinite(n) ? n : null; }
  function kg(n) { if (n == null) return ''; return (Math.round(n * 100) / 100).toString().replace('.', ','); }
  function roundTo(x, step) { return Math.round(x / step) * step; }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function today() { return P.todayISO(); }
  function addDays(iso, k) { return P.isoDn(P.dnISO(iso) + k); }
  var toastT;
  function toast(msg) { var t = document.getElementById('toast'); t.textContent = msg; t.className = 'toast show'; clearTimeout(toastT); toastT = setTimeout(function () { t.className = 'toast'; }, 2400); }
  function logsSorted() { return S.logs.slice().sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : (b.finishedAt || '').localeCompare(a.finishedAt || ''); }); }
  function logsOn(iso) { return S.logs.filter(function (l) { return l.date === iso; }); }
  function countingIn(fromN, toN) { return S.logs.filter(function (l) { var n = P.dnISO(l.date); return l.counts && n >= fromN && n <= toN; }); }

  // ---------------- progression ----------------
  function lastWorking(k, beforeIso) {
    var ls = logsSorted();
    for (var i = 0; i < ls.length; i++) {
      var l = ls[i]; if (l.light || l.date >= beforeIso) continue;
      for (var j = 0; j < l.items.length; j++) {
        var it = l.items[j]; if (it.k !== k || !it.sets.length || it.test) continue;
        var top = 0; it.sets.forEach(function (s) { if (s.w != null && s.w > top) top = s.w; });
        var allTop = it.hi != null && it.sets.length >= it.planned && it.sets.every(function (s) { return s.r != null && s.r >= it.hi; });
        return { top: top, allTop: allTop, date: l.date, sets: it.sets, hi: it.hi };
      }
    }
    return null;
  }
  function bestWorking(k, beforeIso) {
    var best = null;
    S.logs.forEach(function (l) { if (l.light || l.date >= beforeIso) return; l.items.forEach(function (it) { if (it.k !== k) return; it.sets.forEach(function (s) { if (s.w != null && (best == null || s.w > best)) best = s.w; }); }); });
    return best;
  }
  function loggedInPhase(k, phaseN, beforeIso) {
    return S.logs.some(function (l) { return l.phase === phaseN && l.date < beforeIso && l.items.some(function (it) { return it.k === k && it.sets.length; }); });
  }
  function stepFor(kind) { return kind === 'db' ? 0.5 : 2.5; }

  function suggest(item, date, phaseN) {
    var ex = EX[item.k], out = { w: null, hint: '', up: false, last: null };
    if (!ex || ex.kind === 'rounds' || ex.kind === 'time' || ex.kind === 'measure') return out;
    var last = lastWorking(item.k, date); out.last = last;
    if (item.test) { out.w = bestWorking(item.k, date); out.hint = 'Warm up, then add weight each set of 5 until it is a true 5-rep max.'; return out; }
    if (item.from != null && !loggedInPhase(item.k, phaseN, date)) { out.w = item.from; out.hint = 'Phase ' + phaseN + ' starting weight.'; }
    else if (last) {
      if (last.allTop && ex.inc) {
        if (ex.kind === 'db') { out.w = last.top; out.hint = 'Every set hit ' + last.hi + ' last time: go up one dumbbell step.'; out.up = true; }
        else { out.w = last.top + ex.inc; out.hint = 'Every set hit ' + last.hi + ' last time: +' + kg(ex.inc) + ' kg.'; out.up = true; }
      } else { out.w = last.top; if (item.hi) out.hint = 'Same weight until every set reaches ' + item.hi + '.'; }
    } else if (ex.start != null) out.w = ex.start;
    if (item.ofBest) { var b = bestWorking(item.k, date); if (b) out.w = b; }
    if (item.factor && out.w) { out.w = roundTo(out.w * item.factor, stepFor(ex.kind)); out.hint = Math.round(item.factor * 100) + '% of your working weight.'; out.up = false; }
    if (out.w === 0) out.w = null;
    return out;
  }
  function lastText(last) {
    if (!last) return '';
    var reps = last.sets.map(function (s) { return s.r == null ? '–' : s.r; }).join(', ');
    return 'Last ' + P.fmt(last.date) + ': ' + (last.top ? '<b>' + kg(last.top) + ' kg</b> × ' : '') + reps;
  }
  function plates(w) {
    if (!w || w < 20) return '';
    var side = (w - 20) / 2, out = [], P_ = [25, 20, 15, 10, 5, 2.5, 1.25];
    if (side <= 0) return 'Empty bar (20 kg)';
    P_.forEach(function (p) { while (side >= p - 1e-9) { out.push(p); side -= p; } });
    return 'Per side: ' + out.map(kg).join(' + ') + (side > 0.01 ? ' (+' + kg(side) + ')' : '');
  }
  function targetText(it) {
    var ex = EX[it.k];
    if (ex.kind === 'rounds') return it.sets + ' rounds';
    if (ex.kind === 'time') return 'Time it';
    if (ex.kind === 'measure') return 'Measure, cm';
    if (it.dtp) return '50-40-30-20-10';
    return it.sets + ' × ' + it.reps;
  }

  // ---------------- week status ----------------
  function weekStatus(w, uptoIso) {
    var mon = P.weekMon(w), done = countingIn(mon, mon + 6), req = P.required(w);
    var slots = P.slots(w), uptoN = P.dnISO(uptoIso);
    var passed = slots.filter(function (s) { var n = mon + s.dow; return n >= P.START && n < uptoN; }).length;
    if (P.weekKind(w) === 'xmas') passed = uptoN > mon + 6 ? req : 0; // only judged once the holiday week is over
    var doneCodes = {}; done.forEach(function (l) { doneCodes[l.code] = true; });
    var missingCodes = slots.filter(function (s) { return !doneCodes[s.code]; }).map(function (s) { return s.code; });
    return { done: done.length, req: req, passed: passed, behind: Math.max(0, passed - done.length), missing: missingCodes };
  }
  function phaseStatus(ph) {
    var r = P.phaseRange(ph); return { done: countingIn(r.from, r.to).length, gate: ph.gate, of: ph.of, range: r };
  }
  function avgWeight(iso) {
    var vals = []; for (var i = 0; i < 7; i++) { var d = S.daily[addDays(iso, -i)]; if (d && d.weight) vals.push(d.weight); }
    if (!vals.length) return null; return { avg: vals.reduce(function (a, b) { return a + b; }, 0) / vals.length, n: vals.length };
  }

  // ---------------- router ----------------
  function route() {
    var h = location.hash.replace(/^#\/?/, '') || 'today', parts = h.split('/');
    setTab(parts[0] === 'day' ? 'today' : parts[0]);
    if (parts[0] === 'session' && S.draft) return renderSession();
    if (parts[0] === 'plan') return renderPlan();
    if (parts[0] === 'log') return renderLog();
    if (parts[0] === 'day' && /^\d{4}-\d\d-\d\d$/.test(parts[1] || '')) return renderDay(parts[1]);
    return renderDay(today());
  }
  function setTab(t) { document.querySelectorAll('nav.tabs a').forEach(function (a) { a.className = a.getAttribute('data-tab') === t ? 'on' : ''; }); }
  window.addEventListener('hashchange', function () { route(); window.scrollTo(0, 0); });

  // ---------------- Today / day view ----------------
  function weekStrip(w, iso) {
    var mon = P.weekMon(w), slots = P.slots(w), t = today(), h = '<div class="week">';
    for (var i = 0; i < 7; i++) {
      var n = mon + i, d = P.isoDn(n), s = slots.filter(function (x) { return x.dow === i; })[0], dy = P.day(d);
      var lg = logsOn(d).filter(function (l) { return l.counts; });
      var cls = 'wd' + (d === iso ? ' today' : '') + (lg.length ? ' done' : (s && d < t && n >= P.START ? ' missed' : '')) + (n < P.START || n > P.END ? ' off' : '');
      var code = lg.length ? (lg[0].code === 'F' ? 'F' : lg[0].code.replace(/^T/, 'T')) : (s ? s.code : (dy.type === 'extra' ? 'Run' : (dy.type === 'spare' ? '+' : '·')));
      h += '<a class="' + cls + '" href="#/day/' + d + '"><div class="l">' + P.DOW[i] + ' ' + new Date(n * 864e5).getUTCDate() + '</div><div class="c">' + esc(code) + '</div><div class="l">' + (lg.length ? '✓' : '&nbsp;') + '</div></a>';
    }
    return h + '</div>';
  }
  function sessionPreview(code, iso) {
    var s = P.session(code, iso), ph = P.phaseOfWeek(s.week) || P.PHASES[0];
    var li = s.items.map(function (it) {
      var sg = suggest(it, iso, ph.n), w = sg.w ? kg(sg.w) + ' kg' : '';
      return '<li><span>' + esc(it.name) + (it.optional ? ' <span class="muted small">(optional)</span>' : '') + '</span><span class="w">' + esc(targetText(it)) + (w ? ' · ' + w : '') + '</span></li>';
    }).join('');
    return (s.note ? '<p class="small" style="color:var(--warn);margin:8px 0 0">' + esc(s.note) + '</p>' : '') + '<ul class="ex-list">' + li + '</ul>';
  }
  function renderDay(iso) {
    var t = today(), isToday = iso === t, dy = P.day(iso), h = '';
    var w = dy.week, inRange = w >= 1 && w <= P.WEEKS;
    h += '<div class="top"><div><div class="eyebrow">' + (isToday ? 'Today · ' : '') + (dy.inPlan ? 'Week ' + w + ' of 34 · Phase ' + dy.phase.n + ' ' + esc(dy.phase.name) : (dy.type === 'before' ? 'Before the plan' : 'After the plan')) + '</div><h1>' + esc(P.fmt(iso)) + '</h1></div>';
    h += '<div class="row nav2">' + (P.dnISO(iso) > P.START - 2 ? '<a href="#/day/' + addDays(iso, -1) + '" aria-label="Previous day">‹</a>' : '') + '<a href="#/day/' + addDays(iso, 1) + '" aria-label="Next day">›</a></div></div>';
    if (!isToday) h += '<p class="mb0" style="margin-top:-4px"><a href="#/today" style="color:var(--accent);font-size:.9rem">← Back to today</a></p>';
    if (inRange) h += weekStrip(w, iso);
    if (S.draft) h += '<div class="banner warn"><b>Session in progress:</b> ' + esc(S.draft.title) + ' (' + esc(P.fmt(S.draft.date)) + '). <a href="#/session" style="color:inherit;font-weight:700">Resume →</a></div>';

    if (dy.type === 'before') {
      var first = P.day('2026-10-21');
      h += '<div class="card hero"><div class="eyebrow">Plan starts Wed 21 Oct</div><h2 class="mt">' + esc(first.label) + ' · Gym</h2>' + sessionPreview('A', '2026-10-21') +
        '<a class="btn ghost" href="#/day/2026-10-21">Open Wed 21 Oct</a></div>';
      h += '<div class="banner info">Week 1 is short: Wed A (gym), Fri B (gym), Sat C (home). Normal Mon-Sun weeks from 26 Oct. Measure your waist at the navel on the first morning.</div>';
      $app.innerHTML = h + installCard(); return bindDay(iso);
    }
    if (dy.type === 'after') { $app.innerHTML = h + '<div class="card"><h2>Plan complete</h2><p class="muted">Export your log from Progress and bring it to Claude to build the next plan.</p></div>'; return bindDay(iso); }

    // adherence banners (only for today)
    if (isToday) h += adherenceBanners(iso, dy);
    if (dy.kind !== 'normal' && P.KIND_LABEL[dy.kind]) h += '<div class="banner info"><b>' + esc(P.KIND_LABEL[dy.kind]) + '</b></div>';
    if (dy.special) h += '<div class="banner ok"><b>' + esc(dy.special.tag) + ':</b> ' + esc(dy.special.text) + '</div>';

    var done = logsOn(iso);
    done.forEach(function (l) {
      h += '<div class="card" style="border-color:var(--ok)"><div class="between"><div><div class="eyebrow" style="color:var(--ok)">Logged ✓</div><h2>' + esc(l.title) + '</h2></div><span class="pill ok">' + (l.durationMin ? l.durationMin + ' min' : 'done') + '</span></div>' +
        '<p class="small muted mb0" style="margin-top:6px">' + l.items.filter(function (i) { return i.sets.length; }).map(function (i) { return esc(i.name) + ' ' + i.sets.length + '×'; }).join(' · ') + (l.prCount ? ' · <span style="color:var(--gold)">' + l.prCount + ' PR</span>' : '') + '</p></div>';
    });

    if (dy.type === 'session' || dy.type === 'extra') {
      var already = done.some(function (l) { return l.code === dy.code; });
      if (!already) {
        var sess = P.session(dy.code, iso);
        h += '<div class="card hero"><div class="between"><div><div class="eyebrow">' + (dy.optional ? 'Pick 2 this week · ' : '') + esc(sess.location) + '</div><h2>' + esc(sess.title) + '</h2></div><span class="pill acc">' + (dy.code.length === 1 ? 'Day ' + dy.code : dy.code === 'RUN' ? 'Run' : 'Test') + '</span></div>' +
          sessionPreview(dy.code, iso) + '<button class="btn" data-start="' + dy.code + '">' + (isToday ? 'Start session' : 'Log this session for ' + esc(P.fmt(iso))) + '</button></div>';
      }
    } else if (dy.type === 'spare') {
      var ws = weekStatus(w, iso);
      if (ws.done < ws.req && ws.missing.length) {
        var mk = ws.missing[0];
        h += '<div class="card hero"><div class="eyebrow">Spare slot · make-up</div><h2>' + esc(P.TITLES[mk]) + '</h2><p class="muted small">You have ' + ws.done + ' of ' + ws.req + ' this week. Make one up today.</p>' + sessionPreview(mk, iso) + '<button class="btn" data-start="' + mk + '">Start make-up</button></div>';
      } else {
        h += '<div class="card"><div class="eyebrow">Spare slot</div><h2>Week done. Optional conditioning</h2><p class="muted small">Pick one, or rest: stadium stairs/sprints 8-10 rounds · gravel bike 30-60 min easy · backyard circuit (ropes, sledgehammer, jump rope). Wet or icy: the circuit. Sore? Skip it.</p><button class="btn ghost" data-start="COND">Log conditioning</button></div>';
      }
    } else {
      h += '<div class="card"><div class="eyebrow">' + (dy.dow === 6 ? 'Sunday' : P.DOW[dy.dow]) + '</div><h2>' + esc(dy.label) + '</h2><p class="muted small mb0" style="margin-top:6px">Recovery is when the training turns into strength. Hit your steps and protein.</p></div>';
    }

    h += dailyCard(iso, dy);
    h += '<div class="card"><div class="eyebrow">Swap freely, don\'t skip</div><p class="small muted" style="margin:6px 0 0">Can\'t do the planned day? Do another one. The weekday doesn\'t matter; the count does.</p><div class="swap">' +
      ['A', 'B', 'C', 'D'].map(function (c) { return '<button data-start="' + c + '">Day ' + c + '</button>'; }).join('') +
      '<button data-start="F">20-min floor</button><button data-start="COND">Conditioning</button></div></div>';
    var ph = dy.phase, pst = phaseStatus(ph);
    h += '<div class="card"><div class="between"><div class="eyebrow">Phase ' + ph.n + ' gate</div><span class="small muted">' + pst.done + ' of ' + ph.of + ' · need ' + ph.gate + '</span></div><div class="bar"><i style="width:' + Math.min(100, pst.done / ph.gate * 100) + '%"></i></div><p class="small muted mb0">Gate on ' + esc(P.fmt(P.isoDn(pst.range.to))) + '. Miss it and you repeat the last 2 weeks of the phase.</p></div>';
    h += installCard();
    $app.innerHTML = h;
    bindDay(iso);
  }

  function adherenceBanners(iso, dy) {
    var h = '', w = dy.week, ws = weekStatus(w, iso);
    var d1 = S.daily[addDays(iso, -1)], d2 = S.daily[addDays(iso, -2)];
    if (d1 && d2 && d1.sleep === false && d2.sleep === false) h += '<div class="banner warn"><b>Two bad nights in a row.</b> Swap today\'s session for the 20-min floor session instead of skipping. It still counts.</div>';
    if (ws.behind >= 2) h += '<div class="banner bad"><b>Never miss twice.</b> You\'re ' + ws.behind + ' sessions behind this week. Do something today; the 20-min floor session counts.</div>';
    else if (ws.behind === 1 && dy.type !== 'session') h += '<div class="banner warn"><b>1 session behind this week.</b> Do ' + esc(P.TITLES[ws.missing[0]] || 'it') + ' today, or the floor session.</div>';
    if (dy.dow === 0 && w > 1) {
      var lw = weekStatus(w - 1, addDays(iso, 0));
      if (lw.done === 0) h += '<div class="banner bad"><b>Last week: 0 sessions.</b> Zero is the only real failure. If you\'ve been off 2+ weeks, restart at 80% of your last weights.</div>';
      else if (lw.done < lw.req) h += '<div class="banner info">Last week: ' + lw.done + ' of ' + lw.req + '. ' + (lw.done >= 2 ? 'Still an unbroken week.' : 'Two sessions make a week count.') + '</div>';
    }
    if (dy.dow === 6) {
      var lastExp = S.meta.lastExport ? P.dnISO(S.meta.lastExport.slice(0, 10)) : 0;
      if (P.dnISO(iso) - lastExp >= 7) h += '<div class="banner info"><b>Sunday backup.</b> Your log lives only on this phone. <a href="#/log" style="color:var(--accent);font-weight:700">Export it →</a></div>';
    }
    return h;
  }

  function dailyCard(iso, dy) {
    var d = S.daily[iso] || {}, t = dy.targets, h = '<div class="card"><div class="between"><div class="eyebrow">Daily targets</div>';
    var av = avgWeight(iso); h += '<span class="small muted">' + (av ? '7-day avg ' + kg(Math.round(av.avg * 10) / 10) + ' kg' : '') + '</span></div><div class="ticks mt">';
    function tick(key, title, sub) { var v = d[key]; return '<div class="tick"><div><div class="t">' + title + '</div><div class="s">' + sub + '</div></div><button class="chk' + (v === true ? ' on' : v === false ? ' no' : '') + '" data-tick="' + key + '" aria-label="' + esc(title) + '">' + (v === true ? '✓' : v === false ? '✕' : '') + '</button></div>'; }
    h += tick('steps', 'Steps ' + t.steps.toLocaleString('en').replace(',', ' '), 'Phone or watch count');
    h += tick('protein', 'Protein ' + t.protein + ' g', 'About 4 palm-sized portions');
    if (t.kcal) h += tick('kcal', 'Calories ≤ ' + t.kcal.toLocaleString('en').replace(',', ' '), 'Adjust every 2 weeks by the 7-day average');
    else h += '<div class="tick"><div><div class="t">No calorie counting</div><div class="s">' + (dy.kind === 'xmas' ? 'Holiday weeks: protein only' : 'Phase 1: protein and steps are enough') + '</div></div></div>';
    h += tick('sleep', 'Slept 7 h+', 'Tap twice for “no”');
    h += '<div class="tick"><div><div class="t">Body weight' + (t.weighIn ? ' <span class="pill acc" style="margin-left:4px">weigh-in day</span>' : '') + '</div><div class="s">Morning, after the toilet</div></div><input class="wt" inputmode="decimal" placeholder="kg" data-weight value="' + (d.weight ? kg(d.weight) : '') + '"></div>';
    return h + '</div></div>';
  }

  function installCard() {
    if (!deferredInstall) return '';
    return '<div class="card"><h2>Install Lift</h2><p class="small muted">Adds it to your home screen and lets it run with no signal.</p><button class="btn ghost" data-install>Install app</button></div>';
  }

  function bindDay(iso) {
    $app.querySelectorAll('[data-start]').forEach(function (b) { b.onclick = function () { startSession(b.getAttribute('data-start'), iso); }; });
    $app.querySelectorAll('[data-tick]').forEach(function (b) {
      b.onclick = function () {
        var k = b.getAttribute('data-tick'), d = S.daily[iso] || (S.daily[iso] = {});
        d[k] = d[k] === true ? (k === 'sleep' ? false : undefined) : d[k] === false ? undefined : true;
        if (d[k] === undefined) delete d[k];
        save(); renderDay(iso);
      };
    });
    var wi = $app.querySelector('[data-weight]');
    if (wi) wi.onchange = function () { var v = num(wi.value), d = S.daily[iso] || (S.daily[iso] = {}); if (v && v > 30 && v < 250) d.weight = v; else delete d.weight; save(); renderDay(iso); };
    var ib = $app.querySelector('[data-install]'); if (ib) ib.onclick = doInstall;
  }

  // ---------------- session ----------------
  function startSession(code, iso) {
    if (S.draft && !confirm('You have an unfinished session (' + S.draft.title + '). Discard it and start ' + P.TITLES[code] + '?')) { location.hash = '#/session'; return; }
    var s = P.session(code, iso), ph = (P.phaseOfWeek(s.week) || P.PHASES[0]);
    S.draft = {
      id: uid(), date: iso, code: code, title: s.title, week: s.week, phase: ph.n, light: s.light, kind: s.kind, counts: s.counts, note: s.note,
      startedAt: new Date().toISOString(), notes: '',
      items: s.items.map(function (it) {
        var sg = suggest(it, iso, ph.n), ex = EX[it.k], rows = [];
        for (var i = 0; i < it.sets; i++) rows.push({ w: '', r: '', done: false, pw: sg.w != null ? kg(sg.w) : '', pr: it.dtp ? String(it.dtp[i]) : (it.lo != null && it.hi != null ? String(it.hi) : '') });
        return { k: it.k, name: it.name, kind: ex.kind, target: targetText(it), planned: it.sets, lo: it.lo, hi: it.hi, note: it.note || '', hint: sg.hint, up: sg.up,
          last: lastText(sg.last), finisher: !!it.finisher, optional: !!it.optional, dtp: !!it.dtp, test: !!it.test, rest: it.rest || null, rows: rows };
      })
    };
    save(); location.hash = '#/session';
  }

  function restFor(item) {
    if (item.rest) return item.rest;
    var ex = EX[item.k];
    if (ex.kind === 'rounds') return item.k === 'floor' ? 90 : (item.k === 'core' ? 60 : 0);
    if (ex.kind === 'time' || ex.kind === 'measure') return 0;
    if (ex.main && item.hi && item.hi <= 6) return 150;
    if (item.test) return 180;
    return 90;
  }

  var elapsedT;
  function renderSession() {
    var D = S.draft; if (!D) { location.hash = '#/today'; return; }
    var h = '<div class="sess-head"><div class="between"><a href="#/day/' + D.date + '" style="color:var(--muted);text-decoration:none;font-size:.9rem">‹ ' + esc(P.fmt(D.date)) + '</a><span class="pill acc" id="elapsed">0:00</span></div><h1 style="margin-top:6px">' + esc(D.title) + '</h1>' +
      (D.note ? '<div class="small" style="color:var(--warn);margin-top:4px">' + esc(D.note) + '</div>' : '') + '</div>';
    if (D.code === 'COND') {
      h += '<div class="card"><label class="eyebrow">What did you do?</label><textarea id="condTxt" rows="3" placeholder="e.g. Stadium stairs 8 rounds, 25 min">' + esc(D.notes) + '</textarea><p class="small muted">Optional conditioning does not count toward the 4 sessions.</p></div>';
    }
    D.items.forEach(function (it, ii) {
      var allDone = it.rows.length && it.rows.every(function (r) { return r.done; });
      h += '<div class="ex' + (allDone ? ' alldone' : '') + '" id="ex' + ii + '"><div class="between" style="align-items:flex-start"><div><h3>' + esc(it.name) + (it.optional ? ' <span class="muted small">(optional)</span>' : '') + '</h3><div class="tgt">' + esc(it.target) + (it.rows[0] && it.rows[0].pw ? ' · ' + esc(it.rows[0].pw) + ' kg' : '') + '</div></div>' +
        (it.finisher ? '<span class="pill">Finisher</span>' : '') + '</div>';
      if (it.note) h += '<div class="hint">' + esc(it.note) + '</div>';
      if (it.last) h += '<div class="hint">' + it.last + '</div>';
      if (it.hint) h += '<div class="hint' + (it.up ? ' up' : '') + '">' + esc(it.hint) + '</div>';
      if (it.kind === 'bb') { var pw = num(it.rows[0] && it.rows[0].pw); var pl = plates(pw); if (pl) h += '<div class="plates">' + pl + '</div>'; }
      h += '<div class="sets">';
      var two = it.kind === 'rounds' || it.kind === 'time' || it.kind === 'measure';
      if (!two) h += '<div class="colh"><span>Set</span><span>' + (it.kind === 'db' && EX[it.k].perHand ? 'kg/hand' : 'kg') + '</span><span>' + (it.kind === 'carry' ? 'metres' : 'reps') + '</span><span></span></div>';
      it.rows.forEach(function (r, ri) {
        var dn = r.done ? ' done' : '';
        if (it.kind === 'rounds') h += '<div class="set r2' + dn + '"><span class="n">' + (ri + 1) + '</span><span class="small muted">Round ' + (ri + 1) + '</span><button class="chk' + (r.done ? ' on' : '') + '" data-done="' + ii + ':' + ri + '">' + (r.done ? '✓' : '') + '</button></div>';
        else if (it.kind === 'time') h += '<div class="set r2' + dn + '"><span class="n">⏱</span><input inputmode="numeric" placeholder="min:sec e.g. 9:45" data-f="r" data-i="' + ii + ':' + ri + '" value="' + esc(r.r) + '"><button class="chk' + (r.done ? ' on' : '') + '" data-done="' + ii + ':' + ri + '">' + (r.done ? '✓' : '') + '</button></div>';
        else if (it.kind === 'measure') h += '<div class="set r2' + dn + '"><span class="n">cm</span><input inputmode="decimal" placeholder="waist cm" data-f="r" data-i="' + ii + ':' + ri + '" value="' + esc(r.r) + '"><button class="chk' + (r.done ? ' on' : '') + '" data-done="' + ii + ':' + ri + '">' + (r.done ? '✓' : '') + '</button></div>';
        else {
          h += '<div class="set' + dn + '"><span class="n">' + (ri + 1) + '</span><input inputmode="decimal" placeholder="' + esc(r.pw || (it.kind === 'bw' ? 'BW' : 'kg')) + '" data-f="w" data-i="' + ii + ':' + ri + '" value="' + esc(r.w) + '">' +
            '<input inputmode="numeric" placeholder="' + esc(r.pr || (it.hi == null ? 'max' : '')) + '" data-f="r" data-i="' + ii + ':' + ri + '" value="' + esc(r.r) + '">' +
            '<button class="chk' + (r.done ? ' on' : '') + '" data-done="' + ii + ':' + ri + '" aria-label="Set ' + (ri + 1) + ' done">' + (r.done ? '✓' : '') + '</button>' + (r.isPR ? '<span class="pr">★ New best weight</span>' : '') + '</div>';
        }
      });
      h += '</div><div class="between"><button class="linkbtn acc" data-add="' + ii + '">+ Add ' + (it.kind === 'rounds' ? 'round' : 'set') + '</button>' + (it.rows.length > 1 ? '<button class="linkbtn" data-rm="' + ii + '">Remove last</button>' : '') + '</div></div>';
    });
    h += '<div class="card"><label class="eyebrow" for="notes">Notes</label><textarea id="notes" rows="2" placeholder="How did it feel? Anything hurt?">' + esc(D.code === 'COND' ? '' : D.notes) + '</textarea></div>';
    h += '<button class="btn ok" id="finish" style="font-size:1.2rem;padding:18px">Finish & save</button><p style="text-align:center"><button class="linkbtn" id="discard">Discard session</button></p>';
    $app.innerHTML = h;
    bindSession();
    clearInterval(elapsedT);
    var tickEl = function () { var e = document.getElementById('elapsed'); if (!e || !S.draft) return clearInterval(elapsedT); var s = Math.floor((Date.now() - Date.parse(S.draft.startedAt)) / 1000); e.textContent = Math.floor(s / 60) + ':' + P.pad(s % 60); };
    tickEl(); elapsedT = setInterval(tickEl, 1000);
    keepAwake(true);
  }

  function bindSession() {
    var D = S.draft;
    $app.querySelectorAll('input[data-f]').forEach(function (inp) {
      inp.oninput = function () { var p = inp.getAttribute('data-i').split(':'), row = D.items[+p[0]].rows[+p[1]]; row[inp.getAttribute('data-f')] = inp.value; save(); };
    });
    $app.querySelectorAll('[data-done]').forEach(function (b) {
      b.onclick = function () {
        unlockAudio();
        var p = b.getAttribute('data-done').split(':'), it = D.items[+p[0]], row = it.rows[+p[1]];
        if (!row.done) {
          if (it.kind !== 'rounds') {
            if (row.w === '' && row.pw) row.w = row.pw;
            if (row.r === '' && row.pr) row.r = row.pr;
            if (it.kind !== 'time' && it.kind !== 'measure' && num(row.r) == null) { toast('Enter the reps first'); var ri = $app.querySelector('input[data-f="r"][data-i="' + p[0] + ':' + p[1] + '"]'); if (ri) ri.focus(); return; }
            if ((it.kind === 'time' || it.kind === 'measure') && !String(row.r).trim()) { toast('Enter a value first'); return; }
          }
          row.done = true;
          // copy this set's weight forward to later empty rows so changes carry
          if (row.w !== '') it.rows.forEach(function (r2, j) { if (j > +p[1] && !r2.done && r2.w === '') r2.pw = row.w; });
          var w = num(row.w); row.isPR = false;
          if (w && !D.light && !it.test && ['bb', 'db', 'machine', 'cable'].indexOf(it.kind) >= 0) { var b0 = bestWorking(it.k, D.date); if (b0 != null && w > b0) row.isPR = true; }
          var rest = restFor(it), last = it.rows.every(function (r) { return r.done; });
          if (rest && !(last && +p[0] === D.items.length - 1)) startRest(rest);
        } else { row.done = false; row.isPR = false; }
        save();
        var y = window.scrollY; renderSession(); window.scrollTo(0, y);
      };
    });
    $app.querySelectorAll('[data-add]').forEach(function (b) { b.onclick = function () { var it = D.items[+b.getAttribute('data-add')], lr = it.rows[it.rows.length - 1] || {}; it.rows.push({ w: '', r: '', done: false, pw: lr.w || lr.pw || '', pr: lr.pr || '' }); save(); var y = window.scrollY; renderSession(); window.scrollTo(0, y); }; });
    $app.querySelectorAll('[data-rm]').forEach(function (b) { b.onclick = function () { var it = D.items[+b.getAttribute('data-rm')]; it.rows.pop(); save(); var y = window.scrollY; renderSession(); window.scrollTo(0, y); }; });
    var notes = document.getElementById('notes'); if (notes) notes.oninput = function () { if (D.code !== 'COND') { D.notes = notes.value; save(); } };
    var ct = document.getElementById('condTxt'); if (ct) ct.oninput = function () { D.notes = ct.value; save(); };
    document.getElementById('finish').onclick = finishSession;
    document.getElementById('discard').onclick = function () { if (confirm('Discard this session? Nothing will be saved.')) { S.draft = null; save(); stopRest(); keepAwake(false); location.hash = '#/today'; } };
  }

  function finishSession() {
    var D = S.draft, anyDone = D.items.some(function (it) { return it.rows.some(function (r) { return r.done; }); });
    if (!anyDone && D.code !== 'COND') { if (!confirm('No sets ticked. Save it anyway as a session?')) return; }
    var prCount = 0;
    var items = D.items.map(function (it) {
      var sets = it.rows.filter(function (r) { return r.done; }).map(function (r) {
        if (r.isPR) prCount++;
        if (it.kind === 'rounds') return { w: null, r: 1 };
        if (it.kind === 'time') return { w: null, r: null, t: String(r.r).trim() };
        if (it.kind === 'measure') return { w: null, r: num(r.r) };
        return { w: num(r.w), r: num(r.r) };
      });
      return { k: it.k, name: it.name, planned: it.planned, lo: it.lo, hi: it.hi, test: it.test, sets: sets };
    });
    var mins = Math.round((Date.now() - Date.parse(D.startedAt)) / 60000);
    var log = { id: D.id, date: D.date, code: D.code, title: D.title, week: D.week, phase: D.phase, light: D.light, counts: D.counts,
      items: items, notes: D.notes || '', durationMin: Math.min(mins, 240), prCount: prCount, startedAt: D.startedAt, finishedAt: new Date().toISOString() };
    // waist from test day goes to daily too
    items.forEach(function (it) { if (it.k === 'waist' && it.sets[0] && it.sets[0].r) { (S.daily[D.date] = S.daily[D.date] || {}).waist = it.sets[0].r; } });
    S.logs.push(log); S.draft = null; save(); stopRest(); keepAwake(false);
    toast(prCount ? 'Saved · ' + prCount + ' new best' + (prCount > 1 ? 's' : '') + ' ★' : 'Session saved ✓');
    location.hash = '#/day/' + log.date;
  }

  // ---------------- rest timer ----------------
  var restEnd = 0, restT = null, audioCtx = null;
  function unlockAudio() { try { if (!audioCtx) { var C = window.AudioContext || window.webkitAudioContext; if (C) audioCtx = new C(); } if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume(); } catch (e) {} }
  function beep() {
    try { if (audioCtx) [0, 0.22, 0.44].forEach(function (t) { var o = audioCtx.createOscillator(), g = audioCtx.createGain(); o.connect(g); g.connect(audioCtx.destination); o.frequency.value = 880; var s = audioCtx.currentTime + t; g.gain.setValueAtTime(0.0001, s); g.gain.exponentialRampToValueAtTime(0.35, s + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, s + 0.18); o.start(s); o.stop(s + 0.2); }); } catch (e) {}
    if (navigator.vibrate) navigator.vibrate([300, 120, 300, 120, 300]);
  }
  function startRest(sec) { restEnd = Date.now() + sec * 1000; document.getElementById('rest').className = 'show'; drawRest(); clearInterval(restT); restT = setInterval(drawRest, 250); }
  function stopRest() { clearInterval(restT); restT = null; document.getElementById('rest').className = ''; }
  function drawRest() {
    var left = Math.ceil((restEnd - Date.now()) / 1000);
    if (left <= 0) { stopRest(); beep(); toast('Rest over: next set'); return; }
    document.getElementById('restTm').textContent = Math.floor(left / 60) + ':' + P.pad(left % 60);
  }
  document.getElementById('restMinus').onclick = function () { restEnd -= 15000; drawRest(); };
  document.getElementById('restPlus').onclick = function () { restEnd += 15000; drawRest(); };
  document.getElementById('restSkip').onclick = stopRest;
  document.addEventListener('visibilitychange', function () { if (!document.hidden && restT) drawRest(); if (!document.hidden && S.draft && location.hash.indexOf('session') >= 0) keepAwake(true); });

  // ---------------- wake lock ----------------
  var wakeLock = null;
  function keepAwake(on) {
    try {
      if (on && 'wakeLock' in navigator && !wakeLock) navigator.wakeLock.request('screen').then(function (l) { wakeLock = l; l.addEventListener('release', function () { wakeLock = null; }); }).catch(function () {});
      if (!on && wakeLock) { wakeLock.release(); wakeLock = null; }
    } catch (e) {}
  }

  // ---------------- Plan view ----------------
  function renderPlan() {
    var t = today(), curW = P.weekOf(P.dnISO(t)), h = '<div class="top"><div><div class="eyebrow">21 Oct 2026 – 13 Jun 2027</div><h1>Daily plan</h1></div></div>';
    h += '<p class="small muted" style="margin-top:0">Tap any day for its full session, weights and targets. A/B gym, C/D home. + = spare slot.</p>';
    P.PHASES.forEach(function (ph) {
      var pst = phaseStatus(ph);
      h += '<div class="ph between"><h2>Phase ' + ph.n + ' · ' + esc(ph.name) + '</h2><span class="small muted">' + pst.done + '/' + ph.gate + ' to pass</span></div>';
      for (var w = ph.from; w <= ph.to; w++) {
        var mon = P.weekMon(w), kind = P.weekKind(w), ws = weekStatus(w, t);
        h += '<div class="wk' + (w === curW ? ' cur' : '') + '" id="wk' + w + '"><div class="wh"><b>Week ' + w + ' · ' + P.fmt(P.isoDn(mon), false) + ' – ' + P.fmt(P.isoDn(mon + 6), false) + '</b><span class="muted">' +
          [(kind === 'xmas' ? 'Christmas' : kind === 'deload' ? 'Deload' : kind === 'taper' ? 'Taper' : kind === 'test' ? 'Test' : w === 1 ? 'Short week' : ''), (P.dnISO(t) >= mon ? ws.done + '/' + ws.req : '')].filter(Boolean).join(' · ') + '</span></div><div class="days">';
        for (var i = 0; i < 7; i++) {
          var n = mon + i, iso = P.isoDn(n), dy = P.day(iso);
          if (n < P.START) { h += '<a class="x">·</a>'; continue; }
          var lg = logsOn(iso).filter(function (l) { return l.counts; }).length;
          var c = dy.type === 'session' ? dy.code : dy.type === 'extra' ? 'Run' : dy.type === 'spare' ? '+' : '–';
          h += '<a href="#/day/' + iso + '" class="' + (dy.type === 'rest' ? 'rest' : '') + (lg ? ' done' : '') + (iso === t ? ' today' : '') + '"><span class="l">' + P.DOW[i].slice(0, 2) + ' ' + new Date(n * 864e5).getUTCDate() + '</span>' + c + '</a>';
        }
        h += '</div></div>';
      }
      h += '<p class="small muted">Gate ' + esc(P.fmt(P.isoDn(pst.range.to))) + ': ' + ph.gate + ' of ' + ph.of + ' sessions. Steps ' + ph.steps.toLocaleString('en') + ' · protein ' + ph.protein + ' g' + (ph.kcal ? ' · ' + ph.kcal.toLocaleString('en') + ' kcal' : ' · no calorie counting') + '.</p>';
    });
    $app.innerHTML = h;
    var cur = document.getElementById('wk' + Math.max(1, Math.min(34, curW)));
    if (cur && curW > 2) setTimeout(function () { cur.scrollIntoView({ block: 'center' }); }, 30);
  }

  // ---------------- Progress / log view ----------------
  function renderLog() {
    var t = today(), h = '<div class="top"><div><div class="eyebrow">Your log · stored on this phone</div><h1>Progress</h1></div></div>';
    P.PHASES.forEach(function (ph) {
      var pst = phaseStatus(ph), started = P.dnISO(t) >= pst.range.from;
      if (!started && ph.n > 1) return;
      h += '<div class="card"><div class="between"><h2>Phase ' + ph.n + ' · ' + esc(ph.name) + '</h2><span class="small ' + (pst.done >= ph.gate ? '" style="color:var(--ok)' : 'muted') + '">' + pst.done + ' / ' + ph.gate + '</span></div><div class="bar"><i style="width:' + Math.min(100, pst.done / ph.gate * 100) + '%"></i></div><p class="small muted mb0">' + ph.of + ' planned, gate ' + ph.gate + ' by ' + esc(P.fmt(P.isoDn(pst.range.to))) + '.</p></div>';
    });
    var av = avgWeight(t);
    var waists = Object.keys(S.daily).filter(function (k) { return S.daily[k].waist; }).sort();
    h += '<div class="card"><h2>Body</h2><p class="mb0" style="margin-top:6px">' + (av ? '7-day average: <b>' + kg(Math.round(av.avg * 10) / 10) + ' kg</b> <span class="muted small">(' + av.n + ' weigh-ins)</span>' : '<span class="muted">No weigh-ins this week yet. Log them on the Today screen.</span>') + '</p>' +
      (waists.length ? '<p class="small muted mb0">Waist: ' + waists.map(function (k) { return P.fmt(k, false) + ' ' + kg(S.daily[k].waist) + ' cm'; }).join(' · ') + '</p>' : '') + '</div>';
    // best lifts
    var keys = ['squat', 'bench', 'deadlift', 'ohp', 'rdl', 'row', 'pulldown'], bests = [];
    keys.forEach(function (k) { var b = bestWorking(k, '9999-12-31'); if (b) bests.push(EX[k].name + ' <b>' + kg(b) + ' kg</b>'); });
    if (bests.length) h += '<div class="card"><h2>Best working weights</h2><p class="small mb0" style="margin-top:6px">' + bests.join('<br>') + '</p></div>';
    var ls = logsSorted();
    h += '<div class="card"><div class="between"><h2>Sessions</h2><span class="small muted">' + ls.length + '</span></div><div class="loglist mt">' +
      (ls.length ? ls.slice(0, 60).map(function (l) {
        return '<div class="it"><div><div><b>' + esc(l.title) + '</b></div><div class="small muted">' + esc(P.fmt(l.date)) + ' · ' + (l.durationMin || 0) + ' min' + (l.prCount ? ' · <span style="color:var(--gold)">' + l.prCount + ' PR</span>' : '') + (l.counts ? '' : ' · extra') + '</div>' +
          '<details><summary>Sets</summary><div class="small">' + l.items.filter(function (i) { return i.sets.length; }).map(function (i) { return esc(i.name) + ': ' + i.sets.map(function (s) { return s.t ? s.t : (s.w ? kg(s.w) + '×' : '') + (s.r == null ? '' : s.r); }).join(', '); }).join('<br>') + (l.notes ? '<br><i>' + esc(l.notes) + '</i>' : '') + '</div></details></div>' +
          '<button class="linkbtn" data-del="' + l.id + '" aria-label="Delete">Delete</button></div>';
      }).join('') : '<p class="muted small">Nothing logged yet. Your first session is on the Today screen.</p>') + '</div></div>';
    h += '<div class="card"><h2>Backup & Claude</h2><p class="small muted">Everything is stored on this phone only. Export once a week: the file is your backup, and you can send it to Claude for the weekly review.' +
      (S.meta.lastExport ? ' Last export ' + esc(P.fmt(S.meta.lastExport.slice(0, 10))) + '.' : ' Never exported yet.') + '</p>' +
      '<button class="btn" id="exp">Export / share log</button><div style="height:8px"></div><label class="btn ghost" for="imp" style="cursor:pointer">Import a backup</label><input type="file" id="imp" accept="application/json,.json" hidden></div>';
    h += installCard();
    h += '<p class="small muted" style="text-align:center">Lift ' + VERSION + ' · works offline</p>';
    $app.innerHTML = h;
    $app.querySelectorAll('[data-del]').forEach(function (b) { b.onclick = function () { var id = b.getAttribute('data-del'), l = S.logs.filter(function (x) { return x.id === id; })[0]; if (l && confirm('Delete ' + l.title + ' on ' + P.fmt(l.date) + '?')) { S.logs = S.logs.filter(function (x) { return x.id !== id; }); save(); renderLog(); } }; });
    document.getElementById('exp').onclick = exportLog;
    document.getElementById('imp').onchange = importLog;
    var ib = $app.querySelector('[data-install]'); if (ib) ib.onclick = doInstall;
  }

  function exportLog() {
    var data = { app: 'Lift', version: VERSION, exportedAt: new Date().toISOString(), plan: '8-Month Plan 21 Oct 2026 - 13 Jun 2027', logs: S.logs, daily: S.daily };
    var json = JSON.stringify(data, null, 1), name = 'lift-log-' + today() + '.json';
    var file; try { file = new File([json], name, { type: 'application/json' }); } catch (e) {}
    var done = function () { S.meta.lastExport = new Date().toISOString(); save(); renderLog(); };
    if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
      navigator.share({ files: [file], title: name }).then(done).catch(function (e) { if (e && e.name !== 'AbortError') download(json, name, done); });
    } else download(json, name, done);
  }
  function download(text, name, cb) {
    var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' })); a.download = name;
    document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000); toast('Saved to Downloads'); cb && cb();
  }
  function importLog(ev) {
    var f = ev.target.files && ev.target.files[0]; if (!f) return;
    f.text().then(function (txt) {
      var d = JSON.parse(txt); if (!d || !Array.isArray(d.logs)) throw new Error('Not a Lift backup');
      var have = {}, added = 0; S.logs.forEach(function (l) { have[l.id] = true; });
      d.logs.forEach(function (l) { if (l && l.id && l.date && !have[l.id]) { S.logs.push(l); added++; } });
      Object.keys(d.daily || {}).forEach(function (k) { S.daily[k] = Object.assign({}, d.daily[k], S.daily[k] || {}); });
      save(); toast('Imported ' + added + ' session' + (added === 1 ? '' : 's')); renderLog();
    }).catch(function (e) { toast('Import failed: ' + e.message); });
  }

  // ---------------- install + service worker ----------------
  var deferredInstall = null;
  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); deferredInstall = e; if (!S.draft) route(); });
  window.addEventListener('appinstalled', function () { deferredInstall = null; toast('Installed ✓'); route(); });
  function doInstall() { if (!deferredInstall) return; deferredInstall.prompt(); deferredInstall.userChoice.finally(function () { deferredInstall = null; route(); }); }
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
    {
      navigator.serviceWorker.register('sw.js').catch(function () {});
      var hadController = !!navigator.serviceWorker.controller;
      navigator.serviceWorker.addEventListener('controllerchange', function () {
        if (!hadController) { hadController = true; return; }
        if (S.draft) toast('Update ready: it applies after this session'); else location.reload();
      });
    }
  }

  // re-render at midnight / when reopened on a new day
  var renderedDay = today();
  setInterval(function () { if (today() !== renderedDay) { renderedDay = today(); if (!S.draft && /today|^#?$/.test(location.hash || 'today')) route(); } }, 60000);

  route();
  if (S.draft && !location.hash) location.hash = '#/session';
})();
