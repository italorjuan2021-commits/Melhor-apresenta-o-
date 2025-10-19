<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Quiz de Narração</title>
  <link rel="stylesheet" href="style.css" />
</head>
<body>
  <div id="app">
    <!-- Tela do Lobby -->
    <div id="lobby" class="screen active">
      <h1>🎮 Quiz de Narração</h1>
      <p>Entre com seu nome e o código da sala</p>
      <input type="text" id="nickname" placeholder="Seu nome..." />
      <input type="text" id="roomCode" placeholder="Código da sala..." />
      <div class="buttons">
        <button id="createRoom">Criar Sala</button>
        <button id="joinRoom">Entrar na Sala</button>
      </div>
    </div>

    <!-- Tela da Sala -->
    <div id="room" class="screen">
      <h2>Sala <span id="roomName"></span></h2>
      <div id="players"></div>
      <button id="startGame" class="start">Começar Jogo</button>
    </div>

    <!-- Tela do Quiz -->
    <div id="quiz" class="screen">
      <div id="questionBox">
        <h2 id="questionText"></h2>
        <div id="options"></div>
        <p id="timer">Tempo: <span id="time">32</span>s</p>
      </div>
    </div>

    <!-- Tela do Ranking -->
    <div id="ranking" class="screen">
      <h2>🏆 Placar Final</h2>
      <ol id="rankingList"></ol>
      <button id="backToLobby">Voltar ao Lobby</button>
    </div>
  </div>

  <script src="script.js"></script>
</body>
</html>
const screens = {
  lobby: document.getElementById('lobby'),
  room: document.getElementById('room'),
  quiz: document.getElementById('quiz'),
  ranking: document.getElementById('ranking')
};

const nicknameInput = document.getElementById('nickname');
const roomCodeInput = document.getElementById('roomCode');
const roomName = document.getElementById('roomName');
const playersDiv = document.getElementById('players');
const questionText = document.getElementById('questionText');
const optionsDiv = document.getElementById('options');
const rankingList = document.getElementById('rankingList');
const timeDisplay = document.getElementById('time');

let players = [];
let currentQuestion = 0;
let timer;
let timeLeft = 32;
let roomCode = '';
let myName = '';

const questions = [
  {
    q: "O que é uma narração?",
    a: ["Um tipo de texto que relata ações e acontecimentos", "Um texto que descreve objetos", "Um diálogo entre personagens", "Uma lista de instruções"],
    c: 0
  },
  {
    q: "Qual desses é um elemento da narração?",
    a: ["Personagem", "Rima", "Argumento", "Tese"],
    c: 0
  },
  {
    q: "Quem é o responsável por contar a história?",
    a: ["O narrador", "O leitor", "O autor", "O editor"],
    c: 0
  },
  {
    q: "O tempo na narração indica...",
    a: ["Quando os fatos ocorrem", "A velocidade da leitura", "O ritmo do texto", "O número de personagens"],
    c: 0
  },
  {
    q: "O espaço na narração é...",
    a: ["O lugar onde se passa a história", "O ambiente da redação", "O espaço entre parágrafos", "O contexto linguístico"],
    c: 0
  },
  {
    q: "A sequência lógica dos fatos é chamada de...",
    a: ["Enredo", "Descrição", "Argumento", "Ritmo"],
    c: 0
  },
  {
    q: "Qual é a função principal de um texto narrativo?",
    a: ["Contar uma história", "Convencer o leitor", "Informar fatos", "Ensinar regras"],
    c: 0
  },
  {
    q: "Um conto é um exemplo de...",
    a: ["Texto narrativo", "Texto injuntivo", "Texto dissertativo", "Texto publicitário"],
    c: 0
  },
  {
    q: "O conflito em uma narrativa é...",
    a: ["O problema central da história", "O clímax do enredo", "O espaço onde ocorre a ação", "O final da narrativa"],
    c: 0
  },
  {
    q: "Quando o narrador participa da história, ele é...",
    a: ["Narrador-personagem", "Narrador-observador", "Narrador-onisciente", "Narrador-terceiro"],
    c: 0
  }
];

