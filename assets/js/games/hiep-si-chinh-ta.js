// ==========================================
// MINI GAME TV3: HIEP SI CHINH TA - SAN QUAI CHU
// Arcade gameplay: quai chu roi xuong, be cham dung quai de hiep si lao toi chem.
// Du lieu lay tu kho hoc lieu TV3 (Chuyen de 1), khong tao database rieng.
// ==========================================
let skPool = [];
let skIndex = 0;
let skScore = 0;
let skLives = 3;
let skStreak = 0;
let skBestStreak = 0;
let skAnswered = false;
let skRoundSize = 12;
let skMode = 'mixed';
let skTick = null;
let skStartTs = 0;
let skRoundMs = 7000;
let skCurrentChallenge = null;
let skEnemyOrder = [];
let skKnightLane = 1;

const SK_MODES = [
    { id: 'mixed', label: 'Dai chien tong hop', icon: '⚔️', subs: null },
    { id: 'chtr', label: 'ch / tr', icon: '🛡️', subs: ['Phân biệt ch/tr'] },
    { id: 'sx', label: 's / x', icon: '🌟', subs: ['Phân biệt s/x'] },
    { id: 'ln', label: 'l / n', icon: '🍀', subs: ['Phân biệt l/n'] },
    { id: 'rdgi', label: 'r / d / gi', icon: '🔥', subs: ['Phân biệt d/r/gi'] },
    { id: 'rules', label: 'c/k · g/gh · ng/ngh', icon: '🏰', subs: ['Phân biệt c/k', 'Phân biệt g/gh', 'Phân biệt ng/ngh'] }
];

const SK_GATE_MAP = [
    { test: /ch\s*\/\s*tr/i, gates: ['ch', 'tr'] },
    { test: /s\s*\/\s*x/i, gates: ['s', 'x'] },
    { test: /l\s*\/\s*n/i, gates: ['l', 'n'] },
    { test: /r\s*\/\s*d\s*\/\s*gi/i, gates: ['r', 'd', 'gi'] },
    { test: /c\s*\/\s*k|g\s*\/\s*gh|ng\s*\/\s*ngh/i, gates: ['c', 'k', 'g', 'gh', 'ng', 'ngh'] }
];

function skEnsureStyles() {
    if (document.getElementById('sk-arcade-styles')) return;
    const style = document.createElement('style');
    style.id = 'sk-arcade-styles';
    style.textContent = `
      @keyframes skBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}
      @keyframes skEnemyFall{0%{top:7%;transform:translateX(-50%) rotate(-4deg)}55%{transform:translateX(-50%) rotate(4deg)}100%{top:64%;transform:translateX(-50%) rotate(-2deg)}}
      @keyframes skSlash{0%{opacity:0;transform:scale(.2) rotate(-35deg)}40%{opacity:1;transform:scale(1.35) rotate(8deg)}100%{opacity:0;transform:scale(2) rotate(25deg)}}
      @keyframes skBoom{0%{opacity:0;transform:scale(.4)}40%{opacity:1;transform:scale(1.3)}100%{opacity:0;transform:scale(1.8)}}
      @keyframes skShake{0%,100%{transform:translateX(0)}20%{transform:translateX(-8px)}40%{transform:translateX(8px)}60%{transform:translateX(-6px)}80%{transform:translateX(6px)}}
      @keyframes skFlashGood{0%{box-shadow:inset 0 0 0 0 rgba(16,185,129,0)}50%{box-shadow:inset 0 0 70px 12px rgba(16,185,129,.24)}100%{box-shadow:inset 0 0 0 0 rgba(16,185,129,0)}}
      @keyframes skFlashBad{0%{box-shadow:inset 0 0 0 0 rgba(244,63,94,0)}50%{box-shadow:inset 0 0 70px 12px rgba(244,63,94,.25)}100%{box-shadow:inset 0 0 0 0 rgba(244,63,94,0)}}
      .sk-arena{background:linear-gradient(#dbeafe 0 42%,#dcfce7 42% 72%,#d6d3d1 72% 100%);position:relative;overflow:hidden}
      .sk-knight{position:absolute;bottom:3.5%;left:50%;transform:translateX(-50%);font-size:64px;transition:left .22s cubic-bezier(.2,.8,.2,1),transform .22s;z-index:20;filter:drop-shadow(0 7px 5px rgba(0,0,0,.16))}
      .sk-knight-idle{animation:skBob 1.45s ease-in-out infinite}
      .sk-enemy{position:absolute;top:7%;transform:translateX(-50%);z-index:12;animation:skEnemyFall var(--fall-ms) linear forwards;touch-action:manipulation}
      .sk-enemy-core{min-width:104px;min-height:104px;border-radius:999px;border:4px solid rgba(255,255,255,.95);display:flex;flex-direction:column;align-items:center;justify-content:center;box-shadow:0 12px 25px rgba(15,23,42,.18);transition:transform .12s,filter .12s}
      .sk-enemy:hover .sk-enemy-core{transform:scale(1.06);filter:saturate(1.16)}
      .sk-lane{position:absolute;top:4%;bottom:1%;width:1px;background:linear-gradient(to bottom,transparent,rgba(255,255,255,.78),transparent);z-index:2}
      .sk-shake{animation:skShake .32s linear 1}
      .sk-good{animation:skFlashGood .55s ease-out}
      .sk-bad{animation:skFlashBad .55s ease-out}
      .sk-fx{position:absolute;z-index:40;pointer-events:none;font-size:76px;transform:translate(-50%,-50%)}
      .sk-slash{animation:skSlash .5s ease-out forwards}
      .sk-boom{animation:skBoom .65s ease-out forwards}
      .sk-mobile-pad button{touch-action:manipulation}
    `;
    document.head.appendChild(style);
}

