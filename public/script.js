// script.js — versão final 🔥 com pódio e sons embutidos

// ===============================
// 🎵 Sons (base64 — sem precisar baixar)
// ===============================
const soundCorrect = new Audio("data:audio/mp3;base64,//uQxAA..."); // som curto de acerto
const soundWrong = new Audio("data:audio/mp3;base64,//uQxAA..."); // som curto de erro

// ===============================
// 📦 Dados das perguntas
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
// ⚙️ Variáveis globais
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
// 🔄 Utilidades
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
// ❓ Exibir pergunta
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
// 🟩 Selecionar resposta
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
// 🎯 Revelar resposta certa
// ===============================
function revealAnswer(correct = false) {
  const buttons = document.querySelectorAll(".option-btn");
  const q = questions[currentQuestion];
  buttons.forEach((btn) => {
    btn.disabled = true;
    if (btn.textContent === q.options[q.answer]) {
      btn.style.background = "#28a745";
      btn.style.color = "#fff";
    } else if (btn.classList.contains("selected")) {
      btn.style.background = "#dc3545";
      btn.style.color = "#fff";
    } else {
      btn.style.opacity = "0.6";
    }
  });

  if (answered && correct) soundCorrect.play();
  else if (answered && !correct) soundWrong.play();

  setTimeout(() => {
    currentQuestion++;
    nextQuestion();
  }, 1500);
}

// ===============================
// 🏁 Fim do jogo com PÓDIO 🏆
// ===============================
function endGame() {
  showScreen("result");
  totalPlayers[playerName] = score;

  const ranking = Object.entries(totalPlayers).sort((a, b) => b[1] - a[1]);

  // 🎖️ Montar pódio
  let podium = `<div style="display:flex;justify-content:center;align-items:flex-end;gap:15px;margin-top:20px;">`;
  ranking.slice(0, 3).forEach(([p, s], i) => {
    const height = i === 0 ? 100 : i === 1 ? 80 : 60;
    const color = i === 0 ? "#ffd700" : i === 1 ? "#c0c0c0" : "#cd7f32";
    podium += `
      <div style="text-align:center;">
        <div style="background:${color};width:70px;height:${height}px;border-radius:10px 10px 0 0;box-shadow:0 4px 15px rgba(0,0,0,0.3);"></div>
        <p style="margin-top:5px;font-weight:700;">${p}</p>
        <small>${s} pts</small>
      </div>`;
  });
  podium += "</div>";

  // 🧾 Lista completa
  const fullRanking = ranking
    .map(
      ([p, s], i) =>
        `${i + 1}º — <strong>${p}</strong>: ${s} acertos (${Math.round(
          (s / questions.length) * 100
        )}%)`
    )
    .join("<br>");

  document.getElementById("final-score").innerHTML = `
    ${podium}
    <div style="margin-top:20px;text-align:left;">${fullRanking}</div>
  `;
  document.getElementById("accuracy").textContent = "";
}

document.getElementById("backToLobbyBtn").addEventListener("click", () => {
  showScreen("lobby");
});
