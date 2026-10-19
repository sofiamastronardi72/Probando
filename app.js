'use strict';

// ---------- Estado y persistencia ----------

const STORAGE_KEY = 'mi-workout-v1';
const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const DAY_SHORT = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];
const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto',
  'septiembre', 'octubre', 'noviembre', 'diciembre'];
const TYPES = ['casa', 'gym'];
const TYPE_LABEL = { casa: 'Casa', gym: 'Gym' };

const uid = () => Math.random().toString(36).slice(2, 10);

function emptyWeek() {
  const w = {};
  for (let d = 0; d < 7; d++) w[d] = [];
  return w;
}

function weekFromSeed(seed) {
  const w = emptyWeek();
  for (const d in seed) w[d] = seed[d].map(([exId, sets, reps]) => ({ uid: uid(), exId, sets, reps }));
  return w;
}

function seedGymProgram() {
  const weeks = [];
  for (let i = 0; i < SEED_GYM_TOTAL_WEEKS; i++) {
    weeks.push(SEED_GYM_WEEKS[i] ? weekFromSeed(SEED_GYM_WEEKS[i]) : emptyWeek());
  }
  return { start: SEED_GYM_START, weeks };
}

function seedExercises() {
  const exercises = {};
  SEED_EXERCISES.forEach(e => { exercises[e.id] = { video: '', ...e }; });
  return exercises;
}

function seedState() {
  return {
    version: 3,
    exercises: seedExercises(),
    programs: { casa: { start: SEED_GYM_START, weeks: [emptyWeek()] }, gym: seedGymProgram() },
    done: {}, log: {}, type: 'gym',
  };
}

// v1 tenía una sola semana que se repetía por tipo (state.plans).
function migrate(s) {
  if (s.version === 1) {
    for (const [id, ex] of Object.entries(seedExercises())) if (!s.exercises[id]) s.exercises[id] = ex;
    s.programs = {
      casa: { start: SEED_GYM_START, weeks: [s.plans.casa] },
      gym: seedGymProgram(),
    };
    const gymUsed = Object.values(s.plans.gym).some(d => d.length);
    if (gymUsed) s.programs.gym.weeks[0] = s.plans.gym;
    delete s.plans;
    s.type = 'gym';
    s.version = 2;
  }
  if (s.version === 2) {
    for (const [id, ex] of Object.entries(seedExercises())) if (!s.exercises[id]) s.exercises[id] = ex;
    for (const w of s.programs.gym.weeks) for (let d = 0; d < 7; d++) for (const item of w[d]) {
      const up = GYM_UPGRADES[item.exId];
      if (up) { item.exId = up[0]; if (up[1]) item.reps = up[1]; }
    }
    s.version = 3;
  }
  return s;
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return migrate(JSON.parse(raw));
  } catch (e) { /* almacenamiento no disponible */ }
  return seedState();
}

let state = loadState();

function save() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  catch (e) { toast('No se pudo guardar en este navegador'); }
}

save(); // deja guardada la versión migrada

// ---------- Videos guardados en el teléfono (IndexedDB) ----------

const videos = { db: null, keys: new Set(), urls: new Map() };

function idb(mode, fn) {
  return new Promise((resolve, reject) => {
    if (!videos.db) { reject(new Error('sin base')); return; }
    const tx = videos.db.transaction('videos', mode);
    const req = fn(tx.objectStore('videos'));
    tx.oncomplete = () => resolve(req && req.result);
    tx.onerror = () => reject(tx.error);
  });
}

function openVideoDB() {
  return new Promise(resolve => {
    try {
      const req = indexedDB.open('mi-workout-videos', 1);
      req.onupgradeneeded = () => req.result.createObjectStore('videos');
      req.onsuccess = () => { videos.db = req.result; resolve(); };
      req.onerror = () => resolve();
    } catch (e) { resolve(); }
  });
}

async function loadVideoKeys() {
  try { (await idb('readonly', s => s.getAllKeys())).forEach(k => videos.keys.add(k)); }
  catch (e) { /* sin videos locales */ }
}

async function saveVideo(exId, file) {
  await idb('readwrite', s => s.put(file, exId));
  videos.keys.add(exId);
  dropVideoURL(exId);
  try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) { /* opcional */ }
}