async function startSpellingKnightGame() {
    skEnsureStyles();
    skStopTick();
    const box = document.getElementById('game-play-container');
    if (box) box.innerHTML = '<div class="py-12 text-center text-teal-600 font-black"><i class="fa-solid fa-spinner fa-spin mr-2"></i>Đang triệu hồi quái chữ...</div>';
    try {
        await fetchAllQuestionsFlat();
        skRenderModeMenu();
    } catch (e) {
        if (box) box.innerHTML = `<div class="py-10 text-center text-rose-500 font-black">😿 Không tải được học liệu: ${escapeHtml(e.message || String(e))}</div>`;
    }
}

function skDetectGates(q) {
    const sub = String(q.sub_topic || '');
    for (const rule of SK_GATE_MAP) if (rule.test.test(sub)) return rule.gates.slice();
    return null;
}

function skBuildChallenge(q) {
    const answer = String(q.answer || '').trim();
    let gates = skDetectGates(q);
    if (!answer || !gates) return null;
    const lower = answer.toLocaleLowerCase('vi');
    const sorted = gates.slice().sort((a,b)=>b.length-a.length);
    let correct = sorted.find(g => lower.startsWith(g));
    if (!correct) {
        const firstWord = lower.split(/\s+/)[0];
        correct = sorted.find(g => firstWord.startsWith(g));
    }
    if (!correct) return null;
    if (gates.length > 3) {
        if (['c','k'].includes(correct)) gates = ['c','k'];
        else if (['g','gh'].includes(correct)) gates = ['g','gh'];
        else if (['ng','ngh'].includes(correct)) gates = ['ng','ngh'];
        else return null;
    }
    const blank = answer.slice(correct.length);
    if (!blank.trim()) return null;
    return { q, answer, correct, gates, blank };
}

function skGetAllSourceQuestions() {
    const flat = Array.isArray(allQuestionsFlatCache) ? allQuestionsFlatCache : [];
    return flat.filter(q => Number(q.source_topic_id) === 1).map(skBuildChallenge).filter(Boolean);
}

