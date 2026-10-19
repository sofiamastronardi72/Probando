'use strict';

// ---------- Estado y persistencia ----------

const STORAGE_KEY = 'mi-workout-v1';
const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const DAY_SHORT = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];
const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto',
  'septiembre', 'octubre', 'noviembre', 'diciembre'];

const uid = () => Math.random().toString(36).slice(2, 10);

function emptyWeek() {
  const w = {};
  for (let d = 0; d < 7; d++) w[d] = [];
  return w;
}

function seedState() {
  const exercises = {};
  SEED_EXERCISES.forEach(e => { exercises[e.id] = { video: '', ...e }; });
  const plans = { casa: emptyWeek(), gym: emptyWeek() };
  plans.casa[2] = SEED_TUESDAY.map(([exId, sets, reps]) => ({ uid: uid(), exId, sets, reps }));
  return { version: 1, exercises, plans, done: {}, log: {}, type: 'casa' };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) { /* almacenamiento no disponible */ }
  return seedState();
}

let state = loadState();

function save() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  catch (e) { toast('No se pudo guardar en este navegador'); }
}

// ---------- Utilidades ----------

const $ = sel => document.querySelector(sel);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function toISO(d) {
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
function fromISO(s) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}
function prettyDate(s) {
  const d = fromISO(s);
  return `${DAY_NAMES[d.getDay()]}, ${d.getDate()} de ${MONTHS[d.getMonth()]}`;
}

function toast(msg) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2200);
}

function youtubeId(url) {
  if (!url) return null;
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/))([\w-]{11})/);
  return m ? m[1] : null;
}

function videoHTML(ex) {
  const id = youtubeId(ex.video);
  if (id) {
    return `<div class="video"><iframe src="https://www.youtube-nocookie.com/embed/${id}" title="${esc(ex.name)}"
      allow="encrypted-media; picture-in-picture" allowfullscreen loading="lazy"></iframe></div>`;
  }
  if (ex.video) {
    return `<a class="video-link" href="${esc(ex.video)}" target="_blank" rel="noopener">▶ Ver video</a>`;
  }
  const q = encodeURIComponent(`${ex.name} ejercicio técnica`);
  return `<a class="video-link" href="https://www.youtube.com/results?search_query=${q}" target="_blank" rel="noopener">
    ▶ Buscar video en YouTube</a>`;
}

function muscles() {
  return [...new Set(Object.values(state.exercises).map(e => e.muscle).filter(Boolean))].sort();
}

function exerciseOf(item) {
  return state.exercises[item.exId] || { name: '(ejercicio borrado)', muscle: '', description: '', video: '' };
}

function setsLabel(item) {
  const sets = item.sets ? `${item.sets} ${item.sets === '1' ? 'serie' : 'series'}` : '';
  return [sets, item.reps].filter(Boolean).join(' | ');
}

// ---------- Navegación ----------

const ui = { tab: 'hoy', date: toISO(new Date()), open: null, weekDay: new Date().getDay(), search: '' };

document.querySelectorAll('.tabbar button').forEach(b => {
  b.addEventListener('click', () => {
    if (b.dataset.tab === 'semana' && ui.tab === 'hoy') ui.weekDay = fromISO(ui.date).getDay();
    ui.tab = b.dataset.tab; render();
  });
});

function render() {
  document.querySelectorAll('.tabbar button').forEach(b => b.classList.toggle('active', b.dataset.tab === ui.tab));
  const titles = { hoy: 'Workout', semana: 'Mi semana', ejercicios: 'Ejercicios', mas: 'Más' };
  $('#title').textContent = titles[ui.tab];
  ({ hoy: renderHoy, semana: renderSemana, ejercicios: renderEjercicios, mas: renderMas })[ui.tab]();
}

function typeToggle() {
  return `<div class="segmented" id="type">
    <button data-type="casa" class="${state.type === 'casa' ? 'on' : ''}">Casa</button>
    <button data-type="gym" class="${state.type === 'gym' ? 'on' : ''}">Gym</button>
  </div>`;
}
function bindTypeToggle() {
  document.querySelectorAll('#type button').forEach(b => b.addEventListener('click', () => {
    state.type = b.dataset.type; ui.open = null; save(); render();
  }));
}

