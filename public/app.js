const socket = io();

const lobbyScreen = document.getElementById('lobby-screen');
const roomScreen = document.getElementById('room-screen');
const nickInput = document.getElementById('nick');
const createRoomBtn = document.getElementById('createRoomBtn');
const joinRoomBtn = document.getElementById('joinRoomBtn');
const joinCodeInput = document.getElementById('joinCode');
const roomCodeDisplay = document.getElementById('roomCodeDisplay');
const playersList = document.getElementById('playersList');
const startBtn = document.getElementById('startBtn');
const leaveBtn = document.getElementById('leaveBtn');
let myRoom='', myName='', amIHost=false;

function showScreen(el){lobbyScreen.classList.remove('active');roomScreen.classList.remove('active');el.classList.add('active');}

function renderPlayers(players){
  playersList.innerHTML='';
  players.forEach(p=>{
    const li=document.createElement('li');li.innerText=p.name;playersList.appendChild(li);
  });
}

createRoomBtn.addEventListener('click',()=>{
  const name=nickInput.value.trim();
  if(!name)return alert('Digite seu nome!');
  myName=name;
  socket.emit('create_room',name,res=>{
    if(res.ok){
      myRoom=res.code; amIHost=true;
      roomCodeDisplay.innerText=myRoom;
      showScreen(roomScreen);
      startBtn.style.display='inline-block';
    } else alert(res.msg||'Erro');
  });
});

joinRoomBtn.addEventListener('click',()=>{
  const name=nickInput.value.trim();
  const code=joinCodeInput.value.trim().toUpperCase();
  if(!name||!code)return alert('Digite nome e código!');
  myName=name;
  socket.emit('join_room',{code,name},res=>{
    if(res.ok){
      myRoom=code; amIHost=false;
      roomCodeDisplay.innerText=myRoom;
      showScreen(roomScreen);
      startBtn.style.display='none';
    } else alert(res.msg||'Não foi possível entrar');
  });
});

leaveBtn.addEventListener('click',()=>{
  if(!myRoom)return showScreen(lobbyScreen);
  socket.emit('leave_room',myRoom);
  myRoom='';myName='';amIHost=false;
  showScreen(lobbyScreen);
});

startBtn.addEventListener('click',()=>{
  if(!myRoom) return;
  socket.emit('start_room',myRoom,res=>{
    if(!res.ok) alert(res.msg||'Erro ao iniciar');
    else document.getElementById('roomStatus').innerText='Iniciando...';
  });
});

socket.on('room_update',room=>{
  if(room.code!==myRoom) return;
  renderPlayers(room.players);
  document.getElementById('roomStatus').innerText=room.status||'Aguardando';
});
