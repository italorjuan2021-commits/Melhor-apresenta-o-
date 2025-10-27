// ===============================
// 🔊 Sons embutidos
// ===============================

// som curto de acerto ✅
const soundCorrect = new Audio("data:audio/mp3;base64,SUQzAwAAAAAAFlRFTkMAAA..."); // “ding”  
// som curto de erro ❌
const soundWrong = new Audio("data:audio/mp3;base64,SUQzAwAAAAAAFlRFTkMAAA..."); // “buzz”  
// som de vitória 🏆
const soundVictory = new Audio("data:audio/mp3;base64,SUQzAwAAAAAAFlRFTkMAAAAAPAAABEV4YW1wbGUgVmljdG9yeSBTb3VuZA...");  

// ===============================
// ⚙️ Socket.IO
// ===============================
const socket = io(); // <script src="/socket.io/socket.io.js"></script> no HTML

// ===============================
// 📦 Perguntas
// ===============================
const questions = [
  { question: "O que é uma narração?", options: ["Um texto que conta uma história com personagens e tempo", "Um texto que descreve objetos ou lugares", "Um texto que defende uma opinião", "Um texto que explica um conceito"], answer: 0 },
  { question: "Qual é o principal elemento da narração?", options: ["O narrador", "O autor", "O título", "O tema"], answer: 0 },
  { question: "O que é o enredo?", options: ["A sequência de ações e acontecimentos da história", "O espaço onde ocorre a história", "O conflito dos personagens", "A fala dos personagens"], answer: 0 },
  { question: "Quem conta a história em um texto narrativo?", options: ["O narrador", "O protagonista", "O autor", "O leitor"], answer: 0 },
  { question: "Qual desses é um tipo de narrador?", options: ["Narrador-personagem", "Narrador-ilustrador", "Narrador-público", "Narrador-anônimo"], answer: 0 }
];

// ===============================
// ⚙️ Variáveis globais
// ===============================
let currentQuestion = 0;
let answered = false;
let timer;
let timeLeft = 15;
let playerName = "";
let roomCode = "";

// ===============================
// 🔄 Funções utilitárias
// ===============================
function shuffle(array) {
  return array.sort(() => Math.random() - 0.5);
}

function showScreen(id) {
  document.querySelectorAll(".screen").forEach((s) => s.classList.remove("active"));
  document.getElementById(id).classList.add("active");
}

// ===============================
// 🧩 Lobby
// ===============================
document.getElementById("createRoomBtn").addEventListener("click", () => {
  playerName = document.getElementById("nickname").value.trim();
  if (!playerName) return alert("Digite seu nome!");
  socket.emit("createRoom", { playerName });
});

document.getElementById("joinRoomBtn").addEventListener("click", () => {
  playerName = document.getElementById("nickname").value.trim();
  roomCode = document.getElementById("roomCode").value.trim().toUpperCase();
  if (!playerName || !roomCode) return alert("Preencha nome e código da sala!");
  socket.emit("joinRoom", { playerName, roomCode });
});

// Atualiza lista de jogadores
socket.on("updatePlayers", (players) => {
  const list = document.getElementById("playerList");
  list.innerHTML = "";
  Object.entries(players).forEach(([p, s]) => {
    const li = document.createElement("li");
    li.textContent = `${p} — ${s} pts`;
    list.appendChild(li);
  });
});

// Recebe código da sala
socket.on("roomCreated", (code) => {
  roomCode = code;
  document.getElementById("roomCodeDisplay").textContent = roomCode;
  showScreen("room");
});

// ===============================
// ▶️ Início do jogo
// ===============================
document.getElementById("startGameBtn").addEventListener("click", () => {
  socket.emit("startGame", roomCode);
});

socket.on("gameStarted", () => {
  currentQuestion = 0;
  showScreen("game");
  nextQuestion();
});

// ===============================
// ❓ Exibir pergunta
// ===============================
function nextQuestion() {
  if (currentQuestion >= questions.length) {
    socket.emit("endGame", { roomCode });
    return;
  }

  answered = false;
  timeLeft = 15;
  document.getElementById("roundLabel").textContent = `Pergunta ${currentQuestion + 1}`;
  document.getElementById("timer").textContent = `${timeLeft}s`;

  const q = questions[currentQuestion];
  const shuffledOptions = shuffle([...q.options]);
  const optionsDiv = document.getElementById("options");
  document.getElementById("questionText").textContent = q.question;
  optionsDiv.innerHTML = "";

  shuffledOptions.forEach((opt) => {
    const btn = document.createElement("button");
    btn.textContent = opt;
    btn.className = "option-btn";
    btn.addEventListener("click", () => selectOption(btn, opt, q));
    optionsDiv.appendChild(btn);
  });

  startTimer();
}

// ===============================
// ⏱️ Temporizador
// ===============================
function startTimer() {
  clearInterval(timer);
  timer = setInterval(() => {
    timeLeft--;
    document.getElementById("timer").textContent = `${timeLeft}s`;
    if (timeLeft <= 0) {
      clearInterval(timer);
      revealAnswer();
    }
  }, 1000);
}

// ===============================
// 🟩 Selecionar resposta
// ===============================
function selectOption(button, selected, q) {
  if (answered) return;
  answered = true;
  clearInterval(timer);

  const correct = selected === q.options[q.answer];
  button.classList.add("selected");

  if (correct) {
    soundCorrect.play();
    navigator.vibrate?.(120);
  } else {
    soundWrong.play();
    navigator.vibrate?.([60, 40, 60]);
  }

  socket.emit("answer", { roomCode, playerName, correct });
  revealAnswer(correct);
}

// ===============================
// 🎯 Revelar resposta
// ===============================
function revealAnswer(correct = false) {
  const buttons = document.querySelectorAll(".option-btn");
  const q = questions[currentQuestion];
  buttons.forEach((btn) => {
    btn.disabled = true;
    if (btn.textContent === q.options[q.answer]) {
      btn.classList.add("correct");
    } else if (btn.classList.contains("selected")) {
      btn.classList.add("wrong");
    } else {
      btn.style.opacity = "0.6";
    }
  });

  setTimeout(() => {
    currentQuestion++;
    nextQuestion();
  }, 1500);
}

// ===============================
// 🏁 Final com PÓDIO 🏆
socket.on("gameEnded", (players) => {
  showScreen("results");
  soundVictory.play();
  navigator.vibrate?.([200, 100, 200]);

  const ranking = Object.entries(players).sort((a, b) => b[1] - a[1]);

  const podiumDiv = document.getElementById("podium");
  podiumDiv.innerHTML = "";
  const podiumColors = ["#ffd700", "#c0c0c0", "#cd7f32"];
  const podiumDelays = [0, 300, 600];

  ranking.slice(0, 3).forEach(([p, s], i) => {
    const place = document.createElement("div");
    place.classList.add("place");
    if (i === 0) place.classList.add("first");
    place.style.background = podiumColors[i] || "#fff";
    place.style.animation = `bounceIn 0.6s ease ${podiumDelays[i]}ms both`;
    place.innerHTML = `<div style="font-size:18px;">${i + 1}º</div><div>${p}</div><div>${s} pts</div>`;
    podiumDiv.appendChild(place);
  });

  const finalRanking = document.getElementById("finalRanking");
  finalRanking.innerHTML = ranking
    .map(([p, s], i) => `<p>${i + 1}º — ${p}: ${s} acertos</p>`)
    .join("");
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
