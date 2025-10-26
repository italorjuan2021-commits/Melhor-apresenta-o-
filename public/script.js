// script.js - Versão otimizada e aprimorada 💎
// Compatível com o HTML azul safira

const socket = io();

const screens = {
  lobby: document.getElementById("lobby"),
  room: document.getElementById("room"),
  game: document.getElementById("game"),
  result: document.getElementById("result"),
};

const nicknameInput = document.getElementById("nickname");
const roomCodeInput = document.getElementById("roomCode");
const roomCodeDisplay = document.getElementById("roomCodeDisplay");
const playerList = document.getElementById("playerList");

const questionText = document.getElementById("questionText");
const optionsContainer = document.getElementById("options");
const timerDisplay = document.getElementById("timer");

const finalScore = document.getElementById("final-score");
const accuracyDisplay = document.getElementById("accuracy");

const createRoomBtn = document.getElementById("createRoomBtn");
const joinRoomBtn = document.getElementById("joinRoomBtn");
const startGameBtn = document.getElementById("startGameBtn");
const backToLobbyBtn = document.getElementById("backToLobbyBtn");

// 🎵 Sons de acerto/erro
const soundCorrect = new Audio("/sounds/correct.mp3");
const soundWrong = new Audio("/sounds/wrong.mp3");

// 🧩 Perguntas do jogo
const questions = [
  {
    question: "O que é uma narração?",
    options: ["Um texto que descreve fatos", "Um texto que conta uma história", "Um texto que explica algo", "Um texto de opinião"],
    correct: 1,
  },
  {
    question: "Qual desses é um elemento da narração?",
    options: ["Personagens", "Argumentos", "Dados estatísticos", "Opiniões"],
    correct: 0,
  },
  {
    question: "Quem é o responsável por contar a história?",
    options: ["O narrador", "O leitor", "O personagem secundário", "O autor"],
    correct: 0,
  },
  {
    question: "O tempo na narração indica:",
    options: ["A duração dos fatos", "O clima da história", "O tipo de texto", "O gênero literário"],
    correct: 0,
  },
  {
    question: "Qual desses é um tipo de narrador?",
    options: ["Narrador-personagem", "Narrador-argumentativo", "Narrador-descritivo", "Narrador-técnico"],
    correct: 0,
  },
  {
    question: "Quando o narrador fala em primeira pessoa, ele:",
    options: ["Participa da história", "Apenas observa", "Julga os personagens", "Fala com o leitor"],
    correct: 0,
  },
  {
    question: "O espaço na narração representa:",
    options: ["O local onde os fatos ocorrem", "O tempo da história", "O conflito dos personagens", "O gênero textual"],
    correct: 0,
  },
  {
    question: "O conflito na narração é:",
    options: ["O problema que move a história", "A conclusão da história", "O tempo da narração", "A fala dos personagens"],
    correct: 0,
  },
  {
    question: "O clímax de uma história é:",
    options: ["O momento mais intenso da narrativa", "O começo da história", "A descrição dos personagens", "O desfecho final"],
    correct: 0,
  },
  {
    question: "O desfecho é:",
    options: ["A conclusão da história", "O conflito central", "A introdução", "O ponto de vista do narrador"],
    correct: 0,
  },
];

// Estado local
let roomCode = "";
let nickname = "";
let currentQuestionIndex = 0;
let score = 0;
let timer = null;
let timeLeft = 10;
let answered = false;

// 📱 Navegação entre telas
function showScreen(name) {
  Object.values(screens).forEach((s) => (s.classList.remove("active")));
  screens[name].classList.add("active");
  screens[name].style.animation = "fadeIn 0.6s ease";
}

// 🧠 Criação e entrada em sala
createRoomBtn.onclick = () => {
  nickname = nicknameInput.value.trim();
  if (!nickname) return alert("Digite seu nome!");
  socket.emit("createRoom", nickname);
};

joinRoomBtn.onclick = () => {
  nickname = nicknameInput.value.trim();
  roomCode = roomCodeInput.value.trim();
  if (!nickname || !roomCode) return alert("Preencha todos os campos!");
  socket.emit("joinRoom", { roomCode, nickname });
};