async function deleteVideo(exId) {
  if (!videos.keys.has(exId)) return;
  try { await idb('readwrite', s => s.delete(exId)); } catch (e) { /* ya no estaba */ }
  videos.keys.delete(exId);
  dropVideoURL(exId);
}

function dropVideoURL(exId) {
  if (videos.urls.has(exId)) { URL.revokeObjectURL(videos.urls.get(exId)); videos.urls.delete(exId); }
}

async function videoURL(exId) {
  if (!videos.urls.has(exId)) {
    const blob = await idb('readonly', s => s.get(exId));
    if (!blob) return null;
    videos.urls.set(exId, URL.createObjectURL(blob));
  }
  return videos.urls.get(exId);
}

// Respaldo de videos: se exportan como archivos sueltos con el nombre del ejercicio
// y el id al final ("peso-muerto-rumano__peso-muerto-rumano-barra.mov"), así al
// recuperarlos se asignan solos aunque el nombre del ejercicio haya cambiado.
const VIDEO_BATCH = 10;
const VIDEO_EXT = { 'video/quicktime': 'mov', 'video/mp4': 'mp4', 'video/webm': 'webm', 'video/x-m4v': 'm4v' };

function slugify(text) {
  return String(text).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50) || 'ejercicio';
}

async function videoBackupFiles() {
  const files = [];
  for (const exId of videos.keys) {
    const blob = await idb('readonly', s => s.get(exId));
    if (!blob) continue;
    const fromName = blob.name && blob.name.includes('.') ? blob.name.split('.').pop().toLowerCase() : '';
    const ext = VIDEO_EXT[blob.type] || fromName || 'mp4';
    const name = `${slugify(state.exercises[exId]?.name || exId)}__${exId}.${ext}`;
    files.push(new File([blob], name, { type: blob.type || 'video/mp4' }));
  }
  return files.sort((a, b) => a.name.localeCompare(b.name));
}

function exIdFromBackupName(name) {
  const m = name.match(/__([^_.][^.]*)\.[a-z0-9]+$/i);
  return m && state.exercises[m[1]] ? m[1] : null;
}

