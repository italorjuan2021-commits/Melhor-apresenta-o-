// ===============================
// 🌐 Multiplayer Quiz Script
// ===============================
const socket = io();

// ===============================
// ⚙️ Variáveis globais
// ===============================
let playerName = "";
let roomCode = "";
let currentQuestion = 0;
let questions = [];
let timeLeft = 8;
let timer;
let totalPlayers = {};
let lastCorrectShuffled = -1;

// ===============================
// 🔄 Funções utilitárias
// ===============================
function showScreen(id) {
  document.querySelectorAll(".screen").forEach((s) => s.classList.remove("active"));
  document.getElementById(id).classList.add("active");
}

function shuffle(array) {
  return array.sort(() => Math.random() - 0.5);
}

// ===============================
// 🔊 Sons sem arquivo externo
// ===============================
function playCorrectSound() {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.connect(g); g.connect(ctx.destination);
  o.type = "sine"; o.frequency.value = 880; g.gain.value = 0.1;
  o.start(); o.stop(ctx.currentTime + 0.2);
}

function playWrongSound() {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.connect(g); g.connect(ctx.destination);
  o.type = "sawtooth"; o.frequency.value = 200; g.gain.value = 0.1;
  o.start(); o.stop(ctx.currentTime + 0.3);
}

// ===============================
// 🧩 Lobby: criar sala
// ===============================
document.getElementById("createRoomBtn").addEventListener("click", () => {
  playerName = document.getElementById("nickname").value.trim();
  if (!playerName) return alert("Digite seu nome!");
  socket.emit("createRoom", playerName);
});

// ===============================
// 🧩 Lobby: entrar em sala
// ===============================
document.getElementById("joinRoomBtn").addEventListener("click", () => {
  playerName = document.getElementById("nickname").value.trim();
  roomCode = document.getElementById("roomCode").value.trim().toUpperCase();
  if (!playerName || !roomCode) return alert("Preencha nome e código da sala!");
  socket.emit("joinRoom", { roomCode, playerName });
});

// ===============================
// 👥 Atualizar lista de jogadores
// ===============================
function updatePlayerList(players) {
  totalPlayers = {};
  players.forEach(p => totalPlayers[p.name] = p.score || 0);
  const list = document.getElementById("playerList");
  list.innerHTML = "";
  Object.keys(totalPlayers).forEach((p) => {
    const li = document.createElement("li");
    li.textContent = `${p} — ${totalPlayers[p]} pts`;
    list.appendChild(li);
  });
}

// ===============================
// ▶️ Iniciar jogo
// ===============================
document.getElementById("startGameBtn").addEventListener("click", () => {
  socket.emit("startGame", roomCode);
});

// ===============================
// ❓ Receber pergunta do servidor
// ===============================
socket.on("question", (data) => {
  questions[currentQuestion] = data; // salva localmente
  lastCorrectShuffled = data.correctShuffled || 0;

  showScreen("game");
  document.getElementById("roundLabel").textContent = `Pergunta ${currentQuestion + 1}`;
  document.getElementById("questionText").textContent = data.question;

  const optionsDiv = document.getElementById("options");
  optionsDiv.innerHTML = "";
  data.options.forEach((opt, i) => {
    const btn = document.createElement("button");
    btn.textContent = opt;
    btn.className = "option-btn";
    btn.addEventListener("click", () => {
      socket.emit("answer", { roomCode, playerName, answerIndex: i });
      disableOptions();
    });
    optionsDiv.appendChild(btn);
  });

  startTimer(data.time || 8);
});

// ===============================
// ⏱️ Timer
// ===============================
function startTimer(seconds) {
  clearInterval(timer);
  timeLeft = seconds;
  document.getElementById("timer").textContent = `${timeLeft}s`;
  timer = setInterval(() => {
    timeLeft--;
    document.getElementById("timer").textContent = `${timeLeft}s`;
    if (timeLeft <= 0) {
      clearInterval(timer);
      disableOptions();
    }
  }, 1000);
}

function disableOptions() {
  document.querySelectorAll(".option-btn").forEach(b => b.disabled = true);
}

// ===============================
// 🟩 Revelar resposta
// ===============================
socket.on("reveal", ({ correctIndex }) => {
  const buttons = document.querySelectorAll(".option-btn");
  buttons.forEach((btn, i) => {
    if (i === correctIndex) {
      btn.classList.add("correct");
    } else if (btn.disabled) {
      btn.classList.add("wrong");
    } else {
      btn.style.opacity = "0.6";
    }
  });

  // tocar som
  buttons.forEach((btn, i) => {
    if (i === correctIndex) playCorrectSound();
    else if (btn.disabled) playWrongSound();
  });
});

// ===============================
// 📊 Atualizar ranking em tempo real
// ===============================
socket.on("updatePlayers", (players) => {
  updatePlayerList(players);
});

// ===============================
// 🏆 Resultados finais
// ===============================
socket.on("showResults", (ranking) => {
  showScreen("results");
  const podiumDiv = document.getElementById("podium");
  podiumDiv.innerHTML = "";
  const finalRanking = document.getElementById("finalRanking");
  finalRanking.innerHTML = "";

  const podiumColors = ["#ffd700", "#c0c0c0", "#cd7f32"];
  const podiumDelays = [0, 300, 600];

  ranking.slice(0, 3).forEach((p, i) => {
    const place = document.createElement("div");
    place.classList.add("place");
    if (i === 0) place.classList.add("first");
    place.style.background = podiumColors[i] || "#fff";
    place.style.animation = `bounceIn 0.6s ease ${podiumDelays[i]}ms both`;
    place.innerHTML = `<div style="font-size:18px;">${i + 1}º</div><div>${p.name}</div><div>${p.score} pts</div>`;
    podiumDiv.appendChild(place);
  });

  finalRanking.innerHTML = ranking.map((p, i) => `<p>${i + 1}º — ${p.name}: ${p.correctCount || 0} acertos</p>`).join("");
});

// ===============================
// 🔁 Voltar ao lobby
// ===============================
document.getElementById("backToLobbyBtn").addEventListener("click", () => {
  showScreen("lobby");
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