// Troca de telas
function show(screen) {
  Object.values(screens).forEach(s => s.classList.remove('active'));
  screen.classList.add('active');
}

// Criar sala
document.getElementById('createRoom').onclick = () => {
  myName = nicknameInput.value.trim();
  if (!myName) return alert("Digite seu nome!");
  roomCode = Math.floor(Math.random() * 90000 + 10000).toString();
  roomName.textContent = roomCode;
  players = [{ name: myName, score: 0 }];
  updatePlayers();
  show(screens.room);
};

// Entrar em sala
document.getElementById('joinRoom').onclick = () => {
  myName = nicknameInput.value.trim();
  const code = roomCodeInput.value.trim();
  if (!myName || !code) return alert("Digite nome e código!");
  roomCode = code;
  players.push({ name: myName, score: 0 });
  roomName.textContent = roomCode;
  updatePlayers();
  show(screens.room);
};

function updatePlayers() {
  playersDiv.innerHTML = players.map(p => `👤 ${p.name}`).join('<br>');
}

// Começar jogo
document.getElementById('startGame').onclick = () => {
  show(screens.quiz);
  currentQuestion = 0;
  startQuestion();
};

// Perguntas
function startQuestion() {
  const q = questions[currentQuestion];
  questionText.textContent = q.q;
  optionsDiv.innerHTML = '';
  q.a.forEach((option, i) => {
    const btn = document.createElement('button');
    btn.textContent = option;
    btn.onclick = () => checkAnswer(i);
    optionsDiv.appendChild(btn);
  });
  startTimer();
}

function startTimer() {
  timeLeft = 32;
  timeDisplay.textContent = timeLeft;
  timer = setInterval(() => {
    timeLeft--;
    timeDisplay.textContent = timeLeft;
    if (timeLeft <= 0) {
      clearInterval(timer);
      nextQuestion();
    }
  }, 1000);
}

function checkAnswer(i) {
  const correct = questions[currentQuestion].c;
  if (i === correct) {
    const player = players.find(p => p.name === myName);
    player.score += 10;
  }
  clearInterval(timer);
  nextQuestion();
}

function nextQuestion() {
  currentQuestion++;
  if (currentQuestion < questions.length) {
    startQuestion();
  } else {
    showRanking();
  }
}

// Ranking
function showRanking() {
  show(screens.ranking);
  const sorted = players.sort((a, b) => b.score - a.score);
  rankingList.innerHTML = sorted.map((p, i) => `
    <li>${i + 1}º ${p.name} — ${p.score} pts</li>
  `).join('');
}

document.getElementById('backToLobby').onclick = () => {
  show(screens.lobby);
};
:root {
  --azul-safira: #0a192f;
  --azul-brilho: #1f6feb;
  --texto: #e6f1ff;
  --cinza: #112240;
}

body {
  margin: 0;
  font-family: 'Poppins', sans-serif;
  background-color: var(--azul-safira);
  color: var(--texto);
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
}

.screen {
  display: none;
  flex-direction: column;
  align-items: center;
  gap: 15px;
  background-color: var(--cinza);
  padding: 30px;
  border-radius: 20px;
  box-shadow: 0 0 20px #0005;
  text-align: center;
  width: 90%;
  max-width: 400px;
}

.screen.active {
  display: flex;
}

input {
  padding: 10px;
  border-radius: 8px;
  border: none;
  outline: none;
  width: 80%;
  text-align: center;
}

button {
  padding: 10px 20px;
  background-color: var(--azul-brilho);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: 0.3s;
}

button:hover {
  background-color: #388bfd;
}

#players {
  width: 100%;
  background-color: #091a30;
  padding: 10px;
  border-radius: 10px;
  text-align: left;
  max-height: 200px;
  overflow-y: auto;
}

#options button {
  display: block;
  margin: 8px 0;
  width: 100%;
}

#rankingList {
  text-align: left;
  width: 100%;
}

#rankingList li {
  background: #091a30;
  margin: 5px 0;
  padding: 10px;
  border-radius: 10px;
}
