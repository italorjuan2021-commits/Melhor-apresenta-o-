// server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Servir arquivos estáticos da pasta public
app.use(express.static(path.join(__dirname, 'public')));

const PORT = process.env.PORT || 3000;

// --- CONFIG ---
const ROOM_MAX_PLAYERS = 50;
const QUESTIONS_COUNT = 10; // 10 perguntas por jogo
const PRE_START_SECONDS = 5;
const QUESTION_SECONDS = 15;
const POINTS_PER_QUESTION = 10;

// Pool de perguntas (10). Se quiser trocar, modifique aqui.
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

// --- Estado de todas as salas (em memória). Para produção, seria ideal usar Redis/DB.
const rooms = {}; 
/*
rooms structure:
rooms[code] = {
  players: { socketId: { name, score } },
  started: false,
  questions: [ { q, opts, a } ],
  currentIndex: 0,
  answersThisRound: { socketId: answerIndex }, // track to avoid double answer
  timers: { roundTimerId } // optional
}
*/

// --- Helpers
function makeRoomCode() {
  return Math.random().toString(36).substring(2, 7).toUpperCase();
}

function pickQuestions() {
  // shuffle and pick QUESTIONS_COUNT
  const pool = [...QUESTION_POOL];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, QUESTIONS_COUNT);
}

function getPlayersArray(room) {
  return Object.entries(room.players).map(([id, p]) => ({ id, name: p.name, score: p.score }));
}

// --- Socket.IO logic
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
    room.players[socket.id] = { name: playerName, score: 0 };
    socket.join(code);
    socket.emit('roomCreated', code);
    io.to(code).emit('updatePlayers', getPlayersArray(room));
    console.log(`Room ${code} created by ${playerName}`);
  });

  socket.on('joinRoom', ({ roomCode, playerName }) => {
    const code = (roomCode || '').toUpperCase();
    const room = rooms[code];
    if (!room) {
      socket.emit('roomError', 'Sala não encontrada.');
      return;
    }
    if (room.started) {
      socket.emit('roomError', 'Jogo já iniciado na sala.');
      return;
    }
    const count = Object.keys(room.players).length;
    if (count >= ROOM_MAX_PLAYERS) {
      socket.emit('roomError', 'Sala lotada.');
      return;
    }
    room.players[socket.id] = { name: playerName, score: 0 };
    socket.join(code);
    io.to(code).emit('updatePlayers', getPlayersArray(room));
    socket.emit('roomJoined', { roomCode: code, players: getPlayersArray(room) });
    console.log(`${playerName} joined room ${code}`);
  });

  socket.on('startGame', (roomCode) => {
    const code = (roomCode || '').toUpperCase();
    const room = rooms[code];
    if (!room) {
      socket.emit('roomError', 'Sala não existe.');
      return;
    }
    if (room.started) {
      socket.emit('roomError', 'Jogo já está em andamento.');
      return;
    }
    room.started = true;
    room.currentIndex = 0;
    // broadcast pre-start countdown to all players
    io.to(code).emit('preStart', { seconds: PRE_START_SECONDS });
    // after PRE_START_SECONDS, start first question
    setTimeout(() => {
      sendQuestionToRoom(code);
    }, PRE_START_SECONDS * 1000);
    console.log(`Game started in room ${code}`);
  });

  socket.on('answer', ({ roomCode, playerName, answerIndex }) => {
    const code = (roomCode || '').toUpperCase();
    const room = rooms[code];
    if (!room || !room.started) return;
    // prevent if round finished or already answered by this socket
    if (room.answersThisRound[socket.id] !== undefined) return;
    // record answer
    room.answersThisRound[socket.id] = answerIndex;
    // evaluate correctness immediately for score
    const currentQuestion = room.questions[room.currentIndex];
    const isCorrect = answerIndex === currentQuestion.a;
    if (isCorrect) {
      if (room.players[socket.id]) room.players[socket.id].score += POINTS_PER_QUESTION;
    }
    // update scoreboard to clients (live)
    io.to(code).emit('updatePlayers', getPlayersArray(room));
  });

  socket.on('leaveRoom', (roomCode) => {
    const code = (roomCode || '').toUpperCase();
    const room = rooms[code];
    if (!room) return;
    if (room.players[socket.id]) delete room.players[socket.id];
    socket.leave(code);
    io.to(code).emit('updatePlayers', getPlayersArray(room));
  });

  socket.on('disconnect', () => {
    // remove from any room
    for (const code of Object.keys(rooms)) {
      const room = rooms[code];
      if (room && room.players[socket.id]) {
        delete room.players[socket.id];
        io.to(code).emit('updatePlayers', getPlayersArray(room));
      }
    }
  });
});

// --- Question flow per room ---
function sendQuestionToRoom(code) {
  const room = rooms[code];
  if (!room) return;

  if (room.currentIndex >= room.questions.length) {
    // game finished — compute ranking
    const ranking = getPlayersArray(room).sort((a, b) => b.score - a.score);
    io.to(code).emit('showResults', ranking);
    return;
  }

  const q = room.questions[room.currentIndex];
  // send question (shuffle options before sending to keep different order clients)
  // To keep correct answer index after shuffling, we shuffle on server and send options + correctIndex.
  const opts = [...q.opts];
  const indices = opts.map((_, idx) => idx);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  const shuffledOptions = indices.map(i => opts[i]);
  const correctIndexShuffled = indices.indexOf(q.a);

  // reset answers for this round
  room.answersThisRound = {};

  io.to(code).emit('question', {
    question: q.q,
    options: shuffledOptions,
    correctIndex: correctIndexShuffled,
    time: QUESTION_SECONDS
  });

  // after time + small buffer, reveal correct and move on
  room.timers.roundTimer = setTimeout(() => {
    // reveal: send correctIndex (clients will highlight)
    io.to(code).emit('reveal', { correctIndex: correctIndexShuffled });

    // small pause to show reveal (2s) then advance to next question
    setTimeout(() => {
      room.currentIndex++;
      sendQuestionToRoom(code);
    }, 2000);
  }, QUESTION_SECONDS * 1000 + 300);
}

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
