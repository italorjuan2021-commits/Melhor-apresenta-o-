const socket = io();

let playerName = "";
let currentRoom = "";

const nicknameInput = document.getElementById("nickname");
const roomInput = document.getElementById("roomCode");

function showScreen(id) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  document.getElementById(id).classList.add("active");
}

document.getElementById("createRoomBtn").onclick = () => {
  playerName = nicknameInput.value.trim();
  if (!playerName) return alert("Digite seu nome");

  socket.emit("createRoom", { nickname: playerName });
};

document.getElementById("joinRoomBtn").onclick = () => {
  playerName = nicknameInput.value.trim();
  currentRoom = roomInput.value.trim().toUpperCase();

  if (!playerName || !currentRoom) return alert("Preencha tudo");

  socket.emit("joinRoom", { nickname: playerName, roomCode: currentRoom });
};

socket.on("roomCreated", ({ roomCode }) => {
  currentRoom = roomCode;
  document.getElementById("roomCodeDisplay").textContent = roomCode;
  showScreen("room");
});

socket.on("updatePlayers", players => {
  const list = document.getElementById("playerList");
  list.innerHTML = "";

  players.forEach(p => {
    const li = document.createElement("li");
    li.textContent = `${p.nickname} — ${p.score} pts`;
    list.appendChild(li);
  });
});

document.getElementById("startGameBtn").onclick = () => {
  socket.emit("startGame", { roomCode: currentRoom });
};

socket.on("question", (data) => {
  showScreen("game");

  document.getElementById("questionText").textContent = data.question;

  const optionsDiv = document.getElementById("options");
  optionsDiv.innerHTML = "";

  const timerEl = document.getElementById("timer");
  let timeLeft = data.time;
  timerEl.textContent = timeLeft + "s";

  const interval = setInterval(() => {
    timeLeft--;
    timerEl.textContent = timeLeft + "s";
    if (timeLeft <= 0) clearInterval(interval);
  }, 1000);

  data.options.forEach((opt, index) => {
    const btn = document.createElement("button");
    btn.className = "option-btn";
    btn.textContent = opt;

    btn.onclick = () => {
      socket.emit("answer", { roomCode: currentRoom, answerIndex: index });
      document.querySelectorAll(".option-btn").forEach(b => b.disabled = true);
    };

    optionsDiv.appendChild(btn);
  });
});

socket.on("reveal", ({ correctIndex }) => {
  const buttons = document.querySelectorAll(".option-btn");
  buttons.forEach((b, i) => {
    if (i === correctIndex) b.style.background = "green";
    else b.style.background = "red";
  });
});

socket.on("showResults", (ranking) => {
  showScreen("results");

  const rankingDiv = document.getElementById("finalRanking");
  rankingDiv.innerHTML = "";

  ranking.forEach((p, i) => {
    rankingDiv.innerHTML += `<p>${i + 1}º - ${p.nickname}: ${p.score} pts</p>`;
  });
});

document.getElementById("backToLobbyBtn").onclick = () => {
  showScreen("lobby");
};
