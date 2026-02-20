const socket = io();

let playerName = "";
let roomCode = "";

function showScreen(id) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  document.getElementById(id).classList.add("active");
}

document.getElementById("createRoomBtn").onclick = () => {
  playerName = nickname.value.trim();
  if (!playerName) return alert("Digite seu nome");
  socket.emit("createRoom", playerName);
};

document.getElementById("joinRoomBtn").onclick = () => {
  playerName = nickname.value.trim();
  roomCode = roomCode.value.trim().toUpperCase();
  if (!playerName || !roomCode) return alert("Preencha tudo");
  socket.emit("joinRoom", { roomCode, playerName });
};

socket.on("roomCreated", code => {
  roomCode = code;
  roomCodeDisplay.textContent = code;
  showScreen("room");
});

socket.on("roomJoined", ({ roomCode: code }) => {
  roomCode = code;
  roomCodeDisplay.textContent = code;
  showScreen("room");
});

socket.on("updatePlayers", players => {
  playerList.innerHTML = "";
  players.forEach(p => {
    const li = document.createElement("li");
    li.textContent = `${p.name} — ${p.score} pts`;
    playerList.appendChild(li);
  });
});

startGameBtn.onclick = () => {
  socket.emit("startGame", roomCode);
};

socket.on("question", data => {
  showScreen("game");

  questionText.textContent = data.question;
  options.innerHTML = "";
  timer.textContent = data.time + "s";

  let t = data.time;
  const interval = setInterval(() => {
    t--;
    timer.textContent = t + "s";
    if (t <= 0) clearInterval(interval);
  }, 1000);

  data.options.forEach((opt, i) => {
    const btn = document.createElement("button");
    btn.className = "option-btn";
    btn.textContent = opt;
    btn.onclick = () => {
      socket.emit("answer", { roomCode, answerIndex: i });
      document.querySelectorAll(".option-btn").forEach(b=>b.disabled=true);
    };
    options.appendChild(btn);
  });
});

socket.on("reveal", ({ correctIndex }) => {
  const buttons = document.querySelectorAll(".option-btn");
  buttons.forEach((b,i)=>{
    if(i===correctIndex) b.classList.add("correct");
    else b.classList.add("wrong");
  });
});

socket.on("showResults", ranking => {
  showScreen("results");
  podium.innerHTML="";
  finalRanking.innerHTML="";

  ranking.forEach((p,i)=>{
    finalRanking.innerHTML += `<p>${i+1}º - ${p.name}: ${p.score} pts</p>`;
  });
});

backToLobbyBtn.onclick = () => {
  showScreen("lobby");
};
