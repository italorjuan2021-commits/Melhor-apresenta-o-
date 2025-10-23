  // app.js - client logic (connects to server via socket.io)
// Note: when deployed to same origin via Render, io() connects automatically.
const socket = io();

const lobbyScreen = document.getElementById('lobby-screen');
const roomScreen = document.getElementById('room-screen');
const gameScreen = document.getElementById('game-screen');
const resultsScreen = document.getElementById('results-screen');
const loadingScreen = document.getElementById('loading-screen');

const nickInput = document.getElementById('nick');
const createRoomBtn = document.getElementById('createRoomBtn');
const joinRoomBtn = document.getElementById('joinRoomBtn');
const joinCodeInput = document.getElementById('joinCode');

const roomCodeDisplay = document.getElementById('roomCodeDisplay');
const playersList = document.getElementById('playersList');
const startBtn = document.getElementById('startBtn');
const leaveBtn = document.getElementById('leaveBtn');
const roomStatus = document.getElementById('roomStatus');

const qNum = document.getElementById('qNum');
const qTotal = document.getElementById('qTotal');
const countdownTimer = document.getElementById('countdownTimer');
const questionText = document.getElementById('questionText');
const optionsGrid = document.getElementById('optionsGrid');
const roundStatus = document.getElementById('roundStatus');

const podium = document.getElementById('podium');
const finalRanking = document.getElementById('finalRanking');
const playAgainBtn = document.getElementById('playAgain');
const backToLobbyBtn = document.getElementById('backToLobby');

let myName = '';
let myRoom = '';
let amIHost = false;
let totalQuestions = 10;
let localQuestionTimerInterval = null;
let allowedToAnswer = false;

// small loading hide
window.addEventListener('load', () => {
  setTimeout(()=> {
    loadingScreen.style.opacity = '0';
    setTimeout(()=> loadingScreen.style.display = 'none', 600);
  }, 600);
});

function showScreen(el) {
  [lobbyScreen, roomScreen, gameScreen, resultsScreen].forEach(s => s.classList.remove('active'));
  el.classList.add('active');
}

// create room
createRoomBtn.addEventListener('click', () => {
  const name = (nickInput.value || '').trim();
  if (!name) return alert('Digite seu nome!');
  myName = name;
  socket.emit('create_room', name, (res) => {
    if (res && res.ok) {
      myRoom = res.code;
      amIHost = true;
      roomCodeDisplay.innerText = myRoom;
      roomStatus.innerText = 'Aguardando jogadores';
      showScreen(roomScreen);
      renderPlayers(res.room.players || []);
      startBtn.style.display = 'inline-block';
    } else {
      alert(res.msg || 'Erro ao criar sala');
    }
  });
});

// join room
joinRoomBtn.addEventListener('click', () => {
  const name = (nickInput.value || '').trim();
  const code = (joinCodeInput.value || '').trim().toUpperCase();
  if (!name || !code) return alert('Digite nome e código da sala!');
  myName = name;
  socket.emit('join_room', { code, name }, (res) => {
    if (res && res.ok) {
      myRoom = code;
      amIHost = false;
      roomCodeDisplay.innerText = myRoom;
      roomStatus.innerText = 'Aguardando';
      showScreen(roomScreen);
      renderPlayers(res.room.players || []);
      startBtn.style.display = 'none';
    } else {
      alert(res.msg || 'Não foi possível entrar na sala');
    }
  });
});

// leave
leaveBtn.addEventListener('click', () => {
  if (!myRoom) return showScreen(lobbyScreen);
  socket.emit('leave_room', myRoom);
  resetClientState();
  showScreen(lobbyScreen);
});

// start game (host only)
startBtn.addEventListener('click', () => {
  if (!myRoom) return;
  socket.emit('start_room', myRoom, (res) => {
    if (!res.ok) alert(res.msg || 'Erro ao iniciar');
    else roomStatus.innerText = 'Iniciando...';
  });
});

// socket listeners
socket.on('room_update', (room) => {
  if (!myRoom || room.code !== myRoom) return;
  renderPlayers(room.players || []);
  roomStatus.innerText = room.status || 'Aguardando';
  document.getElementById('hostBadge').style.display = (room.hostId === socket.id) ? 'block' : 'none';
});

