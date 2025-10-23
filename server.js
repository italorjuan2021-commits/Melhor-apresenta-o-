// server.js - Quiz Narração Multiplayer (Node.js + Socket.io) - atualizado
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { customAlphabet } = require('nanoid');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(express.static('public'));

const nanoid = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 6);

const MAX_PLAYERS_PER_ROOM = 50;
const QUESTIONS_COUNT = 10;
const POINTS_PER_QUESTION = 10;
const PRE_START_SECONDS = 5;   // <--- reduzido para 5s
const QUESTION_SECONDS = 15;   // <--- reduzido para 15s

// Questions pool (10 short questions about "narração")
const QUESTIONS_POOL = [
  { q: "O que é narração?", opts: ["Descrever objetos", "Contar uma história", "Argumentar um ponto", "Explicar um experimento"], a: 1 },
  { q: "Quem é o narrador?", opts: ["Quem lê o texto", "Quem conta a história", "Quem publica o texto", "Um personagem secundário"], a: 1 },
  { q: "O que é enredo?", opts: ["O tema do texto", "A sequência de ações", "O narrador", "O tipo de linguagem"], a: 1 },
  { q: "O que é espaço na narrativa?", opts: ["O tempo da história", "As falas dos personagens", "O lugar onde a história ocorre", "O resumo do texto"], a: 2 },
  { q: "Qual é o papel do conflito?", opts: ["Resolver tudo", "Gerar o problema central", "Descrever o personagem", "Controlar o tempo"], a: 1 },
  { q: "O que significa narrador em 1ª pessoa?", opts: ["Narrador domina tudo", "Narrador participa da história", "Narrador é anônimo", "Narrador é o autor"], a: 1 },
  { q: "O narrador onisciente:", opts: ["Sabe tudo sobre personagens", "Nunca fala", "É sempre personagem", "É o leitor"], a: 0 },
  { q: "O que é clímax?", opts: ["A introdução", "O ponto alto do conflito", "O final resumido", "O personagem principal"], a: 1 },
  { q: "O que compõe uma narrativa?", opts: ["Personagens, enredo, tempo e espaço", "Somente personagens", "Somente enredo", "Somente tempo"], a: 0 },
  { q: "O desfecho é:", opts: ["O início da história", "A resolução das ações", "O sumário", "A ficha técnica"], a: 1 }
];

function shuffleArray(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// shuffle options and return {opts: [...], correctIndex: n}
function shuffleOptionsWithAnswer(opts, correctIdx) {
  const indexed = opts.map((o, i) => ({ o, i }));
  const shuffled = shuffleArray(indexed);
  const newOpts = shuffled.map(s => s.o);
  const newCorrectIndex = shuffled.findIndex(s => s.i === correctIdx);
  return { opts: newOpts, correctIndex: newCorrectIndex };
}

function makeQuestions() {
  const pool = [...QUESTIONS_POOL];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, QUESTIONS_COUNT);
}

const rooms = new Map();

function createRoom(hostSocketId, hostName) {
  const code = nanoid();
  const room = {
    code,
    hostId: hostSocketId,
    players: [],
    questions: makeQuestions(),
    currentIndex: -1,
    status: 'waiting',
    timers: {},
    _answers: {},              // answers for current question
    acceptingAnswers: false    // flag to block answers after timeout
  };
  rooms.set(code, room);
  addPlayerToRoom(room, hostSocketId, hostName);
  return room;
}

function getRoom(code) { return rooms.get(code); }

function addPlayerToRoom(room, socketId, name) {
  if (!room) return false;
  if (room.players.length >= MAX_PLAYERS_PER_ROOM) return false;
  room.players.push({ id: socketId, name: name || 'Anon', score: 0, correctCount: 0 });
  return true;
}

function removePlayerFromRoom(room, socketId) {
  if (!room) return;
  room.players = room.players.filter(p => p.id !== socketId);
  if (room.hostId === socketId) {
    if (room.players.length > 0) room.hostId = room.players[0].id;
    else {
      clearRoomTimers(room);
      rooms.delete(room.code);
    }
  }
}

function roomSummary(room) {
  return {
    code: room.code,
    hostId: room.hostId,
    players: room.players.map(p => ({ id: p.id, name: p.name, score: p.score })),
    status: room.status,
    currentIndex: room.currentIndex
  };
}

function broadcastRoomUpdate(room) {
  io.to(room.code).emit('room_update', roomSummary(room));
}

function evaluateRound(room) {
  const idx = room.currentIndex;
  const q = room.questions[idx];
  if (!q) return;
  const correctIdx = q.a_shuffled; // we'll set this when sending
  room.players.forEach(p => {
    const ans = room._answers[p.id];
    if (ans !== undefined && ans === correctIdx) {
      p.score += POINTS_PER_QUESTION;
      p.correctCount = (p.correctCount || 0) + 1;
    }
  });
  const results = room.players.map(p => ({
    id: p.id, name: p.name, score: p.score, correctCount: p.correctCount || 0,
    answered: room._answers[p.id] !== undefined, givenAnswer: room._answers[p.id] !== undefined ? room._answers[p.id] : null
  })).sort((a,b)=> b.score - a.score);

  io.to(room.code).emit('round_result', {
    questionIndex: idx,
    correctIndex: correctIdx,
    players: results
  });

  room._answers = {};
}

