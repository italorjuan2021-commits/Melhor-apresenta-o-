const socket = io();

// ======= ELEMENTOS =======
const screens = {
  lobby: document.getElementById("lobby"),
  game: document.getElementById("game"),
  result: document.getElementById("result"),
};

const nicknameInput = document.getElementById("nickname");
const roomCodeInput = document.getElementById("room-code");
const createBtn = document.getElementById("create-room");
const joinBtn = document.getElementById("join-room");
const playAgainBtn = document.getElementById("play-again");

const roomDisplay = document.getElementById("room-display");
const questionText = document.getElementById("question-text");
const optionsContainer = document.getElementById("options");
const timerBar = document.getElementById("timer-fill");
const rankingContainer = document.getElementById("ranking");

const clickSound = document.getElementById("click-sound");
const correctSound = document.getElementById("correct-sound");
const wrongSound = document.getElementById("wrong-sound");

let currentRoom = "";
let playerName = "";
let selected = false;
let timerInterval;
let timeLeft = 10;
let questionIndex = 0;
let questions = [];
let score = 0;
let totalAnswered = 0;
let answeredPlayers = 0;
let totalPlayers = 1;

// ======= PERGUNTAS (10) =======
questions = [
  {
    question: "O que é uma narração?",
    options: [
      "Um texto que conta uma história com personagens e tempo",
      "Uma explicação científica sobre fatos",
      "Uma lista de instruções ou regras",
      "Uma descrição detalhada de um lugar"
    ],
    answer: 0,
  },
  {
    question: "O que geralmente inicia uma narrativa?",
    options: [
      "Apresentação de personagens e cenário",
      "Conclusão da história",
      "Conflito final",
      "Moral da história"
    ],
    answer: 0,
  },
  {
    question: "Qual é o elemento principal da narração?",
    options: [
      "Personagem",
      "Tempo verbal",
      "Verbo de ligação",
      "Figura de linguagem"
    ],
    answer: 0,
  },
  {
    question: "O narrador que participa da história é chamado de:",
    options: [
      "Narrador-personagem",
      "Narrador-observador",
      "Narrador-onisciente",
      "Narrador-coadjuvante"
    ],
    answer: 0,
  },
  {
    question: "Qual é o tempo verbal mais comum em narrativas?",
    options: ["Pretérito perfeito", "Futuro do presente", "Presente do indicativo", "Infinitivo"],
    answer: 0,
  },
  {
    question: "O conflito em uma narração serve para:",
    options: [
      "Gerar interesse e movimentar a história",
      "Apresentar o título",
      "Definir o espaço físico",
      "Indicar o narrador"
    ],
    answer: 0,
  },
  {
    question: "Qual dessas opções representa um enredo?",
    options: [
      "A sequência de acontecimentos da história",
      "A descrição de um objeto",
      "O pensamento do narrador",
      "A moral da história"
    ],
    answer: 0,
  },
  {
    question: "O desfecho da história é o momento em que:",
    options: [
      "Os conflitos são resolvidos",
      "O narrador é apresentado",
      "A história começa",
      "Os personagens são descritos"
    ],
    answer: 0,
  },
  {
    question: "Qual é a diferença entre narrador e autor?",
    options: [
      "O narrador conta a história; o autor cria a história",
      "O autor conta a história; o narrador cria a história",
      "Ambos são o mesmo",
      "O narrador é sempre o protagonista"
    ],
    answer: 0,
  },
  {
    question: "O clímax de uma narrativa é:",
    options: [
      "O ponto mais intenso do conflito",
      "O início da história",
      "A conclusão da moral",
      "A descrição dos personagens"
    ],
    answer: 0,
  },
];

// ======= FUNÇÕES =======
function showScreen(name) {
  Object.values(screens).forEach(s => s.classList.remove("active"));
  screens[name].classList.add("active");
}

function shuffle(array) {
  return array.sort(() => Math.random() - 0.5);
}

function playSound(audio) {
  audio.currentTime = 0;
  audio.play();
}

function startTimer() {
  clearInterval(timerInterval);
  timeLeft = 10;
  timerBar.style.width = "100%";
  timerInterval = setInterval(() => {
    timeLeft--;
    timerBar.style.width = `${(timeLeft / 10) * 100}%`;
    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      if (!selected) {
        disableOptions();
        socket.emit("playerAnswered", { room: currentRoom, player: playerName, correct: false });
      }
    }
  }, 1000);
}

function disableOptions() {
  document.querySelectorAll(".option").forEach(btn => btn.classList.add("disabled"));
}

// ======= EVENTOS DO LOBBY =======
createBtn.onclick = () => {
  playerName = nicknameInput.value.trim();
  if (!playerName) return alert("Digite seu nome!");
  playSound(clickSound);
  socket.emit("createRoom", playerName);
};

joinBtn.onclick = () => {
  playerName = nicknameInput.value.trim();
  const room = roomCodeInput.value.trim().toUpperCase();
  if (!playerName || !room) return alert("Preencha todos os campos!");
  playSound(clickSound);
  socket.emit("joinRoom", { playerName, room });
};

playAgainBtn.onclick = () => {
  location.reload();
};

// ======= SOCKET.IO =======
socket.on("roomCreated", room => {
  currentRoom = room;
  roomDisplay.textContent = "Sala: " + room;
  showScreen("game");
  socket.emit("startGame", { room, questions });
});

socket.on("joinedRoom", room => {
  currentRoom = room;
  roomDisplay.textContent = "Sala: " + room;
  showScreen("game");
});

socket.on("startQuestion", qData => {
  showScreen("game");
  renderQuestion(qData);
});

socket.on("allAnswered", () => {
  revealCorrect();
});

socket.on("gameOver", ranking => {
  renderRanking(ranking);
  showScreen("result");
});

// ======= RENDER PERGUNTAS =======
function renderQuestion(qData) {
  selected = false;
  questionText.textContent = qData.question;
  optionsContainer.innerHTML = "";

  const randomized = shuffle([...qData.options]);
  randomized.forEach(opt => {
    const btn = document.createElement("div");
    btn.textContent = opt;
    btn.classList.add("option");
    btn.onclick = () => {
      if (selected) return;
      selected = true;
      disableOptions();

      const isCorrect = opt === qData.options[qData.answer];
      if (isCorrect) {
        btn.classList.add("correct");
        playSound(correctSound);
      } else {
        btn.classList.add("wrong");
        playSound(wrongSound);
      }

      socket.emit("playerAnswered", {
        room: currentRoom,
        player: playerName,
        correct: isCorrect,
      });
    };
    optionsContainer.appendChild(btn);
  });

  startTimer();
}

function revealCorrect() {
  document.querySelectorAll(".option").forEach(btn => {
    if (btn.textContent === questions[questionIndex].options[questions[questionIndex].answer]) {
      btn.classList.add("correct");
    }
  });
}

function renderRanking(ranking) {
  rankingContainer.innerHTML = "<h3>Ranking Final</h3>";
  ranking.forEach((p, i) => {
    const el = document.createElement("p");
    el.textContent = `${i + 1}. ${p.name} — ${p.score} pts`;
    rankingContainer.appendChild(el);
  });
}
