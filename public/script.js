const socket = io();
let playerName = '';
let roomCode = '';
let currentQuestion = {};
let timer;
let timeLeft = 8;

// Sons
function playCorrectSound() {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.connect(g); g.connect(ctx.destination);
  o.type = 'sine'; o.frequency.value = 880; g.gain.value = 0.1;
  o.start(); o.stop(ctx.currentTime + 0.2);
}
function playWrongSound() {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.connect(g); g.connect(ctx.destination);
  o.type = 'sawtooth'; o.frequency.value = 200; g.gain.value = 0.1;
  o.start(); o.stop(ctx.currentTime + 0.3);
}

// Lobby
document.getElementById("createRoomBtn").addEventListener("click", () => {
  playerName = document.getElementById("nickname").value.trim();
  if(!playerName) return alert("Digite seu nome!");
  socket.emit('createRoom', playerName);
});

document.getElementById("joinRoomBtn").addEventListener("click", () => {
  playerName = document.getElementById("nickname").value.trim();
  roomCode = document.getElementById("roomCode").value.trim().toUpperCase();
  if(!playerName || !roomCode) return alert("Preencha nome e código!");
  socket.emit('joinRoom', { roomCode, playerName });
});

// Receber sala criada
socket.on('roomCreated', code => {
  roomCode = code;
  document.getElementById("roomCodeDisplay").textContent = code;
  showScreen("room");
});

// Receber sala entrou
socket.on('roomJoined', () => {
  document.getElementById("roomCodeDisplay").textContent = roomCode;
  showScreen("room");
});

// Atualizar lista jogadores
socket.on('updatePlayers', players => {
  const list = document.getElementById("playerList");
  list.innerHTML = '';
  players.forEach(p => {
    const li = document.createElement("li");
    li.textContent = `${p.name} — ${p.score} pts`;
    list.appendChild(li);
  });
});

// Iniciar jogo
document.getElementById("startGameBtn").addEventListener("click", () => {
  socket.emit('startGame', roomCode);
  showScreen("game");
});

// Receber pergunta
socket.on('question', data => {
  currentQuestion = data;
  timeLeft = data.time;
  document.getElementById("questionText").textContent = data.question;
  document.getElementById("roundLabel").textContent = `Pergunta`;
  const optionsDiv = document.getElementById("options");
  optionsDiv.innerHTML = '';
  data.options.forEach((opt, i) => {
    const btn = document.createElement("button");
    btn.textContent = opt;
    btn.className = "option-btn";
    btn.addEventListener("click", () => selectOption(i));
    optionsDiv.appendChild(btn);
  });
  startTimer();
});

function startTimer() {
  clearInterval(timer);
  document.getElementById("timer").textContent = `${timeLeft}s`;
  timer = setInterval(() => {
    timeLeft--;
    document.getElementById("timer").textContent = `${timeLeft}s`;
    if(timeLeft <= 0) clearInterval(timer);
  }, 1000);
}

// Selecionar resposta
function selectOption(i) {
  clearInterval(timer);
  socket.emit('answer', { roomCode, answerIndex: i });
}

// Revelar resposta
socket.on('reveal', data => {
  const buttons = document.querySelectorAll(".option-btn");
  buttons.forEach((btn, idx) => {
    btn.disabled = true;
    if(idx === data.correctIndex) btn.classList.add("correct");
    else btn.classList.add("wrong");
  });
});

// Mostrar resultados
socket.on('showResults', ranking => {
  showScreen("results");
  const podiumDiv = document.getElementById("podium");
  podiumDiv.innerHTML = '';
  const colors = ["#ffd700","#c0c0c0","#cd7f32"];
  ranking.slice(0,3).forEach((p,i) => {
    const div = document.createElement("div");
    div.classList.add("place");
    div.style.background = colors[i] || "#fff";
    div.innerHTML = `<div>${i+1}º</div><div>${p.name}</div><div>${p.score} pts</div>`;
    podiumDiv.appendChild(div);
  });
  const finalRanking = document.getElementById("finalRanking");
  finalRanking.innerHTML = ranking.map((p,i)=>`<p>${i+1}º — ${p.name}: ${p.score} pts</p>`).join("");
});

// Voltar ao lobby
document.getElementById("backToLobbyBtn").addEventListener("click", () => showScreen("lobby"));

// Mostrar tela
function showScreen(id) {
  document.querySelectorAll(".screen").forEach(s=>s.classList.remove("active"));
  document.getElementById(id).classList.add("active");
                         }
