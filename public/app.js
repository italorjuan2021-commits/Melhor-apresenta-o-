// app.js (client)
const socket = io(); // connects to same origin; on Railway this will work automatically

// UI refs
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

// sound fx
const sCorrect = new Audio('https://cdn.pixabay.com/audio/2022/03/15/audio_3929fefa3f.mp3');
const sWrong = new Audio('https://cdn.pixabay.com/audio/2022/03/15/audio_6b3d4f8d0e.mp3');

function showScreen(el) {
  [lobbyScreen, roomScreen, gameScreen, resultsScreen].forEach(s => s.classList.remove('active'));
  el.classList.add('active');
}

// small loading hide
window.addEventListener('load', () => {
  setTimeout(()=> {
    loadingScreen.style.opacity = '0';
    setTimeout(()=> loadingScreen.style.display = 'none', 600);
  }, 600);
});

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
  // host badge
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

socket.on('question', (payload) => {
  showScreen(gameScreen);
  qNum.innerText = payload.index + 1;
  qTotal.innerText = totalQuestions;
  countdownTimer.innerText = payload.time;
  questionText.innerText = payload.q;
  optionsGrid.innerHTML = '';
  roundStatus.innerText = 'Responda agora!';
  payload.options.forEach((opt, idx) => {
    const b = document.createElement('button');
    b.innerText = String.fromCharCode(65+idx) + '. ' + opt;
    b.addEventListener('click', () => {
      submitAnswer(idx, b);
    });
    optionsGrid.appendChild(b);
  });
  // animate timer countdown locally
  let t = payload.time;
  const intv = setInterval(()=> {
    t--;
    countdownTimer.innerText = t;
    if (t <= 0) clearInterval(intv);
  }, 1000);
});

socket.on('round_result', (data) => {
  // show correct/wrong and partial ranking
  const correct = data.correctIndex;
  const players = data.players; // sorted by score desc
  // Mark buttons
  Array.from(optionsGrid.children).forEach((btn, idx) => {
    btn.disabled = true;
    if (idx === correct) btn.classList.add('correct');
    else if (btn.classList.contains('selected')) btn.classList.add('wrong');
  });

  // partial scoreboard
  roundStatus.innerText = 'Placar parcial: ' + players.slice(0,5).map(p => `${p.name} (${p.score})`).join('  •  ');
});

socket.on('final_results', (data) => {
  showScreen(resultsScreen);
  // podium
  podium.innerHTML = '';
  data.top5.forEach((p, idx) => {
    const div = document.createElement('div');
    div.className = 'place';
    if (idx === 0) div.classList.add('first');
    div.innerHTML = `<strong>#${idx+1}</strong><div>${p.name}</div><div>${p.score} pts</div><div>${p.accuracy}% acerto</div>`;
    podium.appendChild(div);
  });
  // full ranking
  finalRanking.innerHTML = '';
  data.ranking.forEach(p => {
    const li = document.createElement('li');
    li.innerText = `${p.name} — ${p.score} pts — ${p.accuracy}%`;
    finalRanking.appendChild(li);
  });
});

// helper functions
function renderPlayers(players) {
  playersList.innerHTML = '';
  players.forEach(p => {
    const li = document.createElement('li');
    li.innerHTML = `${p.name} <span class="muted">${p.score || 0} pts</span>`;
    playersList.appendChild(li);
  });
}

function submitAnswer(index, btn) {
  // Visual select
  Array.from(optionsGrid.children).forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  socket.emit('submit_answer', { code: myRoom, answerIndex: index });
  // play sound optimistic (will reflect correctness on 'round_result')
  // no immediate scoring on client
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
}

// play again / back
playAgainBtn && playAgainBtn.addEventListener('click', () => {
  // go back to lobby (room still exists server-side)
  resetClientState();
  showScreen(lobbyScreen);
});

backToLobbyBtn && backToLobbyBtn.addEventListener('click', () => {
  resetClientState();
  showScreen(lobbyScreen);
});
