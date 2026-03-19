// ── ESTADO INICIAL ────────────────────────────────────────────
const initialState = {
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
  asesinoPicked: false,
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

let state = JSON.parse(JSON.stringify(initialState));
let playerData = [];
let timerInterval = null;

// ── PANTALLAS ─────────────────────────────────────────
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => {
      s.classList.remove('active');
      s.style.display = 'none';
  });
  const activeScreen = document.getElementById(id);
  if (activeScreen) {
      activeScreen.style.display = 'block';
      setTimeout(() => activeScreen.classList.add('active'), 10);
  }
  window.scrollTo(0, 0);
}

// ── MODO DE JUEGO ─────────────────────────────────────
function selectMode(mode) {
  state.mode = mode;
  state.phase = 'setup';
  playerData = [{ name: '', age: '', gender: '' }];
  saveState();
  renderPlayers();
  showScreen('screen-setup');
}

// ── SETUP ─────────────────────────────────────────────
function renderPlayers() {
  const list = document.getElementById('playerList');
  if (!list) return;
  const count = playerData.length;
  const mode = state.mode;

  list.innerHTML = ''; 

  playerData.forEach((player, i) => {
    const minPlayers = mode === 'solo' ? 5 : 7;
    const row = document.createElement('div');
    row.className = 'player-row';
    row.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <span class="player-num">JUGADOR ${String(i + 1).padStart(2, '0')}</span>
        ${count > minPlayers ? `<button class="btn-remove" onclick="removePlayer(${i})">✕</button>` : ''}
      </div>
      <div class="player-fields">
        <input class="vm-input" type="text" placeholder="Nombre..." maxlength="20" 
               value="${player.name || ''}" oninput="updatePlayerData(${i}, 'name', this.value)" />
        <div class="player-sub">
          <input class="vm-input" type="number" placeholder="Edad" style="flex:1"
                 value="${player.age || ''}" oninput="updatePlayerData(${i}, 'age', this.value)" />
          <select class="vm-select" style="flex:1" onchange="updatePlayerData(${i}, 'gender', this.value)">
            <option value="">Género</option>
            <option value="M" ${player.gender === 'M' ? 'selected' : ''}>M</option>
            <option value="F" ${player.gender === 'F' ? 'selected' : ''}>F</option>
            <option value="X" ${player.gender === 'X' ? 'selected' : ''}>X</option>
          </select>
        </div>
      </div>
    `;
    list.appendChild(row);
  });

  const toggle = document.getElementById('toggleRolesFalsos');
  if (toggle) toggle.checked = state.rolesFalsos;

  updateCounter();
}

function updatePlayerData(index, field, value) {
    playerData[index][field] = value;
    updateCounter();
    saveState();
}

function updateCounter() {
  const mode = state.mode;
  const minPlayers = mode === 'solo' ? 5 : 7;
  const maxPlayers = mode === 'solo' ? 6 : 12;

  const filled = playerData.filter(p => p.name && p.name.trim() !== '' && p.age !== '' && p.gender !== '').length;
  const countEl = document.getElementById('count');
  const addBtn = document.getElementById('addBtn');
  const startBtn = document.getElementById('startBtn');
  const rangeTextEl = document.getElementById('playerRangeText');
  const warningEl = document.getElementById('warning');

  if (countEl) countEl.textContent = filled;
  if (addBtn) addBtn.style.display = playerData.length >= maxPlayers ? 'none' : 'block';

  const hasDupes = hasDuplicates();
  const allFilled = playerData.every(p => p.name && p.name.trim() !== '' && p.age !== '' && p.gender !== '');
  const valid = allFilled && playerData.length >= minPlayers && !hasDupes;
  
  if (startBtn) startBtn.disabled = !valid;
  if (rangeTextEl) rangeTextEl.textContent = mode === 'solo' ? 'Mín. 5 — Máx. 6' : 'Mín. 7 — Máx. 12';

  if (warningEl) {
    let warn = '';
    if (!allFilled) warn = 'Completá nombre, edad y género de cada jugador.';
    else if (hasDupes) warn = 'Hay nombres repetidos.';
    else if (playerData.length < minPlayers) warn = `Necesitás al menos ${minPlayers} jugadores.`;
    warningEl.textContent = warn;
  }
}

function toggleRolesFalsos() {
  state.rolesFalsos = document.getElementById('toggleRolesFalsos').checked;
  saveState();
}

function hasDuplicates() {
  const names = playerData.map(p => (p.name || '').trim().toLowerCase()).filter(p => p !== '');
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

// Event Listeners 
document.addEventListener('input', e => {
  if (e.target.dataset.field) {
    const i = parseInt(e.target.dataset.i);
    if (isNaN(i)) return;
    if (e.target.dataset.field === 'name') playerData[i].name = e.target.value;
    if (e.target.dataset.field === 'age') playerData[i].age = e.target.value;
    updateCounter();
    saveState();
  }
});

document.addEventListener('change', e => {
  if (e.target.dataset.field === 'gender') {
    const i = parseInt(e.target.dataset.i);
    if (isNaN(i)) return;
    playerData[i].gender = e.target.value;
    updateCounter();
    saveState();
  }
});

document.addEventListener('click', e => {
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

  const especiales = state.round <= 1 ? ['testigo', 'cobarde', 'sacrificio'] : ['testigo', 'cobarde', 'sacrificio', 'medium'];
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
  const el = document.getElementById('rolePlayerName');
  if (el) el.textContent = current.name.toUpperCase();
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
    desc = state.mode === 'complice' ? (state.secuazSuggestion ? `El Secuaz sugiere: ${state.secuazSuggestion}` : 'El Secuaz aún no dejó sugerencia.') : 'Elegí a quién eliminar esta noche.';
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
      desc = 'Dejá una sugerencia al Asesino si querés.\n\n' + otrosRoles.map(a => `${a.name}: ${ROLES[a.role].nombre}`).join('\n');
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
    desc = state.dead.length === 0 ? 'Todavía no hay muertos. Tu poder no tiene efecto esta ronda.' : 'Mañana podrás invocar el voto de un eliminado.';
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
      const pista = state.mode === 'solo'
        ? `El Asesino tiene ${pd.age} años.`
        : `Uno de los villanos tiene ${pd.age} años.`;
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
      const pista = state.mode === 'solo'
        ? `El Asesino es de género ${genText}.`
        : `Uno de los villanos es de género ${genText}.`;
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

  if (state.mode !== 'solo' && villains.length === 2) {
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
    content.innerHTML = `<h2 class="nombre-jugador" style="color:#e8e8e8;font-size:28px;margin-bottom:0.5rem">Nadie murió esta noche</h2><p class="rol-desc">Villa Matanza amaneció en paz.</p>`;
  } else {
    content.innerHTML = `<p class="rol-desc" style="margin-bottom:0.5rem">${sacrificioDied ? 'El Sacrificio murió protegiendo a alguien.' : 'Fue eliminado:'}</p><h2 class="rol-nombre" style="margin-bottom:0.5rem">${victim.toUpperCase()}</h2><p class="rol-desc">${getRolPublico(victim)}</p>`;
  }
  if (checkWinCondition()) return;
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
  if (instr) instr.textContent = isMediumTurn ? 'El Médium invocó tu voto.\nVotá en nombre de los muertos.' : 'Votá en privado.\nNo muestres tu pantalla.';
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

  if (tie || !eliminated) {
    content.innerHTML = `<h2 class="nombre-jugador" style="color:#e8e8e8;font-size:28px;margin-bottom:0.5rem">Empate</h2><p class="rol-desc">Nadie fue eliminado.</p>`;
  } else {
    state.alive = state.alive.filter(p => p !== eliminated);
    state.dead.push(eliminated);
    content.innerHTML = `<p class="rol-desc">El pueblo eligió a:</p><h2 class="rol-nombre">${eliminated.toUpperCase()}</h2><p class="rol-desc">${getRolPublico(eliminated)}</p>`;
    if (checkWinCondition()) return;
  }

  btn.textContent = 'SIGUIENTE RONDA';
  saveState();
  showScreen('screen-vote-result');
}

function afterVoteResult() {
  state.round++;
  state.mediumUsed = false;
  state.pistasUsadas = state.pistasUsadas || [];
  state.assignments = assignRoles(state.alive);
  trackActiveRoles();
  startNight();
}

// ── CONDICIONES Y GAMEOVER ────────────────────────────
function checkWinCondition() {
  const villains = state.assignments.filter(a => (a.role === 'asesino' || a.role === 'secuaz') && state.alive.includes(a.name));
  const asesinoDead = !state.assignments.find(a => a.role === 'asesino' && state.alive.includes(a.name));
  
  if (asesinoDead) { showGameOver('survivors'); return true; }
  if (villains.length >= (state.alive.length - villains.length)) { showGameOver('villains'); return true; }
  return false;
}

function showGameOver(result) {
  state.phase = 'gameover';
  const title = document.getElementById('gameoverTitle');
  const desc = document.getElementById('gameoverDesc');
  title.textContent = result === 'survivors' ? 'VILLA MATANZA SALVADA' : 'EL ASESINO GANÓ';
  title.style.color = result === 'survivors' ? '#e8e8e8' : '#8b0000';
  document.getElementById('gameoverRoles').innerHTML = state.assignments
  .filter(a => a.role === 'asesino' || a.role === 'secuaz')
  .map(a => `<div class="gameover-role-row"><span>${a.name}</span><span class="villain-tag">${ROLES[a.role].nombre}</span></div>`)
  .join('');
  showScreen('screen-gameover');
  saveState();
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

function clearTimer() { clearInterval(timerInterval); }

// ── PERSISTENCIA Y REINICIO ───────────────────────────
function saveState() {
  localStorage.setItem('vm_state', JSON.stringify(state));
  localStorage.setItem('vm_playerData', JSON.stringify(playerData));
}

function resetGame() {
  localStorage.clear();
  state = JSON.parse(JSON.stringify(initialState));
  state.mode = null; 
  playerData = [{ name: '', age: '', gender: '' }];
  showScreen('screen-mode');
}

// ── INICIO UNIFICADO ──────────────────────────────────
function init() {
  const savedState = localStorage.getItem('vm_state');
  const savedPD = localStorage.getItem('vm_playerData');

  if (savedPD) {
    playerData = JSON.parse(savedPD);
  } else {
    playerData = [{ name: '', age: '', gender: '' }];
  }
  
  if (savedState) {
    state = JSON.parse(savedState);
    if (!state.mode || state.mode === null) {
      showScreen('screen-mode');
    } else {
      if (state.phase === 'setup') { 
        renderPlayers(); 
        showScreen('screen-setup'); 
      }
      else if (state.phase === 'roles') showNextRoleScreen();
      else if (state.phase === 'night') showNightPass();
      else if (state.phase === 'day') showScreen('screen-day-announce');
      else if (state.phase === 'gameover') showScreen('screen-gameover');
      else showScreen('screen-mode');
    }
  } else {
    showScreen('screen-mode');
  }
}

document.addEventListener('DOMContentLoaded', init);
