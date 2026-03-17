// Estado global
let state = {
  players: [],
  assignments: [],
  currentRoleIndex: 0
};

// Pantallas
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  window.scrollTo(0, 0);
}

// ── SETUP ──────────────────────────────────────────────

let players = [];

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

function updatePlayer(i, val) {
  players[i] = val;
  renderPlayers();
}

function addPlayer() {
  if (players.length < 10) { players.push(''); renderPlayers(); }
}

function removePlayer(i) {
  if (players.length > 5) { players.splice(i, 1); renderPlayers(); }
}

// ── ASIGNACIÓN DE ROLES ────────────────────────────────

function assignRoles(playerNames) {
  const n = playerNames.length;
  const assignments = [];

  // Roles fijos: 1 asesino + 1 secuaz
  const shuffled = [...playerNames].sort(() => Math.random() - 0.5);
  const asesino = shuffled[0];
  const secuaz = shuffled[1];

  // Pool de roles especiales para sobrevivientes
  const especiales = ['testigo', 'cobarde', 'guardian', 'medium'];
  const sobrevivientes = shuffled.slice(2);
  const nSobrevivientes = sobrevivientes.length;

  // Probabilidad: roles especiales tienen 40% de aparecer cada uno
  // El resto son extras
  let rolesPool = [];
  especiales.forEach(r => {
    if (Math.random() < 0.4) rolesPool.push(r);
  });

  // Completar con extras hasta tener el número exacto de sobrevivientes
  while (rolesPool.length < nSobrevivientes) rolesPool.push('extra');
  // Si sobran (por si los 4 especiales entraron y hay pocos sobrevivientes), cortar
  rolesPool = rolesPool.slice(0, nSobrevivientes).sort(() => Math.random() - 0.5);

  // Armar asignaciones
  assignments.push({ name: asesino, role: 'asesino', rolFalso: getRolFalso('asesino'), complice: secuaz });
  assignments.push({ name: secuaz, role: 'secuaz', rolFalso: getRolFalso('secuaz'), complice: asesino });
  sobrevivientes.forEach((name, i) => {
    assignments.push({ name, role: rolesPool[i] });
  });

  // Mezclar orden de revelación
  return assignments.sort(() => Math.random() - 0.5);
}

function goToRoles() {
  const names = players.map(p => p.trim());
  state.players = names;
  state.assignments = assignRoles(names);
  state.currentRoleIndex = 0;
  saveState();
  showNextRoleScreen();
}

// ── REVELACIÓN DE ROLES ────────────────────────────────

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

  const villainExtra = document.getElementById('villainExtra');
  if (rol.villano) {
    villainExtra.style.display = 'block';
    document.getElementById('compliceNombre').textContent = current.complice.toUpperCase();
  } else {
    villainExtra.style.display = 'none';
  }

  showScreen('screen-reveal');
}

function nextRolePlayer() {
  state.currentRoleIndex++;
  saveState();

  if (state.currentRoleIndex >= state.assignments.length) {
    // Todos vieron su rol — por ahora volvemos al setup
    alert('Todos vieron su rol. ¡Que empiece el juego!');
    return;
  }
  showNextRoleScreen();
}

// ── PERSISTENCIA ───────────────────────────────────────

function saveState() {
  localStorage.setItem('vm_state', JSON.stringify(state));
  localStorage.setItem('vm_players', JSON.stringify(players));
}

function loadState() {
  const saved = localStorage.getItem('vm_state');
  const savedPlayers = localStorage.getItem('vm_players');
  if (savedPlayers) players = JSON.parse(savedPlayers);
  if (saved) {
    state = JSON.parse(saved);
    if (state.currentRoleIndex < state.assignments.length) {
      renderPlayers();
      showNextRoleScreen();
      return;
    }
  }
  renderPlayers();
  showScreen('screen-setup');
}

// ── INICIO ─────────────────────────────────────────────
loadState();
