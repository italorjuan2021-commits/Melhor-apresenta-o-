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
const PRE_START_SECONDS = 5; // 5s antes de iniciar
const QUESTION_SECONDS = 8;  // 8s por pergunta
const POINTS_PER_QUESTION = 10;

// Pool de perguntas (10)
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

// rooms structure in-memory
const rooms = {};

/*
rooms[code] = {
  players: { socketId: { id: socketId, name, score, correctCount } },
  started: false,
  questions: [ { q, opts, a } ],
  currentIndex: 0,
  answersThisRound: { socketId: answerIndex },
  timers: { roundTimer: Timeout }
}
*/

// helpers
function makeRoomCode() {
  return Math.random().toString(36).substring(2, 7).toUpperCase();
}

function pickQuestions() {
  // shuffle QUESTION_POOL and pick QUESTIONS_COUNT
  const pool = [...QUESTION_POOL];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, QUESTIONS_COUNT);
}

function getPlayersArray(room) {
  return Object.values(room.players).map(p => ({ id: p.id, name: p.name, score: p.score, correctCount: p.correctCount || 0 }));
}

function broadcastPlayers(code) {
  const room = rooms[code];
  if (!room) return;
  io.to(code).emit('updatePlayers', getPlayersArray(room));
}

// shuffle options and compute correctIndex in shuffled order
function shuffleOptions(opts, correctIndex) {
  const indices = opts.map((_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  const shuffled = indices.map(i => opts[i]);
  const correctShuffled = indices.indexOf(correctIndex);
  return { shuffled, correctShuffled, mapOriginalToShuffled: indices };
}

// main socket logic
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
    room.players[socket.id] = { id: socket.id, name: playerName, score: 0, correctCount: 0 };
    socket.join(code);
    socket.emit('roomJoined', { roomCode: code, players: getPlayersArray(room) });
    broadcastPlayers(code);
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
    // pre-start countdown
    io.to(code).emit('preStart', { seconds: PRE_START_SECONDS });
    // after PRE_START_SECONDS, send first question
    setTimeout(() => {
      sendQuestionToRoom(code);
    }, PRE_START_SECONDS * 1000);
    console.log(`Game started in room ${code}`);
  });

  // client sends answerIndex as index in the shuffled options (0..n-1)
  socket.on('answer', ({ roomCode, playerName, answerIndex }) => {
    const code = (roomCode || '').toUpperCase();
    const room = rooms[code];
    if (!room || !room.started) return;
    // ignore if already answered this round
    if (room.answersThisRound[socket.id] !== undefined) return;
    room.answersThisRound[socket.id] = answerIndex;

    // evaluate correctness using room._lastCorrectIndex (shuffled index)
    const correctShuffled = room._lastCorrectShuffled;
    const isCorrect = (answerIndex === correctShuffled);

    // award points once per player per question
    if (isCorrect) {
      const player = room.players[socket.id];
      if (player) {
        player.score = (player.score || 0) + POINTS_PER_QUESTION;
        player.correctCount = (player.correctCount || 0) + 1;
      }
    }

    // live update
    broadcastPlayers(code);

    // if all connected players answered, reveal early
    const totalPlayers = Object.keys(room.players).length;
    const answeredCount = Object.keys(room.answersThisRound).length;
    if (answeredCount >= totalPlayers) {
      // clear scheduled reveal if exists
      if (room.timers.roundTimer) {
        clearTimeout(room.timers.roundTimer);
        room.timers.roundTimer = null;
      }
      // reveal now
      io.to(code).emit('reveal', { correctIndex: room._lastCorrectShuffled });
      // small pause then next question
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
    if (room.players[socket.id]) delete room.players[socket.id];
    socket.leave(code);
    broadcastPlayers(code);
  });

  socket.on('disconnect', () => {
    // remove from any room
    for (const code of Object.keys(rooms)) {
      const room = rooms[code];
      if (room && room.players[socket.id]) {
        delete room.players[socket.id];
        // if room becomes empty, delete it
        if (Object.keys(room.players).length === 0) {
          // clear timers
          if (room.timers && room.timers.roundTimer) clearTimeout(room.timers.roundTimer);
          delete rooms[code];
          console.log(`Room ${code} removed (empty)`);
        } else {
          broadcastPlayers(code);
        }
      }
    }
  });
});

// send question flow
function sendQuestionToRoom(code) {
  const room = rooms[code];
  if (!room) return;

  // finished?
  if (room.currentIndex >= room.questions.length) {
    // prepare ranking
    const ranking = getPlayersArray(room).map(p => {
      const player = Object.values(room.players).find(x => x.name === p.name);
      return {
        name: p.name,
        score: p.score || 0,
        correctCount: player ? (player.correctCount || 0) : 0,
        accuracy: player ? Math.round(((player.correctCount || 0) / room.questions.length) * 100) : 0
      };
    }).sort((a, b) => b.score - a.score || b.correctCount - a.correctCount);
    io.to(code).emit('showResults', ranking);
    // cleanup room.started maybe keep for replay
    room.started = false;
    return;
  }

  const q = room.questions[room.currentIndex];
  // shuffle options and map correct index to shuffled
  const { shuffled, correctShuffled } = shuffleOptions(q.opts, q.a);

  // store for evaluation
  room.answersThisRound = {};
  room._lastCorrectShuffled = correctShuffled;

  // send question with time = QUESTION_SECONDS
  io.to(code).emit('question', {
    question: q.q,
    options: shuffled,
    correctIndex: null, // do not reveal correct index now
    time: QUESTION_SECONDS
  });

  // schedule reveal after time
  room.timers.roundTimer = setTimeout(() => {
    // reveal correctIndexShuffled to clients
    io.to(code).emit('reveal', { correctIndex: correctShuffled });
    // small pause then next
    setTimeout(() => {
      room.currentIndex++;
      sendQuestionToRoom(code);
    }, 2000);
  }, QUESTION_SECONDS * 1000 + 200); // small buffer
}

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