function fillLocalVideos() {
  document.querySelectorAll('[data-local-video]').forEach(async el => {
    try {
      const url = await videoURL(el.dataset.localVideo);
      if (url) el.innerHTML = `<video src="${url}" controls playsinline preload="metadata"></video>`;
    } catch (e) { el.remove(); }
  });
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
function mondayOf(s) {
  const d = fromISO(s);
  d.setDate(d.getDate() - (d.getDay() + 6) % 7);
  return d;
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
  if (ex.id && videos.keys.has(ex.id)) return `<div class="video" data-local-video="${esc(ex.id)}"></div>`;
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

// "Cuádriceps (Vasto medial)" y "Cuádriceps (Recto femoral)" cuentan como el mismo grupo.
const baseMuscle = m => (m || '').split('(')[0].trim();

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

// ---------- Programa por semanas ----------

function program(type = state.type) { return state.programs[type]; }

// Índice de semana (0 = semana 1) para una fecha. Un programa de una sola semana se repite siempre.
function weekIndex(iso, type = state.type) {
  const p = program(type);
  if (p.weeks.length === 1) return 0;
  return Math.round((mondayOf(iso) - mondayOf(p.start)) / (7 * 864e5));
}

function itemsFor(iso, type = state.type) {
  const idx = weekIndex(iso, type);
  const p = program(type);
  if (idx < 0 || idx >= p.weeks.length) return null;
  return p.weeks[idx][fromISO(iso).getDay()];
}

function clampWeek(idx) { return Math.max(0, Math.min(program().weeks.length - 1, idx)); }

function allPlans() {
  const lists = [];
  for (const type of TYPES) for (const w of state.programs[type].weeks) for (let d = 0; d < 7; d++) lists.push([w, d]);
  return lists;
}

// ---------- Navegación ----------

const today = toISO(new Date());
const ui = { tab: 'hoy', date: today, open: null, weekIdx: clampWeek(weekIndex(today)), weekDay: new Date().getDay(), search: '' };

document.querySelectorAll('.tabbar button').forEach(b => {
  b.addEventListener('click', () => {
    if (b.dataset.tab === 'semana' && ui.tab === 'hoy') syncWeekToDate();
    ui.tab = b.dataset.tab; render();
  });
});

function syncWeekToDate() {
  ui.weekIdx = clampWeek(weekIndex(ui.date));
  ui.weekDay = fromISO(ui.date).getDay();
}

function render() {
  document.querySelectorAll('.tabbar button').forEach(b => b.classList.toggle('active', b.dataset.tab === ui.tab));
  const titles = { hoy: 'Workout', semana: 'Mi programa', ejercicios: 'Ejercicios', mas: 'Más' };
  $('#title').textContent = titles[ui.tab];
  ({ hoy: renderHoy, semana: renderSemana, ejercicios: renderEjercicios, mas: renderMas })[ui.tab]();
}

function typeToggle() {
  return `<div class="segmented" id="type">${TYPES.map(t =>
    `<button data-type="${t}" class="${state.type === t ? 'on' : ''}">${TYPE_LABEL[t]}</button>`).join('')}</div>`;
}
function bindTypeToggle() {
  document.querySelectorAll('#type button').forEach(b => b.addEventListener('click', () => {
    state.type = b.dataset.type; ui.open = null; ui.weekIdx = clampWeek(ui.weekIdx); save(); render();
  }));
}

// ---------- Hoy ----------

function doneKey() { return `${ui.date}|${state.type}`; }
function doneSet() { return new Set(state.done[doneKey()] || []); }

function weekBanner() {
  const p = program();
  if (p.weeks.length === 1) return '';
  const idx = weekIndex(ui.date);
  if (idx < 0) return `<p class="week-banner">El programa empieza el ${prettyDate(p.start).toLowerCase()}</p>`;
  if (idx >= p.weeks.length) return `<p class="week-banner">Terminaste las ${p.weeks.length} semanas del programa 🎉</p>`;
  return `<p class="week-banner">Semana ${idx + 1} de ${p.weeks.length}</p>`;
}

function renderHoy() {
  const weekday = fromISO(ui.date).getDay();
  const items = itemsFor(ui.date) || [];
  const inProgram = itemsFor(ui.date) !== null;
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
    </div>` + weekBanner();

  if (!items.length) {
    html += `<div class="empty">` + (inProgram
      ? `<p>No hay ejercicios para este ${DAY_NAMES[weekday].toLowerCase()}.</p><button class="btn" id="go-week">Armar este día</button>`
      : `<p>Fuera del programa.</p><button class="btn secondary" id="go-today">Ir a hoy</button>`) + `</div>`;
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
          <div class="item-sub">${esc(ex.muscle)}${ex.muscle && setsLabel(item) ? ' · ' : ''}${esc(setsLabel(item))}</div></span>
          <span class="chev">⌄</span>
        </button>
        ${isOpen ? `<div class="item-body">
          ${videoHTML(ex)}
          <div class="tag">${esc(ex.muscle)}${ex.equipment ? ` · ${esc(ex.equipment)}` : ''}</div>
          ${setsLabel(item) ? `<div class="box center">${esc(setsLabel(item))}</div>` : ''}
          ${ex.description ? `<div class="box desc">${esc(ex.description)}</div>`
            : `<div class="box desc muted">Sin explicación todavía. Tocá ✎ Editar para agregarla o cargar tu video.</div>`}
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
  fillLocalVideos();

  $('#date').addEventListener('change', e => { if (e.target.value) { ui.date = e.target.value; ui.open = null; render(); } });
  $('#prev').onclick = () => shiftDate(-1);
  $('#next').onclick = () => shiftDate(1);
  const goWeek = $('#go-week');
  if (goWeek) goWeek.onclick = () => { syncWeekToDate(); ui.tab = 'semana'; render(); };
  const goToday = $('#go-today');
  if (goToday) goToday.onclick = () => { ui.date = today; render(); };

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
      onPick: exId => { item.exId = exId; save(); render(); toast('Cambiado en tu programa'); } });
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

// ---------- Semana / programa ----------

function renderSemana() {
  const p = program();
  ui.weekIdx = clampWeek(ui.weekIdx);
  const week = p.weeks[ui.weekIdx];
  const items = week[ui.weekDay];
  const multi = p.weeks.length > 1;

  let html = typeToggle();
  if (multi || state.type === 'gym') {
    html += `<div class="weeks">` + p.weeks.map((w, i) =>
      `<button data-week="${i}" class="${i === ui.weekIdx ? 'on' : ''}">S${i + 1}${Object.values(w).some(d => d.length) ? '' : ' ·'}</button>`
    ).join('') + `<button id="add-week" aria-label="Agregar semana">+</button></div>`;
  }
  html += `<div class="days">` + WEEK_ORDER.map(d =>
    `<button data-day="${d}" class="${d === ui.weekDay ? 'on' : ''}">${DAY_SHORT[d]}${week[d].length ? '<span class="dot"></span>' : ''}</button>`
  ).join('') + `</div>
    <div class="row between" style="margin-bottom:8px">
      <strong>${multi ? `Semana ${ui.weekIdx + 1} · ` : ''}${DAY_NAMES[ui.weekDay]} · ${TYPE_LABEL[state.type]}</strong>
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
          <div class="item-sub">${esc(ex.muscle)}${setsLabel(item) ? ' · ' + esc(setsLabel(item)) : ''}</div></div>
        <div class="edit-actions">
          <button class="icon-btn" data-up="${i}" ${i === 0 ? 'disabled' : ''} aria-label="Subir">↑</button>
          <button class="icon-btn" data-down="${i}" ${i === items.length - 1 ? 'disabled' : ''} aria-label="Bajar">↓</button>
          <button class="icon-btn" data-item="${i}" aria-label="Editar">✎</button>
        </div>
      </div></div>`;
    }).join('') + `</div>`;
  }
  html += `<button class="btn block" id="add-item" style="margin-top:12px">+ Agregar ejercicio</button>`;
  if (multi) html += `<button class="btn ghost block" id="del-week" style="margin-top:8px">Quitar semana ${ui.weekIdx + 1}</button>`;

  $('#view').innerHTML = html;
  bindTypeToggle();

  document.querySelectorAll('[data-week]').forEach(b => b.onclick = () => { ui.weekIdx = Number(b.dataset.week); render(); });
  document.querySelectorAll('[data-day]').forEach(b => b.onclick = () => { ui.weekDay = Number(b.dataset.day); render(); });
  document.querySelectorAll('[data-up]').forEach(b => b.onclick = () => move(items, Number(b.dataset.up), -1));
  document.querySelectorAll('[data-down]').forEach(b => b.onclick = () => move(items, Number(b.dataset.down), 1));
  document.querySelectorAll('[data-item]').forEach(b => b.onclick = () => openItemForm(items, Number(b.dataset.item)));
  $('#add-item').onclick = () => openPicker({ title: 'Agregar ejercicio', onPick: exId => {
    items.push({ uid: uid(), exId, sets: '3', reps: '12 reps' }); save(); render();
    openItemForm(items, items.length - 1);
  } });
  const addWeek = $('#add-week');
  if (addWeek) addWeek.onclick = () => {
    p.weeks.push(emptyWeek()); ui.weekIdx = p.weeks.length - 1; save(); render(); toast(`Semana ${p.weeks.length} agregada`);
  };
  const delWeek = $('#del-week');
  if (delWeek) delWeek.onclick = () => {
    if (!confirm(`¿Quitar la semana ${ui.weekIdx + 1} con todos sus ejercicios?`)) return;
    p.weeks.splice(ui.weekIdx, 1); ui.weekIdx = clampWeek(ui.weekIdx); save(); render();
  };
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
  const p = program();
  const days = WEEK_ORDER.filter(d => d !== ui.weekDay);
  const weeks = p.weeks.map((_, i) => i).filter(i => i !== ui.weekIdx);
  openSheet(`
    <div class="sheet-head"><h2>Copiar ${DAY_NAMES[ui.weekDay]} a…</h2><button class="icon-btn" data-close>✕</button></div>
    <p class="muted">Reemplaza lo que haya en el día elegido.</p>
    <div class="group-title">Otro día de esta semana</div>
    <div class="pick">${days.map(d => `<button data-to="${ui.weekIdx}:${d}">${DAY_NAMES[d]}</button>`).join('')}</div>
    ${weeks.length ? `<div class="group-title">${DAY_NAMES[ui.weekDay]} de otra semana</div>
    <div class="pick">${weeks.map(w => `<button data-to="${w}:${ui.weekDay}">Semana ${w + 1}</button>`).join('')}</div>` : ''}`);
  document.querySelectorAll('[data-to]').forEach(b => b.onclick = () => {
    const [w, d] = b.dataset.to.split(':').map(Number);
    p.weeks[w][d] = items.map(it => ({ ...it, uid: uid() }));
    save(); closeSheet(); render();
    toast(w === ui.weekIdx ? `Copiado a ${DAY_NAMES[d]}` : `Copiado a la semana ${w + 1}`);
  });
}

