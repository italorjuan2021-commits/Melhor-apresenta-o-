// ================================
// 🎮 A NARRAÇÃO — script.js
// ================================

// Conexão com o servidor via Socket.IO
const socket = io();

// Elementos principais
const screens = {
  lobby: document.getElementById("lobby"),
  room: document.getElementById("room"),
  game: document.getElementById("game"),
  results: document.getElementById("results"),
};

const nicknameInput = document.getElementById("nickname");
const roomCodeInput = document.getElementById("roomCode");
const roomCodeDisplay = document.getElementById("roomCodeDisplay");
const playerList = document.getElementById("playerList");
const podium = document.getElementById("podium");
const finalRanking = document.getElementById("finalRanking");

// Botões
const createRoomBtn = document.getElementById("createRoomBtn");
const joinRoomBtn = document.getElementById("joinRoomBtn");
const startGameBtn = document.getElementById("startGameBtn");
const backToLobbyBtn = document.getElementById("backToLobbyBtn");

// Jogo
const questionText = document.getElementById("questionText");
const optionsContainer = document.getElementById("options");
const roundLabel = document.getElementById("roundLabel");
const timerLabel = document.getElementById("timer");

// Estado local
let playerName = "";
let currentRoom = "";
let round = 0;
let timer;

// ================================
// 🧭 Funções auxiliares
// ================================

function showScreen(screenId) {
  Object.values(screens).forEach((s) => s.classList.remove("active"));
  screens[screenId].classList.add("active");
}

function updatePlayerList(players) {
  playerList.innerHTML = "";
  players.forEach((p) => {
    const li = document.createElement("li");
    li.textContent = p.name;
    playerList.appendChild(li);
  });
}

// ================================
// 🏠 LOBBY
// ================================

createRoomBtn.addEventListener("click", () => {
  playerName = nicknameInput.value.trim();
  if (!playerName) return alert("Digite seu nome!");

  socket.emit("createRoom", playerName);
});

joinRoomBtn.addEventListener("click", () => {
  playerName = nicknameInput.value.trim();
  const roomCode = roomCodeInput.value.trim();
  if (!playerName || !roomCode) return alert("Preencha nome e código da sala!");

  socket.emit("joinRoom", { roomCode, playerName });
});

startGameBtn.addEventListener("click", () => {
  socket.emit("startGame", currentRoom);
});

backToLobbyBtn.addEventListener("click", () => {
  showScreen("lobby");
});

// ================================
// 🔥 Recebendo dados do servidor
// ================================

socket.on("roomCreated", (roomCode) => {
  currentRoom = roomCode;
  roomCodeDisplay.textContent = roomCode;
  showScreen("room");
});

socket.on("roomJoined", ({ roomCode, players }) => {
  currentRoom = roomCode;
  roomCodeDisplay.textContent = roomCode;
  updatePlayerList(players);
  showScreen("room");
});

socket.on("updatePlayers", (players) => {
  updatePlayerList(players);
});

socket.on("gameStarted", (data) => {
  round = 1;
  showScreen("game");
  loadQuestion(data);
});

socket.on("nextQuestion", (data) => {
  loadQuestion(data);
});

socket.on("showResults", (ranking) => {
  showScreen("results");
  renderResults(ranking);
});

// ================================
// ❓ Perguntas e lógica de jogo
// ================================

function loadQuestion(data) {
  clearInterval(timer);
  const { question, options, time } = data;

  roundLabel.textContent = `Rodada ${round}`;
  questionText.textContent = question;
  optionsContainer.innerHTML = "";

  options.forEach((opt) => {
    const btn = document.createElement("button");
    btn.textContent = opt;
    btn.addEventListener("click", () => {
      socket.emit("answer", { roomCode: currentRoom, playerName, answer: opt });
      optionsContainer.innerHTML = "<p>✅ Resposta enviada!</p>";
      clearInterval(timer);
    });
    optionsContainer.appendChild(btn);
  });

  startTimer(time);
}

function startTimer(seconds) {
  let timeLeft = seconds;
  timerLabel.textContent = `${timeLeft}s`;
  timer = setInterval(() => {
    timeLeft--;
    timerLabel.textContent = `${timeLeft}s`;
    if (timeLeft <= 0) clearInterval(timer);
  }, 1000);
}

function renderResults(ranking) {
  podium.innerHTML = "";
  finalRanking.innerHTML = "";

  if (ranking.length >= 3) {
    podium.innerHTML = `
      <div class="place second">🥈 ${ranking[1].name}<br>${ranking[1].score} pts</div>
      <div class="place first">🥇 ${ranking[0].name}<br>${ranking[0].score} pts</div>
      <div class="place third">🥉 ${ranking[2].name}<br>${ranking[2].score} pts</div>
    `;
  }

  finalRanking.innerHTML = ranking
    .map((p, i) => `<p>${i + 1}. ${p.name} — ${p.score} pts</p>`)
    .join("");
}
