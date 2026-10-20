/* Lift — 8-Month Plan engine. Pure functions, no DOM. Works in browser and Node.
   All dates are LOCAL calendar dates handled as "day numbers" (days since 1970-01-01 of a
   Y-M-D triple via Date.UTC), so DST and UTC offsets can never shift a day. */
(function (G) {
  'use strict';
  var DAY = 864e5;
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function dn(y, m, d) { return Math.round(Date.UTC(y, m - 1, d) / DAY); }
  function dnISO(s) { var p = s.split('-').map(Number); return dn(p[0], p[1], p[2]); }
  function isoDn(n) { var d = new Date(n * DAY); return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate()); }
  // Local "today" — built from local getters only, never toISOString (UTC).
  function todayISO(now) { now = now || new Date(); return now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate()); }
  function dow(n) { return (new Date(n * DAY).getUTCDay() + 6) % 7; } // 0 = Mon … 6 = Sun
  var DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function fmt(iso, withDow) {
    var n = dnISO(iso), d = new Date(n * DAY);
    return (withDow === false ? '' : DOW[dow(n)] + ' ') + d.getUTCDate() + ' ' + MON[d.getUTCMonth()];
  }

  var WEEK1_MON = dnISO('2026-10-19');
  var START = dnISO('2026-10-21');           // Wed — plan day 1
  var END = dnISO('2027-06-13');             // Sun — end of Week 34
  var WEEKS = 34;

  var PHASES = [
    { n: 1, name: 'Restart', from: 1, to: 6, gate: 19, of: 23, steps: 7000, protein: 150, kcal: null },
    { n: 2, name: 'Build', from: 7, to: 14, gate: 23, of: 28, steps: 8000, protein: 160, kcal: 2200 },
    { n: 3, name: 'Strength', from: 15, to: 23, gate: 29, of: 36, steps: 8000, protein: 160, kcal: 2200 },
    { n: 4, name: 'Peak & lean', from: 24, to: 34, gate: 36, of: 44, steps: 10000, protein: 160, kcal: 2100 }
  ];
  function phaseOfWeek(w) { for (var i = 0; i < PHASES.length; i++) if (w >= PHASES[i].from && w <= PHASES[i].to) return PHASES[i]; return null; }
  function weekOf(n) { return Math.floor((n - WEEK1_MON) / 7) + 1; }
  function weekMon(w) { return WEEK1_MON + (w - 1) * 7; }
  function phaseRange(p) { return { from: Math.max(START, weekMon(p.from)), to: weekMon(p.to) + 6 }; }

  function weekKind(w) {
    if (w === 10 || w === 11) return 'xmas';
    if (w === 19 || w === 23 || w === 29) return 'deload';
    if (w === 33) return 'taper';
    if (w === 34) return 'test';
    return 'normal';
  }
  var KIND_LABEL = { xmas: 'Christmas week: 2 sessions minimum, ~70% weights', deload: 'Deload week: 60% weights, half the sets', taper: 'Taper week: main lifts 3 x 3 at ~90%', test: 'Test week', normal: '' };

  // ---------------- Exercise catalogue ----------------
  // kind: bb barbell, db dumbbell, cable, machine, bw bodyweight, carry (kg + metres), rounds (tick only)
  var EX = {
    squat: { name: 'Barbell back squat', kind: 'bb', inc: 5, start: 32.5, main: true },
    rdl: { name: 'Romanian deadlift', kind: 'bb', inc: 5, start: 32.5 },
    deadlift: { name: 'Deadlift', kind: 'bb', inc: 5, main: true },
    lunge: { name: 'Walking lunge', kind: 'db', inc: 2, start: 0 },
    legpress: { name: 'Leg press', kind: 'machine', inc: 5, start: 45 },
    legcurl: { name: 'Leg curl', kind: 'machine', inc: 2.5 },
    calf: { name: 'Standing calf raise', kind: 'machine', inc: 2.5, start: 20 },
    bench: { name: 'Bench press', kind: 'bb', inc: 2.5, start: 32.5, main: true },
    pulldown: { name: 'Lat pulldown', kind: 'cable', inc: 2.5, start: 27 },
    negatives: { name: 'Pull-up negatives (5 s down)', kind: 'bw', inc: 0, start: 0 },
    pullup: { name: 'Pull-ups (strict, band if needed)', kind: 'bw', inc: 0, start: 0 },
    row: { name: 'Seated cable row', kind: 'cable', inc: 2.5, start: 30 },
    ohp: { name: 'Standing overhead press', kind: 'bb', inc: 2.5, start: 12.5, main: true },
    facepull: { name: 'Face pull', kind: 'cable', inc: 2.5, start: null },
    goblet: { name: 'Goblet squat', kind: 'db', inc: 2, start: 8 },
    dbrdl: { name: 'Dumbbell RDL', kind: 'db', inc: 2, start: 8, perHand: true },
    bss: { name: 'Bulgarian split squat', kind: 'db', inc: 2, start: 0 },
    carry: { name: 'Sandbag carry', kind: 'carry', inc: 0, start: 22 },
    tire: { name: 'Tractor tire flip', kind: 'bw', inc: 0, start: 0 },
    dbpress: { name: 'Dumbbell floor/bench press', kind: 'db', inc: 2, start: 11.5, perHand: true },
    dbrow: { name: 'Dumbbell row', kind: 'db', inc: 2, start: 13.5 },
    dbsp: { name: 'Dumbbell shoulder press', kind: 'db', inc: 2, start: 9, perHand: true },
    pullapart: { name: 'Band pull-apart', kind: 'bw', inc: 0, start: 0 },
    core: { name: 'Leg raise 12 + plank 30-45 s', kind: 'rounds' },
    dtp_lp: { name: 'Half-DTP leg press', kind: 'machine', inc: 5, dtp: true },
    dtp_db: { name: 'Half-DTP dumbbell row or press', kind: 'db', inc: 2, dtp: true },
    emom: { name: 'EMOM 8 min: 3 tire flips / 20 m carry', kind: 'rounds' },
    stairs: { name: 'Stadium stairs or 100 m strides', kind: 'rounds' },
    floor: { name: 'Goblet squat 12 · push-up 10 · DB row 10/side · DB RDL 12 · plank 30 s', kind: 'rounds' },
    run: { name: '1,600 m (4 stadium laps)', kind: 'time' },
    waist: { name: 'Waist at navel', kind: 'measure' }
  };

  function parseReps(r) {
    var m = String(r).match(/(\d+)(?:-(\d+))?/);
    if (!m) return { lo: null, hi: null };
    return { lo: +m[1], hi: +(m[2] || m[1]) };
  }
  // item(k, sets, reps, extra)
  function I(k, sets, reps, x) {
    var it = { k: k, name: EX[k].name, sets: sets, reps: String(reps) };
    var p = parseReps(reps); it.lo = p.lo; it.hi = p.hi;
    if (x) for (var key in x) it[key] = x[key];
    return it;
  }
  var DTP_REPS = [50, 40, 30, 20, 10];

  function baseSession(code, w) {
    var p = phaseOfWeek(w).n, early = w <= 2;
    if (code === 'A') {
      if (p === 1) return early
        ? [I('squat', 3, 8), I('rdl', 3, 10), I('lunge', 2, '10/leg', { note: 'Bodyweight' }), I('legpress', 2, 12), I('calf', 3, 12)]
        : [I('squat', 4, '6-8'), I('rdl', 3, '8-10'), I('lunge', 3, '10/leg'), I('legpress', 3, '10-12'), I('calf', 3, '12-15')];
      if (p === 2) return [I('squat', 4, '5-6', { note: 'Heavier than Phase 1' }), I('rdl', 3, '8-10'), I('lunge', 3, '10/leg'), I('calf', 3, '12-15'),
        I('dtp_lp', 5, '50-10', { dtp: DTP_REPS, rest: 45, finisher: true, note: '45 s rest. A weight you can do 50 with; rest-pausing = too heavy.' })];
      if (p === 3) return [I('squat', 5, 5, { from: 75, note: '+2.5 kg/week only if all 25 reps clean' }), I('deadlift', 3, 5, { from: 80, note: '+5 kg/week if clean' }),
        I('lunge', 3, '8/leg', { note: 'Dumbbells' }), I('legcurl', 3, 10), I('calf', 3, 12),
        I('dtp_lp', 5, '50-10', { dtp: DTP_REPS, rest: 45, finisher: true, optional: true, note: 'Only if you are under 45 min.' })];
      return [I('squat', 4, '4-5'), I('deadlift', 3, '3-5'), I('lunge', 3, '8/leg'), I('calf', 3, 12)];
    }
    if (code === 'B') {
      if (p === 1) return early
        ? [I('bench', 3, 8), I('pulldown', 3, 10), I('row', 3, 10), I('ohp', 2, 8), I('facepull', 2, 15, { note: 'Light' })]
        : [I('bench', 4, '6-8'), I('pulldown', 4, '8-10'), I('row', 3, '10-12'), I('ohp', 3, '8-10'), I('facepull', 3, 15)];
      if (p === 2) return [I('bench', 4, '5-6'), I('pulldown', 4, '8-10'), I('negatives', 3, 1, { note: 'Jump up, lower over 5 s' }),
        I('row', 3, '10-12'), I('ohp', 3, '8-10'), I('facepull', 3, 15)];
      if (p === 3) return [I('bench', 5, 5, { from: 60, note: '+2.5 kg/week only if all 25 reps clean' }), I('pullup', 4, 'max', { note: 'Band-assisted to reach 5' }),
        I('row', 3, '8-10'), I('ohp', 4, 6), I('facepull', 3, 15)];
      return [I('bench', 4, '4-5'), I('pullup', 5, 'max', { note: 'Strict only once you have 5' }), I('ohp', 4, 5), I('row', 3, '8-10'), I('facepull', 3, 15)];
    }
    if (code === 'C') {
      if (p === 1) return early
        ? [I('goblet', 3, 12), I('dbrdl', 3, 12), I('bss', 2, '8/leg', { note: 'Bodyweight' }), I('carry', 3, '30 m'), I('tire', 2, 5)]
        : [I('goblet', 4, '10-12'), I('dbrdl', 3, '10-12'), I('bss', 3, '8-10/leg'), I('carry', 4, '40 m'), I('tire', 3, '5-8')];
      if (p === 2) return [I('goblet', 4, '10-12'), I('dbrdl', 3, '10-12'), I('bss', 3, '8-10/leg'), I('carry', 4, '40 m', { note: 'Load toward 30-40 kg' }),
        I('emom', 8, 'round', { finisher: true, note: 'Odd minutes 3 flips, even minutes 20 m carry' })];
      if (p === 3) return [I('goblet', 4, 10, { from: 24, note: '3 s lowering' }), I('bss', 3, '8/leg', { note: 'Dumbbells' }), I('carry', 4, '40 m', { from: 40 }), I('tire', 3, 6)];
      return [I('goblet', 3, 10, { note: 'Stadium: 15 min strength first' }), I('carry', 3, '40 m'),
        I('stairs', 10, 'round', { note: 'Full walk-back recovery. Wet day: backyard tire + rope circuit instead.' })];
    }
    if (code === 'D') {
      var slow = p >= 3 ? { note: '3-4 s lowering' } : (p === 2 ? { note: 'Up a DB step when 12 is easy; slow the lowering at 24 kg' } : null);
      var list = (p === 1 && early)
        ? [I('dbpress', 3, 12), I('dbrow', 3, '12/side'), I('dbsp', 3, 10), I('pullapart', 2, 15), I('core', 2, 'round')]
        : [I('dbpress', 4, '10-12', slow), I('dbrow', 4, '10-12/side', slow), I('dbsp', 3, '10-12', slow), I('pullapart', 3, '15-20'), I('core', 3, 'round')];
      if (p === 4) list.push(I('dtp_db', 5, '50-10', { dtp: DTP_REPS, rest: 45, finisher: true, note: 'Rows or presses. 45 s rest.' }));
      return list;
    }
    return [];
  }

  var TITLES = {
    A: 'Day A · Lower strength', B: 'Day B · Upper push/pull', C: 'Day C · Lower + full body', D: 'Day D · Upper + core',
    F: '20-min floor session', T1: 'Test · Squat 5-rep max', T2: 'Test · Bench 5RM + pull-ups', T3: 'Test · Deadlift 5-rep max',
    T4: 'Test · 1,600 m + measurements', RUN: '1,600 m run', COND: 'Optional conditioning'
  };
  function location(code, w) {
    if (code === 'A' || code === 'B' || code === 'T1' || code === 'T2' || code === 'T3') return 'Gym';
    if (code === 'C') return phaseOfWeek(w).n === 4 ? 'Stadium' : 'Home + shed';
    if (code === 'T4' || code === 'RUN' || code === 'COND') return 'Stadium';
    return 'Home';
  }
  var MAIN = { squat: 1, bench: 1, deadlift: 1, ohp: 1 };

  // Full prescription for a session code on a given date
  function session(code, iso) {
    var n = dnISO(iso), w = weekOf(n), kind = weekKind(w), items, note = '';
    if (code === 'F') items = [I('floor', 3, 'round', { note: 'No rest between moves, 90 s between rounds. Counts as a session.' })];
    else if (code === 'RUN') items = [I('run', 1, 'time', { note: 'Walk breaks allowed. Just record the time.' })];
    else if (code === 'COND') items = [];
    else if (code === 'T1') items = [I('squat', 6, 5, { test: true, note: 'Work up in sets of 5 to a 5-rep max' })];
    else if (code === 'T2') items = [I('bench', 6, 5, { test: true, note: 'Work up to a 5-rep max' }), I('pullup', 2, 'max', { test: true, note: 'Max strict reps' })];
    else if (code === 'T3') items = [I('deadlift', 6, 5, { test: true, note: 'Work up to a 5-rep max' })];
    else if (code === 'T4') items = [I('run', 1, 'time'), I('waist', 1, 'cm', { note: 'Plus your 7-day average body weight' })];
    else {
      items = baseSession(code, w);
      if (kind === 'deload') {
        items = items.filter(function (it) { return !it.finisher; }).map(function (it) {
          var c = clone(it); if (EX[c.k].kind !== 'rounds') c.sets = Math.max(1, Math.ceil(c.sets / 2)); c.factor = 0.6; return c; });
        note = 'Deload: 60% of working weights, half the sets. Do not skip it.';
      } else if (kind === 'xmas') {
        items = items.filter(function (it) { return !it.finisher; }).map(function (it) { var c = clone(it); c.factor = 0.7; return c; });
        note = 'Christmas: minimum 2 sessions this week, one lower (A/C) and one upper (B/D), ~70% weights.';
      } else if (kind === 'taper') {
        items = items.filter(function (it) { return !it.finisher; }).map(function (it) {
          var c = clone(it);
          if (MAIN[c.k]) { c.sets = 3; c.reps = '3'; c.lo = 3; c.hi = 3; c.factor = 0.9; c.ofBest = true; c.note = '~90% of your best working weight'; }
          else if (EX[c.k].kind !== 'rounds') c.sets = Math.max(1, Math.ceil(c.sets / 2));
          return c; });
        note = 'Taper: main lifts 3 x 3 at ~90% of your best, everything else half the sets.';
      }
    }
    return { code: code, title: TITLES[code], location: location(code, w), week: w, kind: kind, light: kind === 'deload' || kind === 'xmas' || kind === 'taper', items: items, note: note,
      counts: !(code === 'RUN' || code === 'COND') };
  }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  // ---------------- Calendar ----------------
  // Scheduled session slots for a week: [{dow, code}]
  function slots(w) {
    if (w === 1) return [{ dow: 2, code: 'A' }, { dow: 4, code: 'B' }, { dow: 5, code: 'C' }];
    if (w === 34) return [{ dow: 0, code: 'T1' }, { dow: 1, code: 'T2' }, { dow: 3, code: 'T3' }, { dow: 5, code: 'T4' }];
    return [{ dow: 0, code: 'A' }, { dow: 1, code: 'B' }, { dow: 3, code: 'C' }, { dow: 4, code: 'D' }];
  }
  function required(w) { return weekKind(w) === 'xmas' ? 2 : slots(w).length; }

  var SPECIAL = {
    '2026-10-21': { tag: 'Start', text: 'Day 1. Measure your waist at the navel this morning.' },
    '2026-10-31': { code: 'RUN', tag: 'Baseline', text: '1,600 m baseline: 4 stadium laps, walk breaks allowed, record the time.' },
    '2026-11-29': { tag: 'Gate 1', text: 'Phase 1 gate: 19 of 23 sessions logged. Measure waist + 7-day average weight.' },
    '2027-01-24': { tag: 'Gate 2', text: 'Phase 2 gate: 23 of 28 sessions. Measure waist + 7-day average weight.' },
    '2027-03-27': { code: 'RUN', tag: 'Retest', text: '1,600 m retest. Target: 8% faster than the baseline.' },
    '2027-03-28': { tag: 'Gate 3', text: 'Phase 3 gate: 29 of 36 sessions. Measure waist + 7-day average weight.' },
    '2027-06-13': { tag: 'Final', text: 'Final gate: 36 of 44 sessions. Fill in the Test week column of the targets table.' }
  };

  // What a calendar day holds
  function day(iso) {
    var n = dnISO(iso), w = weekOf(n), d = dow(n);
    var out = { iso: iso, n: n, dow: d, week: w, inPlan: n >= START && n <= END };
    if (n < START) { out.type = 'before'; out.label = 'Plan starts Wed 21 Oct'; return out; }
    if (n > END) { out.type = 'after'; out.label = 'Plan complete'; return out; }
    var ph = phaseOfWeek(w); out.phase = ph; out.kind = weekKind(w);
    out.targets = { steps: ph.steps, protein: ph.protein, kcal: out.kind === 'xmas' ? null : ph.kcal, weighIn: d === 0 || d === 2 || d === 4 };
    var sp = SPECIAL[iso]; if (sp) out.special = sp;
    var s = slots(w).filter(function (x) { return x.dow === d; })[0];
    if (s) { out.type = 'session'; out.code = s.code; out.label = TITLES[s.code]; out.optional = out.kind === 'xmas'; return out; }
    if (sp && sp.code) { out.type = 'extra'; out.code = sp.code; out.label = TITLES[sp.code]; return out; }
    if (d === 6) { out.type = 'rest'; out.label = 'Full rest'; return out; }
    if (d === 5 && w !== 1 && w !== 34) { out.type = 'spare'; out.label = 'Spare slot: make-up or optional conditioning'; return out; }
    if (d === 2 && w !== 1) { out.type = 'rest'; out.label = 'Rest, or an easy 20-30 min walk'; return out; }
    out.type = 'rest'; out.label = 'Rest'; return out;
  }

  var Plan = {
    pad: pad, dnISO: dnISO, isoDn: isoDn, todayISO: todayISO, dow: dow, fmt: fmt, DOW: DOW, MON: MON,
    START: START, END: END, WEEKS: WEEKS, WEEK1_MON: WEEK1_MON, PHASES: PHASES, EX: EX, TITLES: TITLES, KIND_LABEL: KIND_LABEL,
    weekOf: weekOf, weekMon: weekMon, phaseOfWeek: phaseOfWeek, phaseRange: phaseRange, weekKind: weekKind,
    slots: slots, required: required, session: session, day: day, parseReps: parseReps
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = Plan; else G.Plan = Plan;
})(this);
