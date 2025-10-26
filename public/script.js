// CLIENT: /public/script.js
// Multiplayer quiz client (fits the HTML & CSS above).
(() => {
  const socket = io();

  // Screens
  const $lobby = document.getElementById('lobby');
  const $room = document.getElementById('room');
  const $game = document.getElementById('game');
  const $results = document.getElementById('results');

  // Lobby elems
  const $nickname = document.getElementById('nickname');
  const $createRoomBtn = document.getElementById('createRoomBtn');
  const $joinRoomBtn = document.getElementById('joinRoomBtn');
  const $roomCodeInput = document.getElementById('roomCode');

  // Room elems
  const $roomCodeDisplay = document.getElementById('roomCodeDisplay');
  const $playerList = document.getElementById('playerList');
  const $playerCount = document.getElementById('playerCount');
  const $startGameBtn = document.getElementById('startGameBtn');
  const $leaveBtn = document.getElementById('leaveBtn');

  // Game elems
  const $roundLabel = document.getElementById('roundLabel');
  const $timerText = document.getElementById('timerText');
  const $timerFill = document.getElementById('timerFill');
  const $questionText = document.getElementById('questionText');
  const $options = document.getElementById('options');
  const $status = document.getElementById('status');

  // Results elems
  const $podium = document.getElementById('podium');
  const $finalRanking = document.getElementById('finalRanking');
  const $backToLobbyBtn = document.getElementById('backToLobbyBtn');

  // local state
  let myName = '';
  let currentRoom = '';
  let localAnswered = false;
  let localTimer = null;
  let localTimeLeft = 10;
  let currentQuestionIndex = 0;
  let currentCorrectIndex = null;
  let lastOptionsOrder = []; // to map shuffled options to real indexes when needed

  // WebAudio simple sounds (no external files)
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  function beep(freq, duration = 0.12, type = 'sine', gain = 0.08) {
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.value = gain;
    o.connect(g);
    g.connect(audioCtx.destination);
    o.start();
    setTimeout(() => { o.stop(); }, duration * 1000);
  }
  function soundClick(){ beep(1000,0.06,'square',0.04); }
  function soundCorrect(){ beep(880,0.12,'sine',0.12); setTimeout(()=>beep(1320,0.08,'sine',0.08),120); }
  function soundWrong(){ beep(220,0.18,'sawtooth',0.12); }

  // helpers: show screen
  function showScreen(name){
    [$lobby,$room,$game,$results].forEach(s => s.classList.remove('active'));
    if(name === 'lobby') $lobby.classList.add('active');
    if(name === 'room') $room.classList.add('active');
    if(name === 'game') $game.classList.add('active');
    if(name === 'results') $results.classList.add('active');
  }

  // helpers: shuffle array and return mapping
  function shuffleWithMap(arr){
    const indices = arr.map((_,i)=>i);
    for(let i=indices.length-1;i>0;i--){
      const j = Math.floor(Math.random()*(i+1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    const shuffled = indices.map(i => arr[i]);
    return {shuffled, indices};
  }

  // update players list UI
  function renderPlayers(players){
    $playerList.innerHTML = '';
    players.forEach(p => {
      const li = document.createElement('li');
      li.textContent = `${p.name} — ${p.score ?? 0} pts`;
      $playerList.appendChild(li);
    });
    $playerCount.textContent = players.length;
  }

  // LOBBY events
  $createRoomBtn.addEventListener('click', () => {
    myName = $nickname.value.trim();
    if(!myName) return alert('Digite seu nome!');
    soundClick();
    socket.emit('createRoom', myName);
  });

  $joinRoomBtn.addEventListener('click', () => {
    myName = $nickname.value.trim();
    const code = $roomCodeInput.value.trim().toUpperCase();
    if(!myName || !code) return alert('Preencha nome e código da sala!');
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
    // after game ends return to lobby (client-side)
    currentRoom = '';
    showScreen('lobby');
  });

  // SOCKET handlers
  socket.on('roomCreated', (code) => {
    currentRoom = code;
    $roomCodeDisplay.textContent = code;
    showScreen('room');
    // request current players list
    socket.emit('getPlayers', code);
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
    // show simple countdown in question area before game (client uses server countdown)
    showScreen('game');
    $questionText.textContent = `Jogo começa em ${seconds}...`;
    $options.innerHTML = '';
    $status.textContent = '';
    $timerText.textContent = `${seconds}s`;
    $timerFill.style.width = '100%';
    // local short countdown handled by server; not starting client timer here
  });

  // Accept either 'question' or 'gameStarted' payloads for compatibility
  socket.on('question', (data) => {
    // data: { question, options[], correctIndex?, time? }
    setupQuestion(data);
  });
  socket.on('gameStarted', (data) => {
    // compatibility: server may emit 'gameStarted' with first question
    if(data && (data.question || data.questionText)) setupQuestion(data);
  });

  socket.on('reveal', (data) => {
    // data: { correctIndex } - correctIndex refers to options array as sent by server.
    revealCorrectFromServer(data);
  });

  socket.on('showResults', (ranking) => {
    renderResults(ranking || []);
    showScreen('results');
  });

  // When server signals all answered (compatibility)
  socket.on('allAnswered', () => {
    revealCorrectFromServer(); // if server didn't send index separately, rely on currentCorrectIndex
  });

  // SEND answer helper (emit multiple event names for compatibility)
  function sendAnswer(index){
    // emit answer in several possible event names
    const payload = { roomCode: currentRoom, playerName: myName, answerIndex: index };
    socket.emit('answer', payload);
    socket.emit('playerAnswered', { room: currentRoom, player: myName, correct: null }); // best-effort
  }

  // QUESTION render & logic
  function setupQuestion(data){
    // normalize
    const qText = data.question || data.questionText || '';
    const optionsArr = data.options || data.opts || [];
    const serverCorrectIndex = (data.correctIndex !== undefined) ? data.correctIndex : (data.correct !== undefined ? data.correct : null);
    const time = data.time || 10;

    // store mapping: we will shuffle options client-side (unless server already shuffled)
    const { shuffled, indices } = shuffleWithMap(optionsArr);
    lastOptionsOrder = indices; // indices[i] gives original index of shuffled[i]

    // if server provided correctIndex in server options order, we need to map to shuffled index:
    if(serverCorrectIndex !== null && serverCorrectIndex !== undefined){
      // serverCorrectIndex = index in optionsArr (original)
      // find where original index sits in shuffled
      currentCorrectIndex = shuffled.findIndex((opt, i) => indices[i] === serverCorrectIndex);
      // if not found fallback to null
      if(currentCorrectIndex === -1) currentCorrectIndex = null;
    } else {
      // server didn't tell correctIndex; we will reveal based on server later (server must send reveal with correct index),
      // but we can keep mapping so if server later sends original index we know:
      currentCorrectIndex = null;
    }

    // UI populate
    $roundLabel.textContent = `Pergunta ${ (data.index !== undefined ? data.index+1 : currentQuestionIndex+1) } / 10`;
    $questionText.textContent = qText;
    $options.innerHTML = '';
    $status.textContent = '';
    localAnswered = false;

    shuffled.forEach((optText, i) => {
      const btn = document.createElement('button');
      btn.className = 'option';
      btn.setAttribute('role','listitem');
      btn.textContent = optText;
      btn.disabled = false;
      btn.style.opacity = '1';
      btn.onclick = () => {
        if(localAnswered) return;
        localAnswered = true;
        // mark selection immediate green/red for *this player*
        // we cannot mark the "correct option" for everyone until server reveals,
        // but we must color player's selected button green if it matches server-provided correctIndex (if known),
        // else color immediate local feedback (user asked: green for correct and red for wrong when they mark)
        const chosenIndex = i;
        // map chosenIndex to original option index:
        const originalIndex = typeof lastOptionsOrder[i]==='number' ? lastOptionsOrder[i] : i;
        // If server included correctIndex as original index, we can evaluate immediately:
        let answeredCorrect = false;
        if(serverCorrectIndex !== null && serverCorrectIndex !== undefined){
          answeredCorrect = (originalIndex === serverCorrectIndex);
        } else {
          // server didn't tell; we will optimistically wait for server reveal to mark global correct,
          // but user asked for immediate color: we will color chosen button green if serverCorrectIndex known, else greyed until reveal
          answeredCorrect = null;
        }

        if(answeredCorrect === true) {
          btn.classList.add('correct');
          try{ soundCorrect(); }catch(e){}
        } else if(answeredCorrect === false) {
          btn.classList.add('wrong');
          try{ soundWrong(); }catch(e){}
        } else {
          // unknown — temporarily mark as selected visually (light)
          btn.style.boxShadow = '0 0 0 3px rgba(0,0,0,0.03) inset';
          try{ soundClick(); }catch(e){}
        }

        // disable all options visually for this client
        Array.from($options.children).forEach(c => c.disabled = true);

        // send answer to server — send the original index if we can determine it
        sendAnswer(originalIndex);
      };
      $options.appendChild(btn);
    });

    // start visual timer but server-driven time is authoritative
    startLocalTimer(time);
  }

  // local timer (visual only) — server handles authoritative timeout & reveal
  function startLocalTimer(seconds){
    clearInterval(localTimer);
    localTimeLeft = seconds;
    $timerText.textContent = `${localTimeLeft}s`;
    $timerFill.style.width = '100%';
    localTimer = setInterval(() => {
      localTimeLeft--;
      if(localTimeLeft < 0) localTimeLeft = 0;
      $timerText.textContent = `${localTimeLeft}s`;
      $timerFill.style.width = `${(localTimeLeft/seconds)*100}%`;
      if(localTimeLeft <= 0) {
        clearInterval(localTimer);
        // inform server we timed out (server may already handle this)
        socket.emit('timeout', { roomCode: currentRoom, playerName: myName });
        // disable inputs for this client
        Array.from($options.children).forEach(c => c.disabled = true);
        // status
        $status.textContent = 'Tempo esgotado — aguardando outros jogadores...';
      }
    }, 1000);
  }

  // reveal correct option according to server
  function revealCorrectFromServer(payload){
    // payload may be { correctIndex } where correctIndex refers to server's options original order
    // if payload.correctIndex provided, map to current shuffled index:
    let serverCorrect = null;
    if(payload && (payload.correctIndex!==undefined && payload.correctIndex!==null)){
      // serverCorrectIndex is original index
      const orig = payload.correctIndex;
      const shuffledIndex = lastOptionsOrder.findIndex(x => x === orig);
      serverCorrect = shuffledIndex >= 0 ? shuffledIndex : null;
    } else if(payload && payload.correct !== undefined){
      // alternative naming
      const orig = payload.correct;
      const shuffledIndex = lastOptionsOrder.findIndex(x => x === orig);
      serverCorrect = shuffledIndex >= 0 ? shuffledIndex : null;
    } else {
      // fallback to currentCorrectIndex if we computed earlier from server's provided correctIndex
      serverCorrect = currentCorrectIndex;
    }

    // color correct/wrong globally
    const children = Array.from($options.children);
    children.forEach((btn, i) => {
      btn.classList.remove('disabled');
      btn.disabled = true;
      if(serverCorrect !== null && i === serverCorrect){
        btn.classList.add('correct');
      } else {
        // if a button was previously marked wrong by the user, keep it wrong; else leave as is
        if(!btn.classList.contains('wrong')) {
          // optionally dim
          // btn.style.opacity = '0.9';
        }
      }
    });

    $status.textContent = 'Resposta correta mostrada. Próxima pergunta em breve...';
  }

  // final results render
  function renderResults(ranking){
    $podium.innerHTML = '';
    $finalRanking.innerHTML = '';

    if(ranking.length > 0){
      // podium (top 3)
      const top1 = ranking[0];
      const top2 = ranking[1];
      const top3 = ranking[2];
      $podium.innerHTML = `
        <div class="place second">${top2? '🥈 '+top2.name + '<br>' + (top2.score||0) + ' pts' : ''}</div>
        <div class="place first">${top1? '🥇 '+top1.name + '<br>' + (top1.score||0) + ' pts' : ''}</div>
        <div class="place third">${top3? '🥉 '+top3.name + '<br>' + (top3.score||0) + ' pts' : ''}</div>
      `;
    }

    // full sorted ranking, organized
    const sorted = ranking.slice().sort((a,b)=> b.score - a.score || a.name.localeCompare(b.name));
    const wrapper = document.createElement('div');
    wrapper.style.marginTop = '12px';
    wrapper.style.textAlign = 'left';
    sorted.forEach((p, idx) => {
      const row = document.createElement('div');
      row.style.display = 'flex';
      row.style.justifyContent = 'space-between';
      row.style.padding = '8px';
      row.style.background = 'rgba(255,255,255,0.92)';
      row.style.marginBottom = '8px';
      row.style.borderRadius = '8px';
      row.innerHTML = `<strong>${idx+1}º ${p.name}</strong><span>${p.score} pts</span>`;
      $finalRanking.appendChild(row);
    });
  }

  // safety: if server doesn't reveal, after small buffer we still reveal using server-provided mapping (if possible)
  socket.on('noRevealFallback', () => {
    revealCorrectFromServer({});
  });

  // compatibility: sometimes server expects 'getPlayers' event
  socket.emit('clientReady', { });

  // request initial state (if already in a room, server might send updatePlayers)
  // NOTE: all emits below are best-effort and duplicate events are harmless

  // When server tells client what to do (debug)
  socket.on('debug', (d) => console.log('debug:',d));

  // Ensure audio context resumes on user gesture (some mobile browsers block autoplay)
  document.addEventListener('click', ()=> {
    if(audioCtx.state === 'suspended') audioCtx.resume().catch(()=>{});
  }, { once: true });

  // set initial screen
  showScreen('lobby');

})();
