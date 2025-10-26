// ===============================
// 📦 Perguntas (mesmo que você já tem)
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
let socket;
let timeLeft = 8;

// ===============================
// 🔊 Sons
// ===============================
function playCorrectSound() {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.connect(g); g.connect(ctx.destination);
  o.type = "sine"; o.frequency.value = 880;
  g.gain.value = 0.1;
  o.start(); o.stop(ctx.currentTime + 0.2);
}

function playWrongSound() {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.connect(g); g.connect(ctx.destination);
  o.type = "sawtooth"; o.frequency.value = 200;
  g.gain.value = 0.1;
  o.start(); o.stop(ctx.currentTime + 0.3);
}

// ===============================
// 🧩 Lobby
// ===============================
document.getElementById("createRoomBtn").addEventListener("click", () => {
  playerName = document.getElementById("nickname").value.trim();
  if (!playerName) return alert("Digite seu nome!");
  initSocket();
  socket.emit("createRoom", playerName);
});

document.getElementById("joinRoomBtn").addEventListener("click", () => {
  playerName = document.getElementById("nickname").value.trim();
  roomCode = document.getElementById("roomCode").value.trim().toUpperCase();
  if (!playerName || !roomCode) return alert("Preencha nome e código da sala!");
  initSocket();
  socket.emit("joinRoom", { roomCode, playerName });
});

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
// ▶️ Botão iniciar jogo
// ===============================
document.getElementById("startGameBtn").addEventListener("click", () => {
  socket.emit("startGame", roomCode);
});

// ===============================
// 🔌 Conexão Socket.IO
// ===============================
function initSocket() {
  if (socket) return;
  socket = io();

  // Receber código ao criar
  socket.on("roomCreated", code => {
    roomCode = code;
    document.getElementById("roomCodeDisplay").textContent = code;
    showScreen("room");
  });

  // Receber dados da sala ao entrar
  socket.on("roomJoined", data => {
    roomCode = data.roomCode;
    showScreen("room");
    updatePlayerList(data.players);
    document.getElementById("roomCodeDisplay").textContent = roomCode;
  });

  // Atualizar lista de jogadores
  socket.on("updatePlayers", players => {
    updatePlayerList(players);
  });

  // Pré-start
  socket.on("preStart", data => {
    document.getElementById("timer").textContent = `${data.seconds}s`;
  });

  // Receber pergunta
  socket.on("question", data => {
    showScreen("game");
    displayQuestion(data);
    startTimer(data.time);
  });

  // Revelar resposta
  socket.on("reveal", data => {
    revealAnswer(data.correctIndex);
  });

  // Resultado final
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
      place.style.animation = `bounceIn 0.6s ease ${i*300}ms both`;
      place.innerHTML = `<div style="font-size:18px;">${i+1}º</div><div>${p.name}</div><div>${p.score} pts</div>`;
      podiumDiv.appendChild(place);
    });
    const finalRanking = document.getElementById("finalRanking");
    finalRanking.innerHTML = ranking.map((p,i)=>`<p>${i+1}º — ${p.name}: ${p.correctCount} acertos</p>`).join("");
  });
}

// ===============================
// ❓ Exibir pergunta
// ===============================
function displayQuestion(data) {
  document.getElementById("roundLabel").textContent = `Pergunta ${data.index + 1}`;
  document.getElementById("questionText").textContent = data.question;
  const optionsDiv = document.getElementById("options");
  optionsDiv.innerHTML = "";

  data.options.forEach((opt, i) => {
    const btn = document.createElement("button");
    btn.textContent = opt;
    btn.className = "option-btn";
    btn.addEventListener("click", () => {
      socket.emit("answer", { roomCode, playerName, answerIndex: i });
    });
    optionsDiv.appendChild(btn);
  });
}

// ===============================
// ⏱️ Temporizador sincronizado
// ===============================
let timerInterval;
function startTimer(seconds) {
  clearInterval(timerInterval);
  timeLeft = seconds;
  document.getElementById("timer").textContent = `${timeLeft}s`;
  timerInterval = setInterval(() => {
    timeLeft--;
    document.getElementById("timer").textContent = `${timeLeft}s`;
    if (timeLeft <= 0) clearInterval(timerInterval);
  }, 1000);
}

// ===============================
// 🎯 Revelar resposta
// ===============================
function revealAnswer(correctIndex) {
  clearInterval(timerInterval);
  const buttons = document.querySelectorAll(".option-btn");
  buttons.forEach((btn,i) => {
    btn.disabled = true;
    if(i===correctIndex) btn.classList.add("correct");
    else if(btn.classList.contains("selected")) btn.classList.add("wrong");
    else btn.style.opacity="0.6";
  });
}

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
