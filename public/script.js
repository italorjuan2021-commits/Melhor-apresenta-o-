// ===============================
// 🔊 Sons de acerto e erro
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
// ⚙️ Variáveis globais
// ===============================
let socket = io();
let playerName = "";
let roomCode = "";
let totalPlayers = {};
let currentQuestion = 0;
let score = 0;
let answered = false;
let timer;
let timeLeft = 8;

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
// 🔄 Funções utilitárias
// ===============================
function shuffle(array) { return array.sort(() => Math.random() - 0.5); }
function showScreen(id) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  document.getElementById(id).classList.add("active");
}

// ===============================
// 🧩 Lobby
// ===============================
document.getElementById("createRoomBtn").addEventListener("click", () => {
  playerName = document.getElementById("nickname").value.trim();
  if(!playerName) return alert("Digite seu nome!");
  roomCode = Math.random().toString(36).substring(2,7).toUpperCase();
  joinRoom();
});

document.getElementById("joinRoomBtn").addEventListener("click", () => {
  playerName = document.getElementById("nickname").value.trim();
  roomCode = document.getElementById("roomCode").value.trim().toUpperCase();
  if(!playerName || !roomCode) return alert("Preencha nome e código da sala!");
  joinRoom();
});

function joinRoom() {
  socket.emit("joinRoom", { playerName, roomCode });
  document.getElementById("roomCodeDisplay").textContent = roomCode;
  showScreen("room");
}

// ===============================
// 🏁 Início do jogo
// ===============================
document.getElementById("startGameBtn").addEventListener("click", () => {
  socket.emit("startGame", roomCode);
  currentQuestion = 0;
  score = 0;
  totalPlayers[playerName] = 0;
  showScreen("game");
  nextQuestion();
});

// ===============================
// ❓ Exibir pergunta
// ===============================
function nextQuestion() {
  if(currentQuestion >= questions.length) return endGame();

  answered = false;
  timeLeft = 8;
  document.getElementById("roundLabel").textContent = `Pergunta ${currentQuestion + 1}`;
  document.getElementById("timer").textContent = `${timeLeft}s`;

  const q = questions[currentQuestion];
  const optionsDiv = document.getElementById("options");
  optionsDiv.innerHTML = "";
  const shuffledOptions = shuffle([...q.options]);

  shuffledOptions.forEach(opt => {
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
    if(timeLeft <= 0) {
      clearInterval(timer);
      revealAnswer();
    }
  }, 1000);
}

// ===============================
// 🟩 Selecionar resposta
// ===============================
function selectOption(button, selected, q) {
  if(answered) return;
  answered = true;
  clearInterval(timer);

  const correct = selected === q.options[q.answer];
  button.classList.add("selected");

  if(correct){
    score++;
    playCorrectSound();
    navigator.vibrate?.(120);
  } else {
    playWrongSound();
    navigator.vibrate?.([60,40,60]);
  }

  revealAnswer(correct);
}

// ===============================
// 🎯 Revelar resposta
// ===============================
function revealAnswer(correct = false) {
  const buttons = document.querySelectorAll(".option-btn");
  const q = questions[currentQuestion];

  buttons.forEach(btn => {
    btn.disabled = true;
    if(btn.textContent === q.options[q.answer]) btn.classList.add("correct");
    else if(btn.classList.contains("selected")) btn.classList.add("wrong");
    else btn.style.opacity = "0.6";
  });

  totalPlayers[playerName] = score;
  socket.emit("updateScore", { roomCode, playerName, score });

  setTimeout(() => {
    currentQuestion++;
    nextQuestion();
  }, 800); // 8 segundos entre perguntas
}

// ===============================
// 🏆 Final com PÓDIO
// ===============================
function endGame() {
  showScreen("results");
  const podiumDiv = document.getElementById("podium");
  podiumDiv.innerHTML = "";
  playCorrectSound();

  const ranking = Object.entries(totalPlayers).sort((a,b)=>b[1]-a[1]);
  const podiumColors = ["#ffd700","#c0c0c0","#cd7f32"];

  ranking.slice(0,3).forEach(([p,s], i) => {
    const place = document.createElement("div");
    place.classList.add("place");
    if(i===0) place.classList.add("first");
    place.style.background = podiumColors[i] || "#fff";
    place.style.animation = `bounceIn 0.6s ease ${i*300}ms both`;
    place.innerHTML = `<div style="font-size:18px;">${i+1}º</div><div>${p}</div><div>${s} pts</div>`;
    podiumDiv.appendChild(place);
  });

  document.getElementById("finalRanking").innerHTML = ranking.map(([p,s],i)=>`<p>${i+1}º — ${p}: ${s} acertos</p>`).join("");
}

// ===============================
// 🔁 Voltar ao lobby
// ===============================
document.getElementById("backToLobbyBtn").addEventListener("click", () => {
  showScreen("lobby");
  document.getElementById("nickname").value = "";
  document.getElementById("roomCode").value = "";
});

// ===============================
// 💃 Animações extras
// ===============================
const style = document.createElement("style");
style.textContent = `
@keyframes bounceIn {
  0% { transform: translateY(80px); opacity:0; }
  60% { transform: translateY(-10px); opacity:1; }
  80% { transform: translateY(5px); }
  100% { transform: translateY(0); }
}`;
document.head.appendChild(style);

// ===============================
// 📡 Socket eventos simples para ranking
// ===============================
socket.on("updatePlayers", players => {
  totalPlayers = players;
  const list = document.getElementById("playerList");
  list.innerHTML = "";
  Object.entries(players).forEach(([p,s])=>{
    const li = document.createElement("li");
    li.textContent = `${p} — ${s} pts`;
    list.appendChild(li);
  });
});
