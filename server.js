const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, "public")));

const PORT = process.env.PORT || 3000;

const QUESTION_TIME = 8;
const POINTS = 10;

const QUESTIONS = [
  { q: "O que é narração?", opts: ["Texto descritivo", "Texto que conta uma história", "Lista", "Resumo"], a: 1 },
  { q: "O que é enredo?", opts: ["Local", "Sequência de acontecimentos", "Personagem", "Tema"], a: 1 },
  { q: "O que é clímax?", opts: ["Início", "Ponto de maior tensão", "Final", "Resumo"], a: 1 },
  { q: "Quem conta a história?", opts: ["Autor", "Narrador", "Leitor", "Editor"], a: 1 },
  { q: "Narrador em primeira pessoa usa:", opts: ["Ele", "Ela", "Eu", "Eles"], a: 2 }
];

const rooms = {};

function makeCode() {
  return Math.random().toString(36).substring(2, 7).toUpperCase();
}

function shuffle(opts, correct) {
  const arr = opts.map((v, i) => ({ v, i }));
  arr.sort(() => Math.random() - 0.5);
  return {
    options: arr.map(x => x.v),
    correctIndex: arr.findIndex(x => x.i === correct)
  };
}

io.on("connection", socket => {

  socket.on("createRoom", name => {
    const code = makeCode();
    rooms[code] = {
      players: {},
      started: false,
      questionIndex: 0,
      answers: {}
    };

    rooms[code].players[socket.id] = {
      name,
      score: 0,
      correctCount: 0
    };

    socket.join(code);
    socket.emit("roomCreated", code);
    io.to(code).emit("updatePlayers", getPlayers(code));
  });

  socket.on("joinRoom", ({ roomCode, playerName }) => {
    const room = rooms[roomCode];
    if (!room) return socket.emit("roomError", "Sala não existe");

    room.players[socket.id] = {
      name: playerName,
      score: 0,
      correctCount: 0
    };

    socket.join(roomCode);
    socket.emit("roomJoined", { roomCode });
    io.to(roomCode).emit("updatePlayers", getPlayers(roomCode));
  });

  socket.on("startGame", roomCode => {
    const room = rooms[roomCode];
    if (!room) return;
    room.started = true;
    room.questionIndex = 0;
    sendQuestion(roomCode);
  });

  socket.on("answer", ({ roomCode, answerIndex }) => {
    const room = rooms[roomCode];
    if (!room || !room.started) return;

    if (room.answers[socket.id] !== undefined) return;

    room.answers[socket.id] = answerIndex;

    if (answerIndex === room.correctIndex) {
      room.players[socket.id].score += POINTS;
      room.players[socket.id].correctCount += 1;
    }

    io.to(roomCode).emit("updatePlayers", getPlayers(roomCode));

    if (Object.keys(room.answers).length === Object.keys(room.players).length) {
      clearTimeout(room.timer);
      revealAndNext(roomCode);
    }
  });

  socket.on("disconnect", () => {
    for (const code in rooms) {
      const room = rooms[code];
      if (room.players[socket.id]) {
        delete room.players[socket.id];
        io.to(code).emit("updatePlayers", getPlayers(code));
      }
    }
  });

});

function sendQuestion(code) {
  const room = rooms[code];
  if (!room) return;

  if (room.questionIndex >= QUESTIONS.length) {
    const ranking = getPlayers(code).sort((a,b)=>b.score-a.score);
    io.to(code).emit("showResults", ranking);
    room.started = false;
    return;
  }

  room.answers = {};

  const q = QUESTIONS[room.questionIndex];
  const shuffled = shuffle(q.opts, q.a);

  room.correctIndex = shuffled.correctIndex;

  io.to(code).emit("question", {
    question: q.q,
    options: shuffled.options,
    time: QUESTION_TIME
  });

  room.timer = setTimeout(() => {
    revealAndNext(code);
  }, QUESTION_TIME * 1000);
}

function revealAndNext(code) {
  const room = rooms[code];
  if (!room) return;

  io.to(code).emit("reveal", {
    correctIndex: room.correctIndex
  });

  setTimeout(() => {
    room.questionIndex++;
    sendQuestion(code);
  }, 2000);
}

function getPlayers(code) {
  const room = rooms[code];
  if (!room) return [];
  return Object.values(room.players);
}

server.listen(PORT, () => {
  console.log("Servidor rodando na porta", PORT);
});
