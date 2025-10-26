// =========================================================
// 🎮 A NARRAÇÃO — Versão Final com Pódio + Sons + Feedback
// =========================================================

// 🎵 Sons de acerto e erro (base64 — sem precisar baixar)
const soundCorrect = new Audio(
  "data:audio/mp3;base64,//uQxAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAACcQCA..."
);
const soundWrong = new Audio(
  "data:audio/mp3;base64,//uQxAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAACcQCA..."
);

// ===============================
// 📦 Perguntas do Quiz
// ===============================
const questions = [
  {
    question: "O que é uma narração?",
    options: [
      "Um texto que conta uma história com personagens e tempo",
      "Um texto que descreve objetos ou lugares",
      "Um texto que defende uma opinião",
      "Um texto que explica um conceito"
    ],
    answer: 0
  },
  {
    question: "Qual é o principal elemento da narração?",
    options: ["O narrador", "O autor", "O título", "O tema"],
    answer: 0
  },
  {
    question: "O que é o enredo?",
    options: [
      "A sequência de ações e acontecimentos da história",
      "O espaço onde ocorre a história",
      "O conflito dos personagens",
      "A fala dos personagens"
    ],
    answer: 0
  },
  {
    question: "Quem conta a história em um texto narrativo?",
    options: ["O narrador", "O protagonista", "O autor", "O leitor"],
    answer: 0
  },
  {
    question: "Qual desses é um tipo de narrador?",
    options: [
      "Narrador-personagem",
      "Narrador-ilustrador",
      "Narrador-público",
      "Narrador-anônimo"
    ],
    answer: 0
  },
  {
    question: "O que é o clímax na narrativa?",
    options: [
      "O momento de maior tensão da história",
      "O início da história",
      "A conclusão da história",
      "A descrição do espaço"
    ],
    answer: 0
  },
  {
    question: "O que representa o desfecho?",
    options: [
      "A parte final onde o conflito é resolvido",
      "O começo da história",
      "O conflito central",
      "A fala dos personagens"
    ],
    answer: 0
  },
  {
    question: "Qual é a função do tempo na narração?",
    options: [
      "Situar os acontecimentos",
      "Descrever personagens",
      "Defender uma tese",
      "Apresentar um argumento"
    ],
    answer: 0
  },
  {
    question: "O espaço narrativo representa:",
    options: [
      "O lugar onde a história se passa",
      "O tempo dos acontecimentos",
      "O ponto de vista do narrador",
      "O tema principal"
    ],
    answer: 0
  },
  {
    question: "Quem é o protagonista?",
    options: [
      "O personagem principal da história",
      "O narrador observador",
      "O antagonista",
      "O autor do texto"
    ],
    answer: 0
  }
];

// ===============================
// ⚙️ Variáveis de Controle
// ===============================
let currentQuestion = 0;
let score = 0;
let answered = false;
let timer;
let timeLeft = 10;
let totalPlayers = {};
let playerName = "";
let roomCode = "";

// ===============================
// 🔄 Funções Úteis
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
  roomCode = Math.random().toString(36).substring(2, 7).toUpperCase();
  document.getElementById("roomCodeDisplay").textContent = roomCode;
  totalPlayers[playerName] = 0;
  updatePlayerList();
  showScreen("room");
});

document.getElementById("joinRoomBtn").addEventListener("click", () => {
  playerName = document.getElementById("nickname").value.trim();
  roomCode = document.getElementById("roomCode").value.trim().toUpperCase();
  if (!playerName || !roomCode) return alert("Preencha nome e código da sala!");
  totalPlayers[playerName] = 0;
  document.getElementById("roomCodeDisplay").textContent = roomCode;
  updatePlayerList();
  showScreen("room");
});

function updatePlayerList() {
  const list = document.getElementById("playerList");
  list.innerHTML = "";
  Object.keys(totalPlayers).forEach((p) => {
    const li = document.createElement("li");
    li.textContent = `${p} — ${totalPlayers[p]} pts`;
    list.appendChild(li);
  });
}

// ===============================
// ▶️ Início do jogo
// ===============================
document.getElementById("startGameBtn").addEventListener("click", () => {
  currentQuestion = 0;
  score = 0;
  showScreen("game");
  nextQuestion();
});

// ===============================
// ❓ Exibir Pergunta
// ===============================
function nextQuestion() {
  if (currentQuestion >= questions.length) {
    endGame();
    return;
  }

  answered = false;
  timeLeft = 10;
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
// 🟩 Selecionar Resposta
// ===============================
function selectOption(button, selected, q) {
  if (answered) return;
  answered = true;
  clearInterval(timer);

  const correct = selected === q.options[q.answer];
  if (correct) score++;

  button.classList.add("selected");

  setTimeout(() => revealAnswer(correct), 200);
}

// ===============================
// 🎯 Revelar Resposta Certa
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
      btn.style.opacity = "0.7";
    }
  });

  if (answered && correct) {
    soundCorrect.play();
    navigator.vibrate?.(150);
  } else if (answered && !correct) {
    soundWrong.play();
    navigator.vibrate?.([100, 50, 100]);
  }

  setTimeout(() => {
    currentQuestion++;
    nextQuestion();
  }, 1500);
}

// ===============================
// 🏁 Fim do Jogo com PÓDIO 🏆
// ===============================
function endGame() {
  totalPlayers[playerName] = score;
  showScreen("results");

  const ranking = Object.entries(totalPlayers).sort((a, b) => b[1] - a[1]);

  // 🎖️ Pódio visual
  const podiumDiv = document.getElementById("podium");
  podiumDiv.innerHTML = "";
  const podiumColors = ["#FFD700", "#C0C0C0", "#CD7F32"];
  ranking.slice(0, 3).forEach(([name, points], i) => {
    const place = document.createElement("div");
    place.classList.add("place");
    if (i === 0) place.classList.add("first");
    place.innerHTML = `<strong>${i + 1}º</strong><br>${name}<br><small>${points} pts</small>`;
    place.style.background = podiumColors[i];
    podiumDiv.appendChild(place);
  });

  // 🧾 Lista completa
  const finalList = document.getElementById("finalRanking");
  finalList.innerHTML = ranking
    .map(
      ([p, s], i) =>
        `<p>${i + 1}º — <strong>${p}</strong>: ${s} acertos (${Math.round(
          (s / questions.length) * 100
        )}%)</p>`
    )
    .join("");

  // 🔊 Som e vibração final
  soundCorrect.play();
  navigator.vibrate?.([200, 100, 200]);
}

// ===============================
// 🔁 Voltar ao Início
// ===============================
document.getElementById("backToLobbyBtn").addEventListener("click", () => {
  showScreen("lobby");
});