// ---------- Hoy ----------

function doneKey() { return `${ui.date}|${state.type}`; }
function doneSet() { return new Set(state.done[doneKey()] || []); }

function renderHoy() {
  const weekday = fromISO(ui.date).getDay();
  const items = state.plans[state.type][weekday];
  const done = doneSet();
  const count = items.filter(i => done.has(i.uid)).length;
  const pct = items.length ? Math.round(count / items.length * 100) : 0;

  let html = typeToggle() + `
    <div class="row between">
      <button class="date-nav" id="prev" aria-label="Día anterior">‹</button>
      <label class="date-pill">📅 ${prettyDate(ui.date)}
        <input type="date" id="date" value="${ui.date}">
      </label>
      <button class="date-nav" id="next" aria-label="Día siguiente">›</button>
    </div>`;

  if (!items.length) {
    html += `<div class="empty"><p>No hay ejercicios para los ${DAY_NAMES[weekday].toLowerCase()} (${state.type}).</p>
      <button class="btn" id="go-week">Armar este día</button></div>`;
  } else {
    html += `<div class="progress-label">${count}/${items.length} completados</div>
      <div class="progress"><div style="width:${pct}%"></div></div><div class="list">`;
    items.forEach((item, i) => {
      const ex = exerciseOf(item);
      const isOpen = ui.open === item.uid;
      const isDone = done.has(item.uid);
      const last = lastWeight(item.exId, ui.date);
      const todayW = weightOn(item.exId, ui.date);
      html += `<div class="item ${isOpen ? 'open' : ''} ${isDone ? 'completed' : ''}">
        <button class="item-head" data-open="${item.uid}">
          <span class="num">${isDone ? '✓' : i + 1}</span>
          <span><div class="item-title">${esc(ex.name)}</div>
          <div class="item-sub">${esc(ex.muscle)}${ex.muscle ? ' · ' : ''}${esc(setsLabel(item))}</div></span>
          <span class="chev">⌄</span>
        </button>
        ${isOpen ? `<div class="item-body">
          ${videoHTML(ex)}
          <div class="tag">${esc(ex.muscle)}${ex.equipment ? ` · ${esc(ex.equipment)}` : ''}</div>
          <div class="box center">${esc(setsLabel(item))}</div>
          ${ex.description ? `<div class="box desc">${esc(ex.description)}</div>` : ''}
          <div class="weight">
            <span class="muted">Peso (kg)</span>
            <input type="number" inputmode="decimal" step="0.5" min="0" data-weight="${item.exId}" value="${todayW ?? ''}" placeholder="—">
            ${last ? `<span class="muted">Última vez: ${last.weight} kg (${fromISO(last.date).getDate()}/${fromISO(last.date).getMonth() + 1})</span>` : ''}
          </div>
          <div class="row">
            <button class="btn secondary small" data-swap="${item.uid}">⇄ Cambiar ejercicio</button>
            <button class="btn ghost small" data-edit-ex="${item.exId}">✎ Editar</button>
          </div>
          <div class="row">
            <button class="icon-btn" data-step="-1" ${i === 0 ? 'disabled' : ''} aria-label="Anterior">⏮</button>
            <button class="btn block ${isDone ? 'done' : ''}" data-toggle="${item.uid}">
              ${isDone ? '↺ Desmarcar' : '✓ Marcar completado'}</button>
            <button class="icon-btn" data-step="1" ${i === items.length - 1 ? 'disabled' : ''} aria-label="Siguiente">⏭</button>
          </div>
        </div>` : ''}
      </div>`;
    });
    html += `</div>`;
  }

  $('#view').innerHTML = html;
  bindTypeToggle();

  $('#date').addEventListener('change', e => { if (e.target.value) { ui.date = e.target.value; ui.open = null; render(); } });
  $('#prev').onclick = () => shiftDate(-1);
  $('#next').onclick = () => shiftDate(1);
  const goWeek = $('#go-week');
  if (goWeek) goWeek.onclick = () => { ui.weekDay = weekday; ui.tab = 'semana'; render(); };

  document.querySelectorAll('[data-open]').forEach(b => b.onclick = () => {
    ui.open = ui.open === b.dataset.open ? null : b.dataset.open; render();
  });
  document.querySelectorAll('[data-toggle]').forEach(b => b.onclick = () => toggleDone(b.dataset.toggle, items));
  document.querySelectorAll('[data-step]').forEach(b => b.onclick = () => {
    const idx = items.findIndex(i => i.uid === ui.open) + Number(b.dataset.step);
    if (items[idx]) { ui.open = items[idx].uid; render(); }
  });
  document.querySelectorAll('[data-swap]').forEach(b => b.onclick = () => {
    const item = items.find(i => i.uid === b.dataset.swap);
    openPicker({ title: 'Cambiar por…', current: item.exId, muscle: exerciseOf(item).muscle,
      onPick: exId => { item.exId = exId; save(); render(); toast('Cambiado en tu rutina'); } });
  });
  document.querySelectorAll('[data-edit-ex]').forEach(b => b.onclick = () => openExerciseForm(b.dataset.editEx));
  document.querySelectorAll('[data-weight]').forEach(inp => inp.onchange = () => setWeight(inp.dataset.weight, ui.date, inp.value));
}

