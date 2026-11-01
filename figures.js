/* Lift — exercise illustrations, muscle maps and form cues. All drawings are original, built from joint angles.
   Side view, facing right. Angles are absolute, clockwise from straight up: 0 up, 90 forward (right), 180 down, 270 back (left).
   Each panel is 100 x 90 with the ground at y 82. A pose is placed by one anchor: foot, hipAt, shoAt or handAt. */
(function (G) {
  'use strict';
  var L = { torso: 24, neck: 3, head: 5.2, thigh: 17.4, shin: 17.4, ua: 12, fa: 11.4, foot: 5.4 };
  var GY = 82;
  function pt(p, a, len) { var r = a * Math.PI / 180; return [p[0] + len * Math.sin(r), p[1] - len * Math.cos(r)]; }
  function r1(n) { return Math.round(n * 10) / 10; }
  function ln(a, b, w, cls) { return '<line x1="' + r1(a[0]) + '" y1="' + r1(a[1]) + '" x2="' + r1(b[0]) + '" y2="' + r1(b[1]) + '"' + (w ? ' stroke-width="' + w + '"' : '') + (cls ? ' class="' + cls + '"' : '') + '/>'; }
  function rect(x, y, w, h, cls, rot, cx, cy) { return '<rect x="' + r1(x) + '" y="' + r1(y) + '" width="' + r1(w) + '" height="' + r1(h) + '" rx="1.5" class="' + (cls || 'prop') + '"' + (rot ? ' transform="rotate(' + r1(rot) + ' ' + r1(cx) + ' ' + r1(cy) + ')"' : '') + '/>'; }
  function circ(x, y, r, cls) { return '<circle cx="' + r1(x) + '" cy="' + r1(y) + '" r="' + r + '" class="' + cls + '"/>'; }

  // ---------------- side-view figure ----------------
  function joints(p) {
    var hip = [0, 0];
    var knee = pt(hip, p.th, L.thigh), ankle = pt(knee, p.sh, L.shin);
    var knee2 = p.th2 != null ? pt(hip, p.th2, L.thigh) : null, ankle2 = knee2 ? pt(knee2, p.sh2 != null ? p.sh2 : p.sh, L.shin) : null;
    var sho = pt(hip, p.t, L.torso), neck = pt(sho, p.t, L.neck), head = pt(neck, p.t + (p.hd || 0), L.head);
    var elb = pt(sho, p.ua, L.ua), hand = pt(elb, p.fa, L.fa);
    var elb2 = p.ua2 != null ? pt(sho, p.ua2, L.ua) : null, hand2 = elb2 ? pt(elb2, p.fa2 != null ? p.fa2 : p.fa, L.fa) : null;
    var toe = pt(ankle, p.ft != null ? p.ft : 90, L.foot), toe2 = ankle2 ? pt(ankle2, p.ft2 != null ? p.ft2 : (p.ft != null ? p.ft : 90), L.foot) : null;
    var j = { hip: hip, knee: knee, ankle: ankle, toe: toe, knee2: knee2, ankle2: ankle2, toe2: toe2, sho: sho, head: head, elb: elb, hand: hand, elb2: elb2, hand2: hand2 };
    var ref = null, at = null;
    if (p.foot) { ref = ankle; at = p.foot; } else if (p.toeAt) { ref = toe; at = p.toeAt; } else if (p.hipAt) { ref = hip; at = p.hipAt; }
    else if (p.shoAt) { ref = sho; at = p.shoAt; } else if (p.handAt) { ref = hand; at = p.handAt; }
    var dx = at ? at[0] - ref[0] : 0, dy = at ? at[1] - ref[1] : 0;
    for (var k in j) if (j[k]) j[k] = [j[k][0] + dx, j[k][1] + dy];
    return j;
  }
  function figure(p) {
    var j = joints(p), s = '<g class="fg">';
    if (j.knee2) s += '<g class="far">' + ln(j.hip, j.knee2) + ln(j.knee2, j.ankle2) + (p.nofoot ? '' : ln(j.ankle2, j.toe2, 2.6)) + '</g>';
    if (j.elb2) s += '<g class="far">' + ln(j.sho, j.elb2, 2.5) + ln(j.elb2, j.hand2, 2.5) + '</g>';
    s += ln(j.hip, j.knee) + ln(j.knee, j.ankle) + (p.nofoot ? '' : ln(j.ankle, j.toe, 2.6));
    s += ln(j.hip, j.sho, 3.6) + circ(j.head[0], j.head[1], L.head, 'hd');
    s += ln(j.sho, j.elb, 2.6) + ln(j.elb, j.hand, 2.6);
    return { svg: s + '</g>', j: j };
  }

  // ---------------- front-view figure (pull-aparts, hip abduction) ----------------
  // p.front: true; p.hipAt; p.arm: [ua, fa] for the figure's left arm (screen right), mirrored; p.leg: [th, sh] mirrored; p.seated
  function frontFigure(p) {
    var tl = p.hinge ? L.torso * 0.45 : L.torso, hip = p.hipAt, sho = [hip[0], hip[1] - tl], head = [hip[0], sho[1] - (p.hinge ? 2 : L.neck + L.head)];
    var sR = [sho[0] + 6, sho[1] + 1], sL = [sho[0] - 6, sho[1] + 1], hR = [hip[0] + 3.5, hip[1]], hL = [hip[0] - 3.5, hip[1]];
    function mir(a) { return (360 - a) % 360; }
    var eR = pt(sR, p.arm[0], L.ua), wR = pt(eR, p.arm[1], L.fa), eL = pt(sL, mir(p.arm[0]), L.ua), wL = pt(eL, mir(p.arm[1]), L.fa);
    var kR = pt(hR, p.leg[0], p.seated ? L.thigh * 0.45 : L.thigh), aR = pt(kR, p.leg[1], L.shin), kL = pt(hL, mir(p.leg[0]), p.seated ? L.thigh * 0.45 : L.thigh), aL = pt(kL, mir(p.leg[1]), L.shin);
    var s = '<g class="fg">' + ln(sL, sR, 3) + ln(hL, hR, 3) + ln([hip[0], hip[1]], [sho[0], sho[1] + 1], 3.6) + circ(head[0], head[1], L.head, 'hd') +
      ln(sR, eR, 2.6) + ln(eR, wR, 2.6) + ln(sL, eL, 2.6) + ln(eL, wL, 2.6) + ln(hR, kR) + ln(kR, aR) + ln(hL, kL) + ln(kL, aL) +
      ln(aR, [aR[0] + 2.5, aR[1]], 2.6) + ln(aL, [aL[0] - 2.5, aL[1]], 2.6) + '</g>';
    return { svg: s, j: { hip: hip, sho: sho, head: head, hand: wR, hand2: wL, knee: kR, knee2: kL, ankle: aR, ankle2: aL, elb: eR, elb2: eL } };
  }

  // ---------------- equipment (drawn from the pose's joints) ----------------
  function plate(x, y, r) { return circ(x, y, r || 7, 'plate') + circ(x, y, 1.6, 'hub'); }
  function dbell(c, vert) { return vert ? rect(c[0] - 2, c[1] - 3.5, 4, 7, 'eqf') : rect(c[0] - 3.5, c[1] - 2, 7, 4, 'eqf'); }
  var EQ = {
    barBack: { behind: 1, f: function (j) { return plate(j.sho[0] - 3, j.sho[1] + 2); } },
    barHip: { behind: 1, f: function (j) { return plate(j.hip[0] + 1, j.hip[1] - 7); } },
    barHand: { f: function (j) { return plate(j.hand[0], j.hand[1]); } },
    db: { f: function (j) { return dbell(j.hand) + (j.hand2 ? dbell(j.hand2) : ''); } },
    dbOne: { f: function (j) { return dbell(j.hand); } },
    dbChest: { f: function (j) { return dbell(j.hand, true); } },
    dbHip: { f: function (j) { return dbell([j.hip[0] + 1, j.hip[1] - 3]); } },
    bag: { f: function (j) { return '<ellipse cx="' + r1(j.hand[0] + 1) + '" cy="' + r1(j.hand[1]) + '" rx="6" ry="4.5" class="eqf"/>'; } },
    cableUp: { f: function (j) { return ln(j.hand, [j.hand[0] + 3, 6], 0.8, 'cab') + rect(j.hand[0] - 7, j.hand[1] - 1.2, 14, 2.4, 'eqf'); } },
    cableFwd: { f: function (j) { return ln(j.hand, [96, j.hand[1] + 1], 0.8, 'cab') + rect(j.hand[0] - 1.2, j.hand[1] - 3, 2.4, 6, 'eqf'); } },
    cableHigh: { f: function (j) { return ln(j.hand, [94, 14], 0.8, 'cab') + circ(j.hand[0], j.hand[1], 1.8, 'eqf'); } },
    cableHigh2: { f: function (j) { return ln(j.hand, [j.hand[0] + 12, 8], 0.8, 'cab') + circ(j.hand[0], j.hand[1], 1.8, 'eqf'); } },
    cableSide: { f: function (j) { return ln(j.hand, [4, j.hand[1]], 0.8, 'cab') + circ(j.hand[0], j.hand[1], 1.8, 'eqf'); } },
    band: { f: function (j) { return ln(j.hand, j.hand2, 1.2, 'band'); } },
    sled: { f: function (j) { var c = pt(j.ankle, 61, 2); return rect(c[0] - 1.5, c[1] - 10, 3, 20, 'prop', -29, c[0], c[1]); } },
    pad: { f: function (j) { return circ(j.ankle[0] - 2, j.ankle[1] - 1, 2.6, 'propf'); } },
    tire: { behind: 1, f: function (j) { var a = Math.atan2(j.hand[1] - GY, j.hand[0] - (j.hand[0] + 14)) * 180 / Math.PI; return rect(j.hand[0] - 2, j.hand[1] - 4, 26, 8, 'tire', 0, 0, 0); } }
  };

  // ---------------- props (panel coordinates) ----------------
  var PROPS = {
    benchLow: function () { return rect(8, 65, 24, 4) + ln([13, 69], [13, GY], 2, 'propl') + ln([27, 69], [27, GY], 2, 'propl'); },
    benchFlat: function () { return rect(18, 64, 50, 4) + ln([24, 68], [24, GY], 2, 'propl') + ln([62, 68], [62, GY], 2, 'propl'); },
    benchRow: function () { return rect(52, 62, 34, 4) + ln([58, 66], [58, GY], 2, 'propl') + ln([80, 66], [80, GY], 2, 'propl'); },
    benchBack: function () { return rect(2, 64, 22, 4) + ln([7, 68], [7, GY], 2, 'propl') + ln([19, 68], [19, GY], 2, 'propl'); },
    incline: function (j) { var a = pt(j.hip, 315, 2), b = pt(a, 315, 28); return ln([a[0] - 2, a[1] + 3], [b[0] - 2, b[1] + 3], 4, 'propl') + rect(j.hip[0] - 10, j.hip[1] + 2, 16, 4) + ln([j.hip[0] - 2, j.hip[1] + 6], [j.hip[0] - 2, GY], 2, 'propl'); },
    seat: function () { return rect(30, 65, 20, 3.5) + ln([40, 68.5], [40, GY], 2, 'propl'); },
    kneepad: function () { return rect(52, 56, 8, 4); },
    seatLow: function () { return rect(26, 66, 22, 3.5) + ln([37, 69.5], [37, GY], 2, 'propl') + rect(80, 66, 4, 16); },
    seatCurl: function () { return rect(26, 62, 22, 3.5) + ln([37, 65.5], [37, GY], 2, 'propl') + rect(22, 38, 4, 26); },
    seatFront: function () { return rect(36, 62, 28, 4) + ln([50, 66], [50, GY], 2, 'propl'); },
    pulley: function () { return circ(51, 6, 2.5, 'propl'); },
    pulleyHigh: function () { return circ(94, 14, 2.5, 'propl') + ln([96, 6], [96, GY], 2, 'propl'); },
    pulleyFwd: function () { return ln([96, 50], [96, GY], 2, 'propl'); },
    pulleyLeft: function () { return ln([4, 30], [4, GY], 2, 'propl'); },
    legpress: function () { return rect(16, 58, 30, 4, 'prop', -30, 31, 60) + ln([26, 66], [26, GY], 2, 'propl'); },
    box: function () { return rect(52, 66, 24, 16); },
    step: function () { return rect(38, 78, 24, 4); },
    calfstep: function () { return rect(50, 72, 22, 10); },
    heelplate: function () { return rect(41, 79.5, 6, 2.5); },
    bar: function () { return ln([20, 8], [80, 8], 2.2, 'propl'); },
    hyper: function () { return rect(46, 50, 10, 5, 'prop', 45, 51, 52) + ln([51, 56], [51, GY], 2, 'propl') + rect(16, 74, 10, 3) ; },
    floor: function () { return ''; },
    incTread: function () { return ln([8, 80], [92, 70], 3, 'propl'); },
    stairs: function () { return '<path d="M30 82 V74 H48 V66 H66 V58 H84 V82" class="propfill"/>'; },
    mat: function () { return rect(6, 80.5, 88, 2); }
  };

  // ---------------- muscle map (front + back, original outline) ----------------
  // Each region: [view, cx, cy, rx, ry] mirrored left/right when 'pair'.
  var MREG = {
    chest: [['f', 7, 31, 7.2, 5, 1]], fdelt: [['f', 15.5, 27, 4.2, 4.6, 1]], sdelt: [['f', 17.5, 28, 3.2, 4.2, 1], ['b', 17.5, 28, 3.2, 4.2, 1]],
    rdelt: [['b', 15.5, 27, 4.2, 4.6, 1]], biceps: [['f', 18.5, 39, 3.2, 6.5, 1]], triceps: [['b', 18.5, 39, 3.4, 7, 1]],
    forearms: [['f', 20, 53, 2.8, 7, 1], ['b', 20, 53, 2.8, 7, 1]], abs: [['f', 0, 46, 5.6, 11, 0]], obliques: [['f', 9, 47, 3, 8.5, 1]],
    traps: [['b', 0, 24, 10, 5, 0]], upperback: [['b', 0, 33, 6.5, 6.5, 0]], lats: [['b', 9, 39, 5, 10, 1]], lowback: [['b', 0, 52, 5.2, 6, 0]],
    glutes: [['b', 5.2, 65, 6, 6.2, 1]], hipout: [['b', 10.5, 61, 2.6, 5, 1]], quads: [['f', 6.5, 78, 5.4, 13, 1]], adductors: [['f', 2.4, 72, 1.8, 7, 1]],
    hams: [['b', 6.5, 82, 5, 12, 1]], calves: [['b', 6.5, 102, 3.8, 8, 1]], shins: [['f', 6.5, 102, 3.2, 8, 1]]
  };
  var MNAME = { chest: 'Chest', fdelt: 'Front shoulders', sdelt: 'Side shoulders', rdelt: 'Rear shoulders', biceps: 'Biceps', triceps: 'Triceps', forearms: 'Forearms & grip',
    abs: 'Abs', obliques: 'Obliques', traps: 'Traps', upperback: 'Upper back', lats: 'Lats', lowback: 'Lower back', glutes: 'Glutes', hipout: 'Outer hips',
    quads: 'Quads', adductors: 'Inner thighs', hams: 'Hamstrings', calves: 'Calves' };
  function muscleMap(m, s) {
    var lvl = {}; (s || []).forEach(function (k) { lvl[k] = 'm2'; }); (m || []).forEach(function (k) { lvl[k] = 'm1'; });
    var out = '';
    ['f', 'b'].forEach(function (v, vi) {
      var cx = vi ? 150 : 50, g = '<g>';
      g += circ(cx, 11, 6.5, 'mo') + rect(cx - 2.5, 16, 5, 5, 'mo') + rect(cx - 4, 106, 3, 4, 'mo') + rect(cx + 1, 106, 3, 4, 'mo');
      Object.keys(MREG).forEach(function (k) {
        MREG[k].forEach(function (r) {
          if (r[0] !== v) return;
          var cls = lvl[k] || 'mo';
          var e = function (x) { return '<ellipse cx="' + r1(cx + x) + '" cy="' + r[2] + '" rx="' + r[3] + '" ry="' + r[4] + '" class="' + cls + '"/>'; };
          g += r[5] ? e(-r[1]) + e(r[1]) : e(r[1]);
        });
      });
      out += g + '</g>';
    });
    return '<svg viewBox="0 0 200 116" class="fig mus" role="img" aria-label="Muscles worked">' + out +
      '<text x="50" y="114" class="lbl">Front</text><text x="150" y="114" class="lbl">Back</text></svg>';
  }

  // ---------------- exercise library ----------------
  var STAND = { t: 0, th: 180, sh: 180 };
  function P(o) { var r = {}; for (var k in STAND) r[k] = STAND[k]; for (var k2 in o) r[k2] = o[k2]; return r; }
  var F = {
    squat: { eq: 'barBack', m: ['quads', 'glutes'], s: ['hams', 'lowback', 'abs'], poses: [
      P({ foot: [50, GY], t: 4, th: 182, sh: 178, ua: 200, fa: 345 }),
      P({ foot: [50, GY], t: 40, th: 97, sh: 200, ua: 215, fa: 10 })],
      cues: ['Bar on the upper back. Brace your belly and breathe in before each rep.', 'Sit down between your heels: knees travel out over the toes, chest stays up.', 'Go to at least thighs parallel, then drive up through the whole foot.'] },
    rdl: { eq: 'barHand', m: ['hams', 'glutes'], s: ['lowback', 'forearms'], poses: [
      P({ foot: [52, GY], ua: 182, fa: 180 }),
      P({ foot: [52, GY], t: 72, th: 168, sh: 184, ua: 182, fa: 180 })],
      cues: ['Stand tall with the bar against your thighs, knees slightly bent.', 'Push your hips back and slide the bar down your legs. Back stays flat.', 'Stop when you feel a strong hamstring stretch (about mid-shin), then drive the hips forward.'] },
    deadlift: { thumb: 0, eq: 'barHand', m: ['glutes', 'hams', 'lowback'], s: ['quads', 'traps', 'forearms', 'lats'], poses: [
      P({ foot: [52, GY], t: 58, th: 118, sh: 196, ua: 178, fa: 178 }),
      P({ foot: [52, GY], ua: 182, fa: 180 })],
      cues: ['Bar over midfoot, shins to the bar, grip just outside the legs.', 'Chest up, back flat, brace hard. Push the floor away; the bar stays on your legs.', 'Stand tall with hips and knees locked together. Lower the same way.'] },
    bench: { eq: 'barHand', props: ['benchFlat'], m: ['chest'], s: ['triceps', 'fdelt'], poses: [
      P({ foot: [76, GY], t: 270, th: 100, sh: 180, ua: 2, fa: 0 }),
      P({ foot: [76, GY], t: 270, th: 100, sh: 180, ua: 200, fa: 12 })],
      cues: ['Eyes under the bar, shoulder blades squeezed together, feet planted.', 'Lower the bar to the lower chest with elbows about 45° from your body.', 'Touch, then press up and slightly back to straight arms over the shoulders.'] },
    ohp: { eq: 'barHand', m: ['fdelt', 'sdelt', 'triceps'], s: ['traps', 'upperback', 'abs'], poses: [
      P({ foot: [50, GY], ua: 160, fa: 345 }),
      P({ foot: [50, GY], ua: 2, fa: 0 })],
      cues: ['Bar on the front of the shoulders, grip just outside them, squeeze the glutes.', 'Press straight up; move your head back so the bar passes your chin.', 'Lock out overhead with the bar over the middle of your feet. No leaning back.'] },
    hipthrust: { eq: 'barHip', props: ['benchLow'], m: ['glutes'], s: ['hams', 'quads'], poses: [
      P({ foot: [72, GY], t: 296, th: 62, sh: 172, ua: 140, fa: 75 }),
      P({ foot: [72, GY], t: 272, th: 90, sh: 180, ua: 150, fa: 60 })],
      cues: ['Upper back on the bench edge, bar padded across the hips, feet flat.', 'Chin tucked, ribs down. Push through the heels until hips are level with the knees.', 'Squeeze the glutes 1 s at the top, shins vertical. Do not arch the lower back.'] },
    lunge: { eq: 'db', m: ['quads', 'glutes'], s: ['hams', 'adductors'], poses: [
      P({ foot: [50, GY], ua: 180, fa: 180, ua2: 182, fa2: 180 }),
      P({ foot: [62, GY], th: 100, sh: 180, th2: 200, sh2: 268, ft2: 180, ua: 180, fa: 180, ua2: 182, fa2: 180 })],
      cues: ['Stand tall with a dumbbell in each hand.', 'Step forward and drop the back knee toward the floor; front knee over the foot.', 'Push through the front heel to step through into the next lunge.'] },
    stepup: { eq: 'db', props: ['box'], m: ['quads', 'glutes'], s: ['hams'], poses: [
      P({ foot: [60, 66], th: 115, sh: 182, th2: 186, sh2: 186, ua: 180, fa: 180, ua2: 182, fa2: 180 }),
      P({ foot: [60, 66], th: 180, sh: 180, th2: 140, sh2: 200, ua: 180, fa: 180, ua2: 182, fa2: 180 })],
      cues: ['Whole foot on a knee-high box, dumbbells at your sides.', 'Drive through the heel on the box to stand up tall; do not push off the back foot.', 'Lower slowly back down. Do all reps on one leg, then switch.'] },
    legpress: { eq: 'sled', props: ['legpress'], m: ['quads', 'glutes'], s: ['hams', 'adductors'], poses: [
      P({ hipAt: [40, 66], t: 300, th: 0, sh: 121, ua: 140, fa: 160, nofoot: 1 }),
      P({ hipAt: [40, 66], t: 300, th: 62, sh: 66, ua: 140, fa: 160, nofoot: 1 })],
      cues: ['Back and hips flat on the pad, feet shoulder-width on the platform.', 'Lower until your knees are near your chest without your lower back lifting.', 'Press back up through the whole foot. Do not lock the knees hard at the top.'] },
    legcurl: { eq: 'pad', props: ['seatCurl'], m: ['hams'], s: ['calves'], poses: [
      P({ hipAt: [34, 61], t: 352, th: 90, sh: 95, ua: 160, fa: 90, nofoot: 1 }),
      P({ hipAt: [34, 61], t: 352, th: 90, sh: 195, ua: 160, fa: 90, nofoot: 1 })],
      cues: ['Knees lined up with the machine pivot, pad just above the heels.', 'Curl the pad down and back as far as you can.', 'Return slowly; do not let the weight stack slam.'] },
    calf: { props: ['calfstep'], m: ['calves'], s: [], poses: [
      P({ toeAt: [54, 72], ft: 55, ua: 180, fa: 180 }),
      P({ toeAt: [54, 72], ft: 140, ua: 180, fa: 180 })],
      cues: ['Balls of the feet on the edge, heels hanging low for a full stretch.', 'Rise as high as you can onto the toes and pause 1 s.', 'Lower slowly all the way down. No bouncing.'] },
    pulldown: { eq: 'cableUp', props: ['seat', 'kneepad', 'pulley'], m: ['lats'], s: ['biceps', 'upperback', 'rdelt'], poses: [
      P({ hipAt: [38, 63], t: 350, th: 90, sh: 182, ua: 8, fa: 4 }),
      P({ hipAt: [38, 63], t: 343, th: 90, sh: 182, ua: 196, fa: 25 })],
      cues: ['Thighs locked under the pad, hands a bit wider than the shoulders.', 'Lean back slightly, chest up, pull the elbows down to your pockets.', 'Bar to the top of the chest, then let it rise under control until the arms are straight.'] },
    negatives: { thumb: 0, props: ['bar'], m: ['lats', 'biceps'], s: ['upperback', 'forearms', 'abs'], labels: ['Top', 'Bottom'], poses: [
      P({ handAt: [50, 8], t: 4, ua: 192, fa: 20, th: 178, sh: 228, ft: 150 }),
      P({ handAt: [50, 8], t: 0, ua: 6, fa: 2, th: 178, sh: 228, ft: 150 })],
      cues: ['Jump or step up so your chin is over the bar.', 'Lower yourself as slowly as you can, about 5 seconds, to straight arms.', 'Step down and repeat. No dropping fast at the bottom.'] },
    pullup: { props: ['bar'], m: ['lats', 'biceps'], s: ['upperback', 'forearms', 'abs'], poses: [
      P({ handAt: [50, 8], t: 0, ua: 6, fa: 2, th: 178, sh: 228, ft: 150 }),
      P({ handAt: [50, 8], t: 4, ua: 192, fa: 20, th: 178, sh: 228, ft: 150 })],
      cues: ['Hang with straight arms, hands just wider than the shoulders. Use a band if needed.', 'Pull your chest toward the bar, elbows driving down to your sides.', 'Chin over the bar, then lower all the way under control.'] },
    row: { eq: 'cableFwd', props: ['seatLow', 'pulleyFwd'], m: ['upperback', 'lats'], s: ['biceps', 'rdelt'], poses: [
      P({ hipAt: [36, 64], t: 12, th: 84, sh: 120, ua: 98, fa: 92, ft: 30 }),
      P({ hipAt: [36, 64], t: 358, th: 84, sh: 120, ua: 205, fa: 92, ft: 30 })],
      cues: ['Sit tall, knees slightly bent, arms straight toward the machine.', 'Pull the handle to your belly: shoulder blades back first, then elbows.', 'Pause 1 s, then let the arms straighten without rounding forward.'] },
    facepull: { eq: 'cableHigh', props: ['pulleyHigh'], m: ['rdelt', 'upperback'], s: ['traps'], poses: [
      P({ foot: [40, GY], ua: 62, fa: 68 }),
      P({ foot: [40, GY], ua: 272, fa: 30 })],
      cues: ['Rope at head height, step back so the arms are straight and the cable is tight.', 'Pull the rope to your eyes, hands apart, thumbs pointing back.', 'Squeeze the shoulder blades, then return slowly. Light weight.'] },
    goblet: { eq: 'dbChest', m: ['quads', 'glutes'], s: ['adductors', 'abs'], poses: [
      P({ foot: [50, GY], ua: 165, fa: 20 }),
      P({ foot: [50, GY], t: 22, th: 96, sh: 205, ua: 190, fa: 40 })],
      cues: ['Hold one dumbbell upright against your chest, feet a bit wider than the hips.', 'Sit straight down between the heels, elbows inside the knees, chest up.', 'Go as deep as you can with a flat back, then stand up through the whole foot.'] },
    dbrdl: { eq: 'db', m: ['hams', 'glutes'], s: ['lowback', 'forearms'], poses: [
      P({ foot: [52, GY], ua: 182, fa: 180, ua2: 184, fa2: 180 }),
      P({ foot: [52, GY], t: 72, th: 168, sh: 184, ua: 182, fa: 180, ua2: 184, fa2: 180 })],
      cues: ['Dumbbells in front of the thighs, knees slightly bent.', 'Push the hips back and slide the dumbbells down your legs, back flat.', 'Feel the hamstring stretch, then drive the hips forward to stand tall.'] },
    bss: { eq: 'db', props: ['benchBack'], m: ['quads', 'glutes'], s: ['hams', 'adductors'], poses: [
      P({ foot: [62, GY], t: 4, th: 172, sh: 182, th2: 205, sh2: 290, ft2: 250, ua: 180, fa: 180, ua2: 182, fa2: 180 }),
      P({ foot: [62, GY], t: 14, th: 112, sh: 190, th2: 190, sh2: 296, ft2: 250, ua: 180, fa: 180, ua2: 182, fa2: 180 })],
      cues: ['Top of the back foot on a bench, front foot far enough forward to keep the heel down.', 'Lower straight down until the back knee nearly touches the floor.', 'Drive up through the front heel. Do all reps on one leg, then switch.'] },
    carry: { eq: 'bag', m: ['traps', 'forearms', 'abs'], s: ['glutes', 'quads', 'upperback'], labels: ['Step', 'Step'], poses: [
      P({ foot: [56, GY], th: 168, sh: 182, th2: 200, sh2: 200, ua: 165, fa: 60 }),
      P({ foot: [48, GY], th: 196, sh: 198, th2: 170, sh2: 182, ua: 165, fa: 60 })],
      cues: ['Hug the sandbag tight to your chest, stand tall.', 'Walk with short, steady steps; do not lean back.', 'Breathe behind the brace. Put it down with a flat back.'] },
    farmer: { eq: 'db', m: ['forearms', 'traps'], s: ['abs', 'obliques', 'glutes'], labels: ['Step', 'Step'], poses: [
      P({ foot: [56, GY], th: 168, sh: 182, th2: 200, sh2: 200, ua: 180, fa: 180, ua2: 182, fa2: 180 }),
      P({ foot: [48, GY], th: 196, sh: 198, th2: 170, sh2: 182, ua: 180, fa: 180, ua2: 182, fa2: 180 })],
      cues: ['Heavy dumbbell in each hand, shoulders down and back.', 'Walk tall with short steps; do not let the weights swing.', 'Grip hard the whole way. Set them down with a flat back.'] },
    tire: { eq: 'tire', m: ['glutes', 'hams', 'quads'], s: ['lowback', 'traps', 'triceps', 'chest'], poses: [
      P({ foot: [40, GY], t: 62, th: 112, sh: 200, ua: 165, fa: 170 }),
      P({ foot: [40, GY], t: 18, th: 170, sh: 186, ua: 70, fa: 50 })],
      cues: ['Squat down, chest against the tire, fingers under the edge.', 'Drive forward with the legs and hips, not by pulling with the back.', 'As it rises, switch to the hands and push it over.'] },
    dbpress: { eq: 'db', props: ['mat'], m: ['chest', 'triceps'], s: ['fdelt'], labels: ['Start', 'Finish'], poses: [
      P({ foot: [76, 80], t: 270, th: 40, sh: 150, ua: 96, fa: 0 }),
      P({ foot: [76, 80], t: 270, th: 40, sh: 150, ua: 4, fa: 0 })],
      cues: ['Lie on the floor (or a bench), knees bent, dumbbells above the chest.', 'Lower until the upper arms touch the floor, elbows about 45° from the body.', 'Pause, then press back up to straight arms.'] },
    incdb: { eq: 'db', props: ['incline'], m: ['chest', 'fdelt'], s: ['triceps'], poses: [
      P({ hipAt: [56, 62], t: 315, th: 92, sh: 182, ua: 200, fa: 12 }),
      P({ hipAt: [56, 62], t: 315, th: 92, sh: 182, ua: 20, fa: 18 })],
      cues: ['Bench at about 30-45°, dumbbells at the sides of the chest.', 'Press up until the arms are straight over the shoulders.', 'Lower slowly to a deep stretch, elbows slightly in from the shoulders.'] },
    dbrow: { eq: 'dbOne', props: ['benchRow'], m: ['lats', 'upperback'], s: ['biceps', 'rdelt'], poses: [
      P({ foot: [36, GY], t: 84, th: 178, sh: 180, ua: 180, fa: 180, ua2: 168, fa2: 178 }),
      P({ foot: [36, GY], t: 84, th: 178, sh: 180, ua: 248, fa: 178, ua2: 168, fa2: 178 })],
      cues: ['One hand on the bench, back flat and level, dumbbell hanging straight down.', 'Pull the dumbbell to your hip, elbow close to the body.', 'Lower to a full stretch without twisting the torso.'] },
    dbsp: { eq: 'db', m: ['fdelt', 'sdelt', 'triceps'], s: ['traps', 'upperback'], poses: [
      P({ foot: [50, GY], ua: 172, fa: 8, ua2: 174, fa2: 6 }),
      P({ foot: [50, GY], ua: 4, fa: 2, ua2: 6, fa2: 2 })],
      cues: ['Dumbbells at shoulder height, palms forward, ribs down.', 'Press straight up until the arms are straight overhead.', 'Lower under control to the shoulders. No leaning back.'] },
    pullapart: { eq: 'band', front: 1, m: ['rdelt', 'upperback'], s: ['traps'], poses: [
      { front: 1, hipAt: [50, 52], arm: [205, 300], leg: [180, 180] },
      { front: 1, hipAt: [50, 52], arm: [92, 90], leg: [180, 180] }],
      cues: ['Hold a light band at chest height, arms straight, hands shoulder-width.', 'Pull the band apart until it touches your chest, squeezing the shoulder blades.', 'Return slowly. Keep the shoulders down away from the ears.'] },
    core: { m: ['abs'], s: ['obliques'], labels: ['Leg raise', 'Plank'], props: ['mat'], poses: [
      P({ hipAt: [54, 78], t: 270, th: 10, sh: 10, ua: 100, fa: 95, ft: 90 }),
      P({ toeAt: [86, 80], t: 280, th: 100, sh: 100, ft: 180, ua: 180, fa: 270 })],
      cues: ['Leg raise: lie flat, lower back pressed down. Lower the legs only as far as the back stays flat.', 'Plank: forearms under the shoulders, body in one straight line, squeeze the glutes.', 'Breathe out on effort. Stop if the lower back lifts or the belly domes.'] },
    floor: { m: ['quads', 'glutes', 'chest'], s: ['upperback', 'hams', 'abs'], labels: ['Goblet squat', 'Push-up'], ref: ['goblet', 'pushup'],
      cues: ['5 moves in a row: goblet squat 12, push-up 10, dumbbell row 10/side, dumbbell RDL 12, plank 30 s.', 'No rest between moves; 90 s between rounds.', 'Tap each move on its own card in other sessions for its form.'] },
    run: { m: ['quads', 'hams', 'calves', 'glutes'], s: ['abs'], labels: ['Stride', 'Stride'], poses: [
      P({ foot: [52, GY], t: 10, th: 160, sh: 200, th2: 205, sh2: 270, ft2: 200, ua: 210, fa: 120, ua2: 150, fa2: 80 }),
      P({ foot: [48, GY], t: 10, th: 205, sh: 215, th2: 120, sh2: 200, ft: 200, ua: 150, fa: 80, ua2: 210, fa2: 120 })],
      cues: ['Run tall, look ahead, relaxed shoulders.', 'Short, quick steps landing under the hips, not far in front.', 'Easy pace = you could talk in full sentences.'] },
    incwalk: { props: ['incTread'], m: ['glutes', 'calves', 'hams'], s: ['quads'], labels: ['Step', 'Step'], poses: [
      P({ foot: [54, 75.8], t: 8, th: 165, sh: 180, th2: 196, sh2: 200, ua: 200, fa: 170, ua2: 160, fa2: 150 }),
      P({ foot: [46, 77.4], t: 8, th: 196, sh: 196, th2: 162, sh2: 178, ua: 160, fa: 150, ua2: 200, fa2: 170 })],
      cues: ['Incline 10-12%, a brisk speed you can hold.', 'Walk tall and let the arms swing. Do not hold the rails.', 'Push through the whole foot; you should feel the glutes and calves.'] },
    stairs: { props: ['stairs'], m: ['quads', 'glutes', 'calves'], s: ['hams'], labels: ['Step', 'Step'], poses: [
      P({ foot: [57, 66], t: 18, th: 120, sh: 186, th2: 196, sh2: 210, ua: 210, fa: 120, ua2: 150, fa2: 80 }),
      P({ foot: [57, 66], t: 12, th: 172, sh: 182, th2: 110, sh2: 182, ua: 150, fa: 80, ua2: 210, fa2: 120 })],
      cues: ['Drive up each step with the whole foot, arms pumping.', 'Walk back down slowly for recovery.', 'Icy or wet steps: use 100 m strides on the track instead.'] },
    curl: { eq: 'db', m: ['biceps'], s: ['forearms'], poses: [
      P({ foot: [50, GY], ua: 182, fa: 180 }),
      P({ foot: [50, GY], ua: 186, fa: 25 })],
      cues: ['Stand tall, dumbbells at your sides, palms forward.', 'Curl up by bending only the elbows; upper arms stay still at your sides.', 'Squeeze at the top, lower slowly to straight arms.'] },
    ohext: { eq: 'dbOne', m: ['triceps'], s: [], poses: [
      P({ foot: [50, GY], ua: 352, fa: 200 }),
      P({ foot: [50, GY], ua: 356, fa: 2 })],
      cues: ['Hold one dumbbell with both hands overhead, elbows pointing up.', 'Lower it behind your head by bending only the elbows.', 'Straighten the arms fully. Keep the ribs down; no arching.'] },
    pushdown: { eq: 'cableHigh2', props: ['pulleyFwd'], m: ['triceps'], s: [], poses: [
      P({ foot: [44, GY], t: 6, ua: 175, fa: 60 }),
      P({ foot: [44, GY], t: 6, ua: 175, fa: 178 })],
      cues: ['Rope at the top, elbows pinned to your sides.', 'Push the rope down and spread the ends at the bottom.', 'Let it rise only to about chest height; upper arms do not move.'] },
    pallof: { eq: 'cableSide', props: ['pulleyLeft'], m: ['obliques', 'abs'], s: ['glutes'], poses: [
      P({ foot: [52, GY], ua: 160, fa: 30 }),
      P({ foot: [52, GY], ua: 92, fa: 90 })],
      cues: ['Stand side-on to the cable, handle at the middle of your chest, feet hip-width.', 'Press the handle straight out and do not let it pull you round.', 'Hold 2 s, bring it back. ' + 'Breathe out on the press.'] },
    backext: { props: ['hyper'], m: ['lowback', 'glutes'], s: ['hams'], poses: [
      P({ hipAt: [50, 50], t: 150, th: 225, sh: 225, ua: 150, fa: 20, ft: 135, nofoot: 1 }),
      P({ hipAt: [50, 50], t: 45, th: 225, sh: 225, ua: 210, fa: 80, ft: 135, nofoot: 1 })],
      cues: ['Pad just below the hip bones, heels under the foot plate, arms crossed.', 'Lower the upper body with a flat back until you feel the hamstrings.', 'Squeeze the glutes to rise until the body is in a straight line. No over-arching.'] },
    glutebridge: { eq: 'dbHip', props: ['mat'], m: ['glutes'], s: ['hams'], poses: [
      P({ foot: [72, 80], t: 270, th: 58, sh: 150, ua: 120, fa: 120 }),
      P({ foot: [72, 80], t: 252, th: 86, sh: 176, ua: 270, fa: 270 })],
      cues: ['Lie on your back, knees bent, feet flat, dumbbell on the hips.', 'Push through the heels and lift the hips until knees, hips and shoulders line up.', 'Pause 2 s, squeeze the glutes, lower slowly.'] },
    pushup: { m: ['chest', 'triceps'], s: ['fdelt', 'abs'], poses: [
      P({ toeAt: [86, GY], t: 284, th: 104, sh: 104, ft: 180, ua: 180, fa: 180 }),
      P({ toeAt: [86, GY], t: 276, th: 96, sh: 96, ft: 180, ua: 228, fa: 140 })],
      cues: ['Hands under the shoulders (on a bench or step if needed), body in one straight line.', 'Lower the chest toward the hands, elbows about 45° from the body.', 'Push back up without letting the hips sag or the belly dome.'] },
    revfly: { eq: 'db', front: 1, m: ['rdelt', 'upperback'], s: ['traps'], labels: ['Start (bent over)', 'Finish'], poses: [
      { front: 1, hinge: 1, hipAt: [50, 50], arm: [176, 180], leg: [176, 184] },
      { front: 1, hinge: 1, hipAt: [50, 50], arm: [96, 90], leg: [176, 184] }],
      cues: ['Hinge forward with a flat back, light dumbbells hanging under the shoulders.', 'Raise the arms out to the sides with a slight bend in the elbows.', 'Squeeze the shoulder blades at the top, lower slowly. Light weight.'] },
    pcore: { props: ['mat'], m: ['abs', 'obliques'], s: ['glutes'], labels: ['Dead bug', 'Side plank'], poses: [
      P({ hipAt: [56, 78], t: 270, th: 2, sh: 90, th2: 82, sh2: 86, ft: 0, ft2: 0, ua: 2, fa: 0, ua2: 290, fa2: 280 }),
      P({ toeAt: [86, 80], t: 287, th: 107, sh: 107, ft: 197, ua: 180, fa: 270 })],
      cues: ['Dead bug: lower back pressed down, slowly reach one arm and the opposite leg out, then switch.', 'Side plank: elbow under the shoulder, body straight from head to feet, hips up.', 'Band Pallof press 10/side as on Day B. Breathe out on effort; stop if the belly domes.'] },
    abductor: { front: 1, props: ['seatFront'], m: ['hipout', 'glutes'], s: [], poses: [
      { front: 1, seated: 1, hipAt: [50, 60], arm: [180, 180], leg: [180, 180] },
      { front: 1, seated: 1, hipAt: [50, 60], arm: [180, 180], leg: [128, 176] }],
      cues: ['Sit tall, back against the pad, pads on the outside of the knees.', 'Push the knees out as far as you can and pause 1 s.', 'Return slowly; do not let the plates touch between reps.'] }
  };
  // Shared drawings
  F.pulldown_cg = clone(F.pulldown); F.pulldown_cg.cues = ['Close (neutral) handle, thighs under the pad.', 'Lean back slightly and pull the handle to the top of the chest, elbows close to the body.', 'Let it rise slowly until the arms are straight.'];
  F.goblet_hu = clone(F.goblet); F.goblet_hu.props = ['heelplate']; F.goblet_hu.cues = ['Heels on a small plate or board, dumbbell upright against the chest.', 'Sit straight down, knees forward over the toes, torso upright.', 'Go deep, then stand up. You will feel it more in the front of the thighs.'];
  F.arnold = clone(F.dbsp); F.arnold.cues = ['Start with dumbbells in front of the shoulders, palms facing you.', 'Press up while turning the palms to face forward.', 'Reverse the turn on the way down.'];
  F.dtp_lp = clone(F.legpress); F.dtp_lp.cues = ['50 reps, rest 45 s, 40 reps, 45 s, 30, 20, then 10.', 'Pick a weight you can do 50 with; if you need to pause mid-set, it is too heavy.', 'Same form as the leg press: full range, no hard knee lock.'];
  F.dtp_db = clone(F.dbrow); F.dtp_db.cues = ['50 reps, rest 45 s, 40 reps, 45 s, 30, 20, then 10.', 'Rows or presses with light dumbbells; a weight you can do 50 with.', 'Keep the form strict even when it burns.'];
  F.srun = clone(F.run); F.intervals = clone(F.run);
  F.intervals.cues = ['Warm up 3 min walking or jogging.', 'Fast parts: hard but controlled, about 8 out of 10. Easy parts: walk or slow jog.', 'Stop early if form breaks down.'];
  F.emom = { m: ['glutes', 'hams', 'traps', 'forearms'], s: ['quads', 'abs'], labels: ['Tire flip', 'Carry'], ref: ['tire', 'carry'],
    cues: ['Every minute on the minute for 8 min: odd minutes 3 tire flips, even minutes a 20 m sandbag carry.', 'Rest whatever is left of each minute.', 'Form first: flip with the legs, carry tall.'] };
  F.circuit = { m: ['quads', 'chest', 'upperback', 'forearms'], s: ['glutes', 'triceps', 'abs'], labels: ['Goblet squat', 'Push-up'], ref: ['goblet', 'pushup'],
    cues: ['Goblet squat 10, push-up 8, dumbbell row 10/side, farmer carry 40 m.', 'No rest between moves; 60 s between rounds.', 'Form stays strict; slow down before it breaks.'] };
  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  // ---------------- rendering ----------------
  function draw(f, i) {
    if (f.ref) { var rf = F[f.ref[i]]; return draw(rf, 1); }
    var p = f.poses[i], fig = p.front ? frontFigure(p) : figure(p), g = '';
    (f.props || F[f.base] && F[f.base].props || []).forEach(function (pr) { g += PROPS[pr](fig.j); });
    var eq = f.eq && EQ[f.eq] ? EQ[f.eq] : (f.ref ? null : null), es = eq ? eq.f(fig.j) : '';
    return g + (eq && eq.behind ? es + fig.svg : fig.svg + es);
  }
  function svg(key, mode) {
    var f = F[key]; if (!f) return '';
    var lbl = f.labels || ['Start', 'Finish'];
    if (mode === 'thumb') {
      var src = f.ref ? F[f.ref[0]] : f, i = f.ref ? 1 : (f.thumb != null ? f.thumb : 1), p = src.poses[i], j = p.front ? frontFigure(p).j : joints(p), xs = [], ys = [];
      for (var k in j) if (j[k]) { xs.push(j[k][0]); ys.push(j[k][1]); }
      var x0 = Math.min.apply(null, xs) - 10, x1 = Math.max.apply(null, xs) + 10, y0 = Math.min.apply(null, ys) - 12, y1 = 86;
      var w = Math.max(x1 - x0, y1 - y0), cx = (x0 + x1) / 2; x0 = cx - w / 2; y0 = y1 - w;
      return '<svg viewBox="' + r1(x0) + ' ' + r1(y0) + ' ' + r1(w) + ' ' + r1(w) + '" class="fig thumb" role="img" aria-label="Exercise picture"><line x1="' + r1(x0) + '" y1="82.5" x2="' + r1(x0 + w) + '" y2="82.5" class="gnd"/>' + draw(src, i) + '</svg>';
    }
    if (mode === 'muscles') return muscleMap(f.m, f.s);
    return '<svg viewBox="0 -14 200 114" class="fig full" role="img" aria-label="' + lbl[0] + ' and ' + lbl[1] + '"><line x1="4" y1="82.5" x2="196" y2="82.5" class="gnd"/>' +
      '<g class="p0">' + (f.ref ? draw(F[f.ref[0]], 1) : draw(f, 0)) + '</g><g class="p1" transform="translate(100,0)">' + (f.ref ? draw(F[f.ref[1]], 1) : draw(f, 1)) + '</g>' +
      '<path d="M95 45 l8 0 m-3 -3 l3 3 l-3 3" class="arr"/><text x="50" y="95" class="lbl">' + lbl[0] + '</text><text x="150" y="95" class="lbl">' + lbl[1] + '</text></svg>';
  }
  function muscles(key) { var f = F[key]; if (!f) return null; return { main: (f.m || []).map(function (k) { return MNAME[k]; }), also: (f.s || []).map(function (k) { return MNAME[k]; }) }; }

  // Styles live here so every page that loads figures.js gets them
  if (typeof document !== 'undefined' && !document.getElementById('fig-css')) {
    var st = document.createElement('style'); st.id = 'fig-css';
    st.textContent = '.fig line,.fig circle,.fig rect,.fig ellipse,.fig path{fill:none}.fig line{stroke-linecap:round}' +
      '.fig .fg line{stroke:var(--accent);stroke-width:3}.fig .fg .hd{stroke:var(--accent);stroke-width:2.6;fill:var(--surface-2)}' +
      '.fig .p0 .fg line{stroke:#C9CFCA}.fig .p0 .fg .hd{stroke:#C9CFCA}.fig .far line{opacity:.5}' +
      '.fig .plate{fill:#5A6368;stroke:none}.fig .hub{fill:var(--surface-2);stroke:none}.fig .eqf{fill:var(--text);stroke:none}.fig .tire{fill:#4A5257;stroke:none}' +
      '.fig .cab{stroke:var(--muted)}.fig .band{stroke:#5CC9B2}.fig .gnd{stroke:var(--line);stroke-width:1.5}.fig .prop,.fig .propf{fill:#3A4348;stroke:none}.fig .propl{stroke:#3A4348;stroke-width:2}.fig .propfill{fill:#3A4348;stroke:none}' +
      '.fig .arr{stroke:var(--muted);stroke-width:1.6}.fig .lbl{fill:var(--muted);font-size:7.5px;text-anchor:middle;font-family:system-ui,sans-serif}' +
      '.fig .mo{fill:#353D42;stroke:none}.fig .m1{fill:var(--accent);stroke:none}.fig .m2{fill:var(--accent);fill-opacity:.38;stroke:none}' +
      '.fig{background:var(--surface-2);border-radius:10px;display:block}.fig.thumb{width:56px;height:56px}.fig.full{width:100%;height:auto}.fig.mus{width:100%;height:auto;max-height:170px;margin-top:8px}' +
      '.figbtn{flex:0 0 auto;padding:0;background:none;border:1px solid var(--line);border-radius:11px;line-height:0}.figbtn[aria-expanded=true]{border-color:var(--accent)}' +
      '.howto{margin:10px 0 4px}.howto ol{margin:10px 0 0;padding-left:20px;font-size:.92rem}.howto li{margin:0 0 6px}' +
      '.mkey{display:flex;flex-wrap:wrap;gap:6px 14px;font-size:.85rem;margin:8px 0 0}.mkey i{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:6px;vertical-align:-1px;background:var(--accent)}.mkey i.s{opacity:.38}';
    document.head.appendChild(st);
  }
  G.Figures = { has: function (k) { return !!F[k]; }, svg: svg, cues: function (k) { return F[k] ? F[k].cues : []; }, muscles: muscles, F: F, joints: joints };
})(this);
