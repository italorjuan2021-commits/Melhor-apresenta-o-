// ===============================
// ⚡ Conexão Socket.IO
// ===============================
const socket = io();

let playerName = "";
let roomCode = "";
let currentQuestion = 0;
let totalQuestions = 10;

// ===============================
// 🔊 Sons sem arquivo externo
// ===============================
function playCorrectSound() {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.connect(g);
  g.connect(ctx.destination);
  o.type = "sine";
  o.frequency.value = 880;
  g.gain.value = 0.1;
  o.start();
  o.stop(ctx.currentTime + 0.2);
}
function playWrongSound() {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.connect(g);
  g.connect(ctx.destination);
  o.type = "sawtooth";
  o.frequency.value = 200;
  g.gain.value = 0.1;
  o.start();
  o.stop(ctx.currentTime + 0.3);
}

// ===============================
// 🔄 Funções utilitárias
// ===============================
function showScreen(id) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  document.getElementById(id).classList.add("active");
}

function updatePlayerList(players) {
  const list = document.getElementById("playerList");
  list.innerHTML = "";
  players.forEach(p => {
    const li = document.createElement("li");
    li.textContent = `${p.name} — ${p.score} pts`;
    list.appendChild(li);
  });
}

// ===============================
// 🧩 Lobby
// ===============================
document.getElementById("createRoomBtn").addEventListener("click", () => {
  playerName = document.getElementById("nickname").value.trim();
  if (!playerName) return alert("Digite seu nome!");
  socket.emit("createRoom", playerName);
});

document.getElementById("joinRoomBtn").addEventListener("click", () => {
  playerName = document.getElementById("nickname").value.trim();
  roomCode = document.getElementById("roomCode").value.trim().toUpperCase();
  if (!playerName || !roomCode) return alert("Preencha nome e código da sala!");
  socket.emit("joinRoom", { roomCode, playerName });
});

// ===============================
// ▶️ Início do jogo
// ===============================
document.getElementById("startGameBtn").addEventListener("click", () => {
  socket.emit("startGame", roomCode);
});

// ===============================
// ❓ Receber perguntas do servidor
// ===============================
socket.on("question", data => {
  currentQuestion++;
  showScreen("game");
  document.getElementById("roundLabel").textContent = `Pergunta ${currentQuestion}`;
  document.getElementById("timer").textContent = `${data.time}s`;
  document.getElementById("questionText").textContent = data.question;

  const optionsDiv = document.getElementById("options");
  optionsDiv.innerHTML = "";
  data.options.forEach((opt, index) => {
    const btn = document.createElement("button");
    btn.textContent = opt;
    btn.className = "option-btn";
    btn.addEventListener("click", () => {
      socket.emit("answer", { roomCode, playerName, answerIndex: index });
      Array.from(optionsDiv.children).forEach(b => b.disabled = true);
    });
    optionsDiv.appendChild(btn);
  });

  // temporizador local
  let timeLeft = data.time;
  const timerInterval = setInterval(() => {
    timeLeft--;
    document.getElementById("timer").textContent = `${timeLeft}s`;
    if (timeLeft <= 0) clearInterval(timerInterval);
  }, 1000);
});

// ===============================
// 🟩 Revelar resposta
// ===============================
socket.on("reveal", data => {
  const buttons = document.querySelectorAll(".option-btn");
  buttons.forEach((btn, i) => {
    btn.disabled = true;
    if (i === data.correctIndex) btn.classList.add("correct");
    else if (btn.classList.contains("selected")) btn.classList.add("wrong");
  });
});

// ===============================
// 🔄 Atualizar ranking em tempo real
// ===============================
socket.on("updatePlayers", players => {
  updatePlayerList(players);
});

// ===============================
// 🏁 Mostrar resultado final
// ===============================
socket.on("showResults", ranking => {
  showScreen("results");
  const podiumDiv = document.getElementById("podium");
  podiumDiv.innerHTML = "";
  const podiumColors = ["#ffd700", "#c0c0c0", "#cd7f32"];
  ranking.slice(0, 3).forEach((p, i) => {
    const place = document.createElement("div");
    place.classList.add("place");
    if (i === 0) place.classList.add("first");
    place.style.background = podiumColors[i] || "#fff";
    place.innerHTML = `<div style="font-size:18px;">${i + 1}º</div><div>${p.name}</div><div>${p.score} pts</div>`;
    podiumDiv.appendChild(place);
  });

  const finalRanking = document.getElementById("finalRanking");
  finalRanking.innerHTML = ranking
    .map((p, i) => `<p>${i + 1}º — ${p.name}: ${p.correctCount} acertos</p>`)
    .join("");
});

// ===============================
// 🔁 Voltar ao lobby
// ===============================
document.getElementById("backToLobbyBtn").addEventListener("click", () => {
  showScreen("lobby");
});
