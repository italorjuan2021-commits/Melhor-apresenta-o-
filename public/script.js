const lobbyScreen = document.getElementById("lobby");
const roomScreen = document.getElementById("room");
const gameScreen = document.getElementById("game");
const resultScreen = document.getElementById("result");

const nicknameInput = document.getElementById("nickname");
const roomCodeInput = document.getElementById("roomCode");
const createRoomBtn = document.getElementById("createRoomBtn");
const joinRoomBtn = document.getElementById("joinRoomBtn");
const roomCodeDisplay = document.getElementById("roomCodeDisplay");
const playerList = document.getElementById("playerList");
const startGameBtn = document.getElementById("startGameBtn");
const backToLobbyBtn = document.getElementById("backToLobbyBtn");

const questionText = document.getElementById("questionText");
const optionsContainer = document.getElementById("options");
const timerDisplay = document.getElementById("timer");
const roundLabel = document.getElementById("roundLabel");

const finalScoreEl = document.getElementById("final-score");
const accuracyEl = document.getElementById("accuracy");

let players = [];
let currentPlayer = {};
let roomCode = "";
let currentQuestion = 0;
let score = 0;
let timer;
let timeLeft = 10;

// Simulação de perguntas
const questions = [
  {
    q: "O que é uma narração?",
    a: ["Um texto que descreve sentimentos", "Um texto que relata fatos", "Um texto argumentativo", "Uma conversa informal"],
    correct: 1
  },
  {
    q: "Qual é o principal elemento da narração?",
    a: ["Personagem", "Tema", "Narrador", "Rima"],
    correct: 2
  },
  {
    q: "O tempo da história indica...",
    a: ["Quando e quanto tempo se passa", "O local onde ocorre", "O autor da história", "O conflito dos personagens"],
    correct: 0
  },
  {
    q: "Quem conta a história é o...",
    a: ["Personagem", "Narrador", "Leitor", "Autor"],
    correct: 1
  }
];

function showScreen(id) {
  [lobbyScreen, roomScreen, gameScreen, resultScreen].forEach(s => s.classList.remove("active"));
  document.getElementById(id).classList.add("active");
}

createRoomBtn.onclick = () => {
  if (!nicknameInput.value.trim()) return alert("Digite seu nome!");
  roomCode = Math.random().toString(36).substring(2, 6).toUpperCase();
  roomCodeDisplay.textContent = roomCode;
  players = [nicknameInput.value.trim()];
  currentPlayer.name = nicknameInput.value.trim();
  updatePlayerList();
  showScreen("room");
};

joinRoomBtn.onclick = () => {
  if (!roomCodeInput.value.trim() || !nicknameInput.value.trim()) return alert("Preencha todos os campos!");
  roomCode = roomCodeInput.value.trim().toUpperCase();
  currentPlayer.name = nicknameInput.value.trim();
  players.push(currentPlayer.name);
  roomCodeDisplay.textContent = roomCode;
  updatePlayerList();
  showScreen("room");
};

startGameBtn.onclick = () => startGame();
backToLobbyBtn.onclick = () => location.reload();

function updatePlayerList() {
  playerList.innerHTML = players.map(p => `<li>${p}</li>`).join("");
}

function startGame() {
  showScreen("game");
  score = 0;
  currentQuestion = 0;
  showQuestion();
}

function showQuestion() {
  if (currentQuestion >= questions.length) return endGame();

  const q = questions[currentQuestion];
  questionText.textContent = q.q;
  roundLabel.textContent = `Pergunta ${currentQuestion + 1}`;
  optionsContainer.innerHTML = "";

  q.a.forEach((opt, i) => {
    const btn = document.createElement("button");
    btn.textContent = opt;
    btn.onclick = () => selectAnswer(i);
    optionsContainer.appendChild(btn);
  });

  startTimer();
}

function startTimer() {
  timeLeft = 10;
  timerDisplay.textContent = `${timeLeft}s`;
  clearInterval(timer);
  timer = setInterval(() => {
    timeLeft--;
    timerDisplay.textContent = `${timeLeft}s`;

    if (timeLeft <= 0) {
      clearInterval(timer);
      lockAnswers();
      setTimeout(() => nextQuestion(), 1000);
    }
  }, 1000);
}

function selectAnswer(index) {
  clearInterval(timer);
  const q = questions[currentQuestion];
  const buttons = optionsContainer.querySelectorAll("button");

  buttons.forEach((btn, i) => {
    btn.disabled = true;
    if (i === q.correct) btn.classList.add("correct");
    else if (i === index && i !== q.correct) btn.classList.add("wrong");
  });

  if (index === q.correct) score++;

  setTimeout(() => nextQuestion(), 1000);
}

function lockAnswers() {
  const q = questions[currentQuestion];
  const buttons = optionsContainer.querySelectorAll("button");

  buttons.forEach((btn, i) => {
    btn.disabled = true;
    if (i === q.correct) btn.classList.add("correct");
  });
}

function nextQuestion() {
  currentQuestion++;
  showQuestion();
}

function endGame() {
  showScreen("result");
  finalScoreEl.textContent = `Pontuação: ${score}/${questions.length}`;
  const accuracy = Math.round((score / questions.length) * 100);
  accuracyEl.textContent = `Aproveitamento: ${accuracy}%`;
}
