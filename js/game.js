// ── ESTADO ────────────────────────────────────────────
let state = {
  players: [],        // nombres de todos
  alive: [],          // jugadores vivos
  dead: [],           // jugadores eliminados
  assignments: [],    // { name, role, rolFalso?, complice? }
  round: 0,
  phase: 'setup',     // setup | roles | night | day | vote | gameover

  // Noche
  nightOrder: [],
  nightIndex: 0,
  nightVictim: null,       // elegido por el asesino
  nightProtected: null,    // elegido por el guardián
  secuazSuggestion: null,
  asinoPicked: false,      // el asesino ya eligió?

  // Votación
  voteOrder: [],
  voteIndex: 0,
  votes: {},               // { nombre: votos }
  mediumPlayer: null,      // jugador muerto invocado por el médium
  mediumUsed: false,
  cobardeActive: null,     // nombre del cobarde esta ronda
  testigoActive: null,
  guardianActive: null,
  mediumActive: null,
};

let players = [];
let timerInterval = null;

// ── PANTALLAS ─────────────────────────────────────────
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  window.scrollTo(0, 0);
}

// ── SETUP ─────────────────────────────────────────────
function renderPlayers() {
  const list = document.getElementById('playerList');
  list.innerHTML = '';
  players.forEach((name, i) => {
    const row = document.createElement('div');
    row.className = 'player-row';
    row.innerHTML = `
      <span class="player-num">${String(i + 1).padStart(2, '0')}</span>
      <input class="vm-input" type="text" placeholder="Nombre..." value="${name}" maxlength="20" oninput="updatePlayer(${i}, this.value)" />
      ${players.length > 5
        ? `<button class="btn-remove" onclick="removePlayer(${i})">✕</button>`
        : '<span style="width:28px"></span>'}
    `;
    list.appendChild(row);
  });

  const filled = players.filter(p => p.trim() !== '').length;
  document.getElementById('count').textContent = filled;
  document.getElementById('addBtn').style.display = players.length >= 10 ? 'none' : 'block';

  const hasDupes = hasDuplicates();
  const valid = filled === players.length && players.length >= 5 && !hasDupes;
  document.getElementById('startBtn').disabled = !valid;

  let warn = '';
  if (filled < players.length) warn = 'Completá todos los nombres.';
  else if (hasDupes) warn = 'Hay nombres repetidos.';
  else if (filled < 5) warn = 'Necesitás al menos 5 jugadores.';
  document.getElementById('warning').textContent = warn;
}

function hasDuplicates() {
  const names = players.map(p => p.trim().toLowerCase()).filter(p => p !== '');
  return new Set(names).size !== names.length;
}

function updatePlayer(i, val) { players[i] = val; renderPlayers(); }
function addPlayer() { if (players.length < 10) { players.push(''); renderPlayers(); } }
function removePlayer(i) { if (players.length > 5) { players.splice(i, 1); renderPlayers(); } }

// ── ASIGNACIÓN DE ROLES ───────────────────────────────
function assignRoles(playerNames) {
  const shuffled = [...playerNames].sort(() => Math.random() - 0.5);
  const asesino = shuffled[0];
  const secuaz = shuffled[1];
  const sobrevivientes = shuffled.slice(2);

  const especiales = ['testigo', 'cobarde', 'guardian', 'medium'];
  let rolesPool = [];
  especiales.forEach(r => { if (Math.random() < 0.4) rolesPool.push(r); });
  while (rolesPool.length < sobrevivientes.length) rolesPool.push('extra');
  rolesPool = rolesPool.slice(0, sobrevivientes.length).sort(() => Math.random() - 0.5);

  const result = [];
  result.push({ name: asesino, role: 'asesino', rolFalso: getRolFalso('asesino'), complice: secuaz });
  result.push({ name: secuaz, role: 'secuaz', rolFalso: getRolFalso('secuaz'), complice: asesino });
  sobrevivientes.forEach((name, i) => result.push({ name, role: rolesPool[i] }));

  return result.sort(() => Math.random() - 0.5);
}

