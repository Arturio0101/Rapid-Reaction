const socket = io();
const clickButton = document.getElementById('reactionButton');
const status = document.getElementById('status');
const nameInputContainer = document.getElementById('nameInputContainer');
const playerNameInput = document.getElementById('playerName');
const joinLobbyButton = document.getElementById('joinLobbyButton');
const startGameButton = document.getElementById('startGameButton');
const playersList = document.getElementById('playersList');
const confettiContainer = document.getElementById('confetti-container');

let playerName = localStorage.getItem('playerName') || '';

if (playerName) {
    nameInputContainer.style.display = 'none';
    socket.emit('setName', playerName);
}

joinLobbyButton.addEventListener('click', () => {
    playerName = playerNameInput.value.trim();
    if (playerName) {
        localStorage.setItem('playerName', playerName);
        nameInputContainer.style.display = 'none';
        socket.emit('setName', playerName);
    }
});

startGameButton.addEventListener('click', () => {
    socket.emit('requestStartGame');
});

socket.on('connect', () => {
    console.log('Connected to server');
});

socket.on('buttonEnabled', (enabled) => {
    clickButton.style.display = 'inline-block';
    clickButton.disabled = !enabled;
    status.textContent = enabled ? "Push!" : "Waiting...";
});

socket.on('gameStatus', (message) => {
    status.textContent = message;
});

clickButton.addEventListener('click', () => {
    socket.emit('playerAction', { name: playerName, action: 'clicked', time: Date.now() });
    clickButton.disabled = true;
});

socket.on('updateGame', (data) => {
    // Отображаем персональное сообщение для каждого игрока
    status.textContent = data.message;

    clickButton.disabled = true;

    if (data.name === playerName) {
        createConfetti();
    }

    setTimeout(() => {
        socket.emit('requestNewRound');
    }, 3000);
});

socket.on('updatePlayersList', (players) => {
    playersList.innerHTML = '';
    players.forEach(player => {
        const row = document.createElement('tr');
        const nameCell = document.createElement('td');
        const winsCell = document.createElement('td');

        nameCell.textContent = player.name;
        winsCell.textContent = player.wins;

        row.appendChild(nameCell);
        row.appendChild(winsCell);
        playersList.appendChild(row);
    });
});

socket.on('lobbyReady', (lobbyReady) => {
    startGameButton.disabled = !lobbyReady;
});

// Изменение статуса лобби и статуса кнопки Start Game в зависимости от количества игроков
socket.on('lobbyStatus', ({ playersCount, lobbyReady }) => {
    if (playersCount < 2) {
        status.textContent = "wait for other players...";
        startGameButton.disabled = true;
    } else {
        status.textContent = "";
        startGameButton.disabled = !lobbyReady;
    }
});

socket.on('toggleStartButton', (show) => {
    startGameButton.style.display = show ? 'inline-block' : 'none';
    clickButton.style.display = show ? 'none' : 'inline-block';
    
});

function createConfetti() {
    for (let i = 0; i < 100; i++) {
        const confetti = document.createElement('div');
        confetti.classList.add('confetti');
        
        confetti.style.left = Math.random() * 100 + 'vw';
        confetti.style.backgroundColor = getRandomColor();
        confetti.style.animationDuration = Math.random() * 2 + 3 + 's';

        confettiContainer.appendChild(confetti);
        
        confetti.addEventListener('animationend', () => {
            confettiContainer.removeChild(confetti);
        });
    }
}

function getRandomColor() {
    const colors = ['#f44336', '#e91e63', '#9c27b0', '#673ab7', '#3f51b5', '#2196f3', '#03a9f4', '#00bcd4', '#009688'];
    return colors[Math.floor(Math.random() * colors.length)];
}