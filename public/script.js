// ==========================
// CONFIGURAÇÕES INICIAIS
// ==========================
const screens = {
  lobby: document.getElementById("lobby"),
  game: document.getElementById("game"),
  result: document.getElementById("result"),
};
const nicknameInput = document.getElementById("nickname");
const createBtn = document.getElementById("createRoomBtn");
const joinBtn = document.getElementById("joinRoomBtn");
const startBtn = document.getElementById("startGameBtn");
const backBtn = document.getElementById("backToLobbyBtn");

const questionText = document.getElementById("questionText");
const optionsContainer = document.getElementById("options");
const timerDisplay = document.getElementById("timer");
const roundLabel = document.getElementById("roundLabel");
const podiumDiv = document.getElementById("podium");
const finalRanking = document.getElementById("finalRanking");

let currentQuestion = 0;
let score = 0;
let timer;
let timeLeft = 10; // ⏱️ 10 segundos por rodada

// ==========================
// PERGUNTAS DO JOGO
// ==========================
const questions = [
  {
    question: "Qual é o principal objetivo de um texto narrativo?",
    options: [
      "Explicar um conceito científico",
      "Convencer o leitor a adotar uma ideia",
      "Contar uma história com início, meio e fim",
      "Descrever uma paisagem detalhadamente"
    ],
    correct: 2
  },
  {
    question: "O que é um narrador onisciente?",
    options: [
      "Aquele que participa da história",
      "Aquele que sabe tudo sobre os personagens e acontecimentos",
      "Aquele que apenas observa sem entender os fatos",
      "Aquele que narra em primeira pessoa"
    ],
    correct: 1
  },
  {
    question: "Qual desses é um exemplo de discurso direto?",
    options: [
      "Ele disse que iria à escola.",
      "Ele disse: 'Vou à escola!'",
      "Disse que ele ia à escola.",
      "A ida à escola foi comentada por ele."
    ],
    correct: 1
  },
  {
    question: "Em uma narrativa, o enredo é:",
    options: [
      "O conjunto de ações e acontecimentos da história",
      "A descrição física dos personagens",
      "O local onde se passa a história",
      "O ponto de vista do narrador"
    ],
    correct: 0
  },
  {
    question: "O tempo da narrativa pode ser:",
    options: [
      "Apenas cronológico",
      "Apenas psicológico",
      "Cronológico ou psicológico",
      "Indefinido, sempre o mesmo"
    ],
    correct: 2
  },
  {
    question: "Qual elemento representa o espaço narrativo?",
    options: [
      "O tempo dos acontecimentos",
      "O local onde os fatos ocorrem",
      "O conflito principal da história",
      "A fala dos personagens"
    ],
    correct: 1
  },
  {
    question: "O clímax da narrativa é o momento em que:",
    options: [
      "A história começa",
      "A tensão atinge o ponto máximo",
      "Os personagens são apresentados",
      "O desfecho acontece"
    ],
    correct: 1
  },
  {
    question: "Qual o papel do narrador-personagem?",
    options: [
      "Contar a história de fora dos acontecimentos",
      "Relatar fatos em que ele próprio participa",
      "Narrar os pensamentos dos outros personagens",
      "Descrever apenas o cenário"
    ],
    correct: 1
  },
  {
    question: "O que é um conflito na narrativa?",
    options: [
      "Uma conversa entre personagens",
      "Um problema ou desafio enfrentado pelos personagens",
      "Um espaço geográfico da história",
      "Um diálogo entre narrador e leitor"
    ],
    correct: 1
  },
  {
    question: "Qual destes é um exemplo de tempo psicológico?",
    options: [
      "Ontem, às 18h, João chegou em casa.",
      "João lembrava do passado como se fosse agora.",
      "Em 2020, a escola foi reformada.",
      "Durante o verão, viajaram ao litoral."
    ],
    correct: 1
  }
];

// ==========================
// FUNÇÕES PRINCIPAIS
// ==========================

function startGame() {
  score = 0;
  currentQuestion = 0;
  showScreen("game");
  loadQuestion();
}

function showScreen(screen) {
  Object.values(screens).forEach(s => s.classList.remove("active"));
  screens[screen].classList.add("active");
}

function loadQuestion() {
  const q = questions[currentQuestion];
  if (!q) return endGame();

  roundLabel.textContent = `Pergunta ${currentQuestion + 1} de ${questions.length}`;
  questionText.textContent = q.question;
  optionsContainer.innerHTML = "";

  q.options.forEach((opt, index) => {
    const btn = document.createElement("button");
    btn.textContent = opt;
    btn.classList.add("option");
    btn.onclick = () => checkAnswer(index);
    optionsContainer.appendChild(btn);
  });

  resetTimer();
}

function resetTimer() {
  clearInterval(timer);
  timeLeft = 10;
  timerDisplay.textContent = `${timeLeft}s`;
  timer = setInterval(() => {
    timeLeft--;
    timerDisplay.textContent = `${timeLeft}s`;
    if (timeLeft <= 0) {
      clearInterval(timer);
      nextQuestion();
    }
  }, 1000);
}

function checkAnswer(index) {
  const correct = questions[currentQuestion].correct;
  if (index === correct) {
    score += 10;
  }
  nextQuestion();
}

function nextQuestion() {
  clearInterval(timer);
  currentQuestion++;
  setTimeout(loadQuestion, 300);
}

function endGame() {
  showScreen("result");
  const total = questions.length * 10;
  const percent = Math.round((score / total) * 100);
  document.getElementById("final-score").textContent = `Pontuação: ${score}/${total}`;
  document.getElementById("accuracy").textContent = `Aproveitamento: ${percent}%`;
}

// ==========================
// EVENTOS
// ==========================
document.getElementById("startGameBtn").onclick = startGame;
document.getElementById("backToLobbyBtn").onclick = () => showScreen("lobby");
