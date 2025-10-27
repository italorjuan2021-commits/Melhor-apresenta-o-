// ===============================
// 🎮 A NARRAÇÃO - Servidor Multiplayer Sincronizado
// ===============================

import express from "express";
import http from "http";
import { Server } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname)));

const PORT = process.env.PORT || 3000;

// ===============================
// 📦 Estrutura das salas
// ===============================
let rooms = {};

// ===============================
// 🧠 Banco de perguntas
// ===============================
const questions = [
  { q: "O que é uma narração?", a: ["Um texto que conta uma história com personagens e tempo", "Um texto que descreve objetos ou lugares", "Um texto que defende uma opinião", "Um texto que explica um conceito"], correct: 0 },
  { q: "Quem é o narrador-personagem?", a: ["Quem participa da história e a conta", "Quem só observa de fora", "Quem escreve o livro", "Quem representa o leitor"], correct: 0 },
  { q: "O que é o enredo?", a: ["A sequência de ações da história", "O local onde se passa a história", "A moral do texto", "A fala dos personagens"], correct: 0 },
  { q: "Qual o momento de maior tensão da narrativa?", a: ["Clímax", "Introdução", "Desfecho", "Narrativa"], correct: 0 },
  { q: "O desfecho representa:", a: ["A parte final da história", "O início da narrativa", "O conflito", "O espaço narrativo"], correct: 0 },
  { q: "Quem é o protagonista?", a: ["O personagem principal", "O narrador observador", "O vilão", "O leitor"], correct: 0 },
  { q: "O que o tempo faz na narrativa?", a: ["Situa os acontecimentos", "Apresenta personagens", "Explica ideias", "Expõe opiniões"], correct: 0 },
  { q: "O espaço narrativo é:", a: ["O lugar onde ocorre a história", "O tema da história", "A fala dos personagens", "O conflito central"], correct: 0 },
  { q: "Quem conta a história?", a: ["O narrador", "O autor", "O leitor", "O protagonista"], correct: 0 },
  { q: "O que é o clímax?", a: ["O ponto de maior tensão", "O início do texto", "O final", "A descrição"], correct: 0 }
];

// ===============================
// ⚙️ Conexões Socket.IO
// ===============================
io.on("connection", (socket) => {
  console.log("🟢 Novo jogador conectado:", socket.id);

  socket.on("createRoom", (name) => {
    const code = Math.random().toString(36).substring(2, 7).toUpperCase();
    rooms[code] = {
      host: socket.id,
      players: { [socket.id]: { name, score: 0 } },
      currentQuestion: 0,
      timer: null,
      answers: {},
    };
    socket.join(code);
    socket.emit("roomCreated", code);
    io.to(code).emit("updatePlayers", Object.values(rooms[code].players));
  });

  socket.on("joinRoom", ({ name, code }) => {
    if (!rooms[code]) return socket.emit("errorMsg", "Sala não encontrada!");
    rooms[code].players[socket.id] = { name, score: 0 };
    socket.join(code);
    io.to(code).emit("updatePlayers", Object.values(rooms[code].players));
  });

  socket.on("startGame", (code) => {
    if (!rooms[code]) return;
    rooms[code].currentQuestion = 0;
    startRound(code);
  });

  socket.on("answer", ({ code, answer }) => {
    const room = rooms[code];
    if (!room) return;
    room.answers[socket.id] = answer;
    // Se respondeu certo, soma ponto
    const q = questions[room.currentQuestion];
    if (answer === q.a[q.correct]) {
      room.players[socket.id].score += 1;
    }
  });

  socket.on("disconnect", () => {
    for (const code in rooms) {
      const room = rooms[code];
      if (room.players[socket.id]) {
        delete room.players[socket.id];
        io.to(code).emit("updatePlayers", Object.values(room.players));
        if (Object.keys(room.players).length === 0) delete rooms[code];
      }
    }
  });
});

// ===============================
// ⏱️ Rodadas controladas pelo servidor
// ===============================
function startRound(code) {
  const room = rooms[code];
  if (!room) return;

  const qIndex = room.currentQuestion;
  if (qIndex >= questions.length) {
    endGame(code);
    return;
  }

  const q = questions[qIndex];
  io.to(code).emit("startQuestion", { question: q.q, options: q.a, time: 10 });

  // Zera respostas
  room.answers = {};

  // Inicia o timer da rodada
  clearTimeout(room.timer);
  room.timer = setTimeout(() => {
    io.to(code).emit("timeUp", { correct: q.a[q.correct] });
    setTimeout(() => {
      room.currentQuestion++;
      startRound(code);
    }, 1500);
  }, 10000);
}

// ===============================
// 🏁 Final do jogo
// ===============================
function endGame(code) {
  const room = rooms[code];
  if (!room) return;

  const ranking = Object.values(room.players)
    .sort((a, b) => b.score - a.score)
    .map((p, i) => ({ ...p, rank: i + 1 }));

  io.to(code).emit("showResults", ranking);
  delete rooms[code];
}

// ===============================
// 🚀 Inicialização
// ===============================
server.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
