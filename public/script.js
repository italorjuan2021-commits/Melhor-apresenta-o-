// ===============================
// 🔊 Sons embutidos (base64)
const soundCorrect = new Audio("data:audio/mp3;base64,SUQzAwAAAAAAFlRFTkMAAA..."); // ding
const soundWrong   = new Audio("data:audio/mp3;base64,SUQzAwAAAAAAFlRFTkMAAA..."); // buzz
const soundVictory = new Audio("data:audio/mp3;base64,SUQzAwAAAAAAFlRFTkMAAAAAPAAABEV4YW1wbGUgVmljdG9yeSBTb3VuZA...");

// ===============================
// ⚙️ Socket.IO
const socket = io();

// ===============================
// ⚙️ Variáveis globais
let questions = [];
let currentQuestion = 0;
let answered = false;
let timer;
let timeLeft = 10;
let playerName = "";
let roomCode = "";
let roomPlayers = {};

// ===============================
// 🔄 Utilitários
function shuffle(array) { return array.sort(() => Math.random() - 0.5); }
function showScreen(id) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  document.getElementById(id).classList.add("active");
}

// ===============================
// 🧩 Lobby
document.getElementById("createRoomBtn").addEventListener("click", () => {
  playerName = document.getElementById("nickname").value.trim();
  if (!playerName) return alert("Digite seu nome!");
  socket.emit("createRoom", playerName);
});

document.getElementById("joinRoomBtn").addEventListener("click", () => {
  playerName = document.getElementById("nickname").value.trim();
  roomCode = document.getElementById("roomCode").value.trim().toUpperCase();
  if (!playerName || !roomCode) return alert("Preencha nome e código da sala!");
  socket.emit("joinRoom", { playerName, roomCode });
});

// ===============================
// Atualiza lista de jogadores
socket.on("updatePlayers", players => {
  roomPlayers = players;
  const list = document.getElementById("playerList");
  list.innerHTML = "";
  Object.values(players).forEach(p => {
    const li = document.createElement("li");
    li.textContent = `${p.name} — ${p.score} pts`;
    list.appendChild(li);
  });
});

// ===============================
// Recebe código da sala criada
socket.on("roomCreated", code => {
  roomCode = code;
  document.getElementById("roomCodeDisplay").textContent = roomCode;
  showScreen("room");
});

// ===============================
// ▶️ Iniciar jogo
document.getElementById("startGameBtn").addEventListener("click", () => {
  socket.emit("startGame", roomCode);
});

// ===============================
// Recebe pergunta do servidor
socket.on("startQuestion", data => {
  questions[currentQuestion] = data; // garante compatibilidade
  showScreen("game");
  displayQuestion(data);
  startTimer(data.time || 10);
});

// ===============================
// ⏱️ Temporizador controlado pelo servidor
function startTimer(duration) {
  clearInterval(timer);
  timeLeft = duration;
  document.getElementById("timer").textContent = `${timeLeft}s`;
  timer = setInterval(() => {
    timeLeft--;
    document.getElementById("timer").textContent = `${timeLeft}s`;
    if (timeLeft <= 0) {
      clearInterval(timer);
      if (!answered) autoTimeout();
    }
  }, 1000);
}

// ===============================
// ❌ Auto timeout
function autoTimeout() {
  answered = true;
  document.getElementById("roundStatus").textContent = "Tempo esgotado!";
  revealAnswer(null); // não marcou ninguém
  socket.emit("answer", { roomCode, playerName, correct: false });
}

// ===============================
// 🟩 Exibir pergunta e alternativas
function displayQuestion(qData) {
  answered = false;
  const optionsDiv = document.getElementById("options");
  document.getElementById("questionText").textContent = qData.question;
  document.getElementById("roundLabel").textContent = `Pergunta ${currentQuestion + 1}`;
  document.getElementById("roundStatus").textContent = "";
  optionsDiv.innerHTML = "";

  const shuffled = shuffle([...qData.options]);
  shuffled.forEach(opt => {
    const btn = document.createElement("button");
    btn.className = "option-btn";
    btn.textContent = opt;
    btn.addEventListener("click", () => selectOption(btn, opt, qData));
    optionsDiv.appendChild(btn);
  });
}

// ===============================
// 🖱️ Selecionar resposta
function selectOption(btn, selected, qData) {
  if (answered) return;
  answered = true;
  clearInterval(timer);

  const correct = selected === qData.options[qData.correct];
  btn.classList.add("selected");
  if (correct) { soundCorrect.play(); navigator.vibrate?.(120); }
  else { soundWrong.play(); navigator.vibrate?.([60, 40, 60]); }

  document.getElementById("roundStatus").textContent = "Aguardando outros jogadores...";
  socket.emit("answer", { roomCode, playerName, correct });
  revealAnswer(correct);
}

// ===============================
// 🎯 Revelar resposta
function revealAnswer(correct) {
  const buttons = document.querySelectorAll(".option-btn");
  const q = questions[currentQuestion];
  buttons.forEach(btn => {
    btn.disabled = true;
    if (q && btn.textContent === q.options[q.correct]) btn.classList.add("correct");
    else if (btn.classList.contains("selected")) btn.classList.add("wrong");
    else btn.style.opacity = "0.6";
  });
}

// ===============================
// Servidor manda avançar
socket.on("timeUp", data => revealAnswer(true));
socket.on("nextQuestion", () => { currentQuestion++; });
socket.on("showResults", players => {
  showScreen("results");
  soundVictory.play();
  navigator.vibrate?.([200, 100, 200]);

  const podiumDiv = document.getElementById("podium");
  podiumDiv.innerHTML = "";
  const podiumColors = ["#ffd700", "#c0c0c0", "#cd7f32"];
  const podiumDelays = [0, 300, 600];

  const ranking = Object.entries(players).sort((a, b) => b[1] - a[1]);
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
  finalRanking.innerHTML = ranking.map(([p, s], i) => `<p>${i + 1}º — ${p}: ${s} acertos</p>`).join("");
});

// ===============================
// Voltar ao lobby
document.getElementById("backToLobbyBtn").addEventListener("click", () => showScreen("lobby"));

// ===============================
// 💃 Animações pódio
const style = document.createElement("style");
style.textContent = `
@keyframes bounceIn {
  0% { transform: translateY(80px); opacity: 0; }
  60% { transform: translateY(-10px); opacity: 1; }
  80% { transform: translateY(5px); }
  100% { transform: translateY(0); }
}`;
document.head.appendChild(style);
