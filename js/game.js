// ── ESTADO ────────────────────────────────────────────
let state = {
  mode: null,
  rolesFalsos: false,
  players: [],
  alive: [],
  dead: [],
  assignments: [],
  round: 0,
  phase: 'setup',
  currentRoleIndex: 0,

  nightOrder: [],
  nightIndex: 0,
  nightVictim: null,
  nightProtected: null,
  secuazSuggestion: null,
  asinoPicked: false,

  voteOrder: [],
  voteIndex: 0,
  votes: {},
  mediumPlayer: null,
  mediumUsed: false,
  cobardeActive: null,
  testigoActive: null,
  sacrificioActive: null,
  mediumActive: null,
  pistasUsadas: [],
};

let playerData = [];
let timerInterval = null;

// ── PANTALLAS ─────────────────────────────────────────
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  window.scrollTo(0, 0);
}

// ── MODO DE JUEGO ─────────────────────────────────────
function selectMode(mode) {
  state.mode = mode;
  playerData = [{ name: '', age: '', gender: '' }];
  saveState();
  renderPlayers();
  showScreen('screen-setup');
}

// ── SETUP ─────────────────────────────────────────────
function renderPlayers() {
  const list = document.getElementById('playerList');
  const count = playerData.length;
  const mode = state.mode;

  while (list.children.length < count) {
    const i = list.children.length;
    const row = document.createElement('div');
    row.className = 'player-row';
    row.dataset.index = i;
    row.innerHTML = `
      <span class="player-num">${String(i + 1).padStart(2, '0')}</span>
      <div class="player-fields">
        <input class="vm-input" type="text" placeholder="Nombre..." maxlength="20" data-field="name" data-i="${i}" />
        <div class="player-sub">
          <input class="vm-input vm-input-sm" type="number" placeholder="Edad" min="1" max="99" data-field="age" data-i="${i}" />
          <select class="vm-select" data-field="gender" data-i="${i}">
            <option value="">Género</option>
            <option value="M">M</option>
            <option value="F">F</option>
            <option value="X">X</option>
          </select>
          <button class="btn-remove" data-remove="${i}">✕</button>
        </div>
      </div>
    `;
    list.appendChild(row);
  }

  while (list.children.length > count) list.removeChild(list.lastChild);

  Array.from(list.children).forEach((row, i) => {
    row.querySelector('.player-num').textContent = String(i + 1).padStart(2, '0');
    row.dataset.index = i;
    const nameInput = row.querySelector('[data-field="name"]');
    const ageInput = row.querySelector('[data-field="age"]');
    const genderSelect = row.querySelector('[data-field="gender"]');
    const removeBtn = row.querySelector('[data-remove]');
    const minPlayers = mode === 'solo' ? 5 : 7;
    if (document.activeElement !== nameInput) nameInput.value = playerData[i].name;
    if (document.activeElement !== ageInput) ageInput.value = playerData[i].age;
    genderSelect.value = playerData[i].gender;
    nameInput.dataset.i = i;
    ageInput.dataset.i = i;
    genderSelect.dataset.i = i;
    removeBtn.dataset.remove = i;
    removeBtn.style.display = count > minPlayers ? 'block' : 'none';
  });

  const toggle = document.getElementById('toggleRolesFalsos');
  if (toggle) toggle.checked = state.rolesFalsos;

  updateCounter();
}

