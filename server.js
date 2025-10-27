// server.js
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

// ===============================
// 📂 Dados em memória
// ===============================
const rooms = {}; // { roomCode: { players: { playerName: score }, currentQuestion: 0 } }

// ===============================
// 📦 Servir arquivos estáticos
// ===============================
app.use(express.static("public")); // coloca seu index.html, style.css e script.js dentro da pasta 'public'

// ===============================
// 🔌 Socket.IO
// ===============================
io.on("connection", (socket) => {
  console.log("Novo jogador conectado:", socket.id);

  // Criar sala
  socket.on("createRoom", ({ playerName }) => {
    const roomCode = Math.random().toString(36).substring(2, 7).toUpperCase();
    rooms[roomCode] = { players: {}, currentQuestion: 0 };
    rooms[roomCode].players[playerName] = 0;

    socket.join(roomCode);
    socket.emit("roomCreated", roomCode);
    io.to(roomCode).emit("updatePlayers", rooms[roomCode].players);
    console.log(`Sala criada: ${roomCode} por ${playerName}`);
  });

  // Entrar em sala
  socket.on("joinRoom", ({ playerName, roomCode }) => {
    if (!rooms[roomCode]) return socket.emit("errorMessage", "Sala não existe!");
    rooms[roomCode].players[playerName] = 0;
    socket.join(roomCode);

    io.to(roomCode).emit("updatePlayers", rooms[roomCode].players);
    socket.emit("roomCreated", roomCode); // atualizar lobby do jogador
    console.log(`${playerName} entrou na sala ${roomCode}`);
  });

  // Iniciar jogo
  socket.on("startGame", (roomCode) => {
    if (!rooms[roomCode]) return;
    rooms[roomCode].currentQuestion = 0;
    io.to(roomCode).emit("gameStarted");
    console.log(`Jogo iniciado na sala ${roomCode}`);
  });

  // Receber resposta
  socket.on("answer", ({ roomCode, playerName, correct }) => {
    if (!rooms[roomCode]) return;
    if (correct) rooms[roomCode].players[playerName]++;
    io.to(roomCode).emit("updatePlayers", rooms[roomCode].players);
  });

  // Finalizar jogo
  socket.on("endGame", ({ roomCode }) => {
    if (!rooms[roomCode]) return;
    io.to(roomCode).emit("gameEnded", rooms[roomCode].players);
    console.log(`Jogo finalizado na sala ${roomCode}`);
  });

  // Desconexão
  socket.on("disconnecting", () => {
    const joinedRooms = Array.from(socket.rooms);
    joinedRooms.forEach((roomCode) => {
      if (rooms[roomCode]) {
        for (const playerName in rooms[roomCode].players) {
          // Remover jogador desconectado
          // (Opcional: só remove se você tiver uma forma de mapear socket -> playerName)
        }
        io.to(roomCode).emit("updatePlayers", rooms[roomCode].players);
      }
    });
    console.log("Jogador desconectado:", socket.id);
  });
});

// ===============================
// 🚀 Start server
// ===============================
server.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
