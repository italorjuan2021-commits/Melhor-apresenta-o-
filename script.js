const soundCorrect = new Audio('https://cdn.pixabay.com/audio/2022/03/15/audio_3929fefa3f.mp3');
const soundWrong = new Audio('https://cdn.pixabay.com/audio/2022/03/15/audio_6b3d4f8d0e.mp3');

const homeScreen = document.getElementById('home');
const quizScreen = document.getElementById('quiz');
const rankingScreen = document.getElementById('ranking');
const startBtn = document.getElementById('startBtn');
const restartBtn = document.getElementById('restartBtn');
const nameInput = document.getElementById('nameInput');
const questionText = document.getElementById('questionText');
const optionsDiv = document.getElementById('options');
const timerText = document.getElementById('timer');
const rankingList = document.getElementById('rankingList');

let players = [];
let currentQuestion = 0;
let timer;
let myName = "";
let timeLeft = 10;

const questions = [
  { q: "O que é narração?", o: ["É a ação de narrar algo", "É descrever uma imagem", "É uma forma de cantar"], c: 0 },
  { q: "Quem narra uma história?", o: ["Personagem", "Narrador", "Leitor"], c: 1 },
  { q: "O que é o enredo?", o: ["A sequência de fatos da história", "Os sentimentos dos personagens", "O tempo em que ocorre"], c: 0 },
  { q: "Qual o foco narrativo em 1ª pessoa?", o: ["O narrador participa da história", "O narrador é observador", "O narrador é neutro"], c: 0 },
  { q: "Qual é a principal característica do narrador onisciente?", o: ["Sabe tudo sobre os personagens", "Fala como personagem", "Não tem opinião"], c: 0 },
];

startBtn.onclick = () => {
  const name = nameInput.value.trim();
  if (!name) return alert("Digite seu nome!");
  myName = name;
  players.push({ name, score: 0 });
  showScreen(quizScreen);
  startQuestion();
};

restartBtn.onclick = () => {
  currentQuestion = 0;
  players.forEach(p => p.score = 0);
  showScreen(homeScreen);
};

function showScreen(screen) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  screen.classList.add('active');
}

function startQuestion() {
  if (currentQuestion >= questions.length) return showRanking();
  const q = questions[currentQuestion];
  document.getElementById('progress').textContent = `Pergunta ${currentQuestion + 1} de ${questions.length}`;
  questionText.textContent = q.q;
  optionsDiv.innerHTML = "";
  q.o.forEach((opt, i) => {
    const btn = document.createElement("button");
    btn.textContent = opt;
    btn.onclick = () => checkAnswer(i);
    optionsDiv.appendChild(btn);
  });
  startTimer();
}

function checkAnswer(i) {
  const correct = questions[currentQuestion].c;
  const btns = optionsDiv.querySelectorAll('button');
  btns.forEach((b, idx) => {
    if (idx === correct) b.classList.add('correct');
    else if (idx === i) b.classList.add('wrong');
    b.disabled = true;
  });
  if (i === correct) {
    soundCorrect.play();
    const player = players.find(p => p.name === myName);
    player.score += 10;
  } else {
    soundWrong.play();
  }
  clearInterval(timer);
  setTimeout(nextQuestion, 1500);
}

function startTimer() {
  timeLeft = 10;
  timerText.textContent = `⏱️ ${timeLeft}s`;
  timer = setInterval(() => {
    timeLeft--;
    timerText.textContent = `⏱️ ${timeLeft}s`;
    if (timeLeft <= 0) {
      clearInterval(timer);
      nextQuestion();
    }
  }, 1000);
}

function nextQuestion() {
  currentQuestion++;
  startQuestion();
}

function showRanking() {
  showScreen(rankingScreen);
  rankingList.innerHTML = "";
  players.sort((a, b) => b.score - a.score);
  players.forEach(p => {
    const li = document.createElement("li");
    li.textContent = `${p.name} — ${p.score} pts`;
    rankingList.appendChild(li);
  });
}
