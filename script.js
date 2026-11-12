(() => {
  'use strict';

  const STORAGE_KEY = 'habitous-v1';
  const LEGACY_STORAGE_KEY = 'ascensao-rpg-v1'; // Compatibilidade com o site anterior.
  const COLOR_MODE_KEY = 'habitous-color-mode';

  function setColorMode(mode) {
    const isLight = mode === 'light';
    document.documentElement.dataset.theme = isLight ? 'light' : 'dark';
    const toggle = document.getElementById('theme-toggle');
    const label = isLight ? 'Ativar modo escuro' : 'Ativar modo claro';
    toggle.setAttribute('aria-label', label);
    toggle.setAttribute('title', label);
    toggle.setAttribute('aria-pressed', String(isLight));
    document.querySelector('meta[name="theme-color"]').setAttribute('content', isLight ? '#f7f5ff' : '#10071d');
  }
  function createCosmicSky(id, count, seed) {
    const host = document.getElementById(id);
    if (!host) return;
    // Gerador determinístico: não altera a posição dos pontos a cada recarregamento.
    let value = seed >>> 0;
    const random = () => { value = (1664525 * value + 1013904223) >>> 0; return value / 4294967296; };
    const colors = ['#d8e8ff', '#c0d8ff', '#cdbdff', '#e9e3ff', '#9fd5ff'];
    const points = document.createDocumentFragment();
    for (let i = 0; i < count; i++) {
      const el = document.createElement('span');
      const flare = random() > .89;
      el.className = 'cosmic-point' + (flare ? ' cosmic-point-flare' : '');
      el.style.setProperty('--star-x', (3 + random() * 94).toFixed(2) + '%');
      el.style.setProperty('--star-y', (3 + random() * 94).toFixed(2) + '%');
      el.style.setProperty('--star-size', (flare ? 2.4 + random() * 1.2 : .8 + random() * 1.8).toFixed(2) + 'px');
      el.style.setProperty('--star-color', colors[Math.floor(random() * colors.length)]);
      el.style.setProperty('--star-peak', (.4 + random() * .56).toFixed(2));
      el.style.setProperty('--star-duration', (2.8 + random() * 5.2).toFixed(2) + 's');
      el.style.setProperty('--star-delay', (-random() * 9).toFixed(2) + 's');
      points.appendChild(el);
    }
    host.appendChild(points);
  }

  const VERSION = 1;
  const DAY_MS = 86400000;
  const MAX_ATTRIBUTES = 60;
  const COLORS = ['#a855f7', '#e879f9', '#38bdf8', '#34d399', '#fbbf24', '#fb7185', '#f97316', '#818cf8'];
  // Uicons do Flaticon (via CDN) com SVG local de reserva para uso sem internet.
  const SUGGESTIONS = [
    { id: 'treino', name: 'Treino', icon: 'i:treino', fi: 'bolt', color: '#fb7185', desc: 'Exercício físico' },
    { id: 'estudo', name: 'Estudo', icon: 'i:estudo', fi: 'graduation-cap', color: '#a855f7', desc: 'Aprendizado' },
    { id: 'trabalho', name: 'Trabalho', icon: 'i:trabalho', fi: 'briefcase', color: '#38bdf8', desc: 'Produtividade' },
    { id: 'leitura', name: 'Leitura', icon: 'i:leitura', fi: 'book', color: '#fbbf24', desc: 'Leitura diária' },
    { id: 'sono', name: 'Sono', icon: 'i:sono', fi: 'moon-stars', color: '#818cf8', desc: 'Rotina de descanso' },
    { id: 'alimentacao', name: 'Alimentação', icon: 'i:aliment', fi: 'apple-juice', color: '#34d399', desc: 'Boas escolhas' },
    { id: 'meditacao', name: 'Meditação', icon: 'i:meditac', fi: 'brain', color: '#e879f9', desc: 'Concentração' },
    { id: 'hidratacao', name: 'Hidratação', icon: 'i:hidrat', fi: 'water-drop', color: '#38bdf8', desc: 'Água diariamente' },
    { id: 'organizacao', name: 'Organização', icon: 'i:organiz', fi: 'list-check', color: '#f97316', desc: 'Rotina organizada' },
    { id: 'financas', name: 'Finanças', icon: 'i:financas', fi: 'coins', color: '#fbbf24', desc: 'Saúde financeira' }
  ];
  const ACHIEVEMENTS = [
    { id: 'primeiro-passo', icon: 'check', name: 'Primeiro Passo', description: 'Concluir uma atividade pela primeira vez.' },
    { id: 'ritmo-firme', icon: 'fire', name: 'Ritmo Firme', description: 'Concluir o mesmo hábito por 3 dias seguidos.' },
    { id: 'persistente', icon: 'fire', name: 'Persistente', description: 'Manter 7 dias seguidos em um atributo.' },
    { id: 'disciplinado', icon: 'shield', name: 'Disciplinado', description: 'Alcançar o nível 10 em um atributo.' },
    { id: 'explorador', icon: 'journey', name: 'Explorador', description: 'Ativar cinco atributos diferentes.' },
    { id: 'dia-produtivo', icon: 'grid', name: 'Dia Produtivo', description: 'Concluir três hábitos diferentes no mesmo dia.' },
    { id: 'trinta-vitorias', icon: 'trophy', name: '30 Vitórias', description: 'Somar 30 atividades concluídas.' },
    { id: 'constancia-imparavel', icon: 'spark', name: 'Constância Imparável', description: 'Manter um hábito por 30 dias seguidos.' },
    { id: 'aventureiro-experiente', icon: 'trophy', name: 'Aventureiro Experiente', description: 'Alcançar o nível global 20.' },
    { id: 'lenda-viva', icon: 'spark', name: 'Lenda Viva', description: 'Alcançar o nível global 100.' }
  ];
  const $ = id => document.getElementById(id);
  const PAGE_IDS = ['personagem', 'atributos', 'detalhe', 'jornada', 'conquistas', 'configuracoes'];
  let state = null;
  let activePage = 'personagem';
  let createAvatar = null;
  let editAvatar = null;
  let profileColor = COLORS[0];
  let attributeColor = COLORS[0];
  let onboardingSelection = new Set(['treino', 'estudo', 'leitura']);
  let calendarAttributeId = null;
  let calendarMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  let confirmCallback = null;
  let lastRenderedDay = localDay();
  let sessionMetrics = null;
  let activeDetailId = null;
  let detailMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

  function localDay(date = new Date()) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  function validDay(value) {
    if (typeof value !== 'string' || !/^(19|20|21)\d{2}-\d{2}-\d{2}$/.test(value)) return false;
    const [y, m, d] = value.split('-').map(Number);
    const test = new Date(Date.UTC(y, m - 1, d));
    return test.getUTCFullYear() === y && test.getUTCMonth() === m - 1 && test.getUTCDate() === d;
  }
  function dayIndex(value) {
    const [y, m, d] = value.split('-').map(Number);
    return Math.floor(Date.UTC(y, m - 1, d) / DAY_MS);
  }
  function dayKey(index) { return new Date(index * DAY_MS).toISOString().slice(0, 10); }
  function prettyDate(value, options = { day: '2-digit', month: 'short', year: 'numeric' }) {
    if (!validDay(value)) return '—';
    const [y, m, d] = value.split('-').map(Number);
    return new Date(y, m - 1, d, 12).toLocaleDateString('pt-BR', options);
  }
  function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  }
  function svg(name, className = 'icon') {
    return `<svg class="${className}" aria-hidden="true"><use href="#i-${name}"></use></svg>`;
  }
  const LEGACY_ICONS = { '💪': 'treino', '📚': 'estudo', '💼': 'trabalho', '📖': 'leitura', '🌙': 'sono', '🥗': 'alimentacao', '🧘': 'meditacao', '💧': 'hidratacao', '📋': 'organizacao', '💰': 'financas' };
  function iconMarkup(value, name = '') {
    const raw = String(value || '');
    const preset = SUGGESTIONS.find(s => s.icon === raw || s.id === LEGACY_ICONS[raw] || (name && s.name.toLocaleLowerCase('pt-BR') === String(name).toLocaleLowerCase('pt-BR')));
    const id = preset ? preset.id : 'estrela';
    const flaticon = preset ? preset.fi : 'star';
    return `<span class="flaticon-render" aria-hidden="true"><i class="fi fi-rr-${flaticon}"></i><svg class="icon icon-fallback" aria-hidden="true"><use href="#i-attr-${id}"></use></svg></span>`;
  }
  // O ícone do Flaticon só substitui o SVG de reserva quando a fonte realmente estiver disponível.
  async function enableFlaticonIfAvailable() {
    if (!document.fonts?.load) return;
    try {
      const faces = await document.fonts.load('16px "uicons-regular-rounded"');
      if (faces.some(face => face.status === 'loaded')) document.documentElement.classList.add('flaticon-loaded');
    } catch { /* SVGs locais mantêm a interface funcional offline. */ }
  }
  // Carregamento não bloqueante: a página abre imediatamente com os SVGs locais.
  window.addEventListener('load', () => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://cdn-uicons.flaticon.com/3.0.0/uicons-regular-rounded/css/uicons-regular-rounded.css';
    link.addEventListener('load', enableFlaticonIfAvailable, { once: true });
    document.head.appendChild(link);
  }, { once: true });
  function titleForLevel(level) {
    if (level >= 100) return 'Ascendente';
    if (level >= 75) return 'Lenda';
    if (level >= 50) return 'Mestre';
    if (level >= 30) return 'Veterano';
    if (level >= 20) return 'Guerreiro';
    if (level >= 10) return 'Aventureiro';
    if (level >= 5) return 'Iniciante';
    return 'Aprendiz';
  }
  function randomId() {
    if (window.crypto && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
    return `attr-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  }
  const nameKey = value => value.trim().toLocaleLowerCase('pt-BR');

  function attributeMetrics(attr, asOf = localDay()) {
    const cutoff = dayIndex(asOf);
    const created = dayIndex(attr.createdAt);
    const empty = { level: 0, total: 0, streak: 0, bestStreak: 0, last: null, last7: 0, last30: 0, firstTen: null, firstThree: null, firstSeven: null, firstThirty: null, peak: 0 };
    if (created > cutoff) return empty;
    const dates = attr.completions.filter(d => d >= attr.createdAt && d <= asOf).slice().sort();
    let level = 0;
    let peak = 0;
    let previousIndex = created - 1;
    let lastCompletionIndex = null;
    let consecutive = 0;
    let bestStreak = 0;
    let firstTen = null;
    let firstThree = null;
    let firstSeven = null;
    let firstThirty = null;
    let last7 = 0;
    let last30 = 0;

    for (const d of dates) {
      const idx = dayIndex(d);
      if (idx <= previousIndex) continue;
      const missed = idx - previousIndex - 1;
      level = Math.max(0, level - missed);
      level += 1;
      peak = Math.max(peak, level);
      if (level >= 10 && firstTen === null) firstTen = d;
      consecutive = lastCompletionIndex !== null && idx === lastCompletionIndex + 1 ? consecutive + 1 : 1;
      bestStreak = Math.max(bestStreak, consecutive);
      if (consecutive >= 3 && firstThree === null) firstThree = d;
      if (consecutive >= 7 && firstSeven === null) firstSeven = d;
      if (consecutive >= 30 && firstThirty === null) firstThirty = d;
      if (idx >= cutoff - 6) last7++;
      if (idx >= cutoff - 29) last30++;
      previousIndex = idx;
      lastCompletionIndex = idx;
    }
    const lastClosedDay = cutoff - 1;
    if (lastClosedDay > previousIndex) level = Math.max(0, level - (lastClosedDay - previousIndex));
    const streak = lastCompletionIndex !== null && lastCompletionIndex >= cutoff - 1 ? consecutive : 0;
    return { level, total: dates.length, streak, bestStreak, last: dates.at(-1) || null, last7, last30, firstTen, firstThree, firstSeven, firstThirty, peak };
  }
  function combinedStreak(days, asOf) {
    const cutoff = dayIndex(asOf);
    const indices = new Set(days.map(dayIndex));
    let target = indices.has(cutoff) ? cutoff : cutoff - 1;
    let count = 0;
    while (indices.has(target)) { count++; target--; }
    return count;
  }
  function derive(data, asOf = localDay()) {
    const active = data.attributes.filter(a => a.createdAt <= asOf);
    const byId = new Map();
    let total = 0, last7 = 0, last30 = 0;
    const activities = [];
    for (const attr of active) {
      const metric = attributeMetrics(attr, asOf);
      byId.set(attr.id, metric);
      total += metric.total;
      last7 += metric.last7;
      last30 += metric.last30;
      for (const date of attr.completions) {
        if (date <= asOf && date >= attr.createdAt) activities.push({ date, attr });
      }
    }
    activities.sort((a, b) => b.date.localeCompare(a.date) || a.attr.name.localeCompare(b.attr.name, 'pt-BR'));
    const average = active.length ? active.reduce((sum, attr) => sum + byId.get(attr.id).level, 0) / active.length : 0;
    const globalLevel = Math.floor(average);
    const globalProgress = Math.round((average - globalLevel) * 100);
    const dates = [...new Set(activities.map(a => a.date))];
    return { byId, total, last7, last30, activities, globalLevel, globalProgress, average, activeCount: active.length, streak: combinedStreak(dates, asOf) };
  }

  function awardAchievements(data, metrics = derive(data)) {
    let changed = false;
    const unlock = (key, date) => {
      if (date && !data.achievements[key]) {
        data.achievements[key] = date;
        changed = true;
      }
    };
    const ascDates = metrics.activities.map(e => e.date).sort();
    unlock('primeiro-passo', ascDates[0]);
    // Usa as primeiras datas em que cada objetivo foi realmente alcançado.
    const threeDates = [], streakDates = [], thirtyDates = [], levelDates = [];
    for (const attr of data.attributes) {
      const metric = attributeMetrics(attr);
      if (metric.firstThree) threeDates.push(metric.firstThree);
      if (metric.firstSeven) streakDates.push(metric.firstSeven);
      if (metric.firstThirty) thirtyDates.push(metric.firstThirty);
      if (metric.firstTen) levelDates.push(metric.firstTen);
    }
    threeDates.sort(); streakDates.sort(); thirtyDates.sort(); levelDates.sort();
    unlock('ritmo-firme', threeDates[0]);
    unlock('persistente', streakDates[0]);
    unlock('constancia-imparavel', thirtyDates[0]);
    unlock('disciplinado', levelDates[0]);

    // O histórico global pode reunir conclusões em atributos diferentes.
    unlock('trinta-vitorias', ascDates[29]);
    const habitsByDay = new Map();
    for (const { date, attr } of metrics.activities) {
      if (!habitsByDay.has(date)) habitsByDay.set(date, new Set());
      habitsByDay.get(date).add(attr.id);
    }
    const threeHabitsDay = [...habitsByDay].filter(([, ids]) => ids.size >= 3).map(([date]) => date).sort()[0];
    unlock('dia-produtivo', threeHabitsDay);
    if (data.attributes.length >= 5) unlock('explorador', localDay());
    if (metrics.globalLevel >= 20) unlock('aventureiro-experiente', localDay());
    if (metrics.globalLevel >= 100) unlock('lenda-viva', localDay());
    return changed;
  }

  function normalizeData(input) {
    if (!input || typeof input !== 'object' || Array.isArray(input) || input.version !== VERSION || !input.profile || !Array.isArray(input.attributes)) {
      throw new Error('O arquivo não contém dados válidos do HÁBITOUS (versão 1).');
    }
    const today = localDay();
    const profileName = String(input.profile.name || '').trim().slice(0, 32);
    if (profileName.length < 2) throw new Error('O backup precisa conter um nome de personagem válido.');
    if (input.attributes.length > MAX_ATTRIBUTES) throw new Error(`O limite é de ${MAX_ATTRIBUTES} atributos.`);
    const avatar = input.profile.avatar;
    if (avatar !== null && avatar !== undefined && (typeof avatar !== 'string' || avatar.length > 500000 || !/^data:image\/(jpeg|png|webp);base64,[a-z\d+/=]+$/i.test(avatar))) {
      throw new Error('O backup contém uma fotografia inválida ou muito grande.');
    }
    const profileCreated = validDay(input.profile.createdAt) ? input.profile.createdAt : today;
    const attributes = [];
    const ids = new Set();
    for (const original of input.attributes) {
      if (!original || typeof original !== 'object' || Array.isArray(original)) throw new Error('Há um atributo inválido no backup.');
      const id = String(original.id || '');
      const name = String(original.name || '').trim().slice(0, 30);
      if (!id || id.length > 100 || ids.has(id) || !name) throw new Error('Há atributos repetidos ou sem identificação.');
      if (!validDay(original.createdAt)) throw new Error(`A data de criação de ${name} é inválida.`);
      if (!Array.isArray(original.completions) || original.completions.length > 40000) throw new Error(`O histórico de ${name} é inválido ou grande demais.`);
      const dates = new Set();
      for (const d of original.completions) {
        if (!validDay(d) || d < original.createdAt) throw new Error(`O histórico de ${name} contém datas inválidas.`);
        dates.add(d);
      }
      ids.add(id);
      const icon = String(original.icon || 'i:treino').slice(0, 12);
      attributes.push({ id, name, icon, kind: KINDS.includes(original.kind) ? original.kind : inferKind(name, icon), color: COLORS.includes(original.color) ? original.color : COLORS[0], createdAt: original.createdAt, completions: [...dates].sort(), details: normalizeDetails(original.details, original.createdAt) });
    }
    const achievements = {};
    const saved = input.achievements && typeof input.achievements === 'object' && !Array.isArray(input.achievements) ? input.achievements : {};
    for (const achievement of ACHIEVEMENTS) {
      if (validDay(saved[achievement.id])) achievements[achievement.id] = saved[achievement.id];
    }
    const meta = input.meta && typeof input.meta === 'object' ? input.meta : {};
    return {
      version: VERSION,
      profile: { name: profileName, avatar: avatar || null, color: COLORS.includes(input.profile.color) ? input.profile.color : COLORS[0], createdAt: profileCreated },
      attributes,
      achievements,
      settings: { reduceMotion: !!(input.settings && input.settings.reduceMotion), theme: 'modern' },
      meta: { lastVisit: validDay(meta.lastVisit) && meta.lastVisit <= today ? meta.lastVisit : today }
    };
  }
  function persist(next) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return true;
    } catch (error) {
      console.error('Erro ao salvar dados locais:', error);
      toast('Não foi possível salvar', 'Armazenamento indisponível ou cheio. Exporte seus dados e libere espaço.', 'error');
      return false;
    }
  }
  function loadSaved() {
    try {
      const current = localStorage.getItem(STORAGE_KEY);
      const legacy = current ? null : localStorage.getItem(LEGACY_STORAGE_KEY);
      if (!current && !legacy) return null;
      const normalized = normalizeData(JSON.parse(current || legacy));
      if (legacy) {
        // Migração sem perder a jornada existente e sem exigir ação do usuário.
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
          localStorage.removeItem(LEGACY_STORAGE_KEY);
        } catch (error) { console.warn('Não foi possível migrar o progresso salvo:', error); }
      }
      return normalized;
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      setTimeout(() => toast('Falha ao abrir o progresso', 'Os dados locais estão inacessíveis ou inválidos. Nenhum dado foi apagado.', 'error'), 250);
      return null;
    }
  }
  function commit(change) {
    if (!state) return false;
    const next = JSON.parse(JSON.stringify(state));
    change(next);
    next.meta.lastVisit = localDay();
    awardAchievements(next);
    if (!persist(next)) return false;
    state = next;
    renderAll();
    return true;
  }
  function createAttributeObject(name, icon, color, kind) {
    return { id: randomId(), name, icon, color, kind: kind || inferKind(name, icon), createdAt: localDay(), completions: [], details: emptyDetails() };
  }

  function processPhoto(file) {
    return new Promise((resolve, reject) => {
      if (!file || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return reject(new Error('Escolha uma foto JPG, PNG ou WebP.'));
      if (file.size > 12 * 1024 * 1024) return reject(new Error('A imagem deve ter no máximo 12 MB.'));
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Não foi possível ler esta imagem.'));
      reader.onload = () => {
        const image = new Image();
        image.onerror = () => reject(new Error('Não foi possível abrir esta imagem.'));
        image.onload = () => {
          try {
            const size = 256;
            const canvas = document.createElement('canvas');
            canvas.width = size; canvas.height = size;
            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error('Canvas indisponível neste navegador.');
            ctx.fillStyle = '#261438';
            ctx.fillRect(0, 0, size, size);
            const side = Math.min(image.naturalWidth, image.naturalHeight);
            ctx.drawImage(image, (image.naturalWidth - side) / 2, (image.naturalHeight - side) / 2, side, side, 0, 0, size, size);
            resolve(canvas.toDataURL('image/jpeg', 0.78));
          } catch (error) { reject(error); }
        };
        image.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }
  function avatarMarkup(avatar, name, className) {
    return avatar
      ? `<div class="${className} has-photo" role="img" aria-label="Foto de ${escapeHTML(name)}"><img class="avatar-photo" src="${escapeHTML(avatar)}" alt=""></div>`
      : `<div class="${className}" role="img" aria-label="Avatar padrão de ${escapeHTML(name)}">${escapeHTML(name.charAt(0).toLocaleUpperCase('pt-BR') || '✦')}</div>`;
  }
  function setAvatarPreview(element, photo, name = '✦') {
    element.style.backgroundImage = '';
    element.classList.toggle('has-photo', !!photo);
    element.replaceChildren();
    if (photo) {
      const img = document.createElement('img');
      img.src = photo;
      img.alt = '';
      img.className = 'avatar-photo';
      element.append(img);
    } else element.textContent = name.charAt(0).toLocaleUpperCase('pt-BR') || '✦';
  }
  function renderStarterChoices() {
    $('starter-choices').innerHTML = SUGGESTIONS.map(s => `<button type="button" class="starter-option ${onboardingSelection.has(s.id) ? 'selected' : ''}" data-starter="${s.id}" aria-pressed="${onboardingSelection.has(s.id)}"><span class="starter-emoji">${iconMarkup(s.icon, s.name)}</span><span>${escapeHTML(s.name)}</span><span class="starter-check">${onboardingSelection.has(s.id) ? '✓' : ''}</span></button>`).join('');
  }
  function renderColors(element, selected, purpose) {
    element.innerHTML = COLORS.map(color => `<button type="button" class="color-choice ${color === selected ? 'selected' : ''}" style="--choice:${color}" data-color="${color}" data-color-purpose="${purpose}" aria-label="Escolher cor ${color}" aria-pressed="${color === selected}"></button>`).join('');
  }
  function renderPresets() {
    const existing = new Set(state.attributes.map(a => nameKey(a.name)));
    const available = SUGGESTIONS.filter(s => !existing.has(nameKey(s.name)));
    $('available-presets').innerHTML = available.length
      ? available.map(s => `<button type="button" class="preset-button" data-preset="${s.id}"><span class="preset-icon">${iconMarkup(s.icon, s.name)}</span>${escapeHTML(s.name)}</button>`).join('')
      : '<p class="muted">Todas as sugestões já foram adicionadas. Crie uma habilidade personalizada abaixo.</p>';
  }
  function renderProfileHero(metrics) {
    const { profile } = state;
    $('profile-hero').innerHTML = `
      <div class="hero-main"><div class="hero-avatar-ring">${avatarMarkup(profile.avatar, profile.name, 'hero-avatar')}</div>
        <div class="hero-info"><div class="hero-overline">✦ PERSONAGEM PRINCIPAL</div><h2 class="hero-name">${escapeHTML(profile.name)}</h2><span class="hero-title">✧ ${titleForLevel(metrics.globalLevel)}</span><p class="hero-id">${metrics.activeCount} ${metrics.activeCount === 1 ? 'atributo ativo' : 'atributos ativos'} · Desde ${prettyDate(profile.createdAt)}</p></div>
      </div><div class="hero-level"><div class="level-kicker"><span>NÍVEL GLOBAL</span><span>✦ STATUS</span></div><div class="level-number">${metrics.globalLevel}<small>NV.</small></div><div class="progress-track" role="progressbar" aria-label="Progresso para o próximo nível" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${metrics.globalProgress}"><div class="progress-fill gold" style="width:${metrics.globalProgress}%"></div></div><div class="level-bottom"><span>Próximo nível</span><b>${metrics.globalProgress}%</b></div><p class="hero-hint">Média dos níveis de seus atributos</p></div>`;
  }
  function statHTML(symbol, label, number, caption) {
    return `<div class="stat-card"><div class="stat-top"><span class="stat-icon">${svg(symbol)}</span><span>${escapeHTML(label)}</span></div><strong class="stat-number">${number}</strong><div class="stat-caption">${escapeHTML(caption)}</div></div>`;
  }
  function renderStats(metrics) {
    $('overview-stats').innerHTML = [
      statHTML('grid', 'Atributos ativos', metrics.activeCount, 'Áreas em desenvolvimento'),
      statHTML('check', 'Missões concluídas', metrics.total, 'Conclusões registradas'),
      statHTML('fire', 'Sequência atual', `${metrics.streak}d`, 'Dias seguidos com atividade'),
      statHTML('trophy', 'Conquistas', `${Object.keys(state.achievements).length}/${ACHIEVEMENTS.length}`, 'Medalhas desbloqueadas')
    ].join('');
    $('journey-stats').innerHTML = [
      statHTML('check', 'Últimos 7 dias', metrics.last7, 'Atividades concluídas'),
      statHTML('calendar', 'Últimos 30 dias', metrics.last30, 'Atividades concluídas'),
      statHTML('fire', 'Sequência global', `${metrics.streak}d`, 'Dias seguidos com alguma atividade'),
      statHTML('spark', 'Total histórico', metrics.total, 'Conclusões registradas')
    ].join('');
  }
  function emptyState(title, description, action) {
    return `<div class="empty-state"><span class="empty-state-symbol">✧</span><h3>${escapeHTML(title)}</h3><p>${escapeHTML(description)}</p>${action ? `<button class="btn btn-primary" data-action="add-attribute">${svg('plus')} Criar atributo</button>` : ''}</div>`;
  }
  function attributeCard(attr, metrics, detailed) {
    const info = metrics.byId.get(attr.id) || attributeMetrics(attr);
    const unavailable = attr.createdAt > localDay();
    const completed = attr.completions.includes(localDay());
    const ratio = Math.round((info.last7 / 7) * 100);
    return `<article class="attribute-card" style="--attr-color:${attr.color}">
      <div class="attribute-top"><div class="attribute-identity"><div class="attribute-symbol" aria-hidden="true">${iconMarkup(attr.icon, attr.name)}</div><div><h3 class="attribute-name">${escapeHTML(attr.name)}</h3><div class="attribute-type">HABILIDADE ATIVA</div></div></div>${detailed ? `<div class="attr-actions"><button type="button" class="delete-button" data-action="delete-attribute" data-id="${escapeHTML(attr.id)}" aria-label="Excluir ${escapeHTML(attr.name)}" title="Excluir atributo">${svg('trash')}</button></div>` : ''}</div>
      <div class="attribute-level-row"><div class="attribute-number"><span>NV.</span>${info.level}</div><div class="attribute-streak">${svg('fire')} ${info.streak} ${info.streak === 1 ? 'dia' : 'dias'}</div></div>
      <div class="attribute-progress"><div class="progress-track" role="progressbar" aria-label="Frequência nos últimos 7 dias" aria-valuenow="${ratio}" aria-valuemin="0" aria-valuemax="100"><div class="progress-fill" style="width:${ratio}%"></div></div><div class="progress-labels"><span>Ritmo dos últimos 7 dias</span><span>${info.last7}/7 dias</span></div></div>
      <div class="card-actions"><button type="button" class="complete-btn ${completed ? 'completed' : ''}" data-action="complete" data-id="${escapeHTML(attr.id)}" ${completed || unavailable ? 'disabled' : ''}>${svg('check')} ${unavailable ? 'Disponível a partir de ' + prettyDate(attr.createdAt) : completed ? 'Concluído hoje' : 'Concluir atividade de hoje'}</button></div>
      <div class="attribute-meta">${detailed ? `<button type="button" class="text-link" data-action="attribute-history" data-id="${escapeHTML(attr.id)}">${info.total} conclusões · Maior sequência: ${info.bestStreak}d · Ver histórico ${svg('arrow')}</button><span class="attribute-last">Última conclusão: ${info.last ? prettyDate(info.last) : 'nenhuma'}</span>` : `${info.total} conclusões · Maior sequência: ${info.bestStreak}d`}</div>
      <button class="attribute-open" type="button" data-action="open-attribute" data-id="${escapeHTML(attr.id)}">Abrir painel do atributo ${svg('arrow')}</button>
    </article>`;
  }
  function renderAttributes(metrics) {
    $('dashboard-attr-count').textContent = `/ ${metrics.activeCount}`;
    const attrs = state.attributes;
    $('dashboard-attributes').innerHTML = attrs.length
      ? attrs.slice(0, 4).map(a => attributeCard(a, metrics, false)).join('')
      : emptyState('Sua aventura está começando', 'Adicione um atributo para começar a evoluir.', true);
    $('all-attributes').innerHTML = attrs.length
      ? attrs.map(a => attributeCard(a, metrics, true)).join('')
      : emptyState('Ainda não há atributos', 'Treino, estudo, criatividade... Você decide quais poderes desenvolver.', true);
  }
  function activityHTML(activity) {
    return `<div class="activity-row"><div class="activity-bullet">${iconMarkup(activity.attr.icon, activity.attr.name)}</div><div class="activity-text"><strong>${escapeHTML(activity.attr.name)} concluído</strong><small>${prettyDate(activity.date, { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}</small></div><span class="activity-plus">+1</span></div>`;
  }
  function renderHistory(metrics) {
    $('dashboard-recent').innerHTML = metrics.activities.length ? metrics.activities.slice(0, 4).map(activityHTML).join('') : '<p class="muted">Ainda não há conclusões. Complete sua primeira atividade e ela aparecerá aqui.</p>';
    $('journey-history').innerHTML = metrics.activities.length ? metrics.activities.slice(0, 80).map(activityHTML).join('') : '<p class="muted">Seu histórico aparecerá depois da primeira conclusão.</p>';
  }
  function renderCalendar() {
    const select = $('calendar-attribute');
    if (!state.attributes.some(a => a.id === calendarAttributeId)) calendarAttributeId = state.attributes[0]?.id || null;
    select.innerHTML = state.attributes.length
      ? state.attributes.map(a => `<option value="${escapeHTML(a.id)}">${escapeHTML(a.name)}</option>`).join('')
      : '<option value="">Nenhum atributo cadastrado</option>';
    select.value = calendarAttributeId || '';
    select.disabled = !state.attributes.length;
    const attr = state.attributes.find(a => a.id === calendarAttributeId);
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const monthName = calendarMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    $('calendar-month').textContent = monthName.charAt(0).toLocaleUpperCase('pt-BR') + monthName.slice(1);
    document.querySelector('[data-action="next-month"]').disabled = year >= new Date().getFullYear() && month >= new Date().getMonth();
    const grid = $('calendar-days');
    if (!attr) {
      grid.innerHTML = '<div class="calendar-empty">Crie um atributo para visualizar seu calendário.</div>';
      return;
    }
    const firstWeekday = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = localDay();
    const completed = new Set(attr.completions);
    let markup = '<span class="calendar-day outside" aria-hidden="true"></span>'.repeat(firstWeekday);
    for (let day = 1; day <= daysInMonth; day++) {
      const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const isFuture = key > today;
      const isBefore = key < attr.createdAt;
      const done = completed.has(key);
      const missed = !done && !isBefore && !isFuture && key < today;
      const classes = `calendar-day${done ? ' done' : ''}${missed ? ' missed' : ''}${key === today ? ' today' : ''}`;
      const status = done ? 'concluído' : missed ? 'não concluído' : isFuture ? 'futuro' : isBefore ? 'antes da criação' : 'dia em andamento';
      markup += `<div class="${classes}" aria-label="${prettyDate(key)}: ${status}" title="${prettyDate(key)} — ${status}">${day}${done ? '<span class="day-dot"></span>' : ''}</div>`;
    }
    grid.innerHTML = markup;
  }
  function renderChart(metrics) {
    const today = dayIndex(localDay());
    const dayCounts = new Map();
    for (const item of metrics.activities) dayCounts.set(item.date, (dayCounts.get(item.date) || 0) + 1);
    const records = Array.from({ length: 30 }, (_, i) => {
      const date = dayKey(today - 29 + i);
      return { date, count: dayCounts.get(date) || 0 };
    });
    const max = Math.max(1, ...records.map(record => record.count));
    $('activity-chart').innerHTML = records.map((record, index) => {
      const height = Math.max(3, Math.round(record.count / max * 110));
      return `<div class="chart-col" data-tip="${prettyDate(record.date, { day: '2-digit', month: 'short' })}: ${record.count}" title="${prettyDate(record.date)}: ${record.count} conclusões"><div class="chart-bar ${record.count ? '' : 'zero'}" style="height:${height}px"></div><span class="chart-label">${index % 5 === 0 || index === 29 ? Number(record.date.slice(8)) : ''}</span></div>`;
    }).join('');
    $('activity-chart').setAttribute('aria-label', `${metrics.last30} conclusões nos últimos 30 dias`);
  }
  function renderAchievements() {
    const unlocked = ACHIEVEMENTS.filter(a => state.achievements[a.id]).length;
    $('achievement-tally').textContent = `${unlocked} de ${ACHIEVEMENTS.length} desbloqueadas`;
    $('achievement-bar').style.width = `${Math.round(unlocked / ACHIEVEMENTS.length * 100)}%`;
    $('achievements-list').innerHTML = ACHIEVEMENTS.map(a => {
      const date = state.achievements[a.id];
      return `<article class="achievement-card ${date ? '' : 'locked'}"><div class="achievement-icon" aria-hidden="true">${svg(a.icon)}</div><div class="achievement-info"><h3>${a.name}</h3><p>${a.description}</p><span class="status-pill ${date ? '' : 'locked'}">${date ? `✦ Desbloqueada em ${prettyDate(date)}` : 'Bloqueada'}</span></div></article>`;
    }).join('');
  }
  function navigate(page, scroll = true) {
    if (!PAGE_IDS.includes(page)) return;
    activePage = page;
    for (const id of PAGE_IDS) {
      const el = $(`page-${id}`);
      el.hidden = id !== page;
      el.classList.toggle('active', id === page);
    }
    document.querySelectorAll('[data-page]').forEach(el => {
      const isActive = el.dataset.page === (page === 'detalhe' ? 'atributos' : page);
      if (el.matches('.nav-link,.mobile-nav-link')) {
        el.classList.toggle('active', isActive);
        if (isActive) el.setAttribute('aria-current', 'page');
        else el.removeAttribute('aria-current');
      }
    });
    if (scroll) window.scrollTo({ top: 0, behavior: state?.settings.reduceMotion ? 'instant' : 'smooth' });
  }
  const KINDS = ['geral', 'treino', 'estudo', 'sono', 'hidratacao'];
  const KIND_LABELS = { geral: 'Hábito diário', treino: 'Treinamento', estudo: 'Estudos', sono: 'Sono', hidratacao: 'Hidratação' };
  const WEEKDAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
  const shortDate = date => prettyDate(date, { day: '2-digit', month: 'short' });
  const fmtNumber = number => Number(number || 0).toLocaleString('pt-BR', { maximumFractionDigits: 1 });
  const option = (value, title) => `<option value="${escapeHTML(value)}">${escapeHTML(title)}</option>`;
  function inferKind(name, icon) {
    const preset = SUGGESTIONS.find(s => s.icon === icon || nameKey(s.name) === nameKey(String(name)));
    return ['treino', 'estudo', 'sono', 'hidratacao'].includes(preset?.id) ? preset.id : 'geral';
  }
  function emptyDetails() {
    return { notes: '', dailyGoal: null, routine: [], exercises: [], workouts: [], lifts: [], subjects: [], exams: [], studyLogs: [], values: [], events: [] };
  }
  function normalizeDetails(input, createdAt) {
    const out = emptyDetails();
    if (!input || typeof input !== 'object' || Array.isArray(input)) return out;
    out.notes = String(input.notes || '').slice(0, 8000);
    const number = Number(input.dailyGoal);
    out.dailyGoal = input.dailyGoal !== null && input.dailyGoal !== '' && Number.isFinite(number) && number > 0 && number <= 10000 ? number : null;
    const text = (val, max = 140) => String(val == null ? '' : val).trim().slice(0, max);
    const id = (val) => text(val, 100) || randomId();
    const when = (val) => validDay(val) && val >= createdAt && val <= localDay();
    const rows = (key, max) => Array.isArray(input[key]) ? input[key].slice(0, max).filter(x => x && typeof x === 'object' && !Array.isArray(x)) : [];
    out.routine = rows('routine', 100).filter(x => Number.isInteger(+x.day) && +x.day >= 0 && +x.day <= 6).map(x => ({ id: id(x.id), day: +x.day, name: text(x.name, 65), exercises: text(x.exercises, 1800) }));
    out.exercises = rows('exercises', 300).filter(x => text(x.name)).map(x => ({ id: id(x.id), name: text(x.name, 65), muscle: text(x.muscle, 50), sets: Math.min(30, Math.max(1, +x.sets || 3)), reps: text(x.reps, 20) }));
    out.workouts = rows('workouts', 5000).filter(x => when(x.date)).map(x => ({ id: id(x.id), date: x.date, routineId: text(x.routineId, 100), title: text(x.title, 65), duration: Math.min(1440, Math.max(1, +x.duration || 1)), notes: text(x.notes, 400) }));
    out.lifts = rows('lifts', 12000).filter(x => when(x.date) && Number.isFinite(+x.weight) && +x.weight >= 0 && +x.weight <= 3000).map(x => ({ id: id(x.id), date: x.date, exerciseId: text(x.exerciseId, 100), exercise: text(x.exercise, 65), weight: +x.weight, sets: Math.min(50, Math.max(1, +x.sets || 1)), reps: Math.min(300, Math.max(1, +x.reps || 1)) }));
    out.subjects = rows('subjects', 150).filter(x => text(x.name)).map(x => ({ id: id(x.id), name: text(x.name, 65) }));
    out.exams = rows('exams', 150).filter(x => text(x.name)).map(x => ({ id: id(x.id), name: text(x.name, 90), date: validDay(x.date) ? x.date : '' }));
    out.studyLogs = rows('studyLogs', 12000).filter(x => when(x.date)).map(x => ({ id: id(x.id), date: x.date, subjectId: text(x.subjectId, 100), examId: text(x.examId, 100), minutes: Math.min(1440, Math.max(1, +x.minutes || 1)), topic: text(x.topic, 160), notes: text(x.notes, 400) }));
    out.values = rows('values', 12000).filter(x => when(x.date) && Number.isFinite(+x.value) && +x.value >= 0 && +x.value <= 100000).map(x => ({ date: x.date, value: +x.value }));
    out.events = rows('events', 5000).filter(x => when(x.date)).map(x => ({ id: id(x.id), date: x.date, notes: text(x.notes, 400) }));
    return out;
  }
  function getDetailAttr() { return state?.attributes.find(a => a.id === activeDetailId) || null; }
  function openAttributeDetail(id) {
    if (!state.attributes.some(attr => attr.id === id)) return;
    activeDetailId = id;
    detailMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    renderAttributeDetail();
    navigate('detalhe');
  }
  function ensureCompletion(attr, date) {
    if (date >= attr.createdAt && date <= localDay() && !attr.completions.includes(date)) {
      attr.completions.push(date);
      attr.completions.sort();
    }
  }
  function detailStat(label, value, sub, symbol = 'spark') {
    return `<article class="detail-stat"><span class="detail-stat-label">${svg(symbol)} ${escapeHTML(label)}</span><strong>${escapeHTML(String(value))}</strong><span>${escapeHTML(sub)}</span></article>`;
  }
  function detailHeading(title, subtitle, id = '') {
    return `<div class="detail-section-head"><div><h2>${escapeHTML(title)}</h2><p>${escapeHTML(subtitle)}</p></div>${id ? `<span class="detail-number">${escapeHTML(id)}</span>` : ''}</div>`;
  }
  function detailEmpty(msg) { return `<p class="detail-empty">${escapeHTML(msg)}</p>`; }
  function detailDateField(date = localDay()) { return `<label>Data <input class="text-input" type="date" name="date" data-detail-date required max="${localDay()}" value="${date}"></label>`; }
  function detailFormButton(label = 'Salvar registro') { return `<button class="btn btn-primary" type="submit">${svg('plus')} ${escapeHTML(label)}</button>`; }
  function detailNotes(attr) {
    return `<section class="detail-panel detail-notes" id="detail-notes">${detailHeading('Bloco de notas', 'Ideias, lembretes e observações importantes.')}
      <form data-detail-form="notes"><label class="sr-only" for="detail-notes-textarea">Anotações do atributo</label><textarea id="detail-notes-textarea" class="text-input detail-textarea" name="notes" rows="5" maxlength="8000" placeholder="Anote aqui o que não quer esquecer...">${escapeHTML(attr.details.notes)}</textarea>
      <div class="detail-form-footer"><small>Salvo neste navegador e incluído no backup.</small>${detailFormButton('Salvar notas')}</div></form></section>`;
  }
  function detailBars(records, format, maxLimit) {
    const max = Math.max(maxLimit || 1, ...records.map(r => r.value));
    return `<div class="detail-bars" role="img" aria-label="Gráfico de atividade dos últimos ${records.length} dias">${records.map((r,i) => `<div class="detail-bar-cell" title="${prettyDate(r.date)}: ${escapeHTML(format(r.value))}"><div class="detail-bar-rail"><div class="detail-bar-fill${r.value ? '' : ' is-empty'}" style="height:${Math.max(r.value ? 4 : 2, Math.round(r.value / max * 100))}%"></div></div><span>${i % 3 === 0 || i === records.length - 1 ? r.date.slice(8) : '&nbsp;'}</span></div>`).join('')}</div>`;
  }
  function lastDays(count, map) {
    const today = dayIndex(localDay());
    return Array.from({ length: count }, (_, index) => {
      const date = dayKey(today - count + index + 1);
      return { date, value: map.get(date) || 0 };
    });
  }
  function detailCalendar(attr) {
    const year = detailMonth.getFullYear(), month = detailMonth.getMonth();
    const monthLabel = detailMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    const days = new Set(attr.completions);
    let cells = Array(new Date(year, month, 1).getDay()).fill('<span class="detail-calendar-blank"></span>').join('');
    for (let i = 1; i <= new Date(year, month + 1, 0).getDate(); i++) {
      const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      const isDone = days.has(date);
      const future = date > localDay() || date < attr.createdAt;
      cells += `<button type="button" class="detail-calendar-day ${isDone ? 'done' : ''} ${date === localDay() ? 'today' : ''}" data-action="detail-pick-day" data-date="${date}" ${future ? 'disabled' : ''} title="${prettyDate(date)}${isDone ? ' · concluído' : ''}" aria-label="${prettyDate(date)}${isDone ? ' · concluído' : ''}">${i}${isDone ? '<span class="detail-day-dot"></span>' : ''}</button>`;
    }
    const maxMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const cantNext = detailMonth.getTime() >= maxMonth.getTime();
    return `<section class="detail-panel detail-calendar-panel" id="detail-calendar">${detailHeading('Calendário', 'Selecione um dia para preencher a data de um registro.')}
       <div class="detail-month-nav"><button type="button" class="detail-arrow" data-action="detail-prev-month" aria-label="Mês anterior">${svg('chevron-left')}</button><strong>${escapeHTML(monthLabel)}</strong><button type="button" class="detail-arrow" data-action="detail-next-month" aria-label="Próximo mês" ${cantNext ? 'disabled' : ''}>${svg('chevron-right')}</button></div>
       <div class="detail-calendar-grid">${['D','S','T','Q','Q','S','S'].map(d => `<span class="detail-calendar-weekday">${d}</span>`).join('')}${cells}</div>
       <p class="detail-calendar-tip"><i class="detail-legend-dot"></i> Atividade registrada <span>·</span> ${attr.completions.length} ${attr.completions.length === 1 ? 'dia concluído' : 'dias concluídos'}</p>
       </section>`;
  }
  function commonDetailHeader(attr, stats) {
    const info = attributeMetrics(attr);
    return `<div class="detail-hero" style="--detail-color:${attr.color}"><div class="detail-hero-head"><div class="detail-hero-symbol">${iconMarkup(attr.icon, attr.name)}</div><div><p class="eyebrow">PAINEL DE ${escapeHTML(KIND_LABELS[attr.kind] || 'Hábito diário').toLocaleUpperCase('pt-BR')}</p><h1 id="detail-title">${escapeHTML(attr.name)}<span class="title-dot">.</span></h1><p class="detail-hero-sub">Seu espaço para organizar, registrar e acompanhar cada conquista.</p></div></div>
      <div class="detail-hero-meta"><span>${svg('spark')} Nível ${info.level}</span><span>${svg('fire')} ${info.streak} dias de sequência</span><span>${svg('check')} ${info.total} dias concluídos</span></div></div>
      <div class="detail-stats-grid">${stats}</div>`;
  }
  function detailQuickNav(tabs) {
    return `<nav class="detail-tabs" aria-label="Seções do painel">${tabs.map(([id,text]) => `<button type="button" data-action="detail-scroll" data-target="${id}">${escapeHTML(text)}</button>`).join('')}</nav>`;
  }
  function renderAttributeDetail() {
    const attr = getDetailAttr();
    if (!attr) return;
    // Dados antigos recebem o modelo de detalhes ao carregar. Não altera o estado gravado até o próximo save.
    attr.details ||= emptyDetails();
    const kind = KINDS.includes(attr.kind) ? attr.kind : 'geral';
    let markup = '';
    if (kind === 'treino') markup = renderWorkoutDetail(attr);
    else if (kind === 'estudo') markup = renderStudyDetail(attr);
    else if (kind === 'sono' || kind === 'hidratacao') markup = renderQuantityDetail(attr, kind);
    else markup = renderGenericDetail(attr);
    $('detail-content').innerHTML = markup;
  }
  function renderWorkoutDetail(attr) {
    const d = attr.details;
    const currentMonth = dayIndex(localDay());
    const last7 = d.workouts.filter(w => dayIndex(w.date) >= currentMonth - 6);
    const last30 = d.workouts.filter(w => dayIndex(w.date) >= currentMonth - 29);
    const minutes30 = last30.reduce((sum,w) => sum + w.duration, 0);
    const recentLoads = d.lifts.filter(l => dayIndex(l.date) >= currentMonth - 29);
    const volume = recentLoads.reduce((sum,l) => sum + l.weight * l.reps * l.sets, 0);
    const workoutByDate = new Map();
    for (const w of d.workouts) workoutByDate.set(w.date, (workoutByDate.get(w.date) || 0) + 1);
    const stats = detailStat('Treinos na semana', last7.length, 'Nos últimos 7 dias', 'fire') + detailStat('Treinos no mês', last30.length, 'Nos últimos 30 dias', 'calendar') + detailStat('Tempo treinado', `${fmtNumber(minutes30 / 60)}h`, 'Nos últimos 30 dias', 'journey') + detailStat('Volume movimentado', `${fmtNumber(volume)} kg`, 'Séries × repetições × carga', 'trophy');
    const routines = d.routine.slice().sort((a,b) => (a.day - b.day) || a.name.localeCompare(b.name));
    const routineCards = routines.length ? routines.map(r => `<article class="detail-list-row routine-row"><div class="detail-day-badge">${WEEKDAYS[r.day].slice(0,3)}</div><div class="detail-list-main"><strong>${escapeHTML(r.name || 'Treino do dia')}</strong><small>${escapeHTML(WEEKDAYS[r.day])}</small><p class="detail-preline">${escapeHTML(r.exercises || 'Sem exercícios informados')}</p></div><div class="detail-row-buttons"><button class="detail-icon-button" type="button" data-action="detail-edit-routine" data-id="${escapeHTML(r.id)}" aria-label="Editar rotina">${svg('edit')}</button><button class="detail-icon-button" type="button" data-action="detail-delete-routine" data-id="${escapeHTML(r.id)}" aria-label="Excluir rotina">${svg('trash')}</button></div></article>`).join('') : detailEmpty('Monte seu primeiro treino da semana usando o formulário abaixo.');
    const exercises = d.exercises.length ? d.exercises.map(e => `<div class="detail-list-row"><span class="detail-item-emblem">${svg('target')}</span><div class="detail-list-main"><strong>${escapeHTML(e.name)}</strong><small>${escapeHTML(e.muscle || 'Sem grupo muscular')} · ${e.sets} séries de ${escapeHTML(e.reps || '—')} repetições</small></div><button class="detail-icon-button" type="button" data-action="detail-delete-exercise" data-id="${escapeHTML(e.id)}" aria-label="Excluir exercício">${svg('trash')}</button></div>`).join('') : detailEmpty('Adicione os exercícios que costuma fazer para acompanhar suas cargas.');
    const prs = new Map();
    for (const l of d.lifts) {
      const key = l.exerciseId || l.exercise.toLowerCase();
      if (!prs.has(key) || l.weight > prs.get(key).weight) prs.set(key, l);
    }
    const bests = [...prs.values()].sort((a,b) => b.weight - a.weight);
    const recordRows = bests.length ? bests.slice(0,8).map(l => `<div class="detail-list-row"><span class="detail-item-emblem gold">${svg('trophy')}</span><div class="detail-list-main"><strong>${escapeHTML(l.exercise || d.exercises.find(e => e.id === l.exerciseId)?.name || 'Exercício')}</strong><small>${shortDate(l.date)} · ${l.sets} × ${l.reps} repetições</small></div><strong class="detail-weight">${fmtNumber(l.weight)} kg</strong></div>`).join('') : detailEmpty('Seus recordes pessoais aparecerão aqui quando registrar suas cargas.');
    const workoutRows = d.workouts.slice().sort((a,b) => b.date.localeCompare(a.date)).slice(0,9);
    const lastLogs = d.lifts.slice().sort((a,b) => b.date.localeCompare(a.date)).slice(0,8);
    const sessionHistory = workoutRows.length ? workoutRows.map(w => `<div class="detail-list-row"><div class="detail-date-tile"><b>${w.date.slice(8)}</b><span>${shortDate(w.date).split(' ')[1] || ''}</span></div><div class="detail-list-main"><strong>${escapeHTML(w.title || d.routine.find(r=>r.id===w.routineId)?.name || 'Treino realizado')}</strong><small>${w.duration} min · ${prettyDate(w.date)}</small>${w.notes ? `<p>${escapeHTML(w.notes)}</p>` : ''}</div><button class="detail-icon-button" type="button" data-action="detail-delete-workout" data-id="${escapeHTML(w.id)}" aria-label="Excluir sessão">${svg('trash')}</button></div>`).join('') : detailEmpty('Registre um treino para iniciar seu histórico.');
    const loadHistory = lastLogs.length ? lastLogs.map(l => `<div class="detail-list-row"><span class="detail-item-emblem">${svg('target')}</span><div class="detail-list-main"><strong>${escapeHTML(l.exercise || d.exercises.find(e=>e.id===l.exerciseId)?.name || 'Exercício')}</strong><small>${shortDate(l.date)} · ${l.sets} séries × ${l.reps} repetições</small></div><strong class="detail-weight">${fmtNumber(l.weight)} kg</strong><button class="detail-icon-button" type="button" data-action="detail-delete-lift" data-id="${escapeHTML(l.id)}" aria-label="Excluir carga">${svg('trash')}</button></div>`).join('') : detailEmpty('Registre suas séries e cargas para acompanhar a evolução.');
    return commonDetailHeader(attr, stats) + detailQuickNav([['detail-routine','Rotina'],['detail-training','Treinos'],['detail-exercises','Exercícios'],['detail-records','Recordes'],['detail-calendar','Calendário'],['detail-notes','Notas']]) +
      `<div class="detail-layout"><div class="detail-main-column">
      <section class="detail-panel" id="detail-routine">${detailHeading('Sua divisão de treino', 'Planeje a semana e tenha clareza sobre o que treinar.', '01')}<div class="detail-stack">${routineCards}</div><form data-detail-form="routine" class="detail-form"><input type="hidden" name="editId" value=""><div class="detail-form-grid"><label>Dia da semana<select class="text-input" name="day" required>${WEEKDAYS.map((name,i) => option(i,name)).join('')}</select></label><label>Nome do treino<input class="text-input" name="name" maxlength="65" required placeholder="Ex.: Push A / Peito e tríceps"></label></div><label>Exercícios planejados<textarea class="text-input detail-textarea" name="exercises" rows="3" maxlength="1800" placeholder="Ex.: Supino reto — 4×8\nCrucifixo inclinado — 3×12"></textarea></label><div class="detail-form-footer"><small>Organize sua semana do seu jeito.</small>${detailFormButton('Salvar rotina')}</div></form></section>
      <section class="detail-panel" id="detail-training">${detailHeading('Diário de treinos', 'Registre cada sessão, tempo e observações.', '02')}<form class="detail-form" data-detail-form="workout"><div class="detail-form-grid">${detailDateField()}<label>Treino ou divisão<select class="text-input" name="routineId">${option('','Treino avulso')}${d.routine.map(r=>option(r.id, `${WEEKDAYS[r.day]} · ${r.name}`)).join('')}</select></label><label>Nome da sessão<input class="text-input" name="title" maxlength="65" placeholder="Ex.: Full body / Corrida"></label><label>Duração (min)<input type="number" class="text-input" name="duration" min="1" max="1440" required value="60"></label></div><label>Observações (opcional)<textarea class="text-input" name="notes" rows="2" maxlength="400" placeholder="Como foi o treino hoje?"></textarea></label>${detailFormButton('Registrar treino')}</form><div class="detail-stack history-stack">${sessionHistory}</div></section>
      <section class="detail-panel" id="detail-exercises">${detailHeading('Biblioteca de exercícios', 'Defina exercícios, séries e repetições de referência.', '03')}<div class="detail-stack">${exercises}</div><form class="detail-form" data-detail-form="exercise"><div class="detail-form-grid"><label>Exercício<input class="text-input" name="name" maxlength="65" placeholder="Ex.: Agachamento livre" required></label><label>Grupo muscular<input class="text-input" name="muscle" maxlength="50" placeholder="Ex.: Quadríceps"></label><label>Séries<input type="number" class="text-input" name="sets" value="3" min="1" max="30" required></label><label>Repetições-alvo<input class="text-input" name="reps" maxlength="20" placeholder="Ex.: 8–12"></label></div>${detailFormButton('Adicionar exercício')}</form></section>
      <section class="detail-panel" id="detail-records">${detailHeading('Cargas e recordes pessoais', 'Acompanhe seus melhores levantamentos e toda a evolução.', '04')}<div class="detail-stack">${recordRows}</div><form class="detail-form" data-detail-form="lift"><div class="detail-form-grid">${detailDateField()}<label>Exercício<select class="text-input" name="exerciseId" required>${option('','Selecione o exercício')}${d.exercises.map(e=>option(e.id,e.name)).join('')}</select></label><label>Peso (kg)<input type="number" class="text-input" name="weight" min="0" max="3000" step="0.5" required placeholder="Ex.: 50"></label><label>Séries<input type="number" class="text-input" name="sets" min="1" max="50" value="3" required></label><label>Repetições<input type="number" class="text-input" name="reps" min="1" max="300" value="10" required></label></div>${detailFormButton('Registrar carga')}</form><div class="detail-list-subtitle">Últimas cargas registradas</div><div class="detail-stack">${loadHistory}</div></section>
      ${detailNotes(attr)}</div><aside class="detail-side-column">
      <section class="detail-panel">${detailHeading('Consistência', 'Treinos realizados nos últimos 14 dias.')}${detailBars(lastDays(14,workoutByDate), n=>`${n} treinos`,1)}<div class="detail-insight">${svg('fire')} ${last7.length} sessões na última semana</div></section>
      ${detailCalendar(attr)}
      <section class="detail-panel detail-insight-panel">${svg('trophy')}<h3>Um treino de cada vez.</h3><p>Registre suas sessões, monitore as cargas e perceba a evolução no seu próprio ritmo.</p></section></aside></div>`;
  }
  function renderStudyDetail(attr) {
    const d = attr.details, today = localDay(), todayI = dayIndex(today);
    const recent = d.studyLogs.filter(l => dayIndex(l.date) >= todayI - 29);
    const minutes = d.studyLogs.reduce((sum,l) => sum + l.minutes, 0);
    const weekMinutes = d.studyLogs.filter(l => dayIndex(l.date) >= todayI - 6).reduce((sum,l) => sum + l.minutes, 0);
    const todayMinutes = d.studyLogs.filter(l => l.date === today).reduce((sum,l) => sum + l.minutes, 0);
    const dayMap = new Map();
    d.studyLogs.forEach(l => dayMap.set(l.date, (dayMap.get(l.date) || 0) + l.minutes));
    const goal = d.dailyGoal || 120;
    const dayRatio = Math.min(100, Math.round(todayMinutes / goal * 100));
    const upcoming = d.exams.filter(e => e.date >= today).sort((a,b) => a.date.localeCompare(b.date));
    const stats = detailStat('Hoje', `${fmtNumber(todayMinutes)} min`, 'Tempo estudado hoje', 'target') + detailStat('Últimos 7 dias', `${fmtNumber(weekMinutes / 60)}h`, 'Tempo de dedicação', 'fire') + detailStat('Últimos 30 dias', `${fmtNumber(recent.reduce((s,l)=>s+l.minutes,0)/60)}h`, 'Tempo acumulado', 'calendar') + detailStat('Total estudado', `${fmtNumber(minutes / 60)}h`, 'Desde o primeiro registro', 'trophy');
    const subjects = d.subjects.length ? d.subjects.map(s => {const mins=d.studyLogs.filter(l=>l.subjectId===s.id).reduce((sum,l)=>sum+l.minutes,0);return `<div class="detail-list-row"><span class="detail-item-emblem">${svg('grid')}</span><div class="detail-list-main"><strong>${escapeHTML(s.name)}</strong><small>${fmtNumber(mins/60)} horas registradas</small></div><button type="button" class="detail-icon-button" data-action="detail-delete-subject" data-id="${escapeHTML(s.id)}" aria-label="Excluir disciplina">${svg('trash')}</button></div>`;}).join('') : detailEmpty('Comece cadastrando as disciplinas que estuda.');
    const exams = d.exams.length ? d.exams.slice().sort((a,b)=>(a.date||'9999').localeCompare(b.date||'9999')).map(e => `<div class="detail-list-row"><span class="detail-item-emblem gold">${svg('target')}</span><div class="detail-list-main"><strong>${escapeHTML(e.name)}</strong><small>${e.date ? prettyDate(e.date) : 'Sem data definida'} · ${fmtNumber(d.studyLogs.filter(l=>l.examId===e.id).reduce((s,l)=>s+l.minutes,0)/60)}h dedicadas</small></div><button type="button" class="detail-icon-button" data-action="detail-delete-exam" data-id="${escapeHTML(e.id)}" aria-label="Excluir prova">${svg('trash')}</button></div>`).join('') : detailEmpty('Crie uma prova, vestibular, concurso ou outra preparação.');
    const history = d.studyLogs.slice().sort((a,b)=>b.date.localeCompare(a.date)).slice(0,15);
    const historyRows = history.length ? history.map(l => {const subject=d.subjects.find(s=>s.id===l.subjectId)?.name || 'Estudo geral'; const exam=d.exams.find(e=>e.id===l.examId)?.name; return `<div class="detail-list-row"><div class="detail-date-tile"><b>${l.date.slice(8)}</b><span>${shortDate(l.date).split(' ')[1] || ''}</span></div><div class="detail-list-main"><strong>${escapeHTML(subject)}</strong><small>${fmtNumber(l.minutes)} min · ${shortDate(l.date)}${exam ? ' · '+escapeHTML(exam) : ''}</small>${l.topic ? `<p>${escapeHTML(l.topic)}</p>` : ''}${l.notes ? `<p class="detail-subtle">${escapeHTML(l.notes)}</p>` : ''}</div><button class="detail-icon-button" type="button" data-action="detail-delete-study" data-id="${escapeHTML(l.id)}" aria-label="Excluir estudo">${svg('trash')}</button></div>`;}).join('') : detailEmpty('Seu histórico de estudos aparecerá aqui.');
    return commonDetailHeader(attr, stats) + detailQuickNav([['detail-study-log','Registrar estudo'],['detail-subjects','Disciplinas'],['detail-exams','Provas'],['detail-calendar','Calendário'],['detail-notes','Notas']]) +
      `<div class="detail-layout"><div class="detail-main-column">
      <section class="detail-panel" id="detail-study-log">${detailHeading('Registrar sessão de estudo', 'Seu histórico de aprendizado, organizado por dia.', '01')}<form class="detail-form" data-detail-form="study"><div class="detail-form-grid">${detailDateField()}<label>Disciplina<select class="text-input" name="subjectId" required>${option('','Escolha uma disciplina')}${d.subjects.map(s=>option(s.id,s.name)).join('')}</select></label><label>Prova / preparação<select class="text-input" name="examId">${option('','Estudo livre')}${d.exams.map(e=>option(e.id,e.name)).join('')}</select></label><label>Tempo estudado (min)<input class="text-input" type="number" name="minutes" min="1" max="1440" value="60" required></label></div><label>Assunto estudado<input class="text-input" name="topic" maxlength="160" placeholder="Ex.: Funções do 2º grau · Questões 1–15"></label><label>Notas da sessão<textarea class="text-input" name="notes" rows="2" maxlength="400" placeholder="O que aprendeu? O que precisa revisar?"></textarea></label>${detailFormButton('Salvar sessão de estudo')}</form><div class="detail-list-subtitle">Últimas sessões de estudo</div><div class="detail-stack">${historyRows}</div></section>
      <section class="detail-panel" id="detail-subjects">${detailHeading('Suas disciplinas', 'Organize as matérias da sua rotina.', '02')}<div class="detail-stack">${subjects}</div><form class="detail-form detail-inline-form" data-detail-form="subject"><label>Nome da disciplina<input class="text-input" name="name" maxlength="65" placeholder="Ex.: Matemática, Biologia, Direito..." required></label>${detailFormButton('Adicionar disciplina')}</form></section>
      <section class="detail-panel" id="detail-exams">${detailHeading('Provas e preparações', 'Mantenha seus objetivos à vista.', '03')}<div class="detail-stack">${exams}</div><form class="detail-form" data-detail-form="exam"><div class="detail-form-grid"><label>Nome da prova ou preparação<input class="text-input" name="name" maxlength="90" placeholder="Ex.: ENEM, Concurso público..." required></label><label>Data da prova (opcional)<input class="text-input" type="date" name="date"></label></div>${detailFormButton('Adicionar objetivo')}</form></section>${detailNotes(attr)}</div>
      <aside class="detail-side-column"><section class="detail-panel detail-goal">${detailHeading('Meta diária', 'Transforme a dedicação em constância.')}<div class="detail-goal-value"><strong>${fmtNumber(todayMinutes)}</strong><span>/ ${fmtNumber(goal)} min</span></div><div class="detail-goal-track"><span style="width:${dayRatio}%"></span></div><p class="detail-goal-caption">${dayRatio >= 100 ? 'Meta alcançada hoje! ✦' : `${fmtNumber(Math.max(0, goal - todayMinutes))} min para alcançar sua meta de hoje`}</p><form data-detail-form="goal" class="detail-goal-form"><label>Meta diária (min)<input class="text-input" type="number" name="goal" min="1" max="1440" value="${goal}" required></label><button type="submit" class="btn btn-outline">Atualizar meta</button></form></section>
      <section class="detail-panel">${detailHeading('Tempo de foco', 'Minutos estudados nos últimos 14 dias.')}${detailBars(lastDays(14,dayMap), n=>`${n} minutos`,goal)}<div class="detail-insight">${svg('spark')} ${fmtNumber(weekMinutes / 60)} horas na última semana</div></section>
      ${detailCalendar(attr)}
      ${upcoming.length ? `<section class="detail-panel"><h3>Próxima prova</h3><div class="detail-upcoming"><strong>${escapeHTML(upcoming[0].name)}</strong><span>${prettyDate(upcoming[0].date)}</span></div></section>` : ''}</aside></div>`;
  }
  function renderQuantityDetail(attr, kind) {
    const d=attr.details, isWater=kind==='hidratacao', label=isWater?'Hidratação':'Sono',unit=isWater?'ml':'h';
    const goal = d.dailyGoal || (isWater?2000:8);
    const valuesByDay = new Map();
    for(const row of d.values) valuesByDay.set(row.date,(valuesByDay.get(row.date)||0)+row.value);
    const today=localDay(), now=dayIndex(today);
    const last7=lastDays(7,valuesByDay), last30=lastDays(30,valuesByDay);
    const valToday=valuesByDay.get(today)||0;
    const average=arr=>{const days=isWater?arr:arr.filter(r=>r.value>0);return days.length?days.reduce((s,r)=>s+r.value,0)/days.length:0;};
    const met=last30.filter(r=>r.value>=goal).length;
    const stats = detailStat('Hoje',`${fmtNumber(valToday)} ${unit}`,isWater?'Água ingerida':'Horas de sono','target') + detailStat('Média em 7 dias',`${fmtNumber(average(last7))} ${unit}`,isWater?'Incluindo dias sem registro':'Noites registradas','fire') + detailStat('Média em 30 dias',`${fmtNumber(average(last30))} ${unit}`,isWater?'Incluindo dias sem registro':'Noites registradas','calendar') + detailStat('Meta atingida',`${met} dias`,'Nos últimos 30 dias','trophy');
    const rows=d.values.slice().sort((a,b)=>b.date.localeCompare(a.date)).slice(0,15);
    const history=rows.length?rows.map(row=>`<div class="detail-list-row"><div class="detail-date-tile"><b>${row.date.slice(8)}</b><span>${shortDate(row.date).split(' ')[1] || ''}</span></div><div class="detail-list-main"><strong>${fmtNumber(row.value)} ${unit}</strong><small>${prettyDate(row.date)}</small></div><button class="detail-icon-button" type="button" data-action="detail-delete-value" data-date="${row.date}" aria-label="Excluir registro">${svg('trash')}</button></div>`).join(''):detailEmpty(`Seus registros de ${label.toLowerCase()} aparecerão aqui.`);
    const ratio=Math.min(100,Math.round(valToday/goal*100));
    return commonDetailHeader(attr,stats)+detailQuickNav([['detail-quantity','Registrar'],['detail-calendar','Calendário'],['detail-notes','Notas']])+`<div class="detail-layout"><div class="detail-main-column"><section class="detail-panel" id="detail-quantity">${detailHeading(isWater?'Seu diário de água':'Seu diário de sono',isWater?'Registre quanta água tomou ao longo do dia.':'Registre as horas de sono de cada noite.','01')}
      <form class="detail-form" data-detail-form="quantity"><div class="detail-form-grid">${detailDateField()}<label>${isWater?'Quantidade (ml)':'Horas dormidas'}<input class="text-input" type="number" name="value" min="${isWater?10:0.25}" max="${isWater?10000:24}" step="${isWater?10:0.25}" value="${isWater?250:8}" required></label></div><p class="detail-form-hint">${isWater?'Pode registrar várias vezes no dia: as quantidades serão somadas.':'Ao registrar novamente a mesma data, o número de horas será atualizado.'}</p>${detailFormButton(isWater?'Adicionar água':'Salvar horas de sono')}</form><div class="detail-list-subtitle">Registros recentes</div><div class="detail-stack">${history}</div></section>${detailNotes(attr)}</div>
      <aside class="detail-side-column"><section class="detail-panel detail-goal">${detailHeading('Sua meta diária',isWater?'Mantenha sua hidratação em dia.':'Cuide do seu descanso.')}<div class="detail-goal-value"><strong>${fmtNumber(valToday)}</strong><span>/ ${fmtNumber(goal)} ${unit}</span></div><div class="detail-goal-track"><span style="width:${ratio}%"></span></div><p class="detail-goal-caption">${ratio>=100?'Meta do dia alcançada! ✦':`${fmtNumber(Math.max(0,goal-valToday))} ${unit} para atingir a meta`}</p><form class="detail-goal-form" data-detail-form="goal"><label>Meta (${unit})<input class="text-input" type="number" name="goal" min="${isWater?50:0.5}" max="${isWater?10000:24}" step="${isWater?50:0.25}" value="${goal}" required></label><button class="btn btn-outline" type="submit">Atualizar meta</button></form></section>
      <section class="detail-panel">${detailHeading(isWater?'Consumo diário':'Horas por noite','Acompanhamento dos últimos 14 dias.')}${detailBars(lastDays(14,valuesByDay),n=>`${fmtNumber(n)} ${unit}`,goal)}</section>${detailCalendar(attr)}</aside></div>`;
  }
  function renderGenericDetail(attr) {
    const d=attr.details, info=attributeMetrics(attr);
    const completionMap = new Map(attr.completions.map(date=>[date,1]));
    const events=d.events.slice().sort((a,b)=>b.date.localeCompare(a.date)).slice(0,15);
    const rows=events.length?events.map(e=>`<div class="detail-list-row"><span class="detail-item-emblem">${svg('check')}</span><div class="detail-list-main"><strong>${escapeHTML(e.notes)}</strong><small>${prettyDate(e.date)}</small></div><button class="detail-icon-button" type="button" data-action="detail-delete-event" data-id="${escapeHTML(e.id)}" aria-label="Excluir lembrete">${svg('trash')}</button></div>`).join(''):detailEmpty('Guarde aqui suas observações e pequenos marcos deste atributo.');
    const stats=detailStat('Concluído hoje',attr.completions.includes(localDay())?'Sim':'Ainda não','Seu hábito de hoje','check')+detailStat('Últimos 7 dias',info.last7,'Dias concluídos','fire')+detailStat('Últimos 30 dias',info.last30,'Dias concluídos','calendar')+detailStat('Melhor sequência',`${info.bestStreak} dias`,'Seu recorde de consistência','trophy');
    return commonDetailHeader(attr,stats)+detailQuickNav([['detail-daily','Acompanhar'],['detail-calendar','Calendário'],['detail-notes','Notas']])+`<div class="detail-layout"><div class="detail-main-column"><section class="detail-panel" id="detail-daily">${detailHeading('Seu hábito, seu ritmo','Registre a conclusão diária e acompanhe o histórico.','01')}<button type="button" class="btn btn-primary detail-big-complete" data-action="detail-complete" ${attr.completions.includes(localDay())?'disabled':''}>${svg('check')} ${attr.completions.includes(localDay())?'Hábito concluído hoje':'Marcar hábito como concluído hoje'}</button><div class="detail-list-subtitle">Anotações do dia a dia</div><form data-detail-form="event" class="detail-form"><div class="detail-form-grid">${detailDateField()}<label>O que aconteceu?<input class="text-input" name="notes" maxlength="400" placeholder="Ex.: Tomei creatina após o café da manhã" required></label></div>${detailFormButton('Registrar observação')}</form><div class="detail-stack history-stack">${rows}</div></section>${detailNotes(attr)}</div><aside class="detail-side-column"><section class="detail-panel">${detailHeading('Consistência','Dias em que concluiu o hábito.')}${detailBars(lastDays(14,completionMap),n=>n?'Concluído':'Sem registro',1)}<div class="detail-insight">${svg('fire')} ${info.streak} dias de sequência atual</div></section>${detailCalendar(attr)}</aside></div>`;
  }
  function detailFormData(form) { return Object.fromEntries(new FormData(form).entries()); }
  function handleDetailSubmit(event) {
    const form=event.target.closest('[data-detail-form]');
    if (!form || !state) return;
    event.preventDefault();
    const attr=getDetailAttr();
    if(!attr) return;
    const kind=form.dataset.detailForm;
    const input=detailFormData(form);
    const requiredName = String(input.name || '').trim();
    const date = input.date || localDay();
    const dated = ['workout','lift','study','quantity','event'].includes(kind);
    if(dated && (!validDay(date) || date<attr.createdAt || date>localDay())) {toast('Data inválida','Selecione uma data entre a criação do atributo e hoje.','error');return;}
    const number=(key,min,max)=>{const val=Number(input[key]);return input[key]!=='' && Number.isFinite(val) && val>=min && val<=max ? val : null;};
    if(kind==='notes') {if(commit(next=>next.attributes.find(a=>a.id===attr.id).details.notes=String(input.notes||'').slice(0,8000)))toast('Notas salvas','Suas anotações estão atualizadas.','success');return;}
    if(kind==='goal') {const value=number('goal',0.1,10000);if(value===null){toast('Meta inválida','Informe uma meta positiva.','error');return;}if(commit(next=>next.attributes.find(a=>a.id===attr.id).details.dailyGoal=value))toast('Meta atualizada','Continue acompanhando seu progresso.','success');return;}
    if(['routine','exercise','subject','exam'].includes(kind)&&!requiredName){toast('Nome obrigatório','Preencha o nome para continuar.','error');return;}
    if(kind==='routine' && (number('day',0,6)===null || !Number.isInteger(+input.day))){toast('Dia inválido','','error');return;}
    if(kind==='workout' && number('duration',1,1440)===null) {toast('Tempo inválido','Informe a duração de 1 a 1440 minutos.','error');return;}
    if(kind==='lift' && (number('weight',0,3000)===null || number('sets',1,50)===null || number('reps',1,300)===null || !attr.details.exercises.some(x=>x.id===input.exerciseId))) {toast('Carga inválida','Selecione um exercício e informe peso, séries e repetições válidos.','error');return;}
    if(kind==='study' && (number('minutes',1,1440)===null || !attr.details.subjects.some(x=>x.id===input.subjectId))) {toast('Sessão inválida','Cadastre e selecione uma disciplina e informe o tempo estudado.','error');return;}
    if(kind==='quantity' && number('value',attr.kind==='hidratacao'?10:0.25,attr.kind==='hidratacao'?10000:24)===null) {toast('Quantidade inválida','Confira o valor informado.','error');return;}
    if(kind==='event'&&!String(input.notes||'').trim()){toast('Texto obrigatório','Escreva uma observação.','error');return;}
    const success=commit(next=>{
      const item=next.attributes.find(a=>a.id===attr.id),d=item.details;
      switch(kind){
        case 'routine': {
          const entry={id:String(input.editId||randomId()),day:+input.day,name:requiredName.slice(0,65),exercises:String(input.exercises||'').trim().slice(0,1800)};
          const index=d.routine.findIndex(x=>x.id===entry.id);
          if(index>=0)d.routine[index]=entry;else d.routine.push(entry);
          break;
        }
        case 'exercise':d.exercises.push({id:randomId(),name:requiredName.slice(0,65),muscle:String(input.muscle||'').trim().slice(0,50),sets:+input.sets||3,reps:String(input.reps||'').trim().slice(0,20)});break;
        case 'subject':d.subjects.push({id:randomId(),name:requiredName.slice(0,65)});break;
        case 'exam':d.exams.push({id:randomId(),name:requiredName.slice(0,90),date:validDay(input.date)?input.date:''});break;
        case 'workout':d.workouts.push({id:randomId(),date,routineId:String(input.routineId||''),title:String(input.title||'').trim().slice(0,65),duration:+input.duration,notes:String(input.notes||'').trim().slice(0,400)});ensureCompletion(item,date);break;
        case 'lift':{const ex=d.exercises.find(e=>e.id===input.exerciseId);d.lifts.push({id:randomId(),date,exerciseId:ex.id,exercise:ex.name,weight:+input.weight,sets:+input.sets,reps:+input.reps});ensureCompletion(item,date);break;}
        case 'study':d.studyLogs.push({id:randomId(),date,subjectId:input.subjectId,examId:String(input.examId||''),minutes:+input.minutes,topic:String(input.topic||'').trim().slice(0,160),notes:String(input.notes||'').trim().slice(0,400)});ensureCompletion(item,date);break;
        case 'quantity':{const already=d.values.find(r=>r.date===date);if(already)already.value= item.kind==='hidratacao' ? Math.min(100000,already.value+ +input.value) : +input.value;else d.values.push({date,value:+input.value});ensureCompletion(item,date);break;}
        case 'event':d.events.push({id:randomId(),date,notes:String(input.notes||'').trim().slice(0,400)});break;
      }
    });
    if(success) toast('Registro salvo','Seu painel e os indicadores foram atualizados.','success');
  }
  function handleDetailChange(event) {
    // A data pode ser escolhida no calendário; o formulário permanece editável.
  }
  function handleDetailAction(button,action,id) {
    const attr=getDetailAttr();
    if(!attr || activePage!=='detalhe') return false;
    if(action==='detail-scroll') {const target=$(button.dataset.target);if(target)target.scrollIntoView({behavior:state.settings.reduceMotion?'instant':'smooth',block:'start'});return true;}
    if(action==='detail-prev-month'||action==='detail-next-month') {const delta=action==='detail-prev-month'?-1:1;detailMonth=new Date(detailMonth.getFullYear(),detailMonth.getMonth()+delta,1);renderAttributeDetail();return true;}
    if(action==='detail-pick-day') {const date=button.dataset.date;for(const input of document.querySelectorAll('#detail-content [data-detail-date]'))input.value=date;toast('Data selecionada',`Os formulários agora usam ${prettyDate(date)}.`);return true;}
    if(action==='detail-complete'){finishAttribute(attr.id,button);return true;}
    if(action==='detail-edit-routine') {const r=attr.details.routine.find(x=>x.id===id);const form=document.querySelector('#detail-content [data-detail-form="routine"]');if(r&&form){form.elements.editId.value=r.id;form.elements.day.value=r.day;form.elements.name.value=r.name;form.elements.exercises.value=r.exercises;form.scrollIntoView({behavior:'smooth',block:'center'});form.elements.name.focus();toast('Editando rotina','Atualize os campos e clique em Salvar rotina.');}return true;}
    const deletions={'detail-delete-routine':'routine','detail-delete-exercise':'exercises','detail-delete-workout':'workouts','detail-delete-lift':'lifts','detail-delete-subject':'subjects','detail-delete-exam':'exams','detail-delete-study':'studyLogs','detail-delete-event':'events','detail-delete-value':'values'};
    const key=deletions[action];
    if(!key) return false;
    const identifier=key==='values'?button.dataset.date:id;
    const row=attr.details[key].find(x=>key==='values'?x.date===identifier:x.id===identifier);
    if(!row) return true;
    askConfirm('Excluir registro?', 'O registro selecionado será removido deste painel. Os dias já concluídos continuarão no histórico da jornada.',()=>{
      if(commit(next=>{const arr=next.attributes.find(a=>a.id===attr.id).details[key];const i=arr.findIndex(x=>key==='values'?x.date===identifier:x.id===identifier);if(i>=0)arr.splice(i,1);}))toast('Registro excluído','O painel foi atualizado.');
    },'Excluir registro');
    return true;
  }

  function renderAll() {
    if (!state) { $('app').hidden = true; $('onboarding').hidden = false; renderStarterChoices(); return; }
    $('onboarding').hidden = true;
    $('app').hidden = false;
    document.documentElement.style.setProperty('--accent', state.profile.color);
    document.body.classList.toggle('reduce-motion', state.settings.reduceMotion);
    const metrics = derive(state);
    sessionMetrics = metrics;
    $('sidebar-name').textContent = state.profile.name;
    $('sidebar-level').textContent = `Nível ${metrics.globalLevel} · ${titleForLevel(metrics.globalLevel)}`;
    const sideAvatar = $('sidebar-avatar');
    setAvatarPreview(sideAvatar, state.profile.avatar, state.profile.name);
    $('topbar-level').textContent = `NV. ${metrics.globalLevel}`;
    $('header-date').textContent = prettyDate(localDay(), { weekday: 'long', day: '2-digit', month: 'long' });
    $('reduce-motion').checked = state.settings.reduceMotion;
    renderProfileHero(metrics);
    renderStats(metrics);
    renderAttributes(metrics);
    renderHistory(metrics);
    renderCalendar();
    renderChart(metrics);
    renderAchievements();
    if (activePage === 'detalhe' && !state.attributes.some(a => a.id === activeDetailId)) activePage = 'atributos';
    if (activePage === 'detalhe') renderAttributeDetail();
    navigate(activePage, false);
  }
  function toast(title, description = '', kind = '') {
    const region = $('toast-region');
    const item = document.createElement('div');
    item.className = `toast ${kind}`;
    item.innerHTML = `<span class="toast-symbol">${kind === 'success' ? '✦' : kind === 'error' ? '⚠' : '◈'}</span><div><strong>${escapeHTML(title)}</strong><p>${escapeHTML(description)}</p></div>`;
    region.appendChild(item);
    while (region.children.length > 3) region.firstElementChild.remove();
    setTimeout(() => { item.classList.add('fade-out'); setTimeout(() => item.remove(), 220); }, 4200);
  }
  function celebrate(rect) {
    if (state?.settings.reduceMotion || matchMedia('(prefers-reduced-motion: reduce)').matches || !rect) return;
    for (let i = 0; i < 9; i++) {
      const particle = document.createElement('span');
      particle.className = 'xp-particle';
      particle.textContent = i % 2 === 0 ? '✦' : '+1';
      particle.style.left = `${rect.left + rect.width / 2}px`;
      particle.style.top = `${rect.top + rect.height / 2}px`;
      particle.style.setProperty('--dx', `${(Math.random() - .5) * 175}px`);
      particle.style.setProperty('--dy', `${-35 - Math.random() * 110}px`);
      document.body.appendChild(particle);
      setTimeout(() => particle.remove(), 950);
    }
  }
  function showLevelUp(level) {
    $('levelup-message').textContent = `Você alcançou o nível ${level} — ${titleForLevel(level)}!`;
    $('levelup-overlay').hidden = false;
  }
  function closeLevelUp() { $('levelup-overlay').hidden = true; }
  function askConfirm(title, message, action, buttonLabel = 'Confirmar') {
    confirmCallback = action;
    $('confirm-title').textContent = title;
    $('confirm-message').textContent = message;
    $('confirm-accept').textContent = buttonLabel;
    openDialog('confirm-dialog');
  }
  function openDialog(id) {
    const el = $(id);
    if (typeof el.showModal === 'function') { if (!el.open) el.showModal(); }
    else el.setAttribute('open', '');
  }
  function closeDialog(id) {
    const el = $(id);
    if (typeof el.close === 'function' && el.open) el.close();
    else el.removeAttribute('open');
  }
  function createNewAttribute(name, icon, color, kind = null) {
    if (state.attributes.length >= MAX_ATTRIBUTES) { toast('Limite de atributos', `É possível acompanhar até ${MAX_ATTRIBUTES} habilidades.`, 'error'); return false; }
    name = String(name || '').trim().slice(0, 30);
    icon = (SUGGESTIONS.some(s => s.icon === icon) || icon === 'i:estrela') ? icon : 'i:estrela';
    if (!name) { $('attribute-error').textContent = 'Informe um nome para o atributo.'; return false; }
    if (state.attributes.some(attr => nameKey(attr.name) === nameKey(name))) { $('attribute-error').textContent = 'Você já acompanha um atributo com esse nome.'; return false; }
    const selectedKind = KINDS.includes(kind) ? kind : inferKind(name, icon);
    const success = commit(next => { next.attributes.push(createAttributeObject(name, icon, COLORS.includes(color) ? color : COLORS[0], selectedKind)); });
    if (success) { closeDialog('attribute-dialog'); toast('Novo atributo ativado', `${name} começa no nível 0. Boa jornada!`, 'success'); }
    return success;
  }
  function finishAttribute(id, element) {
    const attr = state.attributes.find(a => a.id === id);
    if (!attr) return;
    const today = localDay();
    if (attr.createdAt > today) { toast('Atributo ainda não iniciado', 'A data local está anterior à criação deste atributo.'); return; }
    if (attr.completions.includes(today)) { toast('Já concluído hoje', 'Você poderá registrar uma nova conclusão amanhã.'); return; }
    const oldLevel = derive(state).globalLevel;
    const oldUnlocks = new Set(Object.keys(state.achievements));
    const rect = element?.getBoundingClientRect();
    if (!commit(next => { next.attributes.find(a => a.id === id).completions.push(today); })) return;
    celebrate(rect);
    toast(`+1 ${attr.name.toLocaleUpperCase('pt-BR')}`, 'Seu esforço fortaleceu este atributo!', 'success');
    const newUnlocks = ACHIEVEMENTS.filter(a => state.achievements[a.id] && !oldUnlocks.has(a.id));
    if (newUnlocks.length) setTimeout(() => toast('Conquista desbloqueada!', newUnlocks.map(a => a.name).join(' · '), 'success'), 600);
    if (sessionMetrics.globalLevel > oldLevel) setTimeout(() => showLevelUp(sessionMetrics.globalLevel), 350);
  }
  function openEditProfile() {
    editAvatar = state.profile.avatar;
    profileColor = state.profile.color;
    $('edit-name').value = state.profile.name;
    $('edit-photo').value = '';
    $('profile-error').textContent = '';
    setAvatarPreview($('edit-avatar-preview'), editAvatar, state.profile.name);
    renderColors($('profile-colors'), profileColor, 'profile');
    openDialog('profile-dialog');
  }
  function openAddAttribute() {
    attributeColor = COLORS[0];
    $('attribute-name').value = '';
    $('attribute-icon').innerHTML = `<option value="i:estrela">Estrela / personalizado</option>` + SUGGESTIONS.map(s => `<option value="${s.icon}">${escapeHTML(s.name)}</option>`).join('');
    $('attribute-icon').value = 'i:estrela';
    $('attribute-kind').value = 'geral';
    $('attribute-error').textContent = '';
    renderColors($('attribute-colors'), attributeColor, 'attribute');
    renderPresets();
    openDialog('attribute-dialog');
  }
  function exportBackup() {
    const json = JSON.stringify(state, null, 2);
    const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `habitous-backup-${localDay()}.json`;
    document.body.appendChild(link);
    link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    toast('Backup preparado', 'Guarde este arquivo em um local seguro.', 'success');
  }
  async function importBackup(file) {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast('Arquivo muito grande', 'O limite de importação é de 5 MB.', 'error'); return; }
    try {
      const content = await file.text();
      const next = normalizeData(JSON.parse(content));
      awardAchievements(next);
      askConfirm('Substituir jornada atual?', `O backup de ${next.profile.name} substituirá todos os dados existentes neste navegador. Exporte seu progresso antes, se desejar.`, () => {
        next.meta.lastVisit = localDay();
        if (!persist(next)) return;
        state = next;
        activePage = 'personagem';
        calendarMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        calendarAttributeId = null;
        renderAll();
        toast('Jornada restaurada', 'Seu progresso foi importado com sucesso.', 'success');
      }, 'Restaurar backup');
    } catch (error) {
      toast('Backup inválido', error.message || 'Não foi possível ler o arquivo.', 'error');
    }
  }
  function dailyRefresh() {
    const today = localDay();
    if (!state || today === lastRenderedDay) return;
    const previous = sessionMetrics;
    lastRenderedDay = today;
    const next = JSON.parse(JSON.stringify(state));
    next.meta.lastVisit = today;
    awardAchievements(next);
    if (persist(next)) state = next;
    renderAll();
    if (previous && (sessionMetrics.globalLevel < previous.globalLevel || state.attributes.some(attr => sessionMetrics.byId.get(attr.id)?.level < previous.byId.get(attr.id)?.level))) {
      toast('Status recalculado', 'Dias completos sem atividade foram considerados. Hoje é uma nova oportunidade de avançar.');
    }
  }

  document.addEventListener('click', event => {
    const starter = event.target.closest('[data-starter]');
    if (starter) {
      const id = starter.dataset.starter;
      if (onboardingSelection.has(id)) onboardingSelection.delete(id);
      else onboardingSelection.add(id);
      renderStarterChoices();
      return;
    }
    const color = event.target.closest('[data-color-purpose]');
    if (color) {
      if (color.dataset.colorPurpose === 'attribute') { attributeColor = color.dataset.color; renderColors($('attribute-colors'), attributeColor, 'attribute'); }
      else { profileColor = color.dataset.color; renderColors($('profile-colors'), profileColor, 'profile'); }
      return;
    }
    const preset = event.target.closest('[data-preset]');
    if (preset && state) {
      const item = SUGGESTIONS.find(s => s.id === preset.dataset.preset);
      if (item) createNewAttribute(item.name, item.icon, item.color);
      return;
    }
    const close = event.target.closest('[data-close-dialog]');
    if (close) { closeDialog(close.closest('dialog').id); return; }
    const nav = event.target.closest('[data-page]');
    if (nav && state) { navigate(nav.dataset.page); return; }
    const actionButton = event.target.closest('[data-action]');
    if (!actionButton || !state) return;
    const action = actionButton.dataset.action;
    const id = actionButton.dataset.id;
    if (action === 'complete') finishAttribute(id, actionButton);
    if (action === 'open-attribute') openAttributeDetail(id);
    if (action === 'back-attributes') navigate('atributos');
    if (action === 'edit-profile') openEditProfile();
    if (action === 'add-attribute') openAddAttribute();
    if (action === 'attribute-history') { calendarAttributeId = id; calendarMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1); navigate('jornada'); renderCalendar(); }
    if (action === 'delete-attribute') {
      const attr = state.attributes.find(a => a.id === id);
      if (attr) askConfirm(`Excluir ${attr.name}?`, 'Este atributo e todo o seu histórico de conclusões serão excluídos permanentemente. Seu nível global será recalculado. Conquistas já desbloqueadas serão mantidas.', () => {
        if (commit(next => { next.attributes = next.attributes.filter(a => a.id !== id); })) toast('Atributo excluído', `${attr.name} foi removido da jornada.`);
      }, 'Excluir atributo');
    }
    if (action === 'prev-month') { calendarMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1); renderCalendar(); }
    if (action === 'next-month') { if (!actionButton.disabled) { calendarMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1); renderCalendar(); } }
    if (handleDetailAction(actionButton, action, id)) return;
    if (action === 'export') exportBackup();
    if (action === 'import') $('backup-input').click();
    if (action === 'reset') askConfirm('Apagar toda a sua jornada?', 'Todos os dados e fotos salvos neste navegador serão apagados permanentemente. Exporte um backup antes, se quiser preservá-los.', () => {
      try {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(LEGACY_STORAGE_KEY);
        state = null; activePage = 'personagem'; createAvatar = null;
        onboardingSelection = new Set(['treino', 'estudo', 'leitura']);
        $('create-name').value = '';
        setAvatarPreview($('create-avatar-preview'), null);
        renderAll();
        toast('Nova jornada disponível', 'Seus dados locais foram excluídos.');
      } catch (error) { toast('Não foi possível apagar os dados', 'O armazenamento está indisponível.', 'error'); }
    }, 'Apagar tudo');
  });

  $('create-form').addEventListener('submit', event => {
    event.preventDefault();
    const name = $('create-name').value.trim();
    if (name.length < 2) { $('create-error').textContent = 'Escolha um nome com pelo menos 2 caracteres.'; $('create-name').focus(); return; }
    $('create-error').textContent = '';
    const newState = {
      version: VERSION,
      profile: { name: name.slice(0, 32), avatar: createAvatar, color: COLORS[0], createdAt: localDay() },
      attributes: SUGGESTIONS.filter(s => onboardingSelection.has(s.id)).map(s => createAttributeObject(s.name, s.icon, s.color)),
      achievements: {}, settings: { reduceMotion: false, theme: 'modern' }, meta: { lastVisit: localDay() }
    };
    awardAchievements(newState);
    if (!persist(newState)) { $('create-error').textContent = 'Não foi possível salvar neste navegador. Verifique o espaço e as permissões de armazenamento.'; return; }
    state = newState;
    lastRenderedDay = localDay();
    renderAll();
    toast('Personagem criado!', 'Sua jornada começa no nível zero. Boa aventura!', 'success');
  });

  $('attribute-form').addEventListener('submit', event => {
    event.preventDefault();
    $('attribute-error').textContent = '';
    createNewAttribute($('attribute-name').value, $('attribute-icon').value, attributeColor, $('attribute-kind').value);
  });
  $('profile-form').addEventListener('submit', event => {
    event.preventDefault();
    const name = $('edit-name').value.trim();
    if (name.length < 2) { $('profile-error').textContent = 'Informe pelo menos 2 caracteres.'; return; }
    if (commit(next => { next.profile.name = name.slice(0, 32); next.profile.avatar = editAvatar; next.profile.color = profileColor; })) {
      closeDialog('profile-dialog');
      toast('Perfil atualizado', 'Sua identidade foi salva com sucesso.', 'success');
    }
  });
  $('remove-photo').addEventListener('click', () => {
    editAvatar = null;
    $('edit-photo').value = '';
    setAvatarPreview($('edit-avatar-preview'), null, $('edit-name').value);
  });
  $('create-photo').addEventListener('change', async event => {
    const file = event.target.files[0];
    if (!file) return;
    try { createAvatar = await processPhoto(file); setAvatarPreview($('create-avatar-preview'), createAvatar); }
    catch (error) { toast('Foto não carregada', error.message, 'error'); }
    event.target.value = '';
  });
  $('edit-photo').addEventListener('change', async event => {
    const file = event.target.files[0];
    if (!file) return;
    try { editAvatar = await processPhoto(file); setAvatarPreview($('edit-avatar-preview'), editAvatar, $('edit-name').value); }
    catch (error) { toast('Foto não carregada', error.message, 'error'); }
    event.target.value = '';
  });
  $('calendar-attribute').addEventListener('change', event => { calendarAttributeId = event.target.value; renderCalendar(); });
  $('attribute-kind').addEventListener('change', event => {
    const kind = event.target.value;
    const preset = SUGGESTIONS.find(s => s.id === kind);
    $('attribute-icon').value = preset ? preset.icon : 'i:estrela';
    if (preset) { attributeColor = preset.color; renderColors($('attribute-colors'), attributeColor, 'attribute'); }
  });
  $('detail-content').addEventListener('submit', handleDetailSubmit);
  $('detail-content').addEventListener('change', handleDetailChange);
  $('reduce-motion').addEventListener('change', event => { commit(next => { next.settings.reduceMotion = event.target.checked; }); });
  $('backup-input').addEventListener('change', async event => {
    const file = event.target.files[0];
    await importBackup(file);
    event.target.value = '';
  });
  $('confirm-cancel').addEventListener('click', () => { confirmCallback = null; closeDialog('confirm-dialog'); });
  $('confirm-accept').addEventListener('click', () => {
    const action = confirmCallback;
    confirmCallback = null;
    closeDialog('confirm-dialog');
    if (typeof action === 'function') action();
  });
  $('confirm-dialog').addEventListener('close', () => { confirmCallback = null; });
  $('levelup-close').addEventListener('click', closeLevelUp);
  $('levelup-overlay').addEventListener('click', event => { if (event.target.id === 'levelup-overlay') closeLevelUp(); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape') closeLevelUp(); });
  for (const dialog of document.querySelectorAll('dialog')) {
    dialog.addEventListener('click', event => {
      if (event.target === dialog) closeDialog(dialog.id);
    });
  }
  document.addEventListener('visibilitychange', () => { if (!document.hidden) dailyRefresh(); });
  window.addEventListener('focus', dailyRefresh);
  setInterval(dailyRefresh, 60 * 1000);

  // A escolha visual é independente do progresso e continua salva após backup/reset.
  setColorMode(document.documentElement.dataset.theme === 'light' ? 'light' : 'dark');
  $('theme-toggle').addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
    setColorMode(next);
    try { localStorage.setItem(COLOR_MODE_KEY, next); }
    catch (error) { console.warn('Não foi possível salvar a preferência de tema:', error); }
  });
  createCosmicSky('cosmic-sky', 88, 412876);
  createCosmicSky('cosmic-sky-art', 49, 283741);
  createCosmicSky('cosmic-sky-sidebar', 28, 593271);

  state = loadSaved();
  if (state) {
    const previousDay = state.meta.lastVisit;
    const previousMetrics = previousDay < localDay() ? derive(state, previousDay) : null;
    const currentMetrics = derive(state);
    const newAchievements = awardAchievements(state, currentMetrics);
    if (state.meta.lastVisit !== localDay() || newAchievements) {
      state.meta.lastVisit = localDay();
      persist(state);
    }
    if (previousMetrics && (previousMetrics.globalLevel > currentMetrics.globalLevel || state.attributes.some(a => currentMetrics.byId.get(a.id)?.level < previousMetrics.byId.get(a.id)?.level))) {
      setTimeout(() => toast('Sua jornada foi atualizada', 'Dias de ausência foram contabilizados automaticamente. Você pode retomar hoje.'), 850);
    }
  }
  renderAll();

  // Instalação/offline disponível somente quando servido por HTTPS ou localhost.
  // Arquivos abertos por file:// continuam funcionando, mas sem service worker.
  if ('serviceWorker' in navigator && location.protocol !== 'file:' && window.isSecureContext) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch(error => {
        console.warn('Modo offline não pôde ser habilitado:', error);
      });
    });
  }
})();