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

const questions = [
  {
    question: "O que é narração?",
    options: ["Relatar fatos", "Descrever objetos", "Dar opinião", "Fazer perguntas"],
    correctIndex: 0
  },
  {
    question: "Quem conta a história é chamado de:",
    options: ["Autor", "Narrador", "Leitor", "Personagem"],
    correctIndex: 1
  }
];

function generateRoomCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

io.on("connection", (socket) => {

  socket.on("createRoom", ({ nickname }) => {
    const roomCode = generateRoomCode();

    rooms[roomCode] = {
      players: [],
      currentQuestion: 0
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
    const room = rooms[roomCode];
    if (!room) return;

    room.currentQuestion = 0;

    io.to(roomCode).emit("question", {
      question: questions[0].question,
      options: questions[0].options,
      time: 10
    });
  });

  socket.on("answer", ({ roomCode, answerIndex }) => {
    const room = rooms[roomCode];
    if (!room) return;

    const q = questions[room.currentQuestion];

    if (answerIndex === q.correctIndex) {
      const player = room.players.find(p => p.id === socket.id);
      if (player) player.score += 10;
    }

    io.to(roomCode).emit("reveal", {
      correctIndex: q.correctIndex
    });

    room.currentQuestion++;

    setTimeout(() => {
      if (room.currentQuestion >= questions.length) {
        const ranking = [...room.players].sort((a,b)=>b.score-a.score);
        io.to(roomCode).emit("showResults", ranking);
      } else {
        const nextQ = questions[room.currentQuestion];
        io.to(roomCode).emit("question", {
          question: nextQ.question,
          options: nextQ.options,
          time: 10
        });
      }
    }, 3000);
  });

  socket.on("disconnect", () => {
    for (const roomCode in rooms) {
      const room = rooms[roomCode];
      room.players = room.players.filter(p => p.id !== socket.id);
      io.to(roomCode).emit("updatePlayers", room.players);
      if (room.players.length === 0) delete rooms[roomCode];
    }
  });

});

server.listen(PORT, () => {
  console.log("Servidor rodando na porta", PORT);
});
