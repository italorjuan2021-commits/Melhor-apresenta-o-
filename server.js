// ===============================
// 🔊 Sons embutidos em Base64
// ===============================
const soundCorrect = new Audio("data:audio/mp3;base64,SUQzAwAAAAAAFlRFTkMAAA..."); // som de acerto
const soundWrong   = new Audio("data:audio/mp3;base64,SUQzAwAAAAAAFlRFTkMAAA..."); // som de erro
const soundVictory = new Audio("data:audio/mp3;base64,SUQzAwAAAAAAFlRFTkMAAAA..."); // som vitória

// ===============================
// ⚙️ Variáveis globais
// ===============================
let currentQuestion = 0;
let score = 0;
let answered = false;
let timer;
let timeLeft = 8;
let playerName = "";
let roomCode = "";

// ===============================
// 🔗 Conexão Socket.IO
// ===============================
const socket = io();

// ===============================
// 🔄 Funções utilitárias
// ===============================
function showScreen(id) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  document.getElementById(id).classList.add("active");
}

// ===============================
// 🧩 Lobby
// ===============================
document.getElementById("createRoomBtn").addEventListener("click", () => {
  playerName = document.getElementById("nickname").value.trim();
  if (!playerName) return alert("Digite seu nome!");
  socket.emit('createRoom', playerName);
});

document.getElementById("joinRoomBtn").addEventListener("click", () => {
  playerName = document.getElementById("nickname").value.trim();
  roomCode = document.getElementById("roomCode").value.trim().toUpperCase();
  if (!playerName || !roomCode) return alert("Preencha nome e código da sala!");
  socket.emit('joinRoom', { roomCode, playerName });
});

document.getElementById("startGameBtn").addEventListener("click", () => {
  if (!roomCode) return alert("Erro: Sala não definida");
  socket.emit('startGame', roomCode);
});

document.getElementById("backToLobbyBtn").addEventListener("click", () => showScreen("lobby"));

// ===============================
// 👥 Atualização de jogadores
// ===============================
function updatePlayerListSocket(players) {
  const list = document.getElementById("playerList");
  list.innerHTML = "";
  players.forEach(p => {
    const li = document.createElement("li");
    li.textContent = `${p.name} — ${p.score} pts`;
    list.appendChild(li);
  });
}

// ===============================
// 🔗 Eventos Socket.IO
// ===============================

// sala criada
socket.on('roomCreated', (code) => {
  roomCode = code;
  document.getElementById("roomCodeDisplay").textContent = roomCode;
  showScreen("room");
});

// entrou em sala
socket.on('roomJoined', ({ roomCode: code, players }) => {
  roomCode = code;
  document.getElementById("roomCodeDisplay").textContent = roomCode;
  updatePlayerListSocket(players);
  showScreen("room");
});

// erro
socket.on('roomError', msg => alert(msg));

// lista de jogadores atualizada
socket.on('updatePlayers', players => updatePlayerListSocket(players));

// contagem regressiva antes do jogo
socket.on('preStart', ({ seconds }) => {
  alert(`Jogo vai começar em ${seconds}s!`);
});

// ===============================
// ❓ Perguntas
// ===============================
socket.on('question', (data) => {
  answered = false;
  showScreen("game");
  showQuestionFromServer(data);
});

function showQuestionFromServer(qData) {
  const optionsDiv = document.getElementById("options");
  document.getElementById("questionText").textContent = qData.question;
  optionsDiv.innerHTML = "";

  qData.options.forEach((opt, index) => {
    const btn = document.createElement("button");
    btn.textContent = opt;
    btn.className = "option-btn";
    btn.addEventListener("click", () => selectOptionServer(index, btn));
    optionsDiv.appendChild(btn);
  });

  // timer
  timeLeft = qData.time;
  document.getElementById("timer").textContent = `${timeLeft}s`;
  clearInterval(timer);
  timer = setInterval(() => {
    timeLeft--;
    document.getElementById("timer").textContent = `${timeLeft}s`;
    if (timeLeft <= 0) clearInterval(timer);
  }, 1000);
}

function selectOptionServer(answerIndex, button) {
  if (answered) return;
  answered = true;
  button.classList.add("selected");
  socket.emit('answer', { roomCode, playerName, answerIndex });
}

// revelar resposta
socket.on('reveal', ({ correctIndex }) => {
  const buttons = document.querySelectorAll(".option-btn");
  buttons.forEach((btn, i) => {
    btn.disabled = true;
    if (i === correctIndex) btn.classList.add("correct");
    else if (btn.classList.contains("selected")) btn.classList.add("wrong");
    else btn.style.opacity = "0.6";
  });
  // tocar som
  buttons.forEach((btn,i)=>{
    if(btn.classList.contains("correct") && btn.classList.contains("selected")) soundCorrect.play();
    else if(btn.classList.contains("wrong")) soundWrong.play();
  });
  navigator.vibrate?.([100,50,100]);
});

// mostrar resultados
socket.on('showResults', (ranking) => {
  showScreen("results");
  soundVictory.play();
  navigator.vibrate?.([200,100,200]);

  const finalRanking = document.getElementById("finalRanking");
  finalRanking.innerHTML = ranking.map((p,i) => `<p>${i+1}º — ${p.name}: ${p.correctCount} acertos</p>`).join("");

  // pódio animado
  const podiumDiv = document.getElementById("podium");
  podiumDiv.innerHTML = "";
  const podiumColors = ["#ffd700","#c0c0c0","#cd7f32"];
  const podiumDelays = [0,300,600];
  ranking.slice(0,3).forEach((p,i)=>{
    const place = document.createElement("div");
    place.classList.add("place");
    if(i===0) place.classList.add("first");
    place.style.background = podiumColors[i] || "#fff";
    place.style.animation = `bounceIn 0.6s ease ${podiumDelays[i]}ms both`;
    place.innerHTML = `<div style="font-size:18px;">${i+1}º</div><div>${p.name}</div><div>${p.correctCount} pts</div>`;
    podiumDiv.appendChild(place);
  });
});

// ===============================
// 💃 Animações extras
// ===============================
const style = document.createElement("style");
style.textContent = `
@keyframes bounceIn {
  0% { transform: translateY(80px); opacity: 0; }
  60% { transform: translateY(-10px); opacity: 1; }
  80% { transform: translateY(5px); }
  100% { transform: translateY(0); }
}`;
document.head.appendChild(style);
