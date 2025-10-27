const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, "public")));

const rooms = {}; // { roomCode: { players: { name: score }, questions: [...] } }

// ================== Utils ==================
function generateRoomCode() {
  return Math.random().toString(36).substring(2, 7).toUpperCase();
}

function getSampleQuestions() {
  return [
    { question:"O que é uma narração?", options:["Um texto que conta uma história","Um texto que descreve","Um texto que defende opinião","Um texto que explica"], correct:0 },
    { question:"Qual é o principal elemento?", options:["Narrador","Autor","Título","Tema"], correct:0 },
    { question:"O que é enredo?", options:["Sequência de ações","Espaço","Conflito","Fala"], correct:0 },
    { question:"Quem conta a história?", options:["Narrador","Protagonista","Autor","Leitor"], correct:0 },
    { question:"Tipo de narrador?", options:["Narrador-personagem","Narrador-ilustrador","Narrador-público","Narrador-anônimo"], correct:0 },
    { question:"O que é clímax?", options:["Momento de maior tensão","Início","Conclusão","Descrição"], correct:0 },
    { question:"Desfecho representa?", options:["Parte final","Começo","Conflito","Fala"], correct:0 },
    { question:"Função do tempo?", options:["Situar acontecimentos","Descrever","Defender tese","Apresentar argumento"], correct:0 },
    { question:"Espaço narrativo representa?", options:["Lugar da história","Tempo","Ponto de vista","Tema"], correct:0 },
    { question:"Quem é o protagonista?", options:["Personagem principal","Narrador","Antagonista","Autor"], correct:0 },
  ];
}

// ================== Socket.IO ==================
io.on("connection", socket => {
  console.log("Novo jogador conectado:", socket.id);

  socket.on("createRoom", playerName => {
    const roomCode = generateRoomCode();
    rooms[roomCode] = { players: {}, questions: getSampleQuestions(), current: 0 };
    rooms[roomCode].players[playerName] = 0;
    socket.join(roomCode);
    socket.emit("roomCreated", roomCode);
    io.to(roomCode).emit("updatePlayers", rooms[roomCode].players);
  });

  socket.on("joinRoom", ({ playerName, roomCode }) => {
    if (!rooms[roomCode]) return socket.emit("error", "Sala não existe");
    rooms[roomCode].players[playerName] = 0;
    socket.join(roomCode);
    io.to(roomCode).emit("updatePlayers", rooms[roomCode].players);
  });

  socket.on("startGame", roomCode => {
    if (!rooms[roomCode]) return;
    const room = rooms[roomCode];
    io.to(roomCode).emit("gameStarted", room.questions);
    nextQuestion(roomCode);
  });

  socket.on("answer", ({ roomCode, playerName, correct }) => {
    if (correct) rooms[roomCode].players[playerName] += 1;
    // marca que respondeu
    if (!rooms[roomCode].answered) rooms[roomCode].answered = {};
    rooms[roomCode].answered[playerName] = true;

    // Se todos responderam ou tempo acabou, envia nextQuestion
    const totalPlayers = Object.keys(rooms[roomCode].players).length;
    const answeredCount = Object.keys(rooms[roomCode].answered).length;
    if (answeredCount >= totalPlayers) nextQuestion(roomCode);
  });
});

// ================== Avançar questão ==================
function nextQuestion(roomCode) {
  const room = rooms[roomCode];
  if (!room) return;
  room.current++;
  room.answered = {};
  if (room.current >= room.questions.length) {
    io.to(roomCode).emit("gameEnded", room.players);
    return;
  }
  io.to(roomCode).emit("nextQuestion");
}

// ================== Servidor ==================
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log("Servidor rodando na porta", PORT));