socket.on("roomCreated", (code) => {
  roomCode = code;
  roomCodeDisplay.textContent = code;
  showScreen("room");
});

socket.on("roomJoined", (data) => {
  roomCode = data.roomCode;
  roomCodeDisplay.textContent = data.roomCode;
  updatePlayerList(data.players);
  showScreen("room");
});

socket.on("updatePlayers", (players) => updatePlayerList(players));

function updatePlayerList(players) {
  playerList.innerHTML = players.map(p => `<li>${p}</li>`).join("");
}

// 🎮 Iniciar jogo
startGameBtn.onclick = () => {
  socket.emit("startGame", roomCode);
};

socket.on("startGame", () => {
  currentQuestionIndex = 0;
  score = 0;
  showQuestion();
  showScreen("game");
});

// 🕒 Exibir perguntas com timer
function showQuestion() {
  const q = questions[currentQuestionIndex];
  if (!q) return endGame();

  questionText.textContent = q.question;

  // Embaralhar alternativas
  const shuffled = q.options
    .map((opt, i) => ({ opt, i }))
    .sort(() => Math.random() - 0.5);

  optionsContainer.innerHTML = "";
  shuffled.forEach(({ opt, i }) => {
    const btn = document.createElement("button");
    btn.textContent = opt;
    btn.onclick = () => handleAnswer(i, q.correct, btn);
    optionsContainer.appendChild(btn);
  });

  answered = false;
  timeLeft = 10;
  timerDisplay.textContent = `${timeLeft}s`;
  clearInterval(timer);
  timer = setInterval(updateTimer, 1000);
}

function updateTimer() {
  timeLeft--;
  timerDisplay.textContent = `${timeLeft}s`;
  if (timeLeft <= 0) {
    clearInterval(timer);
    revealAnswer();
    setTimeout(nextQuestion, 2000);
  }
}

// ✅ Verificação de resposta
function handleAnswer(selectedIndex, correctIndex, button) {
  if (answered) return;
  answered = true;
  clearInterval(timer);

  const allButtons = [...optionsContainer.children];
  allButtons.forEach((b) => (b.disabled = true));

  if (selectedIndex === correctIndex) {
    button.style.background = "#4caf50";
    button.style.color = "#fff";
    score += 10;
    soundCorrect.play();
  } else {
    button.style.background = "#f44336";
    button.style.color = "#fff";
    soundWrong.play();
  }

  revealAnswer();
  setTimeout(nextQuestion, 2000);
}

// ✨ Mostrar qual era a certa
function revealAnswer() {
  const q = questions[currentQuestionIndex];
  [...optionsContainer.children].forEach((btn, i) => {
    if (i === q.correct) {
      btn.style.borderColor = "#00ff88";
      btn.style.boxShadow = "0 0 10px #00ff88";
    }
  });
}

// ⏭️ Próxima pergunta
function nextQuestion() {
  currentQuestionIndex++;
  if (currentQuestionIndex >= questions.length) {
    endGame();
  } else {
    showQuestion();
  }
}

// 🏁 Fim do jogo
function endGame() {
  showScreen("result");
  finalScore.textContent = `Pontuação: ${score}`;
  const accuracy = ((score / (questions.length * 10)) * 100).toFixed(0);
  accuracyDisplay.textContent = `Aproveitamento: ${accuracy}%`;
  socket.emit("playerFinished", { roomCode, nickname, score });
}

// 📊 Receber ranking final
socket.on("showRanking", (ranking) => {
  const rankingDiv = document.createElement("div");
  rankingDiv.innerHTML = `<h3>Classificação Final 🏅</h3>` +
    ranking.map((r, i) => `
      <p><strong>${i + 1}º</strong> ${r.nickname} — ${r.score} pts</p>
    `).join("");
  screens.result.appendChild(rankingDiv);
});

// 🔁 Voltar ao início
backToLobbyBtn.onclick = () => {
  showScreen("lobby");
};