function skRenderModeMenu() {
    skStopTick();
    const box = document.getElementById('game-play-container');
    const all = skGetAllSourceQuestions();
    const countFor = mode => !mode.subs ? all.length : all.filter(c => mode.subs.includes(String(c.q.sub_topic))).length;
    box.innerHTML = `
      <div class="rounded-[28px] border-2 border-teal-200 bg-gradient-to-b from-sky-50 via-white to-emerald-50 p-4 md:p-5 shadow-sm relative overflow-hidden">
        <div class="absolute -left-6 bottom-0 text-9xl opacity-10">🏰</div><div class="absolute -right-5 top-0 text-8xl opacity-10">🐉</div>
        <div class="relative z-10 text-center mb-4"><div class="text-6xl mb-1">🧙‍♂️⚔️👾</div><h3 class="text-xl md:text-2xl font-black text-teal-700">Hiệp sĩ Chính tả: Săn Quái Chữ</h3><p class="text-sm font-bold text-slate-500 mt-1">Quái chữ đang lao xuống! Chạm đúng con mang chữ còn thiếu trước khi nó vượt qua phòng tuyến.</p></div>
        <div class="relative z-10 grid grid-cols-2 md:grid-cols-3 gap-2.5">
          ${SK_MODES.map((m,i)=>`<button class="sk-mode-btn pastel-btn min-h-[104px] rounded-2xl border-2 ${i%2?'border-purple-200 bg-purple-50/80 text-purple-700':'border-rose-200 bg-rose-50/80 text-rose-700'} p-3" data-mode="${escapeHtml(m.id)}"><div class="text-3xl">${m.icon}</div><div class="font-black text-sm md:text-base mt-1">${escapeHtml(m.label)}</div><div class="text-[11px] font-bold opacity-65 mt-1">${countFor(m)} lượt chơi</div></button>`).join('')}
        </div>
        <div class="relative z-10 mt-4 grid grid-cols-3 gap-2 text-[11px] md:text-xs font-black text-center"><div class="bg-white/85 border border-sky-200 rounded-xl p-2">👾 Quái di chuyển</div><div class="bg-white/85 border border-amber-200 rounded-xl p-2">🔥 Combo tăng điểm</div><div class="bg-white/85 border border-pink-200 rounded-xl p-2">🛡️ 3 sinh lực</div></div>
      </div>`;
    box.querySelectorAll('.sk-mode-btn').forEach(btn => btn.addEventListener('click', () => skStartMode(btn.dataset.mode)));
}

function skStartMode(modeId) {
    const mode = SK_MODES.find(m=>m.id===modeId) || SK_MODES[0];
    skMode = mode.id;
    let source = skGetAllSourceQuestions();
    if (mode.subs) source = source.filter(c => mode.subs.includes(String(c.q.sub_topic)));
    const seen = new Set();
    source = shuffleArray(source).filter(c => { const k = `${c.answer}|${c.correct}`; if (seen.has(k)) return false; seen.add(k); return true; });
    if (!source.length) {
        showToast('Nhóm này chưa có đủ học liệu phù hợp. Con chọn Đại chiến tổng hợp nhé!', 'info', 4200);
        return;
    }
    skPool = source.slice(0, Math.min(skRoundSize, source.length));
    skIndex = 0; skScore = 0; skLives = 3; skStreak = 0; skBestStreak = 0; skKnightLane = 1;
    skRenderRound();
}

