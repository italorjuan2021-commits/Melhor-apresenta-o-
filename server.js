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
    options: [
      "Relatar fatos reais ou imaginários",
      "Descrever apenas lugares",
      "Dar opinião pessoal",
      "Fazer perguntas ao leitor"
    ],
    correctIndex: 0
  },
  {
    question: "Quem conta a história é chamado de:",
    options: [
      "Autor",
      "Narrador",
      "Leitor",
      "Personagem secundário"
    ],
    correctIndex: 1
  },
  {
    question: "Quando o narrador participa da história ele é:",
    options: [
      "Observador",
      "Protagonista",
      "Narrador-personagem",
      "Leitor"
    ],
    correctIndex: 2
  },
  {
    question: "Narrador que não participa da história é chamado de:",
    options: [
      "Personagem",
      "Observador",
      "Autor",
      "Leitor"
    ],
    correctIndex: 1
  },
  {
    question: "A narração normalmente apresenta:",
    options: [
      "Fatos organizados no tempo",
      "Apenas descrição física",
      "Somente diálogos",
      "Regras gramaticais"
    ],
    correctIndex: 0
  },
  {
    question: "Um texto narrativo precisa ter:",
    options: [
      "Enredo",
      "Tabela",
      "Gráfico",
      "Equação"
    ],
    correctIndex: 0
  },
  {
    question: "O momento mais tenso da história é chamado de:",
    options: [
      "Introdução",
      "Clímax",
      "Conclusão",
      "Resumo"
    ],
    correctIndex: 1
  },
  {
    question: "A parte final da história é:",
    options: [
      "Clímax",
      "Desenvolvimento",
      "Desfecho",
      "Introdução"
    ],
    correctIndex: 2
  },
  {
    question: "Narrativas podem ser:",
    options: [
      "Reais ou fictícias",
      "Somente reais",
      "Somente científicas",
      "Apenas técnicas"
    ],
    correctIndex: 0
  },
  {
    question: "O conjunto de acontecimentos da história é chamado de:",
    options: [
      "Personagem",
      "Tempo",
      "Enredo",
      "Narrador"
    ],
    correctIndex: 2
  }
];

function generateRoomCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function sendQuestion(roomCode) {
  const room = rooms[roomCode];
  if (!room) return;

  if (room.currentQuestion >= questions.length) {
    const ranking = [...room.players].sort((a, b) => b.score - a.score);
    io.to(roomCode).emit("showResults", ranking);
    return;
  }

  room.answersCount = 0;
  room.answeredPlayers = new Set();

  const q = questions[room.currentQuestion];

  io.to(roomCode).emit("question", {
    question: q.question,
    options: q.options,
    time: 10
  });

  // Tempo máximo da pergunta
  setTimeout(() => {
    if (rooms[roomCode]) {
      revealAndNext(roomCode);
    }
  }, 10000);
}

function revealAndNext(roomCode) {
  const room = rooms[roomCode];
  if (!room) return;

  const q = questions[room.currentQuestion];

  io.to(roomCode).emit("reveal", {
    correctIndex: q.correctIndex
  });

  room.currentQuestion++;

  setTimeout(() => {
    sendQuestion(roomCode);
  }, 3000);
}

io.on("connection", (socket) => {

  socket.on("createRoom", ({ nickname }) => {
    const roomCode = generateRoomCode();

    rooms[roomCode] = {
      players: [],
      currentQuestion: 0,
      answersCount: 0,
      answeredPlayers: new Set()
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
    const room = rooms[roomCode];
    if (!room) return;

    room.players.push({
      id: socket.id,
      nickname,
      score: 0
    });

    socket.join(roomCode);
    io.to(roomCode).emit("updatePlayers", room.players);
  });

  socket.on("startGame", ({ roomCode }) => {
    const room = rooms[roomCode];
    if (!room) return;

    room.currentQuestion = 0;
    sendQuestion(roomCode);
  });

  socket.on("answer", ({ roomCode, answerIndex }) => {
    const room = rooms[roomCode];
    if (!room) return;

    if (room.answeredPlayers.has(socket.id)) return;

    room.answeredPlayers.add(socket.id);

    const q = questions[room.currentQuestion];
    const player = room.players.find(p => p.id === socket.id);

    if (player && answerIndex === q.correctIndex) {
      player.score += 10;
    }

    room.answersCount++;

    if (room.answersCount >= room.players.length) {
      revealAndNext(roomCode);
    }
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