function shiftDate(n) {
  const d = fromISO(ui.date);
  d.setDate(d.getDate() + n);
  ui.date = toISO(d); ui.open = null; render();
}

function toggleDone(itemUid, items) {
  const set = doneSet();
  if (set.has(itemUid)) {
    set.delete(itemUid);
  } else {
    set.add(itemUid);
    // Al completar, abre el siguiente pendiente
    const next = items.find(i => !set.has(i.uid));
    ui.open = next ? next.uid : null;
    if (!next) toast('¡Rutina completa! 💪');
  }
  state.done[doneKey()] = [...set];
  save(); render();
}

// ---------- Registro de pesos ----------

function setWeight(exId, date, value) {
  const list = (state.log[exId] || []).filter(e => e.date !== date);
  if (value !== '') list.push({ date, weight: Number(value) });
  list.sort((a, b) => a.date.localeCompare(b.date));
  state.log[exId] = list;
  save();
}
function weightOn(exId, date) {
  const e = (state.log[exId] || []).find(e => e.date === date);
  return e ? e.weight : null;
}
function lastWeight(exId, beforeDate) {
  const list = (state.log[exId] || []).filter(e => e.date < beforeDate);
  return list[list.length - 1] || null;
}

// ---------- Semana ----------

function renderSemana() {
  const plan = state.plans[state.type];
  const items = plan[ui.weekDay];

  let html = typeToggle() + `<div class="days">` + WEEK_ORDER.map(d =>
    `<button data-day="${d}" class="${d === ui.weekDay ? 'on' : ''}">${DAY_SHORT[d]}${plan[d].length ? '<span class="dot"></span>' : ''}</button>`
  ).join('') + `</div>
    <div class="row between" style="margin-bottom:8px">
      <strong>${DAY_NAMES[ui.weekDay]} · ${state.type === 'casa' ? 'Casa' : 'Gym'}</strong>
      ${items.length ? `<button class="btn ghost small" id="copy-day">Copiar a…</button>` : ''}
    </div>`;

  if (!items.length) {
    html += `<div class="empty"><p>Día libre. Agregá ejercicios o copiá otro día.</p></div>`;
  } else {
    html += `<div class="list">` + items.map((item, i) => {
      const ex = exerciseOf(item);
      return `<div class="item"><div class="edit-item">
        <span class="num">${i + 1}</span>
        <div class="grow"><div class="item-title">${esc(ex.name)}</div>
          <div class="item-sub">${esc(ex.muscle)} · ${esc(setsLabel(item))}</div></div>
        <div class="edit-actions">
          <button class="icon-btn" data-up="${i}" ${i === 0 ? 'disabled' : ''} aria-label="Subir">↑</button>
          <button class="icon-btn" data-down="${i}" ${i === items.length - 1 ? 'disabled' : ''} aria-label="Bajar">↓</button>
          <button class="icon-btn" data-item="${i}" aria-label="Editar">✎</button>
        </div>
      </div></div>`;
    }).join('') + `</div>`;
  }
  html += `<button class="btn block" id="add-item" style="margin-top:12px">+ Agregar ejercicio</button>`;

  $('#view').innerHTML = html;
  bindTypeToggle();

  document.querySelectorAll('[data-day]').forEach(b => b.onclick = () => { ui.weekDay = Number(b.dataset.day); render(); });
  document.querySelectorAll('[data-up]').forEach(b => b.onclick = () => move(items, Number(b.dataset.up), -1));
  document.querySelectorAll('[data-down]').forEach(b => b.onclick = () => move(items, Number(b.dataset.down), 1));
  document.querySelectorAll('[data-item]').forEach(b => b.onclick = () => openItemForm(items, Number(b.dataset.item)));
  $('#add-item').onclick = () => openPicker({ title: 'Agregar ejercicio', onPick: exId => {
    items.push({ uid: uid(), exId, sets: '3', reps: '12 reps' }); save(); render();
    openItemForm(items, items.length - 1);
  } });
  const copy = $('#copy-day');
  if (copy) copy.onclick = () => openCopyDay(items);
}

