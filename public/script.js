// public/script.js
(() => {
  const socket = io();

  // screens
  const $lobby = document.getElementById('lobby');
  const $room = document.getElementById('room');
  const $game = document.getElementById('game');
  const $results = document.getElementById('results');

  // lobby elems
  const $nickname = document.getElementById('nickname');
  const $roomCodeInput = document.getElementById('roomCode');
  const $createRoomBtn = document.getElementById('createRoomBtn');
  const $joinRoomBtn = document.getElementById('joinRoomBtn');

  // room elems
  const $roomCodeDisplay = document.getElementById('roomCodeDisplay');
  const $playerList = document.getElementById('playerList');
  const $startGameBtn = document.getElementById('startGameBtn');
  const $leaveBtn = document.getElementById('leaveBtn');

  // game elems
  const $roundLabel = document.getElementById('roundLabel');
  const $timerText = document.getElementById('timer');
  const $timerFill = document.getElementById('timerFill');
  const $questionText = document.getElementById('questionText');
  const $options = document.getElementById('options');
  const $roundStatus = document.getElementById('roundStatus');

  // results elems
  const $podium = document.getElementById('podium');
  const $finalRanking = document.getElementById('finalRanking');
  const $backToLobbyBtn = document.getElementById('backToLobbyBtn');

  // local state
  let myName = '';
  let currentRoom = '';
  let localAnswered = false;
  let localTimer = null;
  let localTimeLeft = 8;
  let lastQuestionMeta = null; // { optionsSent, correctShuffled, time }

  // WebAudio (generated sounds)
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  const audioCtx = new AudioCtx();
  function playBeep(freq, duration = 0.12, type = 'sine', volume = 0.06) {
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.value = volume;
    o.connect(g);
    g.connect(audioCtx.destination);
    o.start();
    setTimeout(() => o.stop(), duration * 1000);
  }
  function soundClick(){ playBeep(1000,0.06,'square',0.03); }
  function soundCorrect(){ playBeep(880,0.12,'sine',0.12); setTimeout(()=>playBeep(1320,0.08,'sine',0.08),120); }
  function soundWrong(){ playBeep(220,0.18,'sawtooth',0.12); }

  // helper show screen
  function showScreen(name){
    [$lobby,$room,$game,$results].forEach(s => s.classList.remove('active'));
    if(name==='lobby') $lobby.classList.add('active');
    if(name==='room') $room.classList.add('active');
    if(name==='game') $game.classList.add('active');
    if(name==='results') $results.classList.add('active');
  }

  // render players list
  function renderPlayers(arr){
    $playerList.innerHTML = '';
    arr.forEach(p => {
      const li = document.createElement('li');
      li.textContent = `${p.name} — ${p.score || 0} pts`;
      $playerList.appendChild(li);
    });
  }

  // Lobby actions
  $createRoomBtn.addEventListener('click', () => {
    myName = $nickname.value.trim();
    if(!myName) return alert('Digite seu nome!');
    soundClick();
    socket.emit('createRoom', myName);
  });

  $joinRoomBtn.addEventListener('click', () => {
    myName = $nickname.value.trim();
    const code = $roomCodeInput.value.trim().toUpperCase();
    if(!myName || !code) return alert('Preencha seu nome e o código da sala!');
    soundClick();
    socket.emit('joinRoom', { roomCode: code, playerName: myName });
  });

  $leaveBtn.addEventListener('click', () => {
    if(currentRoom) socket.emit('leaveRoom', currentRoom);
    currentRoom = '';
    myName = '';
    $nickname.value = '';
    $roomCodeInput.value = '';
    showScreen('lobby');
  });

  $startGameBtn.addEventListener('click', () => {
    if(!currentRoom) return;
    socket.emit('startGame', currentRoom);
  });

  $backToLobbyBtn.addEventListener('click', () => {
    // reset local UI
    currentRoom = '';
    showScreen('lobby');
  });

  // Socket listeners
  socket.on('roomCreated', (code) => {
    currentRoom = code;
    $roomCodeDisplay.textContent = code;
    showScreen('room');
    // request players update (server emits updatePlayers as well)
  });

  socket.on('roomJoined', ({ roomCode, players }) => {
    currentRoom = roomCode;
    $roomCodeDisplay.textContent = roomCode;
    renderPlayers(players || []);
    showScreen('room');
  });

  socket.on('roomError', (msg) => {
    alert(msg);
  });

  socket.on('updatePlayers', (players) => {
    renderPlayers(players || []);
  });

  socket.on('preStart', ({ seconds }) => {
    showScreen('game');
    $questionText.textContent = `Jogo começa em ${seconds}...`;
    $options.innerHTML = '';
    $roundStatus.textContent = '';
    $timerText.textContent = `${seconds}s`;
    $timerFill.style.width = '100%';
    // local countdown
    let s = seconds;
    clearInterval(localTimer);
    localTimer = setInterval(() => {
      s--;
      $timerText.textContent = `${s}s`;
      $timerFill.style.width = `${(s/seconds)*100}%`;
      if(s <= 0) clearInterval(localTimer);
    }, 1000);
  });

  // receive question (server sends shuffled options; correctIndex is hidden)
  socket.on('question', (data) => {
    // data: { question, options[], correctIndex (null), time }
    localAnswered = false;
    lastQuestionMeta = { options: data.options.slice(), correctShuffled: null, time: data.time || 8 };
    showScreen('game');
    $roundLabel.textContent = `Pergunta ${ (data.index !== undefined ? data.index+1 : '...') } / 10`;
    $questionText.textContent = data.question;
    $options.innerHTML = '';
    $roundStatus.textContent = '';

    // render options
    data.options.forEach((opt, i) => {
      const btn = document.createElement('button');
      btn.className = '';
      btn.innerText = opt;
      btn.style.width = '100%';
      btn.style.padding = '12px';
      btn.style.borderRadius = '10px';
      btn.style.border = '1px solid rgba(0,0,0,0.06)';
      btn.style.background = '#f5f8ff';
      btn.style.fontWeight = '700';
      btn.addEventListener('click', () => {
        if(localAnswered) return;
        localAnswered = true;
        // disable buttons
        Array.from($options.children).forEach(c => c.disabled = true);
        // send answer (index in displayed options)
        socket.emit('answer', { roomCode: currentRoom, playerName: myName, answerIndex: i });
        $roundStatus.textContent = 'Resposta enviada! Aguardando...';
      });
      $options.appendChild(btn);
    });

    // local timer visual (server authoritative)
    startLocalTimer(lastQuestionMeta.time);
  });

  socket.on('reveal', ({ correctIndex }) => {
    // correctIndex is index in the options array the server sent (shuffled)
    // colorize and show
    const buttons = Array.from($options.children);
    buttons.forEach((btn, i) => {
      btn.disabled = true;
      btn.classList.remove('correct','wrong');
      if (i === correctIndex) {
        btn.classList.add('correct');
      } else {
        // if user selected it earlier (we can't know which was clicked unless we tracked),
        // but buttons disabled; leave as is (client doesn't track clicked class). For better UX,
        // we can briefly mark any non-correct but disabled as wrong if they were clicked — not tracked here to keep code simple.
      }
    });
    $roundStatus.textContent = 'Resposta correta mostrada';
    // stop timer visual
    clearInterval(localTimer);
    $timerText.textContent = '0s';
    $timerFill.style.width = '0%';
  });

  socket.on('showResults', (ranking) => {
    // ranking is array of { name, score, correctCount, accuracy }
    $podium.innerHTML = '';
    $finalRanking.innerHTML = '';

    if (ranking.length > 0) {
      const first = ranking[0];
      const second = ranking[1];
      const third = ranking[2];
      $podium.innerHTML = `
        <div class="place">${second ? '🥈 ' + second.name + '<br>' + (second.score||0) + ' pts' : ''}</div>
        <div class="place first">${first ? '🥇 ' + first.name + '<br>' + (first.score||0) + ' pts' : ''}</div>
        <div class="place">${third ? '🥉 ' + third.name + '<br>' + (third.score||0) + ' pts' : ''}</div>
      `;
    }

    // full ranking, sorted by score desc then name
    ranking.sort((a,b) => b.score - a.score || a.name.localeCompare(b.name));
    ranking.forEach((p, i) => {
      const row = document.createElement('div');
      row.className = 'row';
      row.innerHTML = `<div style="font-weight:700">${i+1}º — ${p.name}</div><div>${p.score} pts • ${p.correctCount||0}/${10} acertos • ${p.accuracy||0}%</div>`;
      $finalRanking.appendChild(row);
    });

    showScreen('results');
  });

  // local timer visual
  function startLocalTimer(seconds) {
    clearInterval(localTimer);
    localTimeLeft = seconds;
    $timerText.textContent = `${localTimeLeft}s`;
    $timerFill.style.width = '100%';
    localTimer = setInterval(() => {
      localTimeLeft--;
      if (localTimeLeft < 0) localTimeLeft = 0;
      $timerText.textContent = `${localTimeLeft}s`;
      $timerFill.style.width = `${(localTimeLeft/seconds)*100}%`;
      if(localTimeLeft <= 0) {
        clearInterval(localTimer);
        // time out — disable options
        Array.from($options.children).forEach(c => c.disabled = true);
        $roundStatus.textContent = 'Tempo esgotado — aguardando...';
      }
    }, 1000);
  }

  // ensure audio context resumes after user gesture (some browsers block sound)
  document.addEventListener('click', ()=> { if(audioCtx && audioCtx.state === 'suspended') audioCtx.resume().catch(()=>{}); }, {once:true});

  // initial screen
  showScreen('lobby');

})();