// ---------- Selector de ejercicios ----------

function openPicker({ title, current, muscle, onPick }) {
  const base = baseMuscle(muscle);
  const draw = (q = '') => {
    const all = Object.values(state.exercises)
      .filter(e => !q || `${e.name} ${e.muscle} ${e.equipment}`.toLowerCase().includes(q.toLowerCase()))
      .sort((a, b) => a.name.localeCompare(b.name));
    const same = base ? all.filter(e => baseMuscle(e.muscle) === base && e.id !== current) : [];
    const rest = all.filter(e => !same.includes(e) && e.id !== current);
    const btn = e => `<button data-pick="${e.id}"><div class="item-title">${esc(e.name)}</div>
      <div class="item-sub">${esc(e.muscle)}${e.equipment ? ' · ' + esc(e.equipment) : ''}</div></button>`;
    $('#pick-list').innerHTML =
      (same.length ? `<div class="group-title">Mismo músculo (${esc(base)})</div><div class="pick">${same.map(btn).join('')}</div>` : '') +
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
  list.forEach(e => (groups[baseMuscle(e.muscle) || 'Sin grupo'] ||= []).push(e));

  let html = `<input type="search" id="lib-q" class="search" placeholder="Buscar ejercicio o músculo…" value="${esc(ui.search)}">
    <button class="btn block" id="lib-new">+ Nuevo ejercicio</button>`;
  Object.keys(groups).sort().forEach(m => {
    html += `<div class="group-title">${esc(m)}</div><div class="pick">` +
      groups[m].sort((a, b) => a.name.localeCompare(b.name)).map(e => {
        const hasVideo = videos.keys.has(e.id) ? ' · 🎬 tu video' : e.video ? ' · 🎬 link' : '';
        return `<button data-ex="${e.id}"><div class="item-title">${esc(e.name)}</div>
         <div class="item-sub">${esc(e.equipment || '')}${hasVideo}</div></button>`;
      }).join('') + `</div>`;
  });
  if (!list.length) html += `<p class="empty">Sin resultados.</p>`;
  $('#view').innerHTML = html;

  $('#lib-q').oninput = e => {
    ui.search = e.target.value; renderEjercicios();
    const el = $('#lib-q'); el.focus(); el.setSelectionRange(el.value.length, el.value.length);
  };
  $('#lib-new').onclick = () => openExerciseForm(null);
  document.querySelectorAll('[data-ex]').forEach(b => b.onclick = () => openExerciseForm(b.dataset.ex));
}

function usageCount(exId) {
  return allPlans().reduce((n, [w, d]) => n + w[d].filter(i => i.exId === exId).length, 0);
}

function openExerciseForm(exId, { muscle = '', onCreated } = {}) {
  const ex = exId ? state.exercises[exId] : { name: '', muscle, equipment: '', description: '', video: '' };
  const used = exId ? usageCount(exId) : 0;
  const hasLocal = exId && videos.keys.has(exId);
  openSheet(`
    <div class="sheet-head"><h2>${exId ? 'Editar ejercicio' : 'Nuevo ejercicio'}</h2><button class="icon-btn" data-close>✕</button></div>
    <label>Nombre</label><input type="text" id="e-name" value="${esc(ex.name)}">
    <label>Músculo principal</label><input type="text" id="e-muscle" list="muscle-list" value="${esc(ex.muscle)}">
    <datalist id="muscle-list">${muscles().map(m => `<option value="${esc(m)}">`).join('')}</datalist>
    <label>Equipo</label><input type="text" id="e-equip" value="${esc(ex.equipment)}" placeholder="Mancuernas, banda, polea…">
    ${videos.db ? `<label>Video desde tu celular</label>
    <div class="row">
      <label class="btn secondary small" style="margin:0;color:var(--pink)">${hasLocal ? 'Reemplazar video' : 'Elegir video'}
        <input type="file" id="e-file" accept="video/*" hidden></label>
      <span class="muted" id="e-file-name">${hasLocal ? '🎬 Ya tiene tu video' : ''}</span>
      ${hasLocal ? `<button class="btn ghost small" id="e-file-del">Quitar</button>` : ''}
    </div>` : ''}
    <label>O link de video (YouTube u otro)</label><input type="url" id="e-video" value="${esc(ex.video)}" placeholder="https://youtube.com/…">
    <label>Cómo se hace</label><textarea id="e-desc">${esc(ex.description)}</textarea>
    <div class="actions">
      ${exId ? `<button class="btn danger" id="e-del">Borrar</button>` : ''}
      <button class="btn" id="e-save">Guardar</button>
    </div>
    ${used ? `<p class="muted">Usado ${used} ${used === 1 ? 'vez' : 'veces'} en tus programas.</p>` : ''}`);

  let pickedFile = null;
  let removeLocal = false;
  const fileInput = $('#e-file');
  if (fileInput) fileInput.onchange = () => {
    pickedFile = fileInput.files[0] || null;
    if (pickedFile) $('#e-file-name').textContent = `🎬 ${pickedFile.name} (${Math.round(pickedFile.size / 1048576)} MB)`;
  };
  const fileDel = $('#e-file-del');
  if (fileDel) fileDel.onclick = () => { removeLocal = true; pickedFile = null; $('#e-file-name').textContent = 'Se quitará al guardar'; fileDel.remove(); };

  $('#e-save').onclick = async () => {
    const name = $('#e-name').value.trim();
    if (!name) { toast('Poné un nombre'); return; }
    const data = { name, muscle: $('#e-muscle').value.trim(), equipment: $('#e-equip').value.trim(),
      video: $('#e-video').value.trim(), description: $('#e-desc').value.trim() };
    let id = exId;
    if (id) Object.assign(state.exercises[id], data);
    else { id = uid(); state.exercises[id] = { id, ...data }; }
    save();
    try {
      if (pickedFile) { $('#e-save').textContent = 'Guardando video…'; await saveVideo(id, pickedFile); }
      else if (removeLocal) await deleteVideo(id);
    } catch (e) { toast('No se pudo guardar el video (¿falta espacio?)'); }
    closeSheet();
    if (!exId && onCreated) onCreated(id); else render();
  };
  const del = $('#e-del');
  if (del) del.onclick = async () => {
    const msg = used ? `Está en ${used} lugar(es) de tus programas y se quitará de ahí. ¿Borrar?` : '¿Borrar este ejercicio?';
    if (!confirm(msg)) return;
    delete state.exercises[exId];
    for (const [w, d] of allPlans()) w[d] = w[d].filter(i => i.exId !== exId);
    save(); await deleteVideo(exId); closeSheet(); render();
  };
}

// ---------- Más: programa y respaldo ----------

function renderMas() {
  const p = program();
  const idx = weekIndex(today);
  const current = p.weeks.length === 1 ? 'Se repite todas las semanas'
    : idx < 0 ? 'Todavía no empezó' : idx >= p.weeks.length ? 'Terminado' : `Esta semana es la ${idx + 1} de ${p.weeks.length}`;
  $('#view').innerHTML = typeToggle() + `
    <div class="box desc">
      <strong>Programa ${TYPE_LABEL[state.type]}</strong>
      <p class="muted">${p.weeks.length} ${p.weeks.length === 1 ? 'semana' : 'semanas'} · ${current}</p>
      <label>La semana 1 empieza el</label>
      <input type="date" id="start" value="${p.start}">
    </div>
    <div class="box desc" style="margin-top:12px">
      <strong>Respaldo</strong>
      <p class="muted">Tus datos viven solo en este teléfono. Si borrás los datos del navegador se pierden:
      exportá un respaldo de vez en cuando (por ejemplo, guardalo en Drive o mandalo por mail).
      Los videos van aparte, en la sección de abajo.</p>
      <div class="row"><button class="btn" id="export">Exportar</button>
      <label class="btn secondary" style="margin:0;color:var(--pink)">Importar<input type="file" id="import" accept="application/json" hidden></label></div>
    </div>
    <div class="box desc" style="margin-top:12px" id="vbox">
      <strong>Respaldo de videos</strong>
      <p class="muted" id="vinfo">Buscando videos…</p>
      <div class="row" id="vexport" style="flex-wrap:wrap"></div>
      <p class="muted" style="margin-top:12px">Para recuperarlos (por ejemplo en un teléfono nuevo): primero importá el respaldo de datos de arriba,
      después tocá “Recuperar videos” y elegí los archivos desde la carpeta donde los guardaste.</p>
      <label class="btn secondary" style="margin:0;color:var(--pink)">Recuperar videos<input type="file" id="vimport" accept="video/*" multiple hidden></label>
    </div>
    <div class="box desc" style="margin-top:12px">
      <strong>Instalar en el celular</strong>
      <p class="muted">iPhone: abrí esta página en Safari → botón Compartir → “Agregar a pantalla de inicio”.<br>
      Android: menú de Chrome → “Instalar app”.</p>
    </div>
    <div class="box desc" style="margin-top:12px">
      <strong>Empezar de cero</strong>
      <p class="muted">Vuelve a los ejercicios y el programa original. Borra tus cambios (no los videos).</p>
      <button class="btn danger small" id="reset">Restablecer</button>
    </div>`;
  bindTypeToggle();

  setupVideoBackup();
  $('#vimport').onchange = async e => {
    const picked = [...e.target.files];
    if (!picked.length) return;
    let ok = 0;
    const unknown = [];
    for (const file of picked) {
      const exId = exIdFromBackupName(file.name);
      if (!exId) { unknown.push(file.name); continue; }
      try { await saveVideo(exId, file); ok++; } catch (err) { unknown.push(file.name); }
    }
    toast(`${ok} ${ok === 1 ? 'video recuperado' : 'videos recuperados'}`);
    if (unknown.length) alert(`No se pudieron asignar ${unknown.length} archivo(s), porque no tienen el nombre del respaldo ` +
      `o su ejercicio ya no existe. Asignalos a mano desde ✎ Editar:\n\n${unknown.join('\n')}`);
    render();
  };
  $('#start').onchange = e => {
    if (!e.target.value) return;
    p.start = e.target.value; save(); render(); toast('Fecha de inicio actualizada');
  };
  $('#export').onclick = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `mi-workout-${today}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  $('#import').onchange = async e => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const data = migrate(JSON.parse(await file.text()));
      if (!data.exercises || !data.programs) throw new Error('formato');
      if (!confirm('Esto reemplaza todos tus datos actuales. ¿Seguir?')) return;
      state = data; save(); toast('Respaldo importado'); render();
    } catch (err) { toast('El archivo no es un respaldo válido'); }
  };
  $('#reset').onclick = () => {
    if (!confirm('¿Seguro? Se borran todos tus cambios.')) return;
    state = seedState(); save(); render();
  };
}

async function setupVideoBackup() {
  const info = $('#vinfo');
  const box = $('#vexport');
  if (!info) return;
  if (!videos.db || !videos.keys.size) { info.textContent = 'Todavía no cargaste videos.'; return; }
  let files;
  try { files = await videoBackupFiles(); } catch (e) { info.textContent = 'No se pudieron leer los videos.'; return; }
  if (!$('#vinfo')) return; // cambió de pestaña mientras tanto
  const mb = Math.round(files.reduce((n, f) => n + f.size, 0) / 1048576);
  info.textContent = `Tenés ${files.length} ${files.length === 1 ? 'video' : 'videos'} (${mb} MB). ` +
    `Tocá “Guardar” → “Guardar en Archivos” y elegí una carpeta de iCloud Drive (por ejemplo “Mi Workout”).` +
    (files.length > VIDEO_BATCH ? ` Van de a ${VIDEO_BATCH} para que el teléfono no se trabe.` : '');
  const batches = [];
  for (let i = 0; i < files.length; i += VIDEO_BATCH) batches.push(files.slice(i, i + VIDEO_BATCH));
  box.innerHTML = batches.map((b, i) => `<button class="btn" data-vbatch="${i}">` +
    (batches.length === 1 ? 'Guardar videos' : `Guardar ${i * VIDEO_BATCH + 1}–${i * VIDEO_BATCH + b.length}`) + `</button>`).join('');
  box.querySelectorAll('[data-vbatch]').forEach(btn => btn.onclick = async () => {
    const batch = batches[Number(btn.dataset.vbatch)];
    if (navigator.canShare && navigator.canShare({ files: batch })) {
      try { await navigator.share({ files: batch }); btn.textContent += ' ✓'; }
      catch (e) { if (e.name !== 'AbortError') toast('No se pudo abrir Compartir. Probá de nuevo.'); }
    } else {
      for (const f of batch) {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(f);
        a.download = f.name;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      }
      btn.textContent += ' ✓';
    }
  });
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
openVideoDB().then(loadVideoKeys).then(render);
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