function skRenderRound() {
    skStopTick();
    if (skIndex >= skPool.length || skLives <= 0) return skFinish();
    skCurrentChallenge = skPool[skIndex];
    skAnswered = false;
    const c = skCurrentChallenge;
    const gates = shuffleArray(c.gates.slice());
    skEnemyOrder = gates;
    const laneCount = gates.length;
    const laneXs = laneCount === 2 ? [32,68] : [20,50,80];
    skRoundMs = Math.max(4700, 7600 - skIndex*180 - Math.min(skStreak,4)*180);
    const modeLabel = SK_MODES.find(m=>m.id===skMode)?.label || 'Đại chiến tổng hợp';
    const progress = Math.round((skIndex/skPool.length)*100);
    const box = document.getElementById('game-play-container');
    box.innerHTML = `
      <div id="sk-arena" class="sk-arena rounded-[28px] border-2 border-teal-200 shadow-sm min-h-[535px] md:min-h-[560px]">
        <div class="absolute inset-x-0 top-0 h-[42%] bg-gradient-to-b from-sky-200/30 to-transparent"></div>
        <div class="absolute top-8 left-[7%] text-5xl opacity-75">☁️</div><div class="absolute top-14 right-[9%] text-4xl opacity-70">☁️</div>
        <div class="absolute top-[29%] left-1/2 -translate-x-1/2 text-8xl opacity-20">🏰</div>
        ${laneXs.slice(0,-1).map((x,i)=>`<div class="sk-lane" style="left:${(laneXs[i]+laneXs[i+1])/2}%"></div>`).join('')}
        <div class="relative z-30 px-3 md:px-5 pt-3">
          <div class="flex items-center justify-between gap-2 flex-wrap text-xs md:text-sm font-black"><div class="flex gap-1.5"><span class="px-3 py-1 rounded-full bg-white/90 border border-teal-200 text-teal-700">⚔️ ${escapeHtml(modeLabel)}</span><span id="sk-streak" class="px-3 py-1 rounded-full bg-white/90 border border-amber-200 text-amber-700">🔥 ${skStreak}</span></div><div class="flex gap-1.5"><span id="sk-score" class="px-3 py-1 rounded-full bg-white/90 border border-emerald-200 text-emerald-700">⭐ ${skScore}</span><span id="sk-lives" class="px-3 py-1 rounded-full bg-white/90 border border-pink-200 text-pink-700">${'🛡️'.repeat(skLives)}${'▫️'.repeat(3-skLives)}</span></div></div>
          <div class="mt-2 h-2 bg-white/75 rounded-full overflow-hidden"><div class="h-full bg-gradient-to-r from-teal-400 to-emerald-500" style="width:${progress}%"></div></div>
        </div>
        <div class="absolute z-30 top-[78px] left-1/2 -translate-x-1/2 w-[92%] max-w-xl bg-amber-50/95 border-2 border-amber-300 rounded-2xl px-3 py-2 shadow-md text-center">
          <div class="text-[10px] md:text-xs uppercase tracking-wide font-black text-amber-700">📜 Lượt ${skIndex+1}/${skPool.length} · Chữ nào cứu được từ này?</div>
          <div class="mt-0.5"><span class="text-3xl md:text-4xl font-black text-rose-500">_</span><span class="text-2xl md:text-3xl font-black text-slate-800">${escapeHtml(c.blank)}</span></div>
        </div>
        <div class="absolute z-30 left-3 top-[148px] text-xs font-black bg-white/90 border border-sky-200 text-sky-700 rounded-full px-2.5 py-1">⏱️ <span id="sk-time">${(skRoundMs/1000).toFixed(1)}</span>s</div>
        <div class="absolute z-30 right-3 top-[148px]"><button id="sk-listen" class="px-2.5 py-1 rounded-full bg-white/90 border border-pink-200 text-pink-600 font-black text-xs"><i class="fa-solid fa-volume-high mr-1"></i>Nghe từ</button></div>
        <div id="sk-danger" class="absolute z-5 left-0 right-0 top-[66%] border-t-4 border-dashed border-rose-300/70"><span class="absolute right-2 -top-6 text-[10px] font-black text-rose-500 bg-white/80 px-2 py-0.5 rounded-full">PHÒNG TUYẾN</span></div>
        ${gates.map((g,i)=>`<button class="sk-enemy" data-gate="${escapeHtml(g)}" data-lane="${i}" style="left:${laneXs[i]}%;--fall-ms:${skRoundMs}ms"><div class="sk-enemy-core ${i%3===0?'bg-gradient-to-br from-fuchsia-400 to-purple-600':i%3===1?'bg-gradient-to-br from-sky-400 to-indigo-600':'bg-gradient-to-br from-amber-400 to-orange-600'} text-white"><div class="text-3xl">👾</div><div class="text-2xl md:text-3xl font-black uppercase leading-none mt-1">${escapeHtml(g)}</div><div class="text-[9px] font-black opacity-80 mt-1">CHẠM ĐỂ CHÉM</div></div></button>`).join('')}
        <div id="sk-knight" class="sk-knight sk-knight-idle">🧙‍♂️⚔️</div>
        <div class="sk-mobile-pad absolute z-30 bottom-2 left-1/2 -translate-x-1/2 flex gap-2"><button id="sk-left" class="w-12 h-10 rounded-xl bg-white/90 border-2 border-indigo-200 text-indigo-600 font-black shadow-sm">◀</button><button id="sk-attack" class="px-5 h-10 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 text-white font-black shadow-sm">⚔️ CHÉM</button><button id="sk-right" class="w-12 h-10 rounded-xl bg-white/90 border-2 border-indigo-200 text-indigo-600 font-black shadow-sm">▶</button></div>
        <div id="sk-feedback" class="absolute z-30 bottom-[58px] left-1/2 -translate-x-1/2 whitespace-nowrap text-xs md:text-sm font-black bg-white/90 border border-slate-200 text-slate-600 rounded-full px-3 py-1">Di chuyển rồi CHÉM, hoặc chạm thẳng vào quái!</div>
        <div id="sk-fx-layer" class="absolute inset-0 z-40 pointer-events-none"></div>
      </div>`;
    skBindRoundEvents();
    skSetKnightLane(Math.min(skKnightLane, laneCount-1), false);
    skStartTs = performance.now();
    skTick = requestAnimationFrame(skFrame);
}