function move(arr, i, dir) {
  const j = i + dir;
  [arr[i], arr[j]] = [arr[j], arr[i]];
  save(); render();
}

function openItemForm(items, i) {
  const item = items[i];
  const ex = exerciseOf(item);
  openSheet(`
    <div class="sheet-head"><h2>${esc(ex.name)}</h2><button class="icon-btn" data-close>✕</button></div>
    <label>Series</label><input type="text" id="f-sets" inputmode="numeric" value="${esc(item.sets)}">
    <label>Repeticiones / tiempo</label><input type="text" id="f-reps" value="${esc(item.reps)}" placeholder="12 reps, 1 minuto, 10 por pierna…">
    <button class="btn secondary block" id="f-swap" style="margin-top:12px">⇄ Cambiar por otro ejercicio</button>
    <div class="actions">
      <button class="btn danger" id="f-del">Quitar</button>
      <button class="btn" id="f-save">Guardar</button>
    </div>`);
  $('#f-save').onclick = () => {
    item.sets = $('#f-sets').value.trim(); item.reps = $('#f-reps').value.trim();
    save(); closeSheet(); render();
  };
  $('#f-del').onclick = () => { items.splice(i, 1); save(); closeSheet(); render(); };
  $('#f-swap').onclick = () => openPicker({ title: 'Cambiar por…', current: item.exId, muscle: ex.muscle,
    onPick: exId => { item.exId = exId; save(); render(); } });
}

function openCopyDay(items) {
  const targets = WEEK_ORDER.filter(d => d !== ui.weekDay);
  openSheet(`
    <div class="sheet-head"><h2>Copiar ${DAY_NAMES[ui.weekDay]} a…</h2><button class="icon-btn" data-close>✕</button></div>
    <p class="muted">Reemplaza lo que haya en el día elegido.</p>
    <div class="pick">${targets.map(d => `<button data-to="${d}">${DAY_NAMES[d]}</button>`).join('')}</div>`);
  document.querySelectorAll('[data-to]').forEach(b => b.onclick = () => {
    const d = Number(b.dataset.to);
    state.plans[state.type][d] = items.map(it => ({ ...it, uid: uid() }));
    save(); closeSheet(); render(); toast(`Copiado a ${DAY_NAMES[d]}`);
  });
}

// ---------- Selector de ejercicios ----------

