const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

app.use(express.static(__dirname + "/public"));

const baseQuestions = [
  { question: "O que é uma narração?", options: ["Um texto que conta uma história com personagens e tempo", "Um texto que descreve objetos ou lugares", "Um texto que defende uma opinião", "Um texto que explica um conceito"], answer: 0 },
  { question: "Qual é o principal elemento da narração?", options: ["O narrador", "O autor", "O título", "O tema"], answer: 0 },
  { question: "O que é o enredo?", options: ["A sequência de ações e acontecimentos da história", "O espaço onde ocorre a história", "O conflito dos personagens", "A fala dos personagens"], answer: 0 },
  { question: "Quem conta a história em um texto narrativo?", options: ["O narrador", "O protagonista", "O autor", "O leitor"], answer: 0 },
  { question: "Qual desses é um tipo de narrador?", options: ["Narrador-personagem", "Narrador-ilustrador", "Narrador-público", "Narrador-anônimo"], answer: 0 },
  { question: "O que é o clímax na narrativa?", options: ["O momento de maior tensão da história", "O início da história", "A conclusão da história", "A descrição do espaço"], answer: 0 },
  { question: "O que representa o desfecho?", options: ["A parte final onde o conflito é resolvido", "O começo da história", "O conflito central", "A fala dos personagens"], answer: 0 },
  { question: "Qual é a função do tempo na narração?", options: ["Situar os acontecimentos", "Descrever personagens", "Defender uma tese", "Apresentar um argumento"], answer: 0 },
  { question: "O espaço narrativo representa:", options: ["O lugar onde a história se passa", "O tempo dos acontecimentos", "O ponto de vista do narrador", "O tema principal"], answer: 0 },
  { question: "Quem é o protagonista?", options: ["O personagem principal da história", "O narrador observador", "O antagonista", "O autor do texto"], answer: 0 }
];

function shuffle(array){ return array.sort(() => Math.random() - 0.5); }

const rooms = {}; // { roomCode: { players:{name:score}, questions:[], answersThisRound:{} } }

io.on("connection", socket => {

  socket.on("createRoom", ({ playerName }) => {
    const roomCode = Math.random().toString(36).substring(2,7).toUpperCase();
    rooms[roomCode] = { players: {}, questions: [], answersThisRound: {} };
    rooms[roomCode].players[playerName] = 0;
    socket.join(roomCode);
    io.to(socket.id).emit("roomCreated", roomCode);
    io.to(roomCode).emit("updatePlayers", rooms[roomCode].players);
  });

  socket.on("joinRoom", ({ playerName, roomCode }) => {
    if(!rooms[roomCode]) return socket.emit("error", "Sala não existe!");
    rooms[roomCode].players[playerName] = 0;
    socket.join(roomCode);
    io.to(roomCode).emit("updatePlayers", rooms[roomCode].players);
  });

  socket.on("startGame", (roomCode) => {
    if(!rooms[roomCode]) return;
    rooms[roomCode].questions = shuffle([...baseQuestions]);
    rooms[roomCode].answersThisRound = {};
    io.to(roomCode).emit("gameStarted", rooms[roomCode].questions);
  });

  socket.on("answer", ({ roomCode, playerName, correct }) => {
    if(!rooms[roomCode]) return;
    if(correct) rooms[roomCode].players[playerName] += 1;
    rooms[roomCode].answersThisRound[playerName] = true;

    io.to(roomCode).emit("updatePlayers", rooms[roomCode].players);

    const allAnswered = Object.keys(rooms[roomCode].players)
      .every(p => rooms[roomCode].answersThisRound[p]);
    if(allAnswered){
      rooms[roomCode].answersThisRound = {};
      io.to(roomCode).emit("nextQuestion");
    }
  });

  socket.on("endGame", ({ roomCode }) => {
    if(!rooms[roomCode]) return;
    io.to(roomCode).emit("gameEnded", rooms[roomCode].players);
  });
});

server.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
