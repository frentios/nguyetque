(function () {
  const { secs: SECS, bank: BANK } = window.QUIZ;
  const $ = (id) => document.getElementById(id);
  const LET = 'ABCD';
  const FIELD = { 1: 'sci', 2: 'chem', 3: 'fam', 4: 'alt', 5: 'part', 6: 'chem' };
  const store = {
    get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
  };
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const SCI = new Set(BANK.map((q) => q.herb.sci));
  const italSci = (s) => {
    let out = esc(s);
    SCI.forEach((n) => { if (out.includes(n)) out = out.split(n).join('<i>' + n + '</i>'); });
    return out;
  };
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  // ---- start screen ----
  const chosen = new Set(Object.keys(SECS).map(Number));
  let count = 0; // 0 = tất cả
  $('secs').innerHTML = Object.entries(SECS).map(([k, v]) => {
    const n = BANK.filter((q) => q.sec == k).length;
    return `<label class="chk"><input type="checkbox" value="${k}" checked><span>${esc(v)}</span><span class="n">${n} câu</span></label>`;
  }).join('');
  $('secs').addEventListener('change', (e) => { const v = +e.target.value; e.target.checked ? chosen.add(v) : chosen.delete(v); updCounts(); });
  function updCounts() {
    const total = BANK.filter((q) => chosen.has(q.sec)).length;
    const opts = [20, 40, 60].filter((n) => n < total).map((n) => [n, n + ' câu']).concat([[0, 'Tất cả (' + total + ')']]);
    if (count && count >= total) count = 0;
    $('counts').innerHTML = opts.map(([n, l]) => `<div class="pill ${n === count ? 'on' : ''}" data-n="${n}">${l}</div>`).join('');
    $('go').disabled = total === 0;
  }
  $('counts').addEventListener('click', (e) => { const p = e.target.closest('.pill'); if (!p) return; count = +p.dataset.n; updCounts(); });
  updCounts();
  const saved = store.get('dl_name'); if (saved) $('name').value = saved;

  // ---- quiz state ----
  let list = [], idx = 0, firstOK = 0, wrongClicks = 0, missed = [], tStart = 0, triedWrong = false, name = '';

  $('go').onclick = () => {
    name = $('name').value.trim().replace(/\s+/g, ' ');
    if (!name) { $('nameErr').classList.remove('hidden'); $('name').focus(); return; }
    $('nameErr').classList.add('hidden');
    store.set('dl_name', name);
    let pool = shuffle(BANK.filter((q) => chosen.has(q.sec)));
    if (count) pool = pool.slice(0, count);
    begin(pool);
  };
  $('name').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('go').click(); });

  function begin(pool) {
    list = pool; idx = 0; firstOK = 0; wrongClicks = 0; missed = []; tStart = Date.now();
    show('quiz'); render();
  }
  function show(id) { ['start', 'quiz', 'result'].forEach((s) => $(s).classList.toggle('hidden', s !== id)); window.scrollTo(0, 0); }

  function render() {
    const q = list[idx];
    triedWrong = false;
    $('qnum').textContent = `Câu ${idx + 1}/${list.length}`;
    $('qscore').textContent = `✓ ${firstOK}`;
    $('bar').style.width = (idx / list.length) * 100 + '%';
    $('qtag').textContent = SECS[q.sec];
    $('qtext').innerHTML = italSci(q.q);
    if (q.img) { $('qimg').src = q.img; $('qimg').classList.remove('hidden'); } else $('qimg').classList.add('hidden');
    const order = shuffle([0, 1, 2, 3]);
    $('opts').innerHTML = order.map((oi, i) =>
      `<button class="opt" data-o="${oi}"><span class="k">${LET[i]}</span><span>${italSci(q.opts[oi])}</span></button>`).join('');
    $('msg').className = 'msg hidden';
    $('exp').className = 'exp hidden';
    $('nextWrap').classList.add('hidden');
    // preload next image
    const nx = list[idx + 1]; if (nx && nx.img) { const im = new Image(); im.src = nx.img; }
  }

  $('opts').addEventListener('click', (e) => {
    const b = e.target.closest('.opt'); if (!b || b.disabled) return;
    const q = list[idx];
    if (+b.dataset.o === q.ans) {
      b.classList.add('right');
      document.querySelectorAll('.opt').forEach((o) => (o.disabled = true));
      if (!triedWrong) firstOK++; else missed.push(q);
      $('qscore').textContent = `✓ ${firstOK}`;
      $('msg').className = 'msg hidden';
      explain(q);
      $('nextWrap').classList.remove('hidden');
      $('next').textContent = idx + 1 < list.length ? 'Câu tiếp theo →' : 'Xem kết quả';
      setTimeout(() => $('exp').scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50);
    } else {
      triedWrong = true; wrongClicks++;
      b.classList.add('wrong', 'shake'); b.disabled = true;
      $('msg').className = 'msg bad'; $('msg').textContent = 'Chưa đúng — em chọn lại nhé!';
    }
  });

  function explain(q) {
    const h = q.herb, f = FIELD[q.sec];
    const row = (key, label, val) => val ? `<dt class="${key === f ? 'hl' : ''}">${label}</dt><dd class="${key === f ? 'hl' : ''}">${val}</dd>` : '';
    $('exp').innerHTML = `
      <h3>✓ Chính xác!</h3>
      <div class="herb">
        <img src="${h.img}" alt="${esc(h.vn)}" data-zoom>
        <div><div class="nm">${esc(h.vn)}</div><div class="sc">${esc(h.sci)}</div></div>
      </div>
      <dl>
        ${row('sci', 'Tên khoa học', '<i>' + esc(h.sci) + '</i>')}
        ${row('fam', 'Họ', esc(h.fam))}
        ${row('alt', 'Tên gọi khác', esc(h.alt.join(', ')))}
        ${row('part', 'Bộ phận dùng', esc(h.part))}
        ${row('chem', 'Thành phần', esc(h.chem))}
        ${row('use', 'Công dụng', esc(h.use))}
      </dl>
      ${q.note ? `<div class="note">📌 ${esc(q.note)}</div>` : ''}`;
    $('exp').className = 'exp';
  }

  $('next').onclick = () => { idx++; idx < list.length ? (render(), window.scrollTo({ top: 0, behavior: 'smooth' })) : finish(); };

  function finish() {
    const n = list.length, sec = Math.round((Date.now() - tStart) / 1000);
    $('rName').textContent = name;
    $('rScore').textContent = `${firstOK}/${n}`;
    $('rPct').textContent = Math.round((firstOK / n) * 100) + '%';
    $('rWrong').textContent = wrongClicks;
    $('rTime').textContent = Math.floor(sec / 60) + "'" + String(sec % 60).padStart(2, '0') + '"';
    $('rMiss').innerHTML = missed.length
      ? `<h4>Các câu em chọn sai ở lần đầu (${missed.length})</h4><ol>${missed.map((q) =>
          `<li>${italSci(q.q.replace(' (tên khoa học)', ''))} → <b>${italSci(q.opts[q.ans])}</b>${q.img ? ' <span style="color:var(--muted)">(' + esc(q.herb.vn) + ')</span>' : ''}</li>`).join('')}</ol>`
      : '<h4 style="text-align:center;color:var(--ok)">🎉 Tuyệt vời! Em đúng hết ngay lần đầu.</h4>';
    $('redoMiss').classList.toggle('hidden', !missed.length);
    const hist = store.get('dl_hist') || []; hist.push({ name, score: firstOK, n, t: Date.now() }); store.set('dl_hist', hist.slice(-30));
    show('result');
  }
  $('redoMiss').onclick = () => begin(shuffle(missed));
  $('again').onclick = () => show('start');

  // zoom
  document.addEventListener('click', (e) => {
    const im = e.target.closest('#qimg, [data-zoom]');
    if (im) { $('zoom').querySelector('img').src = im.src; $('zoom').classList.remove('hidden'); }
    else if (e.target.closest('#zoom')) $('zoom').classList.add('hidden');
  });
})();
