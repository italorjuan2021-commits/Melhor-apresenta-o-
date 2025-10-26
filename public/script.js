// ===============================
// 🔌 Conexão Socket.IO
// ===============================
const socket = io();

// ===============================
// 📦 Perguntas
// ===============================
const questions = [
  { question: "O que é uma narração?", options: ["Um texto que conta uma história com personagens e tempo", "Um texto que descreve objetos ou lugares", "Um texto que defende uma opinião", "Um texto que explica um conceito"], answer: 0 },
  { question: "Qual é o principal elemento da narração?", options: ["O narrador", "O autor", "O título", "O tema"], answer: 0 },
  { question: "O que é o enredo?", options: ["A sequência de ações e acontecimentos da história", "O espaço onde ocorre a história", "O conflito dos personagens", "A fala dos personagens"], answer: 0 },
  { question: "Quem conta a história em um texto narrativo?", options: ["O narrador", "O protagonista", "O autor", "O leitor"], answer: 0 },
  { question: "Qual desses é um tipo de narrador?", options: ["Narrador-personagem", "Narrador-ilustrador", "Narrador-público", "Narrador-anônimo"], answer: 0 },
  { question: "O que é o clímax na narrativa?", options: ["O momento de maior tensão da história", "O início da história", "A conclusão da história", "A descrição do espaço"], answer: 0 },
  { question: "O que representa o desfecho?", options: ["A parte final onde o conflito é resolvido", "O começo da história", "O conflito central", "A fala dos personagens"], answer: 0 },
  { question: "Qual é a função do tempo na narração?", options: ["Situar os acontecimentos", "Descrever personagens", "Defender uma tese", "Apresentar um argumento"], answer: 0 },
  { question: "O espaço narrativo representa:", options: ["O lugar onde a história se passa", "O tempo dos acontecimentos", "O ponto de vista do narrador", "O tema principal"], answer: 0 },
  { question: "Quem é o protagonista?", options: ["O personagem principal da história", "O narrador observador", "O antagonista", "O autor do texto"], answer: 0 }
];

// ===============================
// ⚙️ Variáveis globais
// ===============================
let playerName = "";
let roomCode = "";
let currentQuestion = 0;
let timeLeft = 8;
let timer;
let selectedOption = null;

// ===============================
// 🔄 Funções utilitárias
// ===============================
function showScreen(id) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  document.getElementById(id).classList.add("active");
}

// ===============================
// 🔊 Sons
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
// 🔔 Atualização de jogadores
// ===============================
socket.on("updatePlayers", players => {
  const list = document.getElementById("playerList");
  list.innerHTML = "";
  players.forEach(p => {
    const li = document.createElement("li");
    li.textContent = `${p.name} — ${p.score} pts`;
    list.appendChild(li);
  });
});

// ===============================
// 🏁 Criar/Entrar sala
// ===============================
socket.on("roomCreated", code => {
  roomCode = code;
  document.getElementById("roomCodeDisplay").textContent = roomCode;
  showScreen("room");
});

socket.on("roomJoined", ({ roomCode: code }) => {
  roomCode = code;
  document.getElementById("roomCodeDisplay").textContent = roomCode;
  showScreen("room");
});

// ===============================
// ▶️ Iniciar jogo
// ===============================
document.getElementById("startGameBtn").addEventListener("click", () => {
  socket.emit("startGame", roomCode);
});

// ===============================
// ❓ Receber pergunta
// ===============================
socket.on("question", data => {
  currentQuestion++;
  selectedOption = null;
  timeLeft = data.time;
  document.getElementById("roundLabel").textContent = `Pergunta ${currentQuestion}`;
  document.getElementById("questionText").textContent = data.question;
  const optionsDiv = document.getElementById("options");
  optionsDiv.innerHTML = "";

  data.options.forEach((opt, index) => {
    const btn = document.createElement("button");
    btn.textContent = opt;
    btn.className = "option-btn";
    btn.addEventListener("click", () => {
      if (selectedOption !== null) return;
      selectedOption = index;
      socket.emit("answer", { roomCode, playerName, answerIndex: index });
    });
    optionsDiv.appendChild(btn);
  });

  startTimer();
});

// ===============================
// ⏱️ Temporizador
// ===============================
function startTimer() {
  clearInterval(timer);
  document.getElementById("timer").textContent = `${timeLeft}s`;
  timer = setInterval(() => {
    timeLeft--;
    document.getElementById("timer").textContent = `${timeLeft}s`;
    if (timeLeft <= 0) clearInterval(timer);
  }, 1000);
}

// ===============================
// 🎯 Revelar resposta
// ===============================
socket.on("reveal", ({ correctIndex }) => {
  clearInterval(timer);
  const buttons = document.querySelectorAll(".option-btn");
  buttons.forEach((btn, i) => {
    btn.disabled = true;
    if (i === correctIndex) btn.classList.add("correct");
    else if (i === selectedOption) btn.classList.add("wrong");
    else btn.style.opacity = "0.6";
  });

  // tocar som
  if (selectedOption === correctIndex) playCorrectSound();
  else if (selectedOption !== null) playWrongSound();
  navigator.vibrate?.([100, 50, 100]);

  setTimeout(() => {
    // próxima pergunta será enviada pelo servidor
  }, 800);
});

// ===============================
// 🏆 Resultado final
// ===============================
socket.on("showResults", ranking => {
  showScreen("results");

  const podiumDiv = document.getElementById("podium");
  podiumDiv.innerHTML = "";
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

  const finalRanking = document.getElementById("finalRanking");
  finalRanking.innerHTML = ranking
    .map((p, i) => `<p>${i + 1}º — ${p.name}: ${p.score} pts</p>`)
    .join("");
});

// ===============================
// 🔁 Voltar ao lobby
document.getElementById("backToLobbyBtn").addEventListener("click", () => {
  showScreen("lobby");
});

// ===============================
// 💃 Animações extras
const style = document.createElement("style");
style.textContent = `
@keyframes bounceIn {
  0% { transform: translateY(80px); opacity: 0; }
  60% { transform: translateY(-10px); opacity: 1; }
  80% { transform: translateY(5px); }
  100% { transform: translateY(0); }
}`;
document.head.appendChild(style);