function updateCounter() {
  const mode = state.mode;
  const minPlayers = mode === 'solo' ? 5 : 7;
  const maxPlayers = mode === 'solo' ? 6 : 12;

  const filled = playerData.filter(p => p.name.trim() !== '' && p.age !== '' && p.gender !== '').length;
  document.getElementById('count').textContent = filled;
  document.getElementById('addBtn').style.display = playerData.length >= maxPlayers ? 'none' : 'block';

  const hasDupes = hasDuplicates();
  const allFilled = playerData.every(p => p.name.trim() !== '' && p.age !== '' && p.gender !== '');
  const valid = allFilled && playerData.length >= minPlayers && !hasDupes;
  document.getElementById('startBtn').disabled = !valid;

  const rangeText = mode === 'solo' ? 'Mín. 5 — Máx. 6' : 'Mín. 7 — Máx. 12';
  document.getElementById('playerRangeText').textContent = rangeText;

  let warn = '';
  if (!allFilled) warn = 'Completá nombre, edad y género de cada jugador.';
  else if (hasDupes) warn = 'Hay nombres repetidos.';
  else if (playerData.length < minPlayers) warn = `Necesitás al menos ${minPlayers} jugadores.`;
  document.getElementById('warning').textContent = warn;
}

function toggleRolesFalsos() {
  state.rolesFalsos = document.getElementById('toggleRolesFalsos').checked;
  saveState();
}

function hasDuplicates() {
  const names = playerData.map(p => p.name.trim().toLowerCase()).filter(p => p !== '');
  return new Set(names).size !== names.length;
}

function addPlayer() {
  const maxPlayers = state.mode === 'solo' ? 6 : 12;
  if (playerData.length < maxPlayers) {
    playerData.push({ name: '', age: '', gender: '' });
    renderPlayers();
  }
}

function removePlayer(i) {
  const minPlayers = state.mode === 'solo' ? 5 : 7;
  if (playerData.length > minPlayers) {
    playerData.splice(i, 1);
    renderPlayers();
  }
}

document.getElementById('playerList').addEventListener('input', e => {
  const el = e.target;
  const i = parseInt(el.dataset.i);
  if (isNaN(i)) return;
  if (el.dataset.field === 'name') playerData[i].name = el.value;
  if (el.dataset.field === 'age') playerData[i].age = el.value;
  updateCounter();
});

document.getElementById('playerList').addEventListener('change', e => {
  const el = e.target;
  const i = parseInt(el.dataset.i);
  if (isNaN(i)) return;
  if (el.dataset.field === 'gender') playerData[i].gender = el.value;
  updateCounter();
});

document.getElementById('playerList').addEventListener('click', e => {
  const btn = e.target.closest('[data-remove]');
  if (btn) removePlayer(parseInt(btn.dataset.remove));
});

// ── ASIGNACIÓN DE ROLES ───────────────────────────────
function assignRoles(alivePlayers) {
  const shuffled = [...alivePlayers].sort(() => Math.random() - 0.5);
  const asesino = shuffled[0];
  const result = [];

  let sobrevivientes;
  if (state.mode === 'solo') {
    sobrevivientes = shuffled.slice(1);
    result.push({ name: asesino, role: 'asesino', rolFalso: getRolFalso('asesino'), complice: null });
  } else {
    const secuaz = shuffled[1];
    sobrevivientes = shuffled.slice(2);
    result.push({ name: asesino, role: 'asesino', rolFalso: getRolFalso('asesino'), complice: secuaz });
    result.push({ name: secuaz, role: 'secuaz', rolFalso: getRolFalso('secuaz'), complice: asesino });
  }

  const especiales = state.round <= 1
    ? ['testigo', 'cobarde', 'sacrificio']
    : ['testigo', 'cobarde', 'sacrificio', 'medium'];

  const probRoles = { testigo: 0.5, cobarde: 0.5, sacrificio: 0.5, medium: 0.33 };
  let rolesPool = [];
  especiales.forEach(r => { if (Math.random() < probRoles[r]) rolesPool.push(r); });
  while (rolesPool.length < sobrevivientes.length) rolesPool.push('extra');
  rolesPool = rolesPool.slice(0, sobrevivientes.length).sort(() => Math.random() - 0.5);

  sobrevivientes.forEach((name, i) => result.push({ name, role: rolesPool[i] }));
  return result.sort(() => Math.random() - 0.5);
}

