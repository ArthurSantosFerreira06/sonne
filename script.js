(() => {
  'use strict';

  const STORAGE_KEY = 'ascensao-rpg-v1';
  const THEME_KEY = 'sonnhe-theme-v1';
  const VERSION = 1;
  const DAY_MS = 86400000;
  const MAX_ATTRIBUTES = 60;
  const COLORS = ['#a855f7', '#e879f9', '#38bdf8', '#34d399', '#fbbf24', '#fb7185', '#f97316', '#818cf8'];
  const SUGGESTIONS = [
    { id: 'treino', name: 'Treino', icon: '💪', color: '#fb7185', desc: 'Exercício físico' },
    { id: 'estudo', name: 'Estudo', icon: '📚', color: '#a855f7', desc: 'Aprendizado' },
    { id: 'trabalho', name: 'Trabalho', icon: '💼', color: '#38bdf8', desc: 'Produtividade' },
    { id: 'leitura', name: 'Leitura', icon: '📖', color: '#fbbf24', desc: 'Leitura diária' },
    { id: 'sono', name: 'Sono', icon: '🌙', color: '#818cf8', desc: 'Rotina de descanso' },
    { id: 'alimentacao', name: 'Alimentação', icon: '🥗', color: '#34d399', desc: 'Boas escolhas' },
    { id: 'meditacao', name: 'Meditação', icon: '🧘', color: '#e879f9', desc: 'Concentração' },
    { id: 'hidratacao', name: 'Hidratação', icon: '💧', color: '#38bdf8', desc: 'Água diariamente' },
    { id: 'organizacao', name: 'Organização', icon: '📋', color: '#f97316', desc: 'Rotina organizada' },
    { id: 'financas', name: 'Finanças', icon: '💰', color: '#fbbf24', desc: 'Saúde financeira' }
  ];
  const ACHIEVEMENTS = [
    { id: 'primeiro-passo', icon: '🏅', name: 'Primeiro Passo', description: 'Concluir uma atividade pela primeira vez.' },
    { id: 'persistente', icon: '🔥', name: 'Persistente', description: 'Manter 7 dias seguidos em um atributo.' },
    { id: 'disciplinado', icon: '⚔️', name: 'Disciplinado', description: 'Alcançar o nível 10 em um atributo.' },
    { id: 'explorador', icon: '📚', name: 'Explorador', description: 'Ativar cinco atributos diferentes.' },
    { id: 'aventureiro-experiente', icon: '👑', name: 'Aventureiro Experiente', description: 'Alcançar o nível global 20.' },
    { id: 'lenda-viva', icon: '💎', name: 'Lenda Viva', description: 'Alcançar o nível global 100.' }
  ];
  const $ = id => document.getElementById(id);
  const PAGE_IDS = ['personagem', 'atributos', 'jornada', 'conquistas', 'configuracoes'];
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
  // Visual separado do cálculo de dias: não interfere na ofensiva ou nos históricos.
  function storedTheme() {
    try { return localStorage.getItem(THEME_KEY) === 'medieval' ? 'medieval' : 'modern'; }
    catch { return 'modern'; }
  }
  function saveTheme(theme) {
    try { localStorage.setItem(THEME_KEY, theme); }
    catch (error) { console.warn('Preferência visual não pôde ser salva:', error); }
  }
  function applyTheme(theme) {
    const medieval = theme === 'medieval';
    document.documentElement.dataset.theme = medieval ? 'medieval' : 'modern';
    const themeColor = document.querySelector('meta[name="theme-color"]');
    if (themeColor) themeColor.content = medieval ? '#172319' : '#10071d';
    document.querySelectorAll('[data-theme-toggle]').forEach(button => {
      button.setAttribute('aria-pressed', String(medieval));
      button.setAttribute('aria-label', medieval ? 'Ativar tema moderno' : 'Ativar tema medieval 8-bit');
      button.title = medieval ? 'Voltar ao visual moderno' : 'Ativar visual medieval 8-bit';
      const label = button.querySelector('[data-theme-action]');
      if (label) label.textContent = medieval ? 'Visual moderno' : 'Medieval 8-bit';
      const sigil = button.querySelector('.theme-toggle-sigil');
      if (sigil) sigil.textContent = medieval ? '✦' : '⚔';
    });
  }
  const nameKey = value => value.trim().toLocaleLowerCase('pt-BR');

  function attributeMetrics(attr, asOf = localDay()) {
    const cutoff = dayIndex(asOf);
    const created = dayIndex(attr.createdAt);
    const empty = { level: 0, total: 0, streak: 0, bestStreak: 0, last: null, last7: 0, last30: 0, firstTen: null, firstSeven: null, peak: 0 };
    if (created > cutoff) return empty;
    const dates = attr.completions.filter(d => d >= attr.createdAt && d <= asOf).slice().sort();
    let level = 0;
    let peak = 0;
    let previousIndex = created - 1;
    let lastCompletionIndex = null;
    let consecutive = 0;
    let bestStreak = 0;
    let firstTen = null;
    let firstSeven = null;
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
      if (consecutive >= 7 && firstSeven === null) firstSeven = d;
      if (idx >= cutoff - 6) last7++;
      if (idx >= cutoff - 29) last30++;
      previousIndex = idx;
      lastCompletionIndex = idx;
    }
    const lastClosedDay = cutoff - 1;
    if (lastClosedDay > previousIndex) level = Math.max(0, level - (lastClosedDay - previousIndex));
    const streak = lastCompletionIndex !== null && lastCompletionIndex >= cutoff - 1 ? consecutive : 0;
    return { level, total: dates.length, streak, bestStreak, last: dates.at(-1) || null, last7, last30, firstTen, firstSeven, peak };
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
    const streakDates = [], levelDates = [];
    for (const attr of data.attributes) {
      const metric = attributeMetrics(attr);
      if (metric.firstSeven) streakDates.push(metric.firstSeven);
      if (metric.firstTen) levelDates.push(metric.firstTen);
    }
    streakDates.sort(); levelDates.sort();
    unlock('persistente', streakDates[0]);
    unlock('disciplinado', levelDates[0]);
    if (data.attributes.length >= 5) unlock('explorador', localDay());
    if (metrics.globalLevel >= 20) unlock('aventureiro-experiente', localDay());
    if (metrics.globalLevel >= 100) unlock('lenda-viva', localDay());
    return changed;
  }

  function normalizeData(input) {
    if (!input || typeof input !== 'object' || Array.isArray(input) || input.version !== VERSION || !input.profile || !Array.isArray(input.attributes)) {
      throw new Error('O arquivo não contém dados válidos do SONN(H)E (versão 1).');
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
      attributes.push({ id, name, icon: String(original.icon || '⚡').slice(0, 12), color: COLORS.includes(original.color) ? original.color : COLORS[0], createdAt: original.createdAt, completions: [...dates].sort() });
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
      settings: { reduceMotion: !!(input.settings && input.settings.reduceMotion), theme: input.settings?.theme === 'medieval' ? 'medieval' : (input.settings?.theme === 'modern' ? 'modern' : storedTheme()) },
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
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return normalizeData(JSON.parse(raw));
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
  function createAttributeObject(name, icon, color) {
    return { id: randomId(), name, icon, color, createdAt: localDay(), completions: [] };
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
      ? `<div class="${className}" style="background-image:url('${avatar}')" role="img" aria-label="Foto de ${escapeHTML(name)}"></div>`
      : `<div class="${className}" role="img" aria-label="Avatar padrão de ${escapeHTML(name)}">${escapeHTML(name.charAt(0).toLocaleUpperCase('pt-BR') || '✦')}</div>`;
  }
  function setAvatarPreview(element, photo, name = '✦') {
    element.style.backgroundImage = photo ? `url('${photo}')` : '';
    element.textContent = photo ? '' : (name.charAt(0).toLocaleUpperCase('pt-BR') || '✦');
  }
  function renderStarterChoices() {
    $('starter-choices').innerHTML = SUGGESTIONS.map(s => `<button type="button" class="starter-option ${onboardingSelection.has(s.id) ? 'selected' : ''}" data-starter="${s.id}" aria-pressed="${onboardingSelection.has(s.id)}"><span class="starter-emoji">${s.icon}</span><span>${escapeHTML(s.name)}</span><span class="starter-check">${onboardingSelection.has(s.id) ? '✓' : ''}</span></button>`).join('');
  }
  function renderColors(element, selected, purpose) {
    element.innerHTML = COLORS.map(color => `<button type="button" class="color-choice ${color === selected ? 'selected' : ''}" style="--choice:${color}" data-color="${color}" data-color-purpose="${purpose}" aria-label="Escolher cor ${color}" aria-pressed="${color === selected}"></button>`).join('');
  }
  function renderPresets() {
    const existing = new Set(state.attributes.map(a => nameKey(a.name)));
    const available = SUGGESTIONS.filter(s => !existing.has(nameKey(s.name)));
    $('available-presets').innerHTML = available.length
      ? available.map(s => `<button type="button" class="preset-button" data-preset="${s.id}"><span>${s.icon}</span>${escapeHTML(s.name)}</button>`).join('')
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
    return `<div class="stat-card"><div class="stat-top"><span class="stat-icon">${symbol}</span><span>${escapeHTML(label)}</span></div><strong class="stat-number">${number}</strong><div class="stat-caption">${escapeHTML(caption)}</div></div>`;
  }
  function renderStats(metrics) {
    $('overview-stats').innerHTML = [
      statHTML('◈', 'Atributos ativos', metrics.activeCount, 'Áreas em desenvolvimento'),
      statHTML('✓', 'Missões concluídas', metrics.total, 'Conclusões registradas'),
      statHTML('🔥', 'Sequência atual', `${metrics.streak}d`, 'Dias seguidos com atividade'),
      statHTML('🏆', 'Conquistas', `${Object.keys(state.achievements).length}/${ACHIEVEMENTS.length}`, 'Medalhas desbloqueadas')
    ].join('');
    $('journey-stats').innerHTML = [
      statHTML('✓', 'Últimos 7 dias', metrics.last7, 'Atividades concluídas'),
      statHTML('◷', 'Últimos 30 dias', metrics.last30, 'Atividades concluídas'),
      statHTML('🔥', 'Sequência global', `${metrics.streak}d`, 'Dias seguidos com alguma atividade'),
      statHTML('✦', 'Total histórico', metrics.total, 'Conclusões registradas')
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
      <div class="attribute-top"><div class="attribute-identity"><div class="attribute-symbol" aria-hidden="true">${escapeHTML(attr.icon)}</div><div><h3 class="attribute-name">${escapeHTML(attr.name)}</h3><div class="attribute-type">HABILIDADE ATIVA</div></div></div>${detailed ? `<div class="attr-actions"><button type="button" class="delete-button" data-action="delete-attribute" data-id="${escapeHTML(attr.id)}" aria-label="Excluir ${escapeHTML(attr.name)}" title="Excluir atributo">${svg('trash')}</button></div>` : ''}</div>
      <div class="attribute-level-row"><div class="attribute-number"><span>NV.</span>${info.level}</div><div class="attribute-streak">${svg('fire')} ${info.streak} ${info.streak === 1 ? 'dia' : 'dias'}</div></div>
      <div class="attribute-progress"><div class="progress-track" role="progressbar" aria-label="Frequência nos últimos 7 dias" aria-valuenow="${ratio}" aria-valuemin="0" aria-valuemax="100"><div class="progress-fill" style="width:${ratio}%"></div></div><div class="progress-labels"><span>Ritmo dos últimos 7 dias</span><span>${info.last7}/7 dias</span></div></div>
      <div class="card-actions"><button type="button" class="complete-btn ${completed ? 'completed' : ''}" data-action="complete" data-id="${escapeHTML(attr.id)}" ${completed || unavailable ? 'disabled' : ''}>${svg('check')} ${unavailable ? 'Disponível a partir de ' + prettyDate(attr.createdAt) : completed ? 'Concluído hoje' : 'Concluir atividade de hoje'}</button></div>
      <div class="attribute-meta">${detailed ? `<button type="button" class="text-link" data-action="attribute-history" data-id="${escapeHTML(attr.id)}">${info.total} conclusões · Maior sequência: ${info.bestStreak}d · Ver histórico ${svg('arrow')}</button><span class="attribute-last">Última conclusão: ${info.last ? prettyDate(info.last) : 'nenhuma'}</span>` : `${info.total} conclusões · Maior sequência: ${info.bestStreak}d`}</div>
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
    return `<div class="activity-row"><div class="activity-bullet">${escapeHTML(activity.attr.icon)}</div><div class="activity-text"><strong>${escapeHTML(activity.attr.name)} concluído</strong><small>${prettyDate(activity.date, { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}</small></div><span class="activity-plus">+1</span></div>`;
  }
  function renderHistory(metrics) {
    $('dashboard-recent').innerHTML = metrics.activities.length ? metrics.activities.slice(0, 4).map(activityHTML).join('') : '<p class="muted">Ainda não há conclusões. Complete sua primeira atividade e ela aparecerá aqui.</p>';
    $('journey-history').innerHTML = metrics.activities.length ? metrics.activities.slice(0, 80).map(activityHTML).join('') : '<p class="muted">Seu histórico aparecerá depois da primeira conclusão.</p>';
  }
  function renderCalendar() {
    const select = $('calendar-attribute');
    if (!state.attributes.some(a => a.id === calendarAttributeId)) calendarAttributeId = state.attributes[0]?.id || null;
    select.innerHTML = state.attributes.length
      ? state.attributes.map(a => `<option value="${escapeHTML(a.id)}">${escapeHTML(a.icon)} ${escapeHTML(a.name)}</option>`).join('')
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
      return `<article class="achievement-card ${date ? '' : 'locked'}"><div class="achievement-icon" aria-hidden="true">${a.icon}</div><div class="achievement-info"><h3>${a.name}</h3><p>${a.description}</p><span class="status-pill ${date ? '' : 'locked'}">${date ? `✦ Desbloqueada em ${prettyDate(date)}` : '🔒 Bloqueada'}</span></div></article>`;
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
      const isActive = el.dataset.page === page;
      if (el.matches('.nav-link,.mobile-nav-link')) {
        el.classList.toggle('active', isActive);
        if (isActive) el.setAttribute('aria-current', 'page');
        else el.removeAttribute('aria-current');
      }
    });
    if (scroll) window.scrollTo({ top: 0, behavior: state?.settings.reduceMotion ? 'instant' : 'smooth' });
  }
  function renderAll() {
    if (!state) { applyTheme(storedTheme()); $('app').hidden = true; $('onboarding').hidden = false; renderStarterChoices(); return; }
    $('onboarding').hidden = true;
    $('app').hidden = false;
    applyTheme(state.settings.theme);
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
  function createNewAttribute(name, icon, color) {
    if (state.attributes.length >= MAX_ATTRIBUTES) { toast('Limite de atributos', `É possível acompanhar até ${MAX_ATTRIBUTES} habilidades.`, 'error'); return false; }
    name = String(name || '').trim().slice(0, 30);
    icon = String(icon || '⚡').trim().slice(0, 12) || '⚡';
    if (!name) { $('attribute-error').textContent = 'Informe um nome para o atributo.'; return false; }
    if (state.attributes.some(attr => nameKey(attr.name) === nameKey(name))) { $('attribute-error').textContent = 'Você já acompanha um atributo com esse nome.'; return false; }
    const success = commit(next => { next.attributes.push(createAttributeObject(name, icon, COLORS.includes(color) ? color : COLORS[0])); });
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
    $('attribute-icon').value = '⚡';
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
    link.download = `sonnhe-backup-${localDay()}.json`;
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
        saveTheme(next.settings.theme);
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
    const themeButton = event.target.closest('[data-theme-toggle]');
    if (themeButton) {
      const current = document.documentElement.dataset.theme;
      const nextTheme = current === 'medieval' ? 'modern' : 'medieval';
      if (state && !commit(next => { next.settings.theme = nextTheme; })) return;
      saveTheme(nextTheme);
      applyTheme(nextTheme);
      return;
    }
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
    if (action === 'export') exportBackup();
    if (action === 'import') $('backup-input').click();
    if (action === 'reset') askConfirm('Apagar toda a sua jornada?', 'Todos os dados e fotos salvos neste navegador serão apagados permanentemente. Exporte um backup antes, se quiser preservá-los.', () => {
      try {
        localStorage.removeItem(STORAGE_KEY);
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
      achievements: {}, settings: { reduceMotion: false, theme: storedTheme() }, meta: { lastVisit: localDay() }
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
    createNewAttribute($('attribute-name').value, $('attribute-icon').value, attributeColor);
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