function skBindRoundEvents() {
    const arena = document.getElementById('sk-arena');
    if (!arena) return;
    arena.querySelectorAll('.sk-enemy').forEach(btn => btn.addEventListener('click', () => {
        skSetKnightLane(Number(btn.dataset.lane), true);
        setTimeout(() => skAttackGate(btn.dataset.gate, Number(btn.dataset.lane)), 120);
    }));
    document.getElementById('sk-left')?.addEventListener('click', () => skMoveKnight(-1));
    document.getElementById('sk-right')?.addEventListener('click', () => skMoveKnight(1));
    document.getElementById('sk-attack')?.addEventListener('click', skAttackCurrentLane);
    document.getElementById('sk-listen')?.addEventListener('click', () => speakVietnamese(skCurrentChallenge?.answer || '', .96));
}

function skLaneXs() {
    const n = skEnemyOrder.length;
    return n === 2 ? [32,68] : [20,50,80];
}
function skSetKnightLane(lane, quick) {
    const xs = skLaneXs();
    skKnightLane = Math.max(0, Math.min(xs.length-1, lane));
    const knight = document.getElementById('sk-knight');
    if (knight) {
        knight.style.left = `${xs[skKnightLane]}%`;
        if (quick) { knight.classList.remove('sk-knight-idle'); setTimeout(()=>knight.classList.add('sk-knight-idle'),220); }
    }
}
function skMoveKnight(delta) { if (!skAnswered) skSetKnightLane(skKnightLane + delta, true); }
function skAttackCurrentLane() { if (!skAnswered) skAttackGate(skEnemyOrder[skKnightLane], skKnightLane); }

function skFrame(ts) {
    if (skAnswered) return;
    const elapsed = ts - skStartTs;
    const remain = Math.max(0, skRoundMs - elapsed);
    const t = document.getElementById('sk-time');
    if (t) t.textContent = (remain/1000).toFixed(1);
    if (remain <= 0) return skTimeout();
    skTick = requestAnimationFrame(skFrame);
}
function skStopTick() { if (skTick) cancelAnimationFrame(skTick); skTick = null; }

function skAttackGate(gate, lane) {
    if (skAnswered || !skCurrentChallenge || !gate) return;
    skAnswered = true; skStopTick();
    document.querySelectorAll('.sk-enemy').forEach(e => { e.style.animationPlayState = 'paused'; e.disabled = true; });
    const correct = String(gate).toLocaleLowerCase('vi') === String(skCurrentChallenge.correct).toLocaleLowerCase('vi');
    if (correct) {
        skStreak++; skBestStreak = Math.max(skBestStreak, skStreak);
        const elapsed = performance.now() - skStartTs;
        const speed = Math.max(0, Math.round((skRoundMs-elapsed)/350));
        const combo = Math.min(15, Math.max(0,skStreak-1)*3);
        skScore += 10 + speed + combo;
        skResolve(true, gate, lane, false);
    } else {
        skLives--; skStreak = 0; skResolve(false, gate, lane, false);
    }
}

function skTimeout() {
    if (skAnswered) return;
    skAnswered = true; skStopTick(); skLives--; skStreak = 0;
    document.querySelectorAll('.sk-enemy').forEach(e => { e.style.animationPlayState = 'paused'; e.disabled = true; });
    skResolve(false, null, -1, true);
}