function goToRoles() {
  const names = playerData.map(p => p.name.trim());
  state.players = names;
  state.alive = [...names];
  state.dead = [];
  state.assignments = assignRoles(names);
  state.round = 1;
  state.phase = 'roles';
  state.currentRoleIndex = 0;
  trackActiveRoles();
  saveState();
  showNextRoleScreen();
}

function trackActiveRoles() {
  state.cobardeActive = null;
  state.testigoActive = null;
  state.sacrificioActive = null;
  state.mediumActive = null;
  state.assignments.forEach(a => {
    if (a.role === 'cobarde') state.cobardeActive = a.name;
    if (a.role === 'testigo') state.testigoActive = a.name;
    if (a.role === 'sacrificio') state.sacrificioActive = a.name;
    if (a.role === 'medium') state.mediumActive = a.name;
  });
}

function showNextRoleScreen() {
  const current = state.assignments[state.currentRoleIndex];
  document.getElementById('rolePlayerName').textContent = current.name.toUpperCase();
  showScreen('screen-roles');
}

function revealRole() {
  const current = state.assignments[state.currentRoleIndex];
  const rol = ROLES[current.role];
  document.getElementById('revealRoleName').textContent = rol.nombre.toUpperCase();
  document.getElementById('revealRoleDesc').textContent = rol.desc;
  const ve = document.getElementById('villainExtra');
  if (rol.villano && current.complice) {
    ve.style.display = 'block';
    document.getElementById('compliceNombre').textContent = current.complice.toUpperCase();
  } else {
    ve.style.display = 'none';
  }
  showScreen('screen-reveal');
}

function nextRolePlayer() {
  state.currentRoleIndex++;
  saveState();
  if (state.currentRoleIndex >= state.assignments.length) { startNight(); return; }
  showNextRoleScreen();
}

// ── NOCHE ─────────────────────────────────────────────
function startNight() {
  state.phase = 'night';
  state.nightOrder = [...state.alive].sort(() => Math.random() - 0.5);
  state.nightIndex = 0;
  state.nightVictim = null;
  state.nightProtected = null;
  state.secuazSuggestion = null;
  state.asinoPicked = false;
  saveState();
  showNightPass();
}

function showNightPass() {
  const name = state.nightOrder[state.nightIndex];
  document.getElementById('nightPlayerName').textContent = name.toUpperCase();
  document.getElementById('nightRoundNum').textContent = state.round;
  showScreen('screen-night-pass');
}

