import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.static(path.join(__dirname, "public")));

const rooms = {};

io.on("connection", (socket) => {
  socket.on("createRoom", (nickname) => {
    const roomCode = Math.random().toString(36).substr(2, 5).toUpperCase();
    rooms[roomCode] = {
      host: socket.id,
      players: [{ id: socket.id, name: nickname, score: 0, answered: false }],
      gameStarted: false,
    };
    socket.join(roomCode);
    io.to(socket.id).emit("roomCreated", roomCode);
    io.to(roomCode).emit("playerList", rooms[roomCode].players);
  });

  socket.on("joinRoom", ({ nickname, roomCode }) => {
    const room = rooms[roomCode];
    if (room && !room.gameStarted && room.players.length < 50) {
      room.players.push({ id: socket.id, name: nickname, score: 0, answered: false });
      socket.join(roomCode);
      io.to(roomCode).emit("playerList", room.players);
      io.to(socket.id).emit("roomJoined", roomCode);
    } else {
      io.to(socket.id).emit("errorMsg", "Sala inexistente ou já começou!");
    }
  });

  socket.on("startGame", (roomCode) => {
    const room = rooms[roomCode];
    if (!room) return;
    room.gameStarted = true;
    io.to(roomCode).emit("gameStarted");
  });

  socket.on("playerAnswer", ({ roomCode, playerId, isCorrect }) => {
    const room = rooms[roomCode];
    if (!room) return;

    const player = room.players.find((p) => p.id === playerId);
    if (player && !player.answered) {
      player.answered = true;
      if (isCorrect) player.score += 10;
    }

    io.to(roomCode).emit("updateScores", room.players);

    if (room.players.every((p) => p.answered)) {
      io.to(roomCode).emit("allAnswered");
    }
  });

  socket.on("nextQuestion", (roomCode) => {
    const room = rooms[roomCode];
    if (!room) return;
    room.players.forEach((p) => (p.answered = false));
    io.to(roomCode).emit("nextQuestion");
  });

  socket.on("disconnect", () => {
    for (const [code, room] of Object.entries(rooms)) {
      const index = room.players.findIndex((p) => p.id === socket.id);
      if (index !== -1) {
        room.players.splice(index, 1);
        io.to(code).emit("playerList", room.players);
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🔥 Servidor rodando na porta ${PORT}`));
