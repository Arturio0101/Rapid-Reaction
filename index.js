const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));
app.use(express.json());

let gameInProgress = false;
let startTime = null;
let players = [];
const WIN_THRESHOLD = 5;

io.on('connection', (socket) => {
    console.log('User connected');
    let playerName = '';
    let playerData = null;

    socket.on('setName', (name) => {
        playerName = name;
        playerData = players.find(player => player.name === playerName);
        
        if (!playerData) {
            playerData = { name: playerName, wins: 0 };
            players.push(playerData);
        }

        console.log(`Player "${playerName}" joined the lobby`);
        io.emit('updatePlayersList', players);
        checkLobbyStatus();
    });

    socket.on('requestStartGame', () => {
        if (players.length >= 2 && !gameInProgress) {
            console.log(`Player "${playerName}" started the game`);
            io.emit('toggleStartButton', false);
            startNewGame();
        }
    });

    socket.on('playerAction', (data) => {
        if (gameInProgress && startTime) {
            const reactionTime = data.time - startTime;
            endGame();

            if (playerData) {
                playerData.wins += 1;
            }

            // Отправляем сообщение победителю
            io.to(socket.id).emit('updateGame', { 
                name: data.name, 
                reactionTime, 
                message: 'You clicked first!' 
            });

            // Отправляем сообщение остальным игрокам
            socket.broadcast.emit('updateGame', { 
                name: data.name, 
                reactionTime, 
                message: `${data.name} clicked the button first!` 
            });

            io.emit('updatePlayersList', players);

            // Проверяем, достиг ли игрок порога побед
            if (playerData.wins >= WIN_THRESHOLD) {
                io.emit('gameStatus', `Player ${data.name} won!`);
                resetScores();
                io.emit('toggleStartButton', true); // Включаем кнопку для новой игры
            } else {
                setTimeout(() => {
                    if (players.length >= 2) {
                        startNewGame();
                    } else {
                        checkLobbyStatus();
                    }
                }, 3000);
            }
        }
    });

    socket.on('disconnect', () => {
        players = players.filter(player => player.name !== playerName);
        console.log(`Player "${playerName}" disconnected`);
        io.emit('updatePlayersList', players);
        checkLobbyStatus();
    });
});

function checkLobbyStatus() {
    const playersCount = players.length;
    const lobbyReady = playersCount >= 2 && !gameInProgress;
    io.emit('lobbyStatus', { playersCount, lobbyReady });
}

function startNewGame() {
    gameInProgress = true;
    io.emit("gameStatus", "Get ready...");

    const randomDelay = Math.floor(Math.random() * 3000) + 1000;
    console.log(`Starting new game with random delay of ${randomDelay} ms`);

    setTimeout(() => {
        startTime = Date.now();
        io.emit("gameStatus", "push!");
        io.emit("buttonEnabled", true);
    }, randomDelay);
}

function endGame() {
    gameInProgress = false;
    startTime = null;
    io.emit("buttonEnabled", false);
    io.emit("gameStatus", "The game is over! Preparing for the next round...");
}

function resetScores() {
    players.forEach(player => player.wins = 0);
    io.emit('updatePlayersList', players);
}

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || 'localhost';

server.listen(PORT, HOST, () => {
    console.log(`Server is running on http://${HOST}:${PORT}`);
});