function revealNightAction() {
  const name = state.nightOrder[state.nightIndex];
  const assignment = state.assignments.find(a => a.name === name);
  const role = assignment ? assignment.role : 'extra';

  document.getElementById('nightPlayerPicker').style.display = 'none';
  document.getElementById('nightContinueBtn').style.display = 'none';

  let title = '';
  let desc = '';

  if (role === 'asesino') {
    title = 'ELEGÍ TU VÍCTIMA';
    desc = state.mode === 'complice'
      ? (state.secuazSuggestion ? `El Secuaz sugiere: ${state.secuazSuggestion}` : 'El Secuaz aún no dejó sugerencia.')
      : 'Elegí a quién eliminar esta noche.';
    showNightPicker(state.alive.filter(p => p !== name), chosen => {
      state.nightVictim = chosen;
      state.asinoPicked = true;
      saveState();
    });
  } else if (role === 'secuaz') {
    if (state.asinoPicked) {
      title = 'EL ASESINO ACTUÓ';
      desc = state.nightVictim ? `Esta noche eligió a: ${state.nightVictim}` : 'El Asesino aún no eligió.';
    } else {
      title = 'ROLES ESTA RONDA';
      const otrosRoles = state.assignments.filter(a => a.role !== 'asesino' && a.name !== name);
      desc = 'Dejá una sugerencia al Asesino si querés.\n\n' +
        otrosRoles.map(a => `${a.name}: ${ROLES[a.role].nombre}`).join('\n');
      showNightPicker(state.alive.filter(p => p !== name && p !== assignment.complice), chosen => {
        state.secuazSuggestion = chosen;
        saveState();
      });
    }
  } else if (role === 'cobarde') {
    title = 'HUISTE';
    desc = 'Esta noche estás a salvo. Si el Asesino te elige, nadie muere. Tampoco podés votar mañana.';
  } else if (role === 'testigo') {
    title = 'EL TESTIGO';
    desc = generarPista();
  } else if (role === 'sacrificio') {
    title = 'ELEGÍ A QUIÉN PROTEGER';
    desc = 'Si el Asesino elige a esa persona esta noche, morís vos en su lugar.';
    showNightPicker(state.alive.filter(p => p !== name), chosen => {
      state.nightProtected = chosen;
      saveState();
    });
  } else if (role === 'medium') {
    title = 'EL MÉDIUM';
    desc = state.dead.length === 0
      ? 'Todavía no hay muertos. Tu poder no tiene efecto esta ronda.'
      : 'Mañana podrás invocar el voto de un eliminado. El teléfono te indicará cuándo.';
  } else {
    title = 'DESCANSÁS';
    desc = 'Esta noche no tenés acción. Villa Matanza duerme.';
  }

  const rolFalsoEl = document.getElementById('nightRolFalso');
  if (state.rolesFalsos && (role === 'asesino' || role === 'secuaz') && assignment.rolFalso) {
    rolFalsoEl.style.display = 'block';
    rolFalsoEl.textContent = `Si te preguntan tu rol, decí: ${ROLES[assignment.rolFalso].nombre}`;
  } else {
    rolFalsoEl.style.display = 'none';
  }

  document.getElementById('nightActionTitle').textContent = title;
  document.getElementById('nightActionDesc').textContent = desc;
  showScreen('screen-night-action');
  startTimer(10, () => { document.getElementById('nightContinueBtn').style.display = 'block'; });
}

function generarPista() {
  const villains = state.assignments.filter(a => a.role === 'asesino' || a.role === 'secuaz');
  const inocentes = state.assignments.filter(a => a.role !== 'asesino' && a.role !== 'secuaz');
  const consonantes = 'bcdfghjklmnñpqrstvwxyz';
  if (!state.pistasUsadas) state.pistasUsadas = [];
  const candidatas = [];

  villains.forEach(v => {
    const pd = playerData.find(p => p.name.trim() === v.name);
    if (pd && pd.age) {
      const pista = `Uno de los villanos tiene ${pd.age} años.`;
      if (!state.pistasUsadas.includes(pista)) candidatas.push(pista);
    }
  });

  inocentes.forEach(v => {
    const pista = `${v.name} no es el Asesino.`;
    if (!state.pistasUsadas.includes(pista)) candidatas.push(pista);
  });

  villains.forEach(v => {
    const pd = playerData.find(p => p.name.trim() === v.name);
    if (pd && pd.gender) {
      const genText = pd.gender === 'M' ? 'masculino' : pd.gender === 'F' ? 'femenino' : 'no binario';
      const pista = `Uno de los villanos es de género ${genText}.`;
      if (!state.pistasUsadas.includes(pista)) candidatas.push(pista);
    }
  });

  villains.forEach(v => {
    const nombre = v.name.toLowerCase();
    const consonantesEnNombre = [...new Set(nombre.split('').filter(c => consonantes.includes(c)))];
    consonantesEnNombre.forEach(c => {
      const pista = `El nombre de uno de los villanos contiene la letra "${c.toUpperCase()}".`;
      if (!state.pistasUsadas.includes(pista)) candidatas.push(pista);
    });
  });

  if (villains.length === 2) {
    const pd0 = playerData.find(p => p.name.trim() === villains[0].name);
    const pd1 = playerData.find(p => p.name.trim() === villains[1].name);
    if (pd0 && pd1 && pd0.gender && pd1.gender) {
      const pista = pd0.gender === pd1.gender
        ? 'Los dos villanos son del mismo género.'
        : 'Los dos villanos son de géneros distintos.';
      if (!state.pistasUsadas.includes(pista)) candidatas.push(pista);
    }
  }

  if (candidatas.length === 0) return 'No quedan pistas disponibles. Confiá en tu intuición.';
  const elegida = candidatas[Math.floor(Math.random() * candidatas.length)];
  state.pistasUsadas.push(elegida);
  saveState();
  return elegida;
}