function skResolve(ok, chosen, lane, timeout) {
    const arena = document.getElementById('sk-arena');
    const fb = document.getElementById('sk-feedback');
    const c = skCurrentChallenge;
    document.querySelectorAll('.sk-enemy').forEach(el => {
        const g = String(el.dataset.gate).toLocaleLowerCase('vi');
        if (g === String(c.correct).toLocaleLowerCase('vi')) el.querySelector('.sk-enemy-core')?.classList.add('ring-4','ring-emerald-300');
        else if (chosen && g === String(chosen).toLocaleLowerCase('vi')) el.querySelector('.sk-enemy-core')?.classList.add('ring-4','ring-rose-300');
        else el.style.opacity = '.4';
    });
    if (ok) {
        arena?.classList.add('sk-good');
        skSpawnFx(lane,'⚡⚔️✨','sk-slash');
        if (fb) { fb.textContent = `✨ ${c.correct.toUpperCase()} + ${c.blank} = ${c.answer}`; fb.className = 'absolute z-30 bottom-[58px] left-1/2 -translate-x-1/2 whitespace-nowrap text-xs md:text-sm font-black bg-emerald-50 border border-emerald-300 text-emerald-700 rounded-full px-3 py-1'; }
        playAudio('correct'); confetti({particleCount:38,spread:60,origin:{y:.62}}); setTimeout(()=>speakVietnamese(c.answer,.96),150);
    } else {
        arena?.classList.add('sk-bad','sk-shake');
        skSpawnFx(lane>=0?lane:1,'💥🛡️','sk-boom');
        if (fb) { fb.textContent = timeout ? `⏰ Quái lọt qua! Đúng là ${c.correct.toUpperCase()} → ${c.answer}` : `💥 Trúng quái sai! Đúng là ${c.correct.toUpperCase()} → ${c.answer}`; fb.className = 'absolute z-30 bottom-[58px] left-1/2 -translate-x-1/2 whitespace-nowrap text-xs md:text-sm font-black bg-rose-50 border border-rose-300 text-rose-700 rounded-full px-3 py-1'; }
        playAudio('wrong');
    }
    const score = document.getElementById('sk-score'), streak = document.getElementById('sk-streak'), lives = document.getElementById('sk-lives');
    if (score) score.textContent = `⭐ ${skScore}`; if (streak) streak.textContent = `🔥 ${skStreak}`; if (lives) lives.textContent = `${'🛡️'.repeat(skLives)}${'▫️'.repeat(Math.max(0,3-skLives))}`;
    setTimeout(()=>{ skIndex++; skRenderRound(); }, 1250);
}

function skSpawnFx(lane, text, cls) {
    const xs = skLaneXs(); const layer = document.getElementById('sk-fx-layer'); if (!layer) return;
    const x = xs[Math.max(0,Math.min(xs.length-1,lane))] || 50;
    layer.innerHTML = `<div class="sk-fx ${cls}" style="left:${x}%;top:57%">${text}</div>`;
}

function skFinish() {
    skStopTick();
    const box = document.getElementById('game-play-container');
    const cleared = skIndex >= skPool.length && skLives > 0;
    if (cleared) { playAudio('win'); confetti({particleCount:120,spread:85,origin:{y:.6}}); }
    const done = Math.min(skIndex,skPool.length);
    const medal = cleared ? (skLives===3?'👑':skLives===2?'🥇':'🥈') : '💔';
    box.innerHTML = `<div class="rounded-[28px] border-2 ${cleared?'border-emerald-300':'border-rose-300'} bg-gradient-to-b from-amber-50 via-white to-emerald-50 p-6 text-center relative overflow-hidden"><div class="absolute left-2 bottom-0 text-9xl opacity-10">🏰</div><div class="absolute right-2 bottom-0 text-9xl opacity-10">🐉</div><div class="relative z-10"><div class="text-7xl">${medal}</div><h3 class="text-2xl font-black ${cleared?'text-emerald-600':'text-rose-600'} mt-2">${cleared?'Quét sạch quái chữ!':'Thành bị xuyên thủng!'}</h3><p class="mt-2 text-sm md:text-base font-bold text-slate-600">Hạ <strong>${done}/${skPool.length}</strong> đợt quái · <strong>${skScore} điểm</strong> · combo tốt nhất <strong>${skBestStreak}</strong>.</p><div class="grid grid-cols-2 gap-2.5 max-w-md mx-auto mt-5"><button id="sk-again" class="pastel-btn py-3 rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-black text-sm">⚔️ Chơi lại</button><button id="sk-menu" class="pastel-btn py-3 rounded-2xl bg-purple-50 border-2 border-purple-200 text-purple-700 font-black text-sm">🗺️ Chọn màn</button></div></div></div>`;
    document.getElementById('sk-again')?.addEventListener('click',()=>skStartMode(skMode));
    document.getElementById('sk-menu')?.addEventListener('click',skRenderModeMenu);
}
