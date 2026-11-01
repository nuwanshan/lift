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

  // Which person's plan: set by the page (window.LIFT_PROFILE) or env LIFT_PROFILE in Node. Default: Nuwan.
  var WHO = (typeof window !== 'undefined' && window.LIFT_PROFILE) || (typeof process !== 'undefined' && process.env && process.env.LIFT_PROFILE) || 'nuwan';
  var PAM = WHO === 'pam';
  // Restarted 1 Nov 2026 after illness: Week 1 = Mon 2 Nov, final test Fri 18 Jun 2027 (Week 33). Same calendar for both plans.
  var WEEK1_MON = dnISO('2026-11-02');
  var START = WEEK1_MON;                     // Mon — plan day 1
  var END = dnISO('2027-06-18');             // Fri — final test day, Week 33
  var WEEKS = 33;

  var PHASES = PAM ? [
    { n: 1, name: 'Rebuild', from: 1, to: 6, gate: 24, of: 30, steps: 9000, protein: 110, kcal: null },
    { n: 2, name: 'Build', from: 7, to: 14, gate: 28, of: 34, steps: 9000, protein: 110, kcal: null },
    { n: 3, name: 'Strength & shape', from: 15, to: 23, gate: 36, of: 45, steps: 9000, protein: 110, kcal: null },
    { n: 4, name: 'Lean out', from: 24, to: 33, gate: 40, of: 49, steps: 10000, protein: 110, kcal: null }
  ] : [
    { n: 1, name: 'Restart', from: 1, to: 6, gate: 20, of: 24, steps: 7000, protein: 150, kcal: null },
    { n: 2, name: 'Build', from: 7, to: 14, gate: 23, of: 28, steps: 8000, protein: 160, kcal: 2200 },
    { n: 3, name: 'Strength', from: 15, to: 23, gate: 29, of: 36, steps: 8000, protein: 160, kcal: 2200 },
    { n: 4, name: 'Peak & lean', from: 24, to: 33, gate: 32, of: 40, steps: 10000, protein: 160, kcal: 2100 }
  ];
  function phaseOfWeek(w) { for (var i = 0; i < PHASES.length; i++) if (w >= PHASES[i].from && w <= PHASES[i].to) return PHASES[i]; return null; }
  function weekOf(n) { return Math.floor((n - WEEK1_MON) / 7) + 1; }
  function weekMon(w) { return WEEK1_MON + (w - 1) * 7; }
  function phaseRange(p) { return { from: Math.max(START, weekMon(p.from)), to: Math.min(END, weekMon(p.to) + 6) }; }

  function weekKind(w) {
    if (w === 8 || w === 9) return 'xmas';              // 21 Dec – 3 Jan
    if (w === 17 || w === 21 || w === 28) return 'deload'; // 22 Feb, Easter 22 Mar, 10 May
    if (w === 32) return 'taper';                        // 7–13 Jun
    if (w === 33) return 'test';                         // 14–18 Jun
    return 'normal';
  }
  var KIND_LABEL = { xmas: 'Christmas week: 2 sessions minimum, ~70% weights', deload: 'Deload week: 60% weights, half the sets', taper: 'Taper week: main lifts 3 x 3 at ~90%', test: 'Test week', normal: '' };

  // ---------------- Exercise catalogue ----------------
  // kind: bb barbell, db dumbbell, cable, machine, bw bodyweight, carry (kg + metres), rounds (tick only)
  var EX = {
    squat: { name: 'Barbell back squat', kind: 'bb', inc: 5, start: 32.5, main: true },
    rdl: { name: 'Romanian deadlift', kind: 'bb', inc: 5, start: 32.5 },
    deadlift: { name: 'Deadlift', kind: 'bb', inc: 5, main: true, seed: { k: 'rdl', x: 1 } }, // from Week 7; first session = last RDL weight
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
    dbpress: { name: 'Dumbbell floor/bench press', kind: 'db', inc: 2, start: 11.5, perHand: true, seed: { k: 'incdb', x: 1 } },
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
    waist: { name: 'Waist at navel', kind: 'measure' },
    // Rotation partners (alternate every 4 weeks from Week 3). seed = first-time weight from the partner's last log x ratio.
    stepup: { name: 'Dumbbell step-up (knee-high box)', kind: 'db', inc: 2, start: 0, seed: { k: 'lunge', x: 1 } },
    pulldown_cg: { name: 'Close-grip lat pulldown', kind: 'cable', inc: 2.5, start: 27, seed: { k: 'pulldown', x: 1 } },
    goblet_hu: { name: 'Heels-up goblet squat (heels on a plate)', kind: 'db', inc: 2, start: 8, seed: { k: 'goblet', x: 1 } },
    arnold: { name: 'Arnold press (standing)', kind: 'db', inc: 2, start: 8, perHand: true, seed: { k: 'dbsp', x: 0.85 } },
    // Arms, Day D from Week 3 (superset)
    curl: { name: 'Dumbbell curl', kind: 'db', inc: 2, start: null, perHand: true },
    ohext: { name: 'Overhead triceps extension (one DB, two hands)', kind: 'db', inc: 2, start: null },
    // Pam's plan
    hipthrust: { name: 'Barbell hip thrust', kind: 'bb', inc: 5, start: null },
    abductor: { name: 'Hip abduction machine', kind: 'machine', inc: 2.5, start: null },
    incdb: { name: 'Incline dumbbell press', kind: 'db', inc: 2, start: null, perHand: true },
    pushdown: { name: 'Triceps rope pushdown', kind: 'cable', inc: 2.5, start: null },
    pallof: { name: 'Pallof press (cable)', kind: 'cable', inc: 2.5, start: null },
    backext: { name: 'Back extension (45°)', kind: 'bw', inc: 0, start: 0 },
    farmer: { name: 'Dumbbell farmer carry', kind: 'carry', inc: 0, start: null },
    glutebridge: { name: 'Dumbbell glute bridge (pause at the top)', kind: 'db', inc: 2, start: null },
    pushup: { name: 'Push-up (hands on a bench or step if needed)', kind: 'bw', inc: 0, start: 0 },
    revfly: { name: 'Bent-over reverse fly', kind: 'db', inc: 1, start: null, perHand: true },
    pcore: { name: 'Dead bug 8/side + side plank 20-30 s/side + band Pallof 10/side', kind: 'rounds' },
    incwalk: { name: 'Incline treadmill walk', kind: 'rounds' },
    intervals: { name: 'Treadmill intervals', kind: 'rounds' },
    srun: { name: 'Stadium run', kind: 'rounds' },
    circuit: { name: 'Finisher circuit: goblet squat 10 · push-up 8 · DB row 10/side · farmer carry 40 m', kind: 'rounds' }
  };
  var ROTATE = PAM ? { lunge: 'stepup', pulldown: 'pulldown_cg', goblet: 'goblet_hu', dbsp: 'arnold', incdb: 'dbpress' } : { lunge: 'stepup', pulldown: 'pulldown_cg', goblet: 'goblet_hu', dbsp: 'arnold' };
  // 0 = original exercises, 1 = rotation partners. Weeks 1-6 original, then flip every 4 weeks (7-10 partners, 11-14 original, ...).
  function variant(w) { return w < 3 ? 0 : Math.floor((w - 3) / 4) % 2; }
  // Second half of each phase: +1 set on the day's first 3-set accessory.
  function secondHalf(w) { var ph = phaseOfWeek(w); return w >= ph.from + Math.ceil((ph.to - ph.from + 1) / 2); }

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
    var list = coreSession(code, w), p = phaseOfWeek(w).n;
    if (variant(w) === 1) list = list.map(function (it) {
      var to = ROTATE[it.k]; if (!to || it.from != null || (it.k === 'goblet' && p > 2)) return it;
      var c = clone(it); c.k = to; c.name = EX[to].name; c.rotated = true; return c; });
    if (secondHalf(w)) for (var i = 0; i < list.length; i++) {
      var it = list[i], kd = EX[it.k].kind;
      if (!MAIN[it.k] && !it.finisher && it.sets === 3 && (kd === 'bb' || kd === 'db' || kd === 'cable' || kd === 'machine')) {
        var c2 = clone(it); c2.sets = 4; c2.note = (c2.note ? c2.note + ' · ' : '') + '+1 set: second half of the phase'; list[i] = c2; break; }
    }
    return list;
  }
  function coreSession(code, w) {
    if (PAM) return pamSession(code, w);
    var p = phaseOfWeek(w).n, early = w <= 2;
    if (code === 'A') {
      if (p === 1) return early
        ? [I('squat', 3, 8), I('rdl', 3, 10), I('lunge', 2, '10/leg', { note: 'Bodyweight' }), I('legpress', 2, 12), I('calf', 3, 12)]
        : [I('squat', 4, '6-8'), I('rdl', 3, '8-10'), I('lunge', 3, '10/leg'), I('legpress', 3, '10-12'), I('calf', 3, '12-15')];
      if (p === 2) return [I('squat', 4, '5-6', { note: 'Heavier than Phase 1' }), I('deadlift', 3, 5, { note: 'Replaces the RDL. Same setup every rep: bar over midfoot, shins to bar, brace, push the floor away. +5 kg only when all 15 reps are clean.' }), I('lunge', 3, '10/leg'), I('calf', 3, '12-15'),
        I('dtp_lp', 5, '50-10', { dtp: DTP_REPS, rest: 45, finisher: true, note: '45 s rest. A weight you can do 50 with; rest-pausing = too heavy.' })];
      if (p === 3) return [I('squat', 5, 5, { inc: 2.5, note: 'Carries on from Phase 2. +2.5 kg only when all 25 reps are clean.' }), I('deadlift', 3, 5, { note: 'Carries on from Phase 2. +5 kg only when all 15 reps are clean.' }),
        I('lunge', 3, '8/leg', { note: 'Dumbbells' }), I('legcurl', 3, 10), I('calf', 3, 12),
        I('dtp_lp', 5, '50-10', { dtp: DTP_REPS, rest: 45, finisher: true, optional: true, note: 'Only if you are under 45 min.' })];
      return [I('squat', 4, '4-5', { inc: 2.5 }), I('deadlift', 3, '3-5'), I('lunge', 3, '8/leg'), I('calf', 3, 12)];
    }
    if (code === 'B') {
      if (p === 1) return early
        ? [I('bench', 3, 8), I('pulldown', 3, 10), I('row', 3, 10), I('ohp', 2, 8), I('facepull', 2, 15, { note: 'Light' })]
        : [I('bench', 4, '6-8'), I('pulldown', 4, '8-10'), I('row', 3, '10-12'), I('ohp', 3, '8-10'), I('facepull', 3, 15)];
      if (p === 2) return [I('bench', 4, '5-6'), I('pulldown', 4, '8-10'), I('negatives', 3, 1, { note: 'Jump up, lower over 5 s' }),
        I('row', 3, '10-12'), I('ohp', 3, '8-10'), I('facepull', 3, 15)];
      if (p === 3) return [I('bench', 5, 5, { note: 'Carries on from Phase 2. +2.5 kg only when all 25 reps are clean.' }), I('pullup', 4, 'max', { note: 'Band-assisted to reach 5' }),
        I('row', 3, '8-10'), I('ohp', 4, 6), I('facepull', 3, 15)];
      return [I('bench', 4, '4-5'), I('pullup', 5, 'max', { note: 'Strict only once you have 5' }), I('ohp', 4, 5), I('row', 3, '8-10'), I('facepull', 3, 15)];
    }
    if (code === 'C') {
      if (p === 1) return early
        ? [I('goblet', 3, 12), I('dbrdl', 3, 12), I('bss', 2, '8/leg', { note: 'Bodyweight' }), I('carry', 3, '30 m'), I('tire', 2, 5)]
        : [I('goblet', 4, '10-12'), I('dbrdl', 3, '10-12'), I('bss', 3, '8-10/leg'), I('carry', 4, '40 m'), I('tire', 3, '5-8')];
      if (p === 2) return [I('goblet', 4, '10-12'), I('dbrdl', 3, '10-12'), I('bss', 3, '8-10/leg'), I('carry', 4, '40 m', { note: 'Load toward 30-40 kg' }),
        I('emom', 8, 'round', { finisher: true, note: 'Odd minutes 3 flips, even minutes 20 m carry' })];
      if (p === 3) return [I('goblet', 4, 10, { note: '3 s lowering. Build toward 24 kg.' }), I('dbrdl', 3, '8-10', { note: '3 s lowering, hamstrings and glutes' }), I('bss', 3, '8/leg', { note: 'Dumbbells' }), I('carry', 4, '40 m', { note: 'Build toward 40 kg' }), I('tire', 3, 6)];
      return [I('goblet', 3, 10, { note: 'Stadium: 15 min strength first' }), I('dbrdl', 3, 10, { note: 'Hamstrings and glutes' }), I('carry', 3, '40 m'),
        I('stairs', 10, 'round', { note: 'Full walk-back recovery. Wet day: backyard tire + rope circuit instead.' })];
    }
    if (code === 'D') {
      var slow = p >= 3 ? { note: '3-4 s lowering' } : (p === 2 ? { note: 'Up a DB step when 12 is easy; slow the lowering at 24 kg' } : null);
      var list = (p === 1 && early)
        ? [I('dbpress', 3, 12), I('dbrow', 3, '12/side'), I('dbsp', 3, 10), I('pullapart', 2, 15), I('core', 2, 'round')]
        : [I('dbpress', 4, '10-12', slow), I('dbrow', 4, '10-12/side', slow), I('dbsp', 3, '10-12', slow), I('pullapart', 3, '15-20'), I('core', 3, 'round')];
      {
        var at = list.map(function (it) { return it.k; }).indexOf('pullapart'), ea = p === 1 && early;
        list.splice(at, 0, I('curl', ea ? 2 : 3, ea ? 12 : '10-12', { note: 'Superset with the extension: curl, extension, 60 s rest. ' + (ea ? 'Light: a weight you could do 16-18 times.' : 'A weight you can do 12 with, 2 left.') }),
          I('ohext', ea ? 2 : 3, ea ? 12 : '10-12', { note: 'Superset with the curl' + (ea ? '. Light.' : '') }));
        list[at + 2] = clone(list[at + 2]); list[at + 2].note = 'Superset with the core work: alternate, no rest between';
      }
      if (p === 4) list.push(I('dtp_db', 5, '50-10', { dtp: DTP_REPS, rest: 45, finisher: true, note: 'Rows or presses. 45 s rest.' }));
      return list;
    }
    return [];
  }

  // ---------------- Pam: 5 sessions, fat loss + shape, diastasis-safe core ----------------
  var BREATHE = 'Breathe out on the effort. Stop the set if your belly domes or ridges.';
  function pamSession(code, w) {
    var p = phaseOfWeek(w).n, wk1 = w === 1;
    var find = wk1 ? { note: 'Week 1: find your weight. End every set with 2 reps left.' } : null;
    function n(x, extra) { var o = {}; if (find) o.note = find.note; if (x) o.note = (o.note ? o.note + ' ' : '') + x; if (extra) for (var k in extra) o[k] = extra[k]; return o; }
    if (code === 'A') { // Tue gym: lower, squat + glutes
      if (p === 1) return [I('squat', 3, '10-12', n(BREATHE)), I('hipthrust', 3, '10-12', n('Chin tucked, ribs down, squeeze 1 s at the top.')), I('rdl', 3, '10-12', n()), I('lunge', 2, '10/leg', n('Dumbbells')), I('abductor', 2, 15, n()),
        I('incwalk', 1, '10 min', { finisher: true, note: '10-12% incline, brisk walk, no holding the rails.' })];
      if (p === 2) return [I('squat', 4, '8-10', { note: BREATHE }), I('hipthrust', 4, '8-12', { note: 'Squeeze 1 s at the top.' }), I('rdl', 3, '8-10'), I('lunge', 3, '10/leg', { note: 'Dumbbells' }), I('abductor', 2, 15),
        I('incwalk', 1, '12 min', { finisher: true, note: '12% incline, brisk.' })];
      if (p === 3) return [I('squat', 4, '6-8', { inc: 2.5, note: BREATHE + ' +2.5 kg when every set hits 8.' }), I('hipthrust', 4, '8-10'), I('rdl', 3, '8-10'), I('lunge', 3, '8/leg', { note: 'Dumbbells' }), I('abductor', 2, 15),
        I('incwalk', 1, '12 min', { finisher: true, note: '12% incline, brisk.' })];
      return [I('squat', 3, '8-10', { inc: 2.5, note: BREATHE }), I('hipthrust', 3, '10-12'), I('rdl', 3, 10), I('lunge', 3, '10/leg', { note: 'Dumbbells' }), I('abductor', 2, 15),
        I('intervals', 8, '1 min fast / 1 min walk', { finisher: true, note: 'Treadmill. Fast = hard but controlled, about 8 out of 10.' })];
    }
    if (code === 'B') { // Thu gym: upper, back + posture + triceps
      var list = [I('pulldown', p === 1 ? 3 : 4, p === 3 ? '6-10' : '10-12', n('Pull the elbows down to your pockets, chest up.')), I('row', 3, p === 3 ? '8-10' : '10-12', n('Shoulder blades back first, then pull.')),
        I('incdb', 3, p === 3 ? '8-10' : '10-12', n()), I('facepull', 3, 15, n('Light. Pull to the eyes, thumbs back. Posture work.')), I('pushdown', 3, '12-15', n('Backs of the arms. Elbows pinned to your sides.')),
        I('pallof', p === 1 ? 2 : 3, '10/side', n('Deep core without crunching. ' + BREATHE))];
      if (p === 4) list.push(I('intervals', 6, '1 min fast / 1 min walk', { finisher: true, note: 'Treadmill, about 8 out of 10.' }));
      return list;
    }
    if (code === 'C') { // Sat gym: full body + intervals
      var c = [I('legpress', 3, p >= 3 ? '10-12' : '12-15', n('Feet high and wide = more glutes.')), I('backext', 3, '12-15', n('Squeeze the glutes to come up. Hold a plate when 15 is easy.')),
        I('pulldown', 3, '10-12', n()), I('dbsp', 3, '10-12', n('Seated, back supported.')), I('farmer', 3, '40 m', n('Heavy dumbbells, tall posture.'))];
      var rounds = p === 1 ? 6 : p === 2 ? 8 : 10;
      c.push(I('intervals', rounds, p === 3 ? '2 min hard / 1 min easy' : '1 min fast / 1 min walk', { finisher: true, note: 'Treadmill. Warm up 3 min first. About 8 out of 10 on the hard parts.' }));
      return c;
    }
    if (code === 'D') { // Mon home: glutes + core + stadium run
      var runTxt = p === 1 ? '20 min easy' : p === 2 ? '25 min easy' : p === 3 ? '20 min, last 8 min faster' : '25-30 min easy';
      return [I('goblet', 3, '12-15', n()), I('dbrdl', 3, '12', n()), I('glutebridge', 3, '15', n('Pause 2 s at the top.')), I('bss', 2, '10/leg', n('Bodyweight first, then hold dumbbells.')),
        I('pcore', 3, 'round', { note: 'No crunches or sit-ups. ' + BREATHE }), I('srun', 1, runTxt, { finisher: true, note: 'Stadium next door. Talking pace unless it says faster. Wet or icy: 20 min brisk walk.' })];
    }
    if (code === 'E') { // Fri home: upper, arms, core (legs rest between Thu and Sat)
      var e = [I('dbrow', 3, '10-12/side', n()), I('pushup', 3, '6-12', n('Hands on a bench or step if the floor is too hard. Body in one straight line.')), I('dbsp', 3, '10-12', n()),
        I('revfly', 3, '12-15', n('Light. Posture work.')), I('ohext', 3, '12-15', n('Superset with the curl: extension, curl, 60 s rest.')), I('curl', 2, '12', n('Superset with the extension')),
        I('pcore', 3, 'round', { note: 'No crunches or sit-ups. ' + BREATHE })];
      if (p === 4) e.push(I('circuit', 3, 'round', { finisher: true, note: 'No rest between moves, 60 s between rounds.' }));
      return e;
    }
    return [];
  }

  var TITLES = PAM ? {
    A: 'Day A · Lower: squat & glutes', B: 'Day B · Upper: back & posture', C: 'Day C · Full body + intervals', D: 'Day D · Glutes, core + run', E: 'Day E · Upper, arms & core',
    F: '20-min floor session', T1: 'Test · Squat 8-rep max + hip thrust', T2: 'Test · Pulldown 8-rep max + push-ups',
    T4: 'Test · 1,600 m + measurements', RUN: '1,600 m run', COND: 'Optional conditioning'
  } : {
    A: 'Day A · Lower strength', B: 'Day B · Upper push/pull', C: 'Day C · Lower + full body', D: 'Day D · Upper + core',
    F: '20-min floor session', T1: 'Test · Squat 5-rep max', T2: 'Test · Bench 5RM + pull-ups', T3: 'Test · Deadlift 5-rep max',
    T4: 'Test · 1,600 m + measurements', RUN: '1,600 m run', COND: 'Optional conditioning'
  };
  function location(code, w) {
    if (PAM) return (code === 'A' || code === 'B' || code === 'C' || code === 'T1' || code === 'T2') ? 'Gym' : code === 'D' ? 'Home + stadium' : (code === 'T4' || code === 'RUN') ? 'Stadium' : 'Home';
    if (code === 'A' || code === 'B' || code === 'T1' || code === 'T2' || code === 'T3') return 'Gym';
    if (code === 'C') return phaseOfWeek(w).n === 4 ? 'Stadium' : 'Home + shed';
    if (code === 'T4' || code === 'RUN' || code === 'COND') return 'Stadium';
    return 'Home';
  }
  var MAIN = PAM ? { squat: 1, hipthrust: 1 } : { squat: 1, bench: 1, deadlift: 1, ohp: 1 };

  // Full prescription for a session code on a given date
  function session(code, iso) {
    var n = dnISO(iso), w = weekOf(n), kind = weekKind(w), items, note = '';
    if (code === 'F') items = [I('floor', 3, 'round', { note: 'No rest between moves, 90 s between rounds. Counts as a session.' })];
    else if (code === 'RUN') items = [I('run', 1, 'time', { note: 'Walk breaks allowed. Just record the time.' })];
    else if (code === 'COND') items = [];
    else if (PAM && code === 'T1') items = [I('squat', 5, 8, { test: true, note: 'Work up in sets of 8 to the heaviest clean 8' }), I('hipthrust', 4, 10, { test: true, note: 'Work up to the heaviest clean 10' })];
    else if (PAM && code === 'T2') items = [I('pulldown', 5, 8, { test: true, note: 'Work up to the heaviest clean 8' }), I('pushup', 1, 'max', { test: true, note: 'One set, as many good reps as you can' })];
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
        note = PAM ? 'Christmas: minimum 2 sessions this week, one lower (A/D) and one upper (B/E), ~70% weights.' : 'Christmas: minimum 2 sessions this week, one lower (A/C) and one upper (B/D), ~70% weights.';
      } else if (kind === 'taper') {
        items = items.filter(function (it) { return !it.finisher; }).map(function (it) {
          var c = clone(it);
          if (MAIN[c.k]) { var tr = PAM ? 5 : 3; c.sets = 3; c.reps = String(tr); c.lo = tr; c.hi = tr; c.factor = 0.9; c.ofBest = true; c.note = '~90% of your best working weight'; }
          else if (EX[c.k].kind !== 'rounds') c.sets = Math.max(1, Math.ceil(c.sets / 2));
          return c; });
        note = PAM ? 'Taper: squat and hip thrust 3 x 5 at ~90% of your best, everything else half the sets.' : 'Taper: main lifts 3 x 3 at ~90% of your best, everything else half the sets.';
      }
    }
    if (w <= HOLD_WEEKS) items.forEach(function (it) { it.hold = true; }); // Nuwan Weeks 1-2: no weight increases while movements come back
    if (PAM && kind === 'normal' && !note && /^[A-E]$/.test(code)) note = 'Warm up 5 min. ' + BREATHE;
    return { code: code, title: TITLES[code], location: location(code, w), week: w, kind: kind, light: kind === 'deload' || kind === 'xmas' || kind === 'taper', items: items, note: note,
      counts: !(code === 'RUN' || code === 'COND') };
  }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  var HOLD_WEEKS = PAM ? 0 : 2;

  // ---------------- Calendar ----------------
  // Scheduled session slots for a week: [{dow, code}]
  function slots(w) {
    if (PAM) return w === 33 ? [{ dow: 0, code: 'D' }, { dow: 1, code: 'T1' }, { dow: 3, code: 'T2' }, { dow: 4, code: 'T4' }]
      : [{ dow: 0, code: 'D' }, { dow: 1, code: 'A' }, { dow: 3, code: 'B' }, { dow: 4, code: 'E' }, { dow: 5, code: 'C' }];
    if (w === 33) return [{ dow: 0, code: 'T1' }, { dow: 1, code: 'T2' }, { dow: 3, code: 'T3' }, { dow: 4, code: 'T4' }];
    return [{ dow: 0, code: 'A' }, { dow: 1, code: 'B' }, { dow: 3, code: 'C' }, { dow: 4, code: 'D' }];
  }
  function required(w) { return weekKind(w) === 'xmas' ? 2 : slots(w).length; }

  var SPECIAL = PAM ? {
    '2026-11-02': { tag: 'Start', text: 'Day 1. This morning: weigh in after the toilet and measure your waist at the navel. Week 1 is for finding your weights: end every set with 2 reps left.' },
    '2026-11-08': { code: 'RUN', tag: 'Baseline', text: '1,600 m baseline at the stadium (4 laps). Steady hard effort, record the time.' },
    '2026-12-13': { tag: 'Gate 1', text: 'Phase 1 gate: 24 of 30 sessions logged. Measure waist + 7-day average weight.' },
    '2027-02-07': { tag: 'Gate 2', text: 'Phase 2 gate: 28 of 34 sessions. Measure waist + 7-day average weight.' },
    '2027-04-04': { code: 'RUN', tag: 'Retest', text: '1,600 m retest. Beat the baseline.' },
    '2027-04-11': { tag: 'Gate 3', text: 'Phase 3 gate: 36 of 45 sessions. Measure waist + 7-day average weight.' },
    '2027-06-18': { tag: 'Final', text: 'Final gate: 40 of 49 sessions. Last measurements: waist, 7-day average weight, 1,600 m.' }
  } : {
    '2026-11-02': { tag: 'Start', text: 'Day 1. Measure your waist at the navel this morning. First week back after being sick: if a set feels like a grind, stop it there.' },
    '2026-11-07': { code: 'RUN', tag: 'Baseline', text: '1,600 m baseline: 4 stadium laps, walk breaks allowed, record the time.' },
    '2026-12-13': { tag: 'Gate 1', text: 'Phase 1 gate: 20 of 24 sessions logged. Measure waist + 7-day average weight.' },
    '2027-02-07': { tag: 'Gate 2', text: 'Phase 2 gate: 23 of 28 sessions. Measure waist + 7-day average weight.' },
    '2027-04-10': { code: 'RUN', tag: 'Retest', text: '1,600 m retest. Target: 8% faster than the baseline.' },
    '2027-04-11': { tag: 'Gate 3', text: 'Phase 3 gate: 29 of 36 sessions. Measure waist + 7-day average weight.' },
    '2027-06-18': { tag: 'Final', text: 'Final gate: 32 of 40 sessions. Fill in the Test week column of the targets table.' }
  };

  // What a calendar day holds
  function day(iso) {
    var n = dnISO(iso), w = weekOf(n), d = dow(n);
    var out = { iso: iso, n: n, dow: d, week: w, inPlan: n >= START && n <= END };
    if (n < START) { out.type = 'before'; out.label = 'Plan starts Mon 2 Nov'; return out; }
    if (n > END) { out.type = 'after'; out.label = 'Plan complete'; return out; }
    var ph = phaseOfWeek(w); out.phase = ph; out.kind = weekKind(w);
    out.targets = { steps: ph.steps, protein: ph.protein, kcal: out.kind === 'xmas' ? null : ph.kcal, weighIn: d === 0 || d === 2 || d === 4 };
    var sp = SPECIAL[iso]; if (sp) out.special = sp;
    var s = slots(w).filter(function (x) { return x.dow === d; })[0];
    if (s) { out.type = 'session'; out.code = s.code; out.label = TITLES[s.code]; out.optional = out.kind === 'xmas'; return out; }
    if (sp && sp.code) { out.type = 'extra'; out.code = sp.code; out.label = TITLES[sp.code]; return out; }
    if (d === 6) { out.type = 'rest'; out.label = 'Full rest'; return out; }
    if (!PAM && d === 5 && w !== 33) { out.type = 'spare'; out.label = 'Spare slot: make-up or optional conditioning'; return out; }
    if (d === 2) { out.type = 'rest'; out.label = 'Rest, or an easy 20-30 min walk'; return out; }
    out.type = 'rest'; out.label = 'Rest'; return out;
  }

  var Plan = {
    pad: pad, dnISO: dnISO, isoDn: isoDn, todayISO: todayISO, dow: dow, fmt: fmt, DOW: DOW, MON: MON,
    START: START, END: END, WEEKS: WEEKS, WEEK1_MON: WEEK1_MON, PHASES: PHASES, EX: EX, TITLES: TITLES, KIND_LABEL: KIND_LABEL,
    weekOf: weekOf, weekMon: weekMon, variant: variant, secondHalf: secondHalf, ROTATE: ROTATE, phaseOfWeek: phaseOfWeek, phaseRange: phaseRange, weekKind: weekKind,
    slots: slots, required: required, session: session, day: day, parseReps: parseReps,
    WHO: WHO, KEY: PAM ? 'lift.pam.v1' : 'lift.v1', NO_STARTS: PAM,
    CODES: PAM ? ['A', 'B', 'C', 'D', 'E'] : ['A', 'B', 'C', 'D'], PER_WEEK: PAM ? 5 : 4,
    LEGEND: PAM ? 'A/B/C gym, D/E home.' : 'A/B gym, C/D home. + = spare slot.',
    BEST_KEYS: PAM ? ['squat', 'hipthrust', 'rdl', 'pulldown', 'row', 'incdb', 'legpress'] : ['squat', 'bench', 'deadlift', 'ohp', 'rdl', 'row', 'pulldown'],
    PLAN_NAME: (PAM ? 'Pam' : 'Nuwan') + ' · 8-Month Plan 2 Nov 2026 - 18 Jun 2027',
    WEEK1_TEXT: PAM ? 'Week 1: Mon D (home + stadium run), Tue A (gym), Thu B (gym), Fri E (home), Sat C (gym). Wed and Sun are rest. Weigh in and measure your waist on the first morning.'
      : 'Week 1: Mon A (gym), Tue B (gym), Thu C (home), Fri D (home), Sat 7 Nov 1,600 m baseline at the stadium. Measure your waist at the navel on the first morning. First week back after being sick: easy Week 1 sessions, stop a set if it turns into a grind.',
    NO_KCAL_TEXT: PAM ? 'Protein and steps only' : 'Phase 1: protein and steps are enough'
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = Plan; else G.Plan = Plan;
})(this);