function openPicker({ title, current, muscle, onPick }) {
  const draw = (q = '') => {
    const all = Object.values(state.exercises)
      .filter(e => !q || `${e.name} ${e.muscle} ${e.equipment}`.toLowerCase().includes(q.toLowerCase()))
      .sort((a, b) => a.name.localeCompare(b.name));
    const same = muscle ? all.filter(e => e.muscle === muscle && e.id !== current) : [];
    const rest = all.filter(e => !same.includes(e) && e.id !== current);
    const btn = e => `<button data-pick="${e.id}"><div class="item-title">${esc(e.name)}</div>
      <div class="item-sub">${esc(e.muscle)}${e.equipment ? ' · ' + esc(e.equipment) : ''}</div></button>`;
    $('#pick-list').innerHTML =
      (same.length ? `<div class="group-title">Mismo músculo (${esc(muscle)})</div><div class="pick">${same.map(btn).join('')}</div>` : '') +
      (rest.length ? `<div class="group-title">${same.length ? 'Otros' : 'Todos'}</div><div class="pick">${rest.map(btn).join('')}</div>` : '') +
      (!same.length && !rest.length ? `<p class="muted">Sin resultados.</p>` : '');
    document.querySelectorAll('[data-pick]').forEach(b => b.onclick = () => { closeSheet(); onPick(b.dataset.pick); });
  };
  openSheet(`
    <div class="sheet-head"><h2>${esc(title)}</h2><button class="icon-btn" data-close>✕</button></div>
    <input type="search" id="pick-q" class="search" placeholder="Buscar…">
    <button class="btn secondary block" id="pick-new">+ Crear ejercicio nuevo</button>
    <div id="pick-list"></div>`);
  $('#pick-q').oninput = e => draw(e.target.value);
  $('#pick-new').onclick = () => openExerciseForm(null, { muscle, onCreated: onPick });
  draw();
}

// ---------- Biblioteca ----------

function renderEjercicios() {
  const q = ui.search.toLowerCase();
  const list = Object.values(state.exercises)
    .filter(e => !q || `${e.name} ${e.muscle} ${e.equipment}`.toLowerCase().includes(q));
  const groups = {};
  list.forEach(e => (groups[e.muscle || 'Sin grupo'] ||= []).push(e));

  let html = `<input type="search" id="lib-q" class="search" placeholder="Buscar ejercicio o músculo…" value="${esc(ui.search)}">
    <button class="btn block" id="lib-new">+ Nuevo ejercicio</button>`;
  Object.keys(groups).sort().forEach(m => {
    html += `<div class="group-title">${esc(m)}</div><div class="pick">` +
      groups[m].sort((a, b) => a.name.localeCompare(b.name)).map(e =>
        `<button data-ex="${e.id}"><div class="item-title">${esc(e.name)}</div>
         <div class="item-sub">${esc(e.equipment || '')}${e.video ? ' · 🎬 video' : ''}</div></button>`).join('') + `</div>`;
  });
  if (!list.length) html += `<p class="empty">Sin resultados.</p>`;
  $('#view').innerHTML = html;

  const qi = $('#lib-q');
  qi.oninput = e => {
    ui.search = e.target.value; renderEjercicios();
    const el = $('#lib-q'); el.focus(); el.setSelectionRange(el.value.length, el.value.length);
  };
  $('#lib-new').onclick = () => openExerciseForm(null);
  document.querySelectorAll('[data-ex]').forEach(b => b.onclick = () => openExerciseForm(b.dataset.ex));
}

function usageCount(exId) {
  let n = 0;
  for (const type of ['casa', 'gym']) for (let d = 0; d < 7; d++) n += state.plans[type][d].filter(i => i.exId === exId).length;
  return n;
}