socket.on('countdown_start', (data) => {
  roomStatus.innerText = `Começando em ${data.seconds}s`;
  showScreen(roomScreen);
});
socket.on('countdown_tick', (data) => {
  roomStatus.innerText = `Começando em ${data.seconds}s`;
  if (data.seconds <= 0) roomStatus.innerText = 'Iniciando...';
});

// QUESTION: server sends question only when timer started
socket.on('question', (payload) => {
  showScreen(gameScreen);
  qNum.innerText = payload.index + 1;
  qTotal.innerText = totalQuestions;
  questionText.innerText = payload.q;
  optionsGrid.innerHTML = '';
  roundStatus.innerText = 'Responda agora!';
  allowedToAnswer = true;

  payload.options.forEach((opt, idx) => {
    const b = document.createElement('button');
    b.innerText = String.fromCharCode(65+idx) + '. ' + opt;
    b.dataset.idx = idx;
    b.addEventListener('click', () => {
      if (!allowedToAnswer) return;
      submitAnswer(idx, b);
    });
    optionsGrid.appendChild(b);
  });

  // countdown on client for display (server is authoritative)
  countdownTimer.innerText = payload.time;
  if (localQuestionTimerInterval) clearInterval(localQuestionTimerInterval);
  let t = payload.time;
  localQuestionTimerInterval = setInterval(()=> {
    t--;
    countdownTimer.innerText = t;
    if (t <= 0) {
      clearInterval(localQuestionTimerInterval);
      allowedToAnswer = false;
      // disable buttons visually when time's up
      Array.from(optionsGrid.children).forEach(btn => btn.disabled = true);
      roundStatus.innerText = 'Tempo esgotado — aguardando resultado...';
    }
  }, 1000);
});

// round result: server sends correct index (shuffled) after timer expires
socket.on('round_result', (data) => {
  const correct = data.correctIndex;
  const players = data.players;
  // visually mark options
  Array.from(optionsGrid.children).forEach((btn, idx) => {
    btn.disabled = true;
    btn.classList.remove('selected','correct','wrong');
    if (idx === correct) btn.classList.add('correct');
    else if (btn.classList.contains('selected')) btn.classList.add('wrong');
  });
  roundStatus.innerText = 'Placar parcial: ' + players.slice(0,5).map(p => `${p.name} (${p.score})`).join('  •  ');
});

// final results
socket.on('final_results', (data) => {
  showScreen(resultsScreen);
  podium.innerHTML = '';
  data.top5.forEach((p, idx) => {
    const div = document.createElement('div');
    div.className = 'place';
    if (idx === 0) div.classList.add('first');
    div.innerHTML = `<strong>#${idx+1}</strong><div>${p.name}</div><div>${p.score} pts</div><div>${p.accuracy}% acerto</div>`;
    podium.appendChild(div);
  });
  finalRanking.innerHTML = '';
  data.ranking.forEach(p => {
    const li = document.createElement('li');
    li.innerText = `${p.name} — ${p.score} pts — ${p.accuracy}%`;
    finalRanking.appendChild(li);
  });
});

// render players list
function renderPlayers(players) {
  playersList.innerHTML = '';
  players.forEach(p => {
    const li = document.createElement('li');
    li.innerHTML = `${p.name} <span class="muted">${p.score || 0} pts</span>`;
    playersList.appendChild(li);
  });
}

// submit an answer
function submitAnswer(index, btn) {
  // mark selected locally
  Array.from(optionsGrid.children).forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  // send to server
  socket.emit('submit_answer', { code: myRoom, answerIndex: index });
  // visually disable immediate multiple clicks, still wait for round_result
  Array.from(optionsGrid.children).forEach(b => b.disabled = true);
}

// reset client state
function resetClientState() {
  myRoom = '';
  myName = '';
  amIHost = false;
  playersList.innerHTML = '';
  roomCodeDisplay.innerText = '—';
  roomStatus.innerText = 'Aguardando';
  showScreen(lobbyScreen);
  if (localQuestionTimerInterval) clearInterval(localQuestionTimerInterval);
}

playAgainBtn && playAgainBtn.addEventListener('click', () => {
  resetClientState();
  showScreen(lobbyScreen);
});
backToLobbyBtn && backToLobbyBtn.addEventListener('click', () => {
  resetClientState();
  showScreen(lobbyScreen);
});
