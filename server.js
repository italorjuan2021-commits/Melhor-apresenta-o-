// ===============================
// server.js
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

// Configurações
const ROOM_MAX_PLAYERS = 50;
const QUESTION_SECONDS = 8; // 8s por pergunta
const QUESTIONS_COUNT = 10;

// Perguntas (mesmo que no front)
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

// Estrutura das salas
const rooms = {};

/*
rooms[code] = {
  players: { socketId: { name, score, correctCount } },
  started: false,
  questions: [],
  currentIndex: 0,
  answersThisRound: {},
  timers: {}
}
*/

// Helpers
function makeRoomCode() {
  return Math.random().toString(36).substring(2,7).toUpperCase();
}

function pickQuestions() {
  const pool = [...QUESTION_POOL];
  for(let i = pool.length-1; i>0; i--){
    const j = Math.floor(Math.random() * (i+1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, QUESTIONS_COUNT);
}

function broadcastPlayers(code) {
  const room = rooms[code];
  if(!room) return;
  const players = Object.values(room.players).map(p => ({
    name: p.name,
    score: p.score,
    correctCount: p.correctCount
  }));
  io.to(code).emit('updatePlayers', players);
}

// Shuffle options
function shuffleOptions(opts, correctIndex) {
  const indices = opts.map((_,i)=>i);
  for(let i=indices.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  const shuffled = indices.map(i=>opts[i]);
  const correctShuffled = indices.indexOf(correctIndex);
  return { shuffled, correctShuffled };
}

// ===============================
// Socket.IO
// ===============================
io.on('connection', socket => {
  console.log('connected', socket.id);

  // Criar sala
  socket.on('createRoom', playerName => {
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
    room.players[socket.id] = { name: playerName, score: 0, correctCount: 0 };
    socket.join(code);
    socket.emit('roomCreated', code);
    broadcastPlayers(code);
  });

  // Entrar sala
  socket.on('joinRoom', ({ roomCode, playerName }) => {
    const code = roomCode.toUpperCase();
    const room = rooms[code];
    if(!room) { socket.emit('roomError', 'Sala não encontrada'); return; }
    if(room.started) { socket.emit('roomError', 'Jogo já iniciado'); return; }
    if(Object.keys(room.players).length >= ROOM_MAX_PLAYERS) {
      socket.emit('roomError', 'Sala lotada'); return;
    }
    room.players[socket.id] = { name: playerName, score: 0, correctCount: 0 };
    socket.join(code);
    socket.emit('roomJoined', { roomCode: code, players: Object.values(room.players) });
    broadcastPlayers(code);
  });

  // Iniciar jogo
  socket.on('startGame', roomCode => {
    const room = rooms[roomCode];
    if(!room) return;
    if(room.started) return;
    room.started = true;
    room.currentIndex = 0;
    sendQuestion(roomCode);
  });

  // Resposta
  socket.on('answer', ({ roomCode, playerName, answerIndex }) => {
    const room = rooms[roomCode];
    if(!room || !room.started) return;
    if(room.answersThisRound[socket.id] !== undefined) return;
    room.answersThisRound[socket.id] = answerIndex;

    const correctIndex = room._lastCorrectShuffled;
    const player = room.players[socket.id];
    if(answerIndex === correctIndex){
      player.score += 1;
      player.correctCount += 1;
    }

    broadcastPlayers(roomCode);

    // Se todos responderam
    if(Object.keys(room.answersThisRound).length === Object.keys(room.players).length){
      clearTimeout(room.timers.roundTimer);
      io.to(roomCode).emit('reveal', { correctIndex });
      setTimeout(() => {
        room.currentIndex++;
        sendQuestion(roomCode);
      }, 1500);
    }
  });

  // Desconectar
  socket.on('disconnect', () => {
    for(const code in rooms){
      const room = rooms[code];
      if(room.players[socket.id]){
        delete room.players[socket.id];
        broadcastPlayers(code);
        if(Object.keys(room.players).length===0){
          clearTimeout(room.timers.roundTimer);
          delete rooms[code];
        }
      }
    }
  });
});

// ===============================
// Enviar pergunta
// ===============================
function sendQuestion(code){
  const room = rooms[code];
  if(!room) return;

  if(room.currentIndex >= room.questions.length){
    // Ranking final
    const ranking = Object.values(room.players)
      .map(p => ({ name: p.name, score: p.score, correctCount: p.correctCount }))
      .sort((a,b)=>b.score - a.score);
    io.to(code).emit('showResults', ranking);
    room.started = false;
    return;
  }

  const q = room.questions[room.currentIndex];
  const { shuffled, correctShuffled } = shuffleOptions(q.opts, q.a);
  room.answersThisRound = {};
  room._lastCorrectShuffled = correctShuffled;

  io.to(code).emit('question', {
    index: room.currentIndex,
    question: q.q,
    options: shuffled,
    time: QUESTION_SECONDS
  });

  room.timers.roundTimer = setTimeout(()=>{
    io.to(code).emit('reveal',{ correctIndex: correctShuffled });
    setTimeout(()=>{
      room.currentIndex++;
      sendQuestion(code);
    },1500);
  }, QUESTION_SECONDS*1000);
}

// ===============================
server.listen(PORT, ()=>console.log(`Server rodando na porta ${PORT}`));