function openExerciseForm(exId, { muscle = '', onCreated } = {}) {
  const ex = exId ? state.exercises[exId] : { name: '', muscle, equipment: '', description: '', video: '' };
  const used = exId ? usageCount(exId) : 0;
  openSheet(`
    <div class="sheet-head"><h2>${exId ? 'Editar ejercicio' : 'Nuevo ejercicio'}</h2><button class="icon-btn" data-close>✕</button></div>
    <label>Nombre</label><input type="text" id="e-name" value="${esc(ex.name)}">
    <label>Músculo principal</label><input type="text" id="e-muscle" list="muscle-list" value="${esc(ex.muscle)}">
    <datalist id="muscle-list">${muscles().map(m => `<option value="${esc(m)}">`).join('')}</datalist>
    <label>Equipo</label><input type="text" id="e-equip" value="${esc(ex.equipment)}" placeholder="Mancuernas, banda, peso corporal…">
    <label>Link de video (YouTube u otro)</label><input type="url" id="e-video" value="${esc(ex.video)}" placeholder="https://youtube.com/…">
    <label>Cómo se hace</label><textarea id="e-desc">${esc(ex.description)}</textarea>
    <div class="actions">
      ${exId ? `<button class="btn danger" id="e-del">Borrar</button>` : ''}
      <button class="btn" id="e-save">Guardar</button>
    </div>
    ${used ? `<p class="muted">Usado ${used} ${used === 1 ? 'vez' : 'veces'} en tus rutinas.</p>` : ''}`);

  $('#e-save').onclick = () => {
    const name = $('#e-name').value.trim();
    if (!name) { toast('Poné un nombre'); return; }
    const data = { name, muscle: $('#e-muscle').value.trim(), equipment: $('#e-equip').value.trim(),
      video: $('#e-video').value.trim(), description: $('#e-desc').value.trim() };
    let id = exId;
    if (id) Object.assign(state.exercises[id], data);
    else { id = uid(); state.exercises[id] = { id, ...data }; }
    save(); closeSheet();
    if (!exId && onCreated) onCreated(id); else render();
  };
  const del = $('#e-del');
  if (del) del.onclick = () => {
    const msg = used ? `Está en ${used} lugar(es) de tus rutinas y se quitará de ahí. ¿Borrar?` : '¿Borrar este ejercicio?';
    if (!confirm(msg)) return;
    delete state.exercises[exId];
    for (const type of ['casa', 'gym']) for (let d = 0; d < 7; d++)
      state.plans[type][d] = state.plans[type][d].filter(i => i.exId !== exId);
    save(); closeSheet(); render();
  };
}

// ---------- Más: respaldo ----------

function renderMas() {
  $('#view').innerHTML = `
    <div class="box desc">
      <strong>Respaldo</strong>
      <p class="muted">Tus datos viven solo en este teléfono. Si borrás los datos del navegador se pierden:
      exportá un respaldo de vez en cuando (por ejemplo, guardalo en Drive o mandalo por mail).</p>
      <div class="row"><button class="btn" id="export">Exportar</button>
      <label class="btn secondary" style="margin:0;color:var(--pink)">Importar<input type="file" id="import" accept="application/json" hidden></label></div>
    </div>
    <div class="box desc" style="margin-top:12px">
      <strong>Instalar en el celular</strong>
      <p class="muted">iPhone: abrí esta página en Safari → botón Compartir → “Agregar a pantalla de inicio”.<br>
      Android: menú de Chrome → “Instalar app”.</p>
    </div>
    <div class="box desc" style="margin-top:12px">
      <strong>Empezar de cero</strong>
      <p class="muted">Vuelve a los ejercicios y la rutina de ejemplo. Borra tus cambios.</p>
      <button class="btn danger small" id="reset">Restablecer</button>
    </div>`;

  $('#export').onclick = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `mi-workout-${toISO(new Date())}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  $('#import').onchange = async e => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (!data.exercises || !data.plans) throw new Error('formato');
      if (!confirm('Esto reemplaza todos tus datos actuales. ¿Seguir?')) return;
      state = data; save(); toast('Respaldo importado'); render();
    } catch (err) { toast('El archivo no es un respaldo válido'); }
  };
  $('#reset').onclick = () => {
    if (!confirm('¿Seguro? Se borran todos tus cambios.')) return;
    state = seedState(); save(); render();
  };
}

// ---------- Hoja modal ----------

function openSheet(html) {
  const dlg = $('#sheet');
  $('#sheet-body').innerHTML = html;
  $('#sheet-body').querySelectorAll('[data-close]').forEach(b => b.onclick = closeSheet);
  if (!dlg.open) dlg.showModal();
}
function closeSheet() { $('#sheet').close(); }
$('#sheet').addEventListener('click', e => { if (e.target.id === 'sheet') closeSheet(); });

// ---------- Inicio ----------

render();
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
