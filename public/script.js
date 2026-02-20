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

socket.on("gameStarted", () => {
  alert("Jogo iniciado!");
  showScreen("game");
});

document.getElementById("backToLobbyBtn").onclick = () => {
  showScreen("lobby");
};
