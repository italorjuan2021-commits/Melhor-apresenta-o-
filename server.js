const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, "public")));

const PORT = process.env.PORT || 3000;

const rooms = {};

function generateRoomCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

io.on("connection", (socket) => {
  console.log("Novo jogador conectado:", socket.id);

  socket.on("createRoom", ({ nickname }) => {
    const roomCode = generateRoomCode();

    rooms[roomCode] = {
      players: [],
      host: socket.id,
      gameStarted: false
    };

    rooms[roomCode].players.push({
      id: socket.id,
      nickname,
      score: 0
    });

    socket.join(roomCode);

    socket.emit("roomCreated", { roomCode });
    io.to(roomCode).emit("updatePlayers", rooms[roomCode].players);
  });

  socket.on("joinRoom", ({ nickname, roomCode }) => {
    if (!rooms[roomCode]) return;

    rooms[roomCode].players.push({
      id: socket.id,
      nickname,
      score: 0
    });

    socket.join(roomCode);

    io.to(roomCode).emit("updatePlayers", rooms[roomCode].players);
  });

  socket.on("startGame", ({ roomCode }) => {
    if (!rooms[roomCode]) return;
    io.to(roomCode).emit("gameStarted");
  });

  socket.on("disconnect", () => {
    for (const roomCode in rooms) {
      const room = rooms[roomCode];
      room.players = room.players.filter(p => p.id !== socket.id);

      io.to(roomCode).emit("updatePlayers", room.players);

      if (room.players.length === 0) {
        delete rooms[roomCode];
      }
    }
  });
});

server.listen(PORT, () => {
  console.log("Servidor rodando na porta", PORT);
});