function showNightPicker(options, onSelect) {
  const wrap = document.getElementById('nightPlayerPicker');
  const list = document.getElementById('nightPickerList');
  wrap.style.display = 'block';
  list.innerHTML = '';
  options.forEach(name => {
    const btn = document.createElement('button');
    btn.className = 'picker-btn';
    btn.textContent = name;
    btn.onclick = () => {
      document.querySelectorAll('#nightPickerList .picker-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      onSelect(name);
    };
    list.appendChild(btn);
  });
}

function nextNightPlayer() {
  clearTimer();
  state.nightIndex++;
  saveState();
  if (state.nightIndex >= state.nightOrder.length) { resolveNight(); return; }
  showNightPass();
}

function resolveNight() {
  let victim = state.nightVictim;
  let sacrificioDied = false;

  if (victim && state.nightProtected === victim) {
    const sacrificio = state.assignments.find(a => a.role === 'sacrificio' && state.alive.includes(a.name));
    if (sacrificio) { victim = sacrificio.name; sacrificioDied = true; }
  }

  if (victim && victim === state.cobardeActive) victim = null;

  state.nightVictim = victim;
  if (victim) { state.alive = state.alive.filter(p => p !== victim); state.dead.push(victim); }
  saveState();
  showDayAnnounce(victim, sacrificioDied);
}

// ── DÍA ───────────────────────────────────────────────
function showDayAnnounce(victim, sacrificioDied) {
  state.phase = 'day';
  const content = document.getElementById('announceContent');
  if (!victim) {
    content.innerHTML = `<h2 class="nombre-jugador" style="color:#e8e8e8;font-size:28px;margin-bottom:0.5rem">Nadie murió esta noche</h2><p class="rol-desc">Villa Matanza amaneció en paz... por ahora.</p>`;
  } else {
    content.innerHTML = `
      <p class="rol-desc" style="margin-bottom:0.5rem">${sacrificioDied ? 'El Sacrificio murió protegiendo a alguien.' : 'Durante la noche fue eliminado:'}</p>
      <h2 class="rol-nombre" style="margin-bottom:0.5rem">${victim.toUpperCase()}</h2>
      <p class="rol-desc">${getRolPublico(victim)}</p>`;
  }
  const gameOver = checkWinCondition();
  if (gameOver) return;
  saveState();
  showScreen('screen-day-announce');
}

function getRolPublico(name) {
  const a = state.assignments.find(x => x.name === name);
  return a ? ROLES[a.role].nombre : '';
}

function startDebate() {
  document.getElementById('debateRoundNum').textContent = state.round;
  const alive = document.getElementById('debateAlivePlayers');
  alive.innerHTML = state.alive.map(p => `<span class="alive-chip">${p}</span>`).join('');
  showScreen('screen-debate');
}

// ── VOTACIÓN ──────────────────────────────────────────
function startVoting() {
  state.phase = 'vote';
  state.votes = {};
  state.alive.forEach(p => state.votes[p] = 0);
  let voters = state.alive.filter(p => p !== state.cobardeActive);
  state.mediumPlayer = null;
  if (state.mediumActive && state.alive.includes(state.mediumActive) && state.dead.length > 0 && !state.mediumUsed) {
    state.mediumPlayer = state.dead[Math.floor(Math.random() * state.dead.length)];
    state.mediumUsed = true;
  }
  state.voteOrder = voters.sort(() => Math.random() - 0.5);
  state.voteIndex = 0;
  saveState();
  showVotePass();
}

function showVotePass() {
  const isMediumTurn = state.mediumPlayer && state.voteIndex >= state.voteOrder.length;
  if (!isMediumTurn && state.voteIndex >= state.voteOrder.length) { resolveVote(); return; }
  const name = isMediumTurn ? state.mediumPlayer : state.voteOrder[state.voteIndex];
  document.getElementById('votePlayerName').textContent = name.toUpperCase();
  document.getElementById('voteRoundNum').textContent = state.round;
  const instr = document.querySelector('#screen-vote-pass .instruccion');
  instr.textContent = isMediumTurn ? 'El Médium invocó tu voto.\nVotá en nombre de los muertos.' : 'Votá en privado.\nNo muestres tu pantalla.';
  showScreen('screen-vote-pass');
}

function revealVote() {
  const isMediumTurn = state.mediumPlayer && state.voteIndex >= state.voteOrder.length;
  const currentVoter = isMediumTurn ? state.mediumPlayer : state.voteOrder[state.voteIndex];
  document.getElementById('voteActionLabel').textContent = isMediumTurn ? `Voto de ${state.mediumPlayer} (invocado)` : '¿A quién eliminás?';
  const list = document.getElementById('votePickerList');
  list.innerHTML = '';
  const options = state.alive.filter(p => p !== currentVoter);
  options.forEach(name => {
    const btn = document.createElement('button');
    btn.className = 'picker-btn';
    btn.textContent = name;
    btn.onclick = () => {
      state.votes[name] = (state.votes[name] || 0) + 1;
      state.voteIndex++;
      saveState();
      if (isMediumTurn) { resolveVote(); return; }
      showVotePass();
    };
    list.appendChild(btn);
  });
  showScreen('screen-vote-action');
}

function resolveVote() {
  let maxVotes = 0, eliminated = null, tie = false;
  Object.entries(state.votes).forEach(([name, count]) => {
    if (count > maxVotes) { maxVotes = count; eliminated = name; tie = false; }
    else if (count === maxVotes && count > 0) tie = true;
  });

  const content = document.getElementById('voteResultContent');
  const btn = document.getElementById('voteResultBtn');

  if (tie || !eliminated || maxVotes === 0) {
    content.innerHTML = `<h2 class="nombre-jugador" style="color:#e8e8e8;font-size:28px;margin-bottom:0.5rem">Empate</h2><p class="rol-desc">El pueblo no se puso de acuerdo. Nadie es eliminado.</p>`;
  } else {
    state.alive = state.alive.filter(p => p !== eliminated);
    state.dead.push(eliminated);
    content.innerHTML = `
      <p class="rol-desc" style="margin-bottom:0.5rem">El pueblo eligió:</p>
      <h2 class="rol-nombre" style="margin-bottom:0.5rem">${eliminated.toUpperCase()}</h2>
      <p class="rol-desc">${getRolPublico(eliminated)}</p>`;
    const gameOver = checkWinConditionSilent();
    if (gameOver) { showGameOver(gameOver); return; }
  }

  btn.textContent = 'SIGUIENTE RONDA';
  saveState();
  showScreen('screen-vote-result');
}

function afterVoteResult() {
  state.round++;
  reassignRoles();
  startNight();
}

function reassignRoles() {
  state.assignments = assignRoles(state.alive);
  state.mediumUsed = false;
  trackActiveRoles();
}

// ── CONDICIÓN DE VICTORIA ─────────────────────────────
function checkWinCondition() {
  const result = checkWinConditionSilent();
  if (result) { showGameOver(result); return true; }
  return false;
}

function checkWinConditionSilent() {
  const aliveVillains = state.assignments.filter(a =>
    (a.role === 'asesino' || a.role === 'secuaz') && state.alive.includes(a.name));
  const asesinoDead = !state.assignments.find(a => a.role === 'asesino' && state.alive.includes(a.name));
  if (asesinoDead) return 'survivors';
  const survivors = state.alive.filter(p => !aliveVillains.find(v => v.name === p));
  if (aliveVillains.length >= survivors.length) return 'villains';
  return null;
}

function showGameOver(result) {
  state.phase = 'gameover';
  saveState();
  const title = document.getElementById('gameoverTitle');
  const desc = document.getElementById('gameoverDesc');
  if (result === 'survivors') {
    title.textContent = 'VILLA MATANZA FUE SALVADA';
    title.style.color = '#e8e8e8';
    desc.textContent = 'El asesino fue descubierto. La pesadilla terminó.';
  } else {
    title.textContent = 'EL ASESINO GANÓ';
    title.style.color = '#8b0000';
    desc.textContent = 'Villa Matanza cayó en la oscuridad.';
  }
  document.getElementById('gameoverRoles').innerHTML = state.assignments.map(a => {
    const isVillain = a.role === 'asesino' || a.role === 'secuaz';
    return `<div class="gameover-role-row"><span>${a.name}</span><span class="${isVillain ? 'villain-tag' : ''}">${ROLES[a.role].nombre}</span></div>`;
  }).join('');
  showScreen('screen-gameover');
}

// ── TIMER ─────────────────────────────────────────────
function startTimer(seconds, onComplete) {
  clearTimer();
  let remaining = seconds;
  const wrap = document.getElementById('timerWrap');
  wrap.innerHTML = `<div class="timer-bar-bg"><div class="timer-bar" id="timerBar" style="width:100%"></div></div><p class="timer-text" id="timerText">${remaining}</p>`;
  timerInterval = setInterval(() => {
    remaining--;
    const b = document.getElementById('timerBar');
    const t = document.getElementById('timerText');
    if (b) b.style.width = `${(remaining / seconds) * 100}%`;
    if (t) t.textContent = remaining;
    if (remaining <= 0) { clearTimer(); onComplete(); }
  }, 1000);
}

function clearTimer() {
  if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
}

// ── PERSISTENCIA ──────────────────────────────────────
function saveState() {
  localStorage.setItem('vm_state', JSON.stringify(state));
  localStorage.setItem('vm_playerData', JSON.stringify(playerData));
}

function loadState() {
  if (new URLSearchParams(window.location.search).get('from') === 'instrucciones') {
    history.replaceState(null, '', window.location.pathname);
    return;
  }

  const savedPD = localStorage.getItem('vm_playerData');
  const savedState = localStorage.getItem('vm_state');
  if (savedPD) playerData = JSON.parse(savedPD);
  else playerData = [{ name: '', age: '', gender: '' }];

  if (savedState) {
    state = JSON.parse(savedState);
    switch (state.phase) {
      case 'setup': showScreen('screen-mode'); break;
      case 'setup': showScreen('screen-mode'); break;
      case 'roles': renderPlayers(); showNextRoleScreen(); break;
      case 'night': renderPlayers(); showNightPass(); break;
      case 'day': renderPlayers(); showScreen('screen-debate'); break;
      case 'vote': renderPlayers(); showVotePass(); break;
      case 'gameover': showScreen('screen-gameover'); break;
      default: showScreen('screen-mode');
    }
    return;
  }

  showScreen('screen-mode');
}

function resetGame() {
  localStorage.removeItem('vm_state');
  localStorage.removeItem('vm_playerData');
  playerData = [{ name: '', age: '', gender: '' }];
  state = {
    mode: null, rolesFalsos: false, players: [], alive: [], dead: [], assignments: [],
    round: 0, phase: 'setup', currentRoleIndex: 0,
    nightOrder: [], nightIndex: 0, nightVictim: null, nightProtected: null,
    secuazSuggestion: null, asinoPicked: false,
    voteOrder: [], voteIndex: 0, votes: {}, mediumPlayer: null, mediumUsed: false,
    cobardeActive: null, testigoActive: null, sacrificioActive: null, mediumActive: null, pistasUsadas: []
  };
  showScreen('screen-mode');
}

// ── INICIO ────────────────────────────────────────────
loadState();