function goToRoles() {
  const names = players.map(p => p.trim());
  state.players = names;
  state.alive = [...names];
  state.dead = [];
  state.assignments = assignRoles(names);
  state.round = 1;
  state.phase = 'roles';
  state.currentRoleIndex = 0;

  // Guardar roles activos
  state.assignments.forEach(a => {
    if (a.role === 'cobarde') state.cobardeActive = a.name;
    if (a.role === 'testigo') state.testigoActive = a.name;
    if (a.role === 'guardian') state.guardianActive = a.name;
    if (a.role === 'medium') state.mediumActive = a.name;
  });

  saveState();
  showNextRoleScreen();
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
  if (rol.villano) {
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
  if (state.currentRoleIndex >= state.assignments.length) {
    startNight();
    return;
  }
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

  document.getElementById('nightActionLabel').textContent = 'Tu acción esta noche';
  document.getElementById('nightPlayerPicker').style.display = 'none';
  document.getElementById('nightContinueBtn').style.display = 'none';

  let title = '';
  let desc = '';

  if (role === 'asesino') {
    title = 'ELEGÍ TU VÍCTIMA';
    // Mostrar sugerencia del secuaz si existe
    desc = state.secuazSuggestion
      ? `El Secuaz sugiere: ${state.secuazSuggestion}`
      : 'El Secuaz aún no dejó sugerencia.';
    showNightPicker(state.alive.filter(p => p !== name), (chosen) => {
      state.nightVictim = chosen;
      state.asinoPicked = true;
      saveState();
    });
  } else if (role === 'secuaz') {
    if (state.asinoPicked) {
      title = 'EL ASESINO ACTUÓ';
      desc = state.nightVictim
        ? `Esta noche eligió a: ${state.nightVictim}`
        : 'El Asesino aún no eligió.';
    } else {
      title = 'DEJÁ UNA SUGERENCIA';
      desc = 'El Asesino verá tu elección.';
      showNightPicker(state.alive.filter(p => p !== name && p !== assignment.complice), (chosen) => {
        state.secuazSuggestion = chosen;
        saveState();
      });
    }
  } else if (role === 'cobarde') {
    title = 'HUISTE';
    desc = 'Esta noche estás a salvo. No podés ser asesinado, pero tampoco podrás votar mañana.';
  } else if (role === 'testigo') {
    title = 'EL TESTIGO';
    desc = 'Mañana recibirás una pista sobre los villanos. Guardala para vos hasta el momento indicado.';
  } else if (role === 'guardian') {
    title = 'ELEGÍ A QUIÉN PROTEGER';
    desc = 'Si el Asesino lo elige, morís vos en su lugar.';
    showNightPicker(state.alive.filter(p => p !== name), (chosen) => {
      state.nightProtected = chosen;
      saveState();
    });
  } else if (role === 'medium') {
    title = 'EL MÉDIUM';
    if (state.dead.length === 0) {
      desc = 'Todavía no hay muertos. Tu poder no tiene efecto esta ronda.';
    } else {
      desc = 'Mañana podrás invocar el voto de un eliminado. El teléfono te indicará cuándo.';
    }
  } else {
    title = 'DESCANSÁS';
    desc = 'Esta noche no tenés acción. Villa Matanza duerme.';
  }

  document.getElementById('nightActionTitle').textContent = title;
  document.getElementById('nightActionDesc').textContent = desc;

  showScreen('screen-night-action');
  startTimer(10, () => {
    document.getElementById('nightContinueBtn').style.display = 'block';
  });
}

function showNightPicker(options, onSelect) {
  const wrap = document.getElementById('nightPlayerPicker');
  const list = document.getElementById('nightPickerList');
  wrap.style.display = 'block';
  list.innerHTML = '';
  let selected = null;

  options.forEach(name => {
    const btn = document.createElement('button');
    btn.className = 'picker-btn';
    btn.textContent = name;
    btn.onclick = () => {
      document.querySelectorAll('#nightPickerList .picker-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      selected = name;
      onSelect(name);
    };
    list.appendChild(btn);
  });
}

function nextNightPlayer() {
  clearTimer();
  state.nightIndex++;
  saveState();
  if (state.nightIndex >= state.nightOrder.length) {
    resolveNight();
    return;
  }
  showNightPass();
}

function resolveNight() {
  // Aplicar guardián
  let victim = state.nightVictim;
  let guardianDied = false;

  if (victim && state.nightProtected === victim) {
    // El guardián salva a la víctima, muere él
    const guardian = state.assignments.find(a => a.role === 'guardian' && state.alive.includes(a.name));
    if (guardian) {
      victim = guardian.name;
      guardianDied = true;
    }
  }

  // Cobarde: si el asesino lo eligió, nadie muere
  if (victim && victim === state.cobardeActive) {
    victim = null;
  }

  state.nightVictim = victim;

  // Eliminar víctima
  if (victim) {
    state.alive = state.alive.filter(p => p !== victim);
    state.dead.push(victim);
  }

  saveState();
  showDayAnnounce(victim, guardianDied);
}

// ── DÍA ───────────────────────────────────────────────
function showDayAnnounce(victim, guardianDied) {
  state.phase = 'day';
  const content = document.getElementById('announceContent');

  if (!victim) {
    content.innerHTML = `
      <h2 class="nombre-jugador" style="color:#e8e8e8; font-size:28px; margin-bottom:0.5rem">Nadie murió esta noche</h2>
      <p class="rol-desc">Villa Matanza amaneció en paz... por ahora.</p>
    `;
  } else {
    content.innerHTML = `
      <p class="rol-desc" style="margin-bottom:0.5rem">${guardianDied ? 'El Guardián murió protegiendo a alguien.' : 'Esta noche fue eliminado:'}</p>
      <h2 class="rol-nombre" style="margin-bottom:0.5rem">${victim.toUpperCase()}</h2>
      <p class="rol-desc">${getRolPublico(victim)}</p>
    `;
  }

  // Verificar condición de victoria antes de continuar
  const gameOver = checkWinCondition();
  if (gameOver) return;

  saveState();
  showScreen('screen-day-announce');
}

function getRolPublico(name) {
  const a = state.assignments.find(x => x.name === name);
  if (!a) return '';
  return ROLES[a.role].nombre;
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

  // Orden de votación: vivos excluyendo cobarde, aleatorio
  let voters = state.alive.filter(p => p !== state.cobardeActive);

  // Si hay médium activo y hay muertos, agregar un muerto al final
  state.mediumPlayer = null;
  if (state.mediumActive && state.alive.includes(state.mediumActive) && state.dead.length > 0 && !state.mediumUsed) {
    // El médium elige quién vota — lo haremos inline
    state.mediumPlayer = state.dead[Math.floor(Math.random() * state.dead.length)];
    state.mediumUsed = true;
  }

  state.voteOrder = voters.sort(() => Math.random() - 0.5);
  state.voteIndex = 0;
  saveState();
  showVotePass();
}

function showVotePass() {
  // Chequear si hay que pasar por el médium al final
  const total = state.voteOrder.length + (state.mediumPlayer ? 1 : 0);
  const isMediumTurn = state.mediumPlayer && state.voteIndex >= state.voteOrder.length;

  if (isMediumTurn) {
    document.getElementById('votePlayerName').textContent = state.mediumPlayer.toUpperCase();
    document.getElementById('voteRoundNum').textContent = state.round;
    const label = document.querySelector('#screen-vote-pass .instruccion');
    label.textContent = 'El Médium invocó tu voto.\nVotá en nombre de los muertos.';
    showScreen('screen-vote-pass');
    return;
  }

  if (state.voteIndex >= state.voteOrder.length) {
    resolveVote();
    return;
  }

  document.getElementById('votePlayerName').textContent = state.voteOrder[state.voteIndex].toUpperCase();
  document.getElementById('voteRoundNum').textContent = state.round;
  document.querySelector('#screen-vote-pass .instruccion').textContent = 'Votá en privado.\nNo muestres tu pantalla.';
  showScreen('screen-vote-pass');
}

function revealVote() {
  const isMediumTurn = state.mediumPlayer && state.voteIndex >= state.voteOrder.length;
  const currentVoter = isMediumTurn ? state.mediumPlayer : state.voteOrder[state.voteIndex];

  document.getElementById('voteActionLabel').textContent = isMediumTurn
    ? `Voto de ${state.mediumPlayer} (invocado)`
    : '¿A quién eliminás?';

  const list = document.getElementById('votePickerList');
  list.innerHTML = '';

  // Opciones: todos los vivos excepto el propio votante (si está vivo)
  const options = state.alive.filter(p => p !== currentVoter);

  options.forEach(name => {
    const btn = document.createElement('button');
    btn.className = 'picker-btn';
    btn.textContent = name;
    btn.onclick = () => {
      state.votes[name] = (state.votes[name] || 0) + 1;
      state.voteIndex++;
      saveState();
      showVotePass();
    };
    list.appendChild(btn);
  });

  showScreen('screen-vote-action');
}

function resolveVote() {
  // Encontrar el más votado
  let maxVotes = 0;
  let eliminated = null;
  let tie = false;

  Object.entries(state.votes).forEach(([name, count]) => {
    if (count > maxVotes) { maxVotes = count; eliminated = name; tie = false; }
    else if (count === maxVotes && count > 0) { tie = true; }
  });

  const content = document.getElementById('voteResultContent');
  const btn = document.getElementById('voteResultBtn');

  if (tie || !eliminated || maxVotes === 0) {
    content.innerHTML = `
      <h2 class="nombre-jugador" style="color:#e8e8e8; font-size:28px; margin-bottom:0.5rem">Empate</h2>
      <p class="rol-desc">El pueblo no se puso de acuerdo. Nadie es eliminado.</p>
    `;
    btn.textContent = 'CONTINUAR';
    state.phase = 'night';
    saveState();
  } else {
    state.alive = state.alive.filter(p => p !== eliminated);
    state.dead.push(eliminated);
    content.innerHTML = `
      <p class="rol-desc" style="margin-bottom:0.5rem">El pueblo eligió:</p>
      <h2 class="rol-nombre" style="margin-bottom:0.5rem">${eliminated.toUpperCase()}</h2>
      <p class="rol-desc">${getRolPublico(eliminated)}</p>
    `;
    btn.textContent = 'CONTINUAR';
    saveState();

    const gameOver = checkWinConditionSilent();
    if (gameOver) { showGameOver(gameOver); return; }
  }

  showScreen('screen-vote-result');
}

function afterVoteResult() {
  state.round++;
  // Reasignar roles para la nueva ronda
  reassignRoles();
  startNight();
}

// ── REASIGNACIÓN DE ROLES ─────────────────────────────
function reassignRoles() {
  const aliveNames = state.alive;
  const newAssignments = assignRoles(aliveNames);
  state.assignments = newAssignments;
  state.cobardeActive = null;
  state.testigoActive = null;
  state.guardianActive = null;
  state.mediumActive = null;
  state.mediumUsed = false;

  newAssignments.forEach(a => {
    if (a.role === 'cobarde') state.cobardeActive = a.name;
    if (a.role === 'testigo') state.testigoActive = a.name;
    if (a.role === 'guardian') state.guardianActive = a.name;
    if (a.role === 'medium') state.mediumActive = a.name;
  });
}

// ── CONDICIÓN DE VICTORIA ─────────────────────────────
function checkWinCondition() {
  const result = checkWinConditionSilent();
  if (result) { showGameOver(result); return true; }
  return false;
}

function checkWinConditionSilent() {
  const alivePlayers = state.alive;
  const aliveVillains = state.assignments
    .filter(a => (a.role === 'asesino' || a.role === 'secuaz') && alivePlayers.includes(a.name));

  // Asesino eliminado = sobrevivientes ganan
  const asesinoDead = !state.assignments.find(a => a.role === 'asesino' && alivePlayers.includes(a.name));
  if (asesinoDead) return 'survivors';

  // Villanos >= sobrevivientes = villanos ganan
  const survivors = alivePlayers.filter(p => !aliveVillains.find(v => v.name === p));
  if (aliveVillains.length >= survivors.length) return 'villains';

  return null;
}

function showGameOver(result) {
  state.phase = 'gameover';
  saveState();

  const title = document.getElementById('gameoverTitle');
  const desc = document.getElementById('gameoverDesc');
  const roles = document.getElementById('gameoverRoles');

  if (result === 'survivors') {
    title.textContent = 'VILLA MATANZA\nFUE SALVADA';
    title.style.color = '#e8e8e8';
    desc.textContent = 'El asesino fue descubierto. La pesadilla terminó.';
  } else {
    title.textContent = 'EL ASESINO\nGANÓ';
    title.style.color = '#8b0000';
    desc.textContent = 'Villa Matanza cayó en la oscuridad. Nadie sobrevivió para contarlo.';
  }

  roles.innerHTML = state.assignments.map(a => {
    const isVillain = a.role === 'asesino' || a.role === 'secuaz';
    return `
      <div class="gameover-role-row">
        <span>${a.name}</span>
        <span class="${isVillain ? 'villain-tag' : ''}">${ROLES[a.role].nombre}</span>
      </div>
    `;
  }).join('');

  showScreen('screen-gameover');
}

// ── TIMER ─────────────────────────────────────────────
function startTimer(seconds, onComplete) {
  clearTimer();
  let remaining = seconds;
  const bar = document.getElementById('timerBar');
  const text = document.getElementById('timerText');
  const wrap = document.getElementById('timerWrap');
  wrap.innerHTML = `<div class="timer-bar-bg"><div class="timer-bar" id="timerBar" style="width:100%"></div></div><p class="timer-text" id="timerText">${remaining}</p>`;

  timerInterval = setInterval(() => {
    remaining--;
    const b = document.getElementById('timerBar');
    const t = document.getElementById('timerText');
    if (b) b.style.width = `${(remaining / seconds) * 100}%`;
    if (t) t.textContent = remaining;
    if (remaining <= 0) {
      clearTimer();
      onComplete();
    }
  }, 1000);
}

function clearTimer() {
  if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
}

// ── PERSISTENCIA ──────────────────────────────────────
function saveState() {
  localStorage.setItem('vm_state', JSON.stringify(state));
  localStorage.setItem('vm_players', JSON.stringify(players));
}

function loadState() {
  const savedPlayers = localStorage.getItem('vm_players');
  const savedState = localStorage.getItem('vm_state');
  if (savedPlayers) players = JSON.parse(savedPlayers);

  if (savedState) {
    state = JSON.parse(savedState);
    renderPlayers();
    switch (state.phase) {
      case 'roles': showNextRoleScreen(); break;
      case 'night': showNightPass(); break;
      case 'day': showScreen('screen-debate'); break;
      case 'vote': showVotePass(); break;
      case 'gameover': showScreen('screen-gameover'); break;
      default: showScreen('screen-setup');
    }
    return;
  }

  renderPlayers();
  showScreen('screen-setup');
}

function resetGame() {
  localStorage.removeItem('vm_state');
  state = { players:[], alive:[], dead:[], assignments:[], round:0, phase:'setup',
    nightOrder:[], nightIndex:0, nightVictim:null, nightProtected:null,
    secuazSuggestion:null, asinoPicked:false, voteOrder:[], voteIndex:0,
    votes:{}, mediumPlayer:null, mediumUsed:false,
    cobardeActive:null, testigoActive:null, guardianActive:null, mediumActive:null };
  showScreen('screen-setup');
}

// ── INICIO ────────────────────────────────────────────
loadState();
