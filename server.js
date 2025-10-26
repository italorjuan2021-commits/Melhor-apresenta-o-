const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

const PORT = process.env.PORT || 3000;

const QUESTION_SECONDS = 8;
const POINTS_PER_QUESTION = 10;

// Perguntas
const QUESTION_POOL = [
  { q: "O que é uma narração?", opts: ["Um texto que conta uma história com personagens e tempo", "Um texto que descreve objetos ou lugares", "Um texto que defende uma opinião", "Um texto que explica um conceito"], a: 0 },
  { q: "Qual é o principal elemento da narração?", opts: ["O narrador", "O autor", "O título", "O tema"], a: 0 },
  { q: "O que é o enredo?", opts: ["A sequência de ações e acontecimentos da história", "O espaço onde ocorre a história", "O conflito dos personagens", "A fala dos personagens"], a: 0 },
  { q: "Quem conta a história em um texto narrativo?", opts: ["O narrador", "O protagonista", "O autor", "O leitor"], a: 0 },
  { q: "Qual desses é um tipo de narrador?", opts: ["Narrador-personagem", "Narrador-ilustrador", "Narrador-público", "Narrador-anônimo"], a: 0 },
  { q: "O que é o clímax na narrativa?", opts: ["O momento de maior tensão da história", "O início da história", "A conclusão da história", "A descrição do espaço"], a: 0 },
  { q: "O que representa o desfecho?", opts: ["A parte final onde o conflito é resolvido", "O começo da história", "O conflito central", "A fala dos personagens"], a: 0 },
  { q: "Qual é a função do tempo na narração?", opts: ["Situar os acontecimentos", "Descrever personagens", "Defender uma tese", "Apresentar um argumento"], a: 0 },
  { q: "O espaço narrativo representa:", opts: ["O lugar onde a história se passa", "O tempo dos acontecimentos", "O ponto de vista do narrador", "O tema principal"], a: 0 },
  { q: "Quem é o protagonista?", opts: ["O personagem principal da história", "O narrador observador", "O antagonista", "O autor do texto"], a: 0 }
];

const rooms = {};

function makeRoomCode() {
  return Math.random().toString(36).substring(2, 7).toUpperCase();
}

function shuffleOptions(opts, correctIndex) {
  const indices = opts.map((_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  const shuffled = indices.map(i => opts[i]);
  const correctShuffled = indices.indexOf(correctIndex);
  return { shuffled, correctShuffled };
}

io.on('connection', socket => {

  socket.on('createRoom', playerName => {
    const code = makeRoomCode();
    rooms[code] = {
      players: { [socket.id]: { name: playerName, score: 0 } },
      started: false,
      questions: QUESTION_POOL.slice(),
      currentIndex: 0,
      answers: {},
      timers: {}
    };
    socket.join(code);
    socket.emit('roomCreated', code);
    io.to(code).emit('updatePlayers', Object.values(rooms[code].players));
  });

  socket.on('joinRoom', ({ roomCode, playerName }) => {
    const room = rooms[roomCode];
    if (!room) {
      socket.emit('roomError', 'Sala não existe');
      return;
    }
    room.players[socket.id] = { name: playerName, score: 0 };
    socket.join(roomCode);
    socket.emit('roomJoined', { roomCode });
    io.to(roomCode).emit('updatePlayers', Object.values(room.players));
  });

  socket.on('startGame', roomCode => {
    const room = rooms[roomCode];
    if (!room || room.started) return;
    room.started = true;
    room.currentIndex = 0;
    sendQuestion(roomCode);
  });

  socket.on('answer', ({ roomCode, answerIndex }) => {
    const room = rooms[roomCode];
    if (!room) return;
    if (room.answers[socket.id] !== undefined) return;

    room.answers[socket.id] = answerIndex;

    const correct = answerIndex === room.correctShuffled;
    if (correct) room.players[socket.id].score += POINTS_PER_QUESTION;

    // atualizar ranking para todos
    io.to(roomCode).emit('updatePlayers', Object.values(room.players));

    if (Object.keys(room.answers).length === Object.keys(room.players).length) {
      clearTimeout(room.timers.roundTimer);
      io.to(roomCode).emit('reveal', { correctIndex: room.correctShuffled });
      setTimeout(() => {
        room.currentIndex++;
        sendQuestion(roomCode);
      }, 1000);
    }
  });

  socket.on('disconnect', () => {
    for (const code in rooms) {
      const room = rooms[code];
      if (room.players[socket.id]) delete room.players[socket.id];
      io.to(code).emit('updatePlayers', Object.values(room.players));
    }
  });

});

function sendQuestion(code) {
  const room = rooms[code];
  if (!room) return;

  if (room.currentIndex >= room.questions.length) {
    const ranking = Object.values(room.players)
      .sort((a, b) => b.score - a.score);
    io.to(code).emit('showResults', ranking);
    room.started = false;
    return;
  }

  const q = room.questions[room.currentIndex];
  const { shuffled, correctShuffled } = shuffleOptions(q.opts, q.a);
  room.correctShuffled = correctShuffled;
  room.answers = {};

  io.to(code).emit('question', {
    question: q.q,
    options: shuffled,
    time: QUESTION_SECONDS
  });

  room.timers.roundTimer = setTimeout(() => {
    io.to(code).emit('reveal', { correctIndex: correctShuffled });
    setTimeout(() => {
      room.currentIndex++;
      sendQuestion(code);
    }, 1000);
  }, QUESTION_SECONDS * 1000);
}

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
