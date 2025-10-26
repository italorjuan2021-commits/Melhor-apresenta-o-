const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

const PORT = process.env.PORT || 3000;

const ROOM_MAX_PLAYERS = 50;
const QUESTION_SECONDS = 8;
const POINTS_PER_QUESTION = 1;

// Perguntas
const QUESTION_POOL = [
  { q: "O que é uma narração?", opts: ["Texto descritivo", "Texto que conta uma história", "Lista de instruções", "Resumo"], a: 1 },
  { q: "Quem é o narrador?", opts: ["Autor", "Voz que conta a história", "Leitor", "Editor"], a: 1 },
  { q: "O que é enredo?", opts: ["Sequência de acontecimentos", "Local da história", "Falas dos personagens", "Tema"], a: 0 },
  { q: "O que é clímax?", opts: ["Início da história", "Ponto de maior tensão", "Resumo final", "Descrição do local"], a: 1 },
  { q: "Qual elemento NÃO é essencial em uma narrativa?", opts: ["Enredo", "Personagens", "Estrutura de rimas", "Espaço"], a: 2 },
  { q: "O que é o espaço na narração?", opts: ["Lugar onde acontece", "Tempo verbal", "Personagem secundário", "Tema"], a: 0 },
  { q: "O narrador onisciente:", opts: ["Desconhece os pensamentos", "Sabe tudo sobre personagens", "É personagem principal", "Sempre usa 'eu'"], a: 1 },
  { q: "O que é ponto de vista?", opts: ["Forma de contar a história", "Cor do livro", "Número de páginas", "Nome do autor"], a: 0 },
  { q: "Narrador em primeira pessoa usa:", opts: ["'ele' ou 'ela'", "'nós'", "'eu'", "'vós'"], a: 2 },
  { q: "Função principal da narração:", opts: ["Argumentar", "Contar história com começo, meio e fim", "Listar dados", "Dar instruções"], a: 1 }
];

// Estrutura das salas
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

function broadcastPlayers(code) {
  const room = rooms[code];
  if (!room) return;
  io.to(code).emit('updatePlayers', Object.values(room.players));
}

function sendQuestionToRoom(code) {
  const room = rooms[code];
  if (!room) return;
  if (room.currentIndex >= room.questions.length) {
    const ranking = Object.values(room.players)
      .sort((a, b) => b.score - a.score)
      .map(p => ({ name: p.name, score: p.score }));
    io.to(code).emit('showResults', ranking);
    room.started = false;
    return;
  }

  const q = room.questions[room.currentIndex];
  const { shuffled, correctShuffled } = shuffleOptions(q.opts, q.a);
  room._lastCorrectShuffled = correctShuffled;
  room.answersThisRound = {};
  io.to(code).emit('question', { question: q.q, options: shuffled, time: QUESTION_SECONDS });

  room.timers.roundTimer = setTimeout(() => {
    io.to(code).emit('reveal', { correctIndex: correctShuffled });
    setTimeout(() => {
      room.currentIndex++;
      sendQuestionToRoom(code);
    }, 2000);
  }, QUESTION_SECONDS * 1000);
}

io.on('connection', socket => {
  socket.on('createRoom', (playerName) => {
    const code = makeRoomCode();
    rooms[code] = {
      players: { [socket.id]: { id: socket.id, name: playerName, score: 0 } },
      started: false,
      questions: QUESTION_POOL,
      currentIndex: 0,
      timers: {}
    };
    socket.join(code);
    socket.emit('roomCreated', code);
    broadcastPlayers(code);
  });

  socket.on('joinRoom', ({ roomCode, playerName }) => {
    const code = roomCode.toUpperCase();
    const room = rooms[code];
    if (!room) { socket.emit('roomError', 'Sala não encontrada'); return; }
    room.players[socket.id] = { id: socket.id, name: playerName, score: 0 };
    socket.join(code);
    socket.emit('roomJoined', { roomCode: code });
    broadcastPlayers(code);
  });

  socket.on('startGame', (code) => {
    const room = rooms[code];
    if (!room) return;
    room.started = true;
    room.currentIndex = 0;
    sendQuestionToRoom(code);
  });

  socket.on('answer', ({ roomCode, answerIndex }) => {
    const room = rooms[roomCode];
    if (!room) return;
    if (room.answersThisRound[socket.id] !== undefined) return;
    room.answersThisRound[socket.id] = answerIndex;

    const correct = answerIndex === room._lastCorrectShuffled;
    if (correct) room.players[socket.id].score += POINTS_PER_QUESTION;
    broadcastPlayers(roomCode);

    if (Object.keys(room.answersThisRound).length === Object.keys(room.players).length) {
      clearTimeout(room.timers.roundTimer);
      io.to(roomCode).emit('reveal', { correctIndex: room._lastCorrectShuffled });
      setTimeout(() => {
        room.currentIndex++;
        sendQuestionToRoom(roomCode);
      }, 2000);
    }
  });

  socket.on('disconnect', () => {
    for (const code in rooms) {
      if (rooms[code].players[socket.id]) delete rooms[code].players[socket.id];
      broadcastPlayers(code);
    }
  });
});

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
