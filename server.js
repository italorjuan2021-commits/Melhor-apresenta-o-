// ===============================
// server.js - Multiplayer Quiz
// ===============================
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Servir arquivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

const PORT = process.env.PORT || 3000;

// ===============================
// Configurações
// ===============================
const ROOM_MAX_PLAYERS = 50;
const QUESTION_SECONDS = 8;
const PRE_START_SECONDS = 5;
const POINTS_PER_QUESTION = 10;

// Pool de perguntas
const QUESTION_POOL = [
  { q: "O que é narração?", opts: ["Texto descritivo", "Texto que conta uma história", "Lista de instruções", "Resumo"], a: 1 },
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

// ===============================
// Helpers
// ===============================
function makeRoomCode() {
  return Math.random().toString(36).substring(2, 7).toUpperCase();
}

function pickQuestions(count = 10) {
  const pool = [...QUESTION_POOL];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count);
}

function getPlayersArray(room) {
  return Object.values(room.players).map(p => ({
    id: p.id,
    name: p.name,
    score: p.score,
    correctCount: p.correctCount || 0
  }));
}

function broadcastPlayers(code) {
  const room = rooms[code];
  if (!room) return;
  io.to(code).emit('updatePlayers', getPlayersArray(room));
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

// ===============================
// Socket.IO
// ===============================
io.on('connection', socket => {
  console.log('connected', socket.id);

  socket.on('createRoom', (playerName) => {
    const code = makeRoomCode();
    const room = {
      players: {},
      started: false,
      questions: pickQuestions(),
      currentIndex: 0,
      answersThisRound: {},
      timers: {}
    };
    rooms[code] = room;
    room.players[socket.id] = { id: socket.id, name: playerName, score: 0, correctCount: 0 };
    socket.join(code);
    socket.emit('roomCreated', code);
    broadcastPlayers(code);
  });

  socket.on('joinRoom', ({ roomCode, playerName }) => {
    const code = (roomCode || '').toUpperCase();
    const room = rooms[code];
    if (!room) return socket.emit('roomError', 'Sala não encontrada.');
    if (room.started) return socket.emit('roomError', 'Jogo já iniciado.');
    if (Object.keys(room.players).length >= ROOM_MAX_PLAYERS) return socket.emit('roomError', 'Sala lotada.');
    room.players[socket.id] = { id: socket.id, name: playerName, score: 0, correctCount: 0 };
    socket.join(code);
    socket.emit('roomJoined', { roomCode: code, players: getPlayersArray(room) });
    broadcastPlayers(code);
  });

  socket.on('startGame', (roomCode) => {
    const code = (roomCode || '').toUpperCase();
    const room = rooms[code];
    if (!room || room.started) return;
    room.started = true;
    room.currentIndex = 0;
    io.to(code).emit('preStart', { seconds: PRE_START_SECONDS });
    setTimeout(() => sendQuestionToRoom(code), PRE_START_SECONDS * 1000);
  });

  socket.on('answer', ({ roomCode, answerIndex }) => {
    const code = (roomCode || '').toUpperCase();
    const room = rooms[code];
    if (!room || !room.started) return;
    if (room.answersThisRound[socket.id] !== undefined) return;

    room.answersThisRound[socket.id] = answerIndex;
    const correctShuffled = room._lastCorrectShuffled;
    const isCorrect = answerIndex === correctShuffled;

    if (isCorrect) {
      const player = room.players[socket.id];
      if (player) {
        player.score += POINTS_PER_QUESTION;
        player.correctCount += 1;
      }
    }

    broadcastPlayers(code);

    // se todos responderam, revelar
    if (Object.keys(room.answersThisRound).length >= Object.keys(room.players).length) {
      if (room.timers.roundTimer) clearTimeout(room.timers.roundTimer);
      io.to(code).emit('reveal', { correctIndex: correctShuffled });
      setTimeout(() => {
        room.currentIndex++;
        sendQuestionToRoom(code);
      }, 2000);
    }
  });

  socket.on('leaveRoom', (roomCode) => {
    const code = (roomCode || '').toUpperCase();
    const room = rooms[code];
    if (!room) return;
    delete room.players[socket.id];
    socket.leave(code);
    broadcastPlayers(code);
  });

  socket.on('disconnect', () => {
    for (const code of Object.keys(rooms)) {
      const room = rooms[code];
      if (room && room.players[socket.id]) {
        delete room.players[socket.id];
        if (Object.keys(room.players).length === 0) {
          if (room.timers.roundTimer) clearTimeout(room.timers.roundTimer);
          delete rooms[code];
        } else {
          broadcastPlayers(code);
        }
      }
    }
  });
});

// ===============================
// Função de envio de perguntas
// ===============================
function sendQuestionToRoom(code) {
  const room = rooms[code];
  if (!room) return;

  if (room.currentIndex >= room.questions.length) {
    const ranking = getPlayersArray(room)
      .map(p => ({ name: p.name, score: p.score, correctCount: p.correctCount }))
      .sort((a, b) => b.score - a.score || b.correctCount - a.correctCount);
    io.to(code).emit('showResults', ranking);
    room.started = false;
    return;
  }

  const q = room.questions[room.currentIndex];
  const { shuffled, correctShuffled } = shuffleOptions(q.opts, q.a);

  room.answersThisRound = {};
  room._lastCorrectShuffled = correctShuffled;

  io.to(code).emit('question', { question: q.q, options: shuffled, time: QUESTION_SECONDS });

  room.timers.roundTimer = setTimeout(() => {
    io.to(code).emit('reveal', { correctIndex: correctShuffled });
    setTimeout(() => {
      room.currentIndex++;
      sendQuestionToRoom(code);
    }, 2000);
  }, QUESTION_SECONDS * 1000);
}

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
