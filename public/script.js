// public/script.js
(() => {
  const socket = io();

  // screens
  const lobby = document.getElementById('lobby');
  const room = document.getElementById('room');
  const game = document.getElementById('game');
  const results = document.getElementById('results');

  // lobby elems
  const nicknameInput = document.getElementById('nickname');
  const roomCodeInput = document.getElementById('roomCode');
  const createRoomBtn = document.getElementById('createRoomBtn');
  const joinRoomBtn = document.getElementById('joinRoomBtn');
  const playerList = document.getElementById('playerList');
  const roomCodeDisplay = document.getElementById('roomCodeDisplay');
  const startGameBtn = document.getElementById('startGameBtn');

  // game elems
  const questionText = document.getElementById('questionText');
  const optionsContainer = document.getElementById('options');
  const roundLabel = document.getElementById('roundLabel');
  const timerLabel = document.getElementById('timer');
  const roundStatus = document.getElementById('roundStatus');

  // results elems
  const podium = document.getElementById('podium');
  const finalRanking = document.getElementById('finalRanking');
  const backToLobbyBtn = document.getElementById('backToLobbyBtn');

  let myName = '';
  let currentRoom = '';
  let currentRound = 0;
  let localTimer = null;
  let acceptingAnswers = false;

  // helper: show a screen
  function showScreen(id) {
    [lobby, room, game, results].forEach(s => s.classList.remove('active'));
    if (id === 'lobby') lobby.classList.add('active');
    if (id === 'room') room.classList.add('active');
    if (id === 'game') game.classList.add('active');
    if (id === 'results') results.classList.add('active');
  }

  // update players list UI
  function renderPlayers(list) {
    playerList.innerHTML = '';
    list.forEach(p => {
      const li = document.createElement('li');
      li.innerText = `${p.name} — ${p.score || 0} pts`;
      playerList.appendChild(li);
    });
  }

  // create / join events
  createRoomBtn.addEventListener('click', () => {
    myName = nicknameInput.value.trim();
    if (!myName) return alert('Digite seu nome!');
    socket.emit('createRoom', myName);
  });

  joinRoomBtn.addEventListener('click', () => {
    myName = nicknameInput.value.trim();
    const code = roomCodeInput.value.trim().toUpperCase();
    if (!myName || !code) return alert('Preencha seu nome e o código da sala!');
    socket.emit('joinRoom', { roomCode: code, playerName: myName });
  });

  startGameBtn.addEventListener('click', () => {
    if (!currentRoom) return;
    socket.emit('startGame', currentRoom);
  });

  backToLobbyBtn.addEventListener('click', () => {
    // refresh UI local state
    currentRoom = '';
    myName = '';
    nicknameInput.value = '';
    roomCodeInput.value = '';
    showScreen('lobby');
  });

  // socket listeners
  socket.on('roomCreated', (code) => {
    currentRoom = code;
    roomCodeDisplay.textContent = code;
    showScreen('room');
  });

  socket.on('roomJoined', ({ roomCode, players }) => {
    currentRoom = roomCode;
    roomCodeDisplay.textContent = roomCode;
    renderPlayers(players);
    showScreen('room');
  });

  socket.on('roomError', (msg) => {
    alert(msg);
  });

  socket.on('updatePlayers', (players) => {
    renderPlayers(players);
  });

  // preStart: show countdown on all clients
  socket.on('preStart', ({ seconds }) => {
    // show countdown in question place then game screen
    showScreen('game');
    questionText.innerText = `O jogo começa em ${seconds}...`;
    optionsContainer.innerHTML = '';
    roundStatus.innerText = '';
    timerLabel.innerText = `${seconds}s`;
    let s = seconds;
    clearInterval(localTimer);
    localTimer = setInterval(() => {
      s--;
      timerLabel.innerText = `${s}s`;
      questionText.innerText = s > 0 ? `O jogo começa em ${s}...` : 'Preparando...';
      if (s <= 0) clearInterval(localTimer);
    }, 1000);
  });

  // when server sends a question
  socket.on('question', (data) => {
    // data: { question, options[], correctIndex, time }
    currentRound += 1;
    showScreen('game');
    roundLabel.innerText = `Rodada ${currentRound}`;
    questionText.innerText = data.question;
    optionsContainer.innerHTML = '';
    roundStatus.innerText = '';
    acceptingAnswers = true;

    // render options
    data.options.forEach((opt, i) => {
      const btn = document.createElement('button');
      btn.className = 'option-btn';
      btn.innerText = opt;
      btn.style.width = '100%';
      btn.style.padding = '12px';
      btn.style.borderRadius = '10px';
      btn.style.border = '1px solid rgba(0,0,0,0.06)';
      btn.style.background = '#f5f8ff';
      btn.style.fontWeight = '700';
      btn.addEventListener('click', () => {
        if (!acceptingAnswers) return;
        acceptingAnswers = false;
        // disable UI
        Array.from(optionsContainer.children).forEach(c => c.disabled = true);
        // send answer (by index) to server
        socket.emit('answer', { roomCode: currentRoom, playerName: myName, answerIndex: i });
        roundStatus.innerText = 'Resposta enviada! Aguarde o final do tempo.';
      });
      optionsContainer.appendChild(btn);
    });

    // start local timer
    let t = data.time || 10;
    timerLabel.innerText = `${t}s`;
    clearInterval(localTimer);
    localTimer = setInterval(() => {
      t--;
      timerLabel.innerText = `${t}s`;
      if (t <= 0) {
        clearInterval(localTimer);
        acceptingAnswers = false;
      }
    }, 1000);
  });

  // reveal correct answer (server signals)
  socket.on('reveal', ({ correctIndex }) => {
    // colorize buttons
    const buttons = Array.from(optionsContainer.children);
    buttons.forEach((btn, i) => {
      btn.disabled = true;
      if (i === correctIndex) {
        btn.classList.add('correct');
      } else {
        // only mark wrong if the player clicked it (it is disabled)
        if (btn.classList.contains('clicked')) btn.classList.add('wrong');
      }
    });
    roundStatus.innerText = 'Resposta correta mostrada';
  });

  // when final ranking is sent
  socket.on('showResults', (ranking) => {
    showScreen('results');
    // podium
    podium.innerHTML = '';
    finalRanking.innerHTML = '';
    if (ranking.length > 0) {
      const first = ranking[0];
      const second = ranking[1];
      const third = ranking[2];
      const p1 = `<div class="place first">🥇 ${first ? first.name : '—'}<br>${first ? first.score + ' pts' : ''}</div>`;
      const p2 = `<div class="place">${second ? '🥈 ' + second.name + '<br>' + second.score + ' pts' : ''}</div>`;
      const p3 = `<div class="place">${third ? '🥉 ' + third.name + '<br>' + third.score + ' pts' : ''}</div>`;
      podium.innerHTML = p2 + p1 + p3;
    }
    // full ranking top N
    ranking.forEach((p, i) => {
      const el = document.createElement('p');
      el.innerText = `${i + 1}º — ${p.name} — ${p.score} pts`;
      finalRanking.appendChild(el);
    });
  });

  // initial screen
  showScreen('lobby');

  // small UX: pressing Enter in name creates/join logic (optional)
  nicknameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      if (roomCodeInput.value.trim()) joinRoomBtn.click();
      else createRoomBtn.click();
    }
  });
})();