function sendQuestion(room) {
  if (!room) return;
  if (room.currentIndex < 0 || room.currentIndex >= room.questions.length) {
    finishRoom(room);
    return;
  }
  const qRaw = room.questions[room.currentIndex];
  // shuffle options and store the mapping in question object
  const { opts: shuffledOpts, correctIndex } = shuffleOptionsWithAnswer(qRaw.opts, qRaw.a);
  // store the shuffled-correct index to evaluate later
  room.questions[room.currentIndex].a_shuffled = correctIndex;

  room._answers = {};
  room.acceptingAnswers = true;

  io.to(room.code).emit('question', {
    index: room.currentIndex,
    q: qRaw.q,
    options: shuffledOpts,
    time: QUESTION_SECONDS
  });

  // set timer for question
  room.timers.questionTimer = setTimeout(() => {
    room.acceptingAnswers = false;
    evaluateRound(room);
    clearTimeout(room.timers.questionTimer);
    room.currentIndex++;
    if (room.currentIndex >= room.questions.length) {
      setTimeout(() => finishRoom(room), 2000);
    } else {
      setTimeout(() => sendQuestion(room), 2000);
    }
  }, QUESTION_SECONDS * 1000);
}

function startRoomCountdown(room) {
  room.status = 'starting';
  let sec = PRE_START_SECONDS;
  io.to(room.code).emit('countdown_start', { seconds: sec });
  room.timers.startTimer = setInterval(() => {
    sec--;
    io.to(room.code).emit('countdown_tick', { seconds: sec });
    if (sec <= 0) {
      clearInterval(room.timers.startTimer);
      room.status = 'in-progress';
      room.currentIndex = 0;
      sendQuestion(room);
    }
  }, 1000);
}

function finishRoom(room) {
  room.status = 'finished';
  const ranking = room.players.map(p => ({
    name: p.name,
    score: p.score,
    correctCount: p.correctCount || 0,
    accuracy: Math.round(((p.correctCount || 0) / QUESTIONS_COUNT) * 100)
  })).sort((a,b) => b.score - a.score);

  io.to(room.code).emit('final_results', {
    ranking,
    top5: ranking.slice(0, 5)
  });
}

function clearRoomTimers(room) {
  if (!room) return;
  if (room.timers.startTimer) clearInterval(room.timers.startTimer);
  if (room.timers.questionTimer) clearTimeout(room.timers.questionTimer);
  room.timers = {};
}

io.on('connection', socket => {
  console.log('conn:', socket.id);

  socket.on('create_room', (name, cb) => {
    try {
      const room = createRoom(socket.id, name);
      socket.join(room.code);
      cb && cb({ ok: true, code: room.code, room: roomSummary(room) });
      broadcastRoomUpdate(room);
    } catch (err) {
      console.error(err);
      cb && cb({ ok: false, msg: 'Erro ao criar sala' });
    }
  });

  socket.on('join_room', (data, cb) => {
    const { code, name } = data;
    const room = getRoom(code);
    if (!room) return cb && cb({ ok: false, msg: 'Sala não existe' });
    if (room.players.length >= MAX_PLAYERS_PER_ROOM) return cb && cb({ ok: false, msg: 'Sala cheia' });
    if (room.status !== 'waiting') return cb && cb({ ok: false, msg: 'Jogo já começou' });
    addPlayerToRoom(room, socket.id, name);
    socket.join(code);
    cb && cb({ ok: true, room: roomSummary(room) });
    broadcastRoomUpdate(room);
  });

  socket.on('leave_room', (code) => {
    const room = getRoom(code);
    if (!room) return;
    removePlayerFromRoom(room, socket.id);
    socket.leave(code);
    broadcastRoomUpdate(room);
  });

  socket.on('start_room', (code, cb) => {
    const room = getRoom(code);
    if (!room) return cb && cb({ ok: false, msg: 'Sala inválida' });
    if (socket.id !== room.hostId) return cb && cb({ ok: false, msg: 'Somente o host pode iniciar' });
    if (room.status !== 'waiting') return cb && cb({ ok: false, msg: 'Jogo já iniciado' });
    startRoomCountdown(room);
    cb && cb({ ok: true });
  });

  socket.on('submit_answer', (data) => {
    const { code, answerIndex } = data;
    const room = getRoom(code);
    if (!room || room.status !== 'in-progress') return;
    // block answers if not accepting
    if (!room.acceptingAnswers) return;
    if (room._answers[socket.id] !== undefined) return;
    room._answers[socket.id] = answerIndex;
    // NOTE: we purposely DO NOT evaluate early when everyone answered —
    // the reveal only happens when the server timer expires, per the spec.
  });

  socket.on('disconnect', () => {
    for (let room of rooms.values()) {
      const idx = room.players.findIndex(p => p.id === socket.id);
      if (idx !== -1) {
        room.players.splice(idx, 1);
        io.to(room.code).emit('room_update', roomSummary(room));
        if (room.hostId === socket.id) {
          if (room.players.length > 0) room.hostId = room.players[0].id;
          else {
            clearRoomTimers(room);
            rooms.delete(room.code);
          }
        }
        break;
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log('Server running on', PORT));
