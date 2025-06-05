import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { GameEngine } from './game/GameEngine';
import { GameRoom } from './types/game';

const app = express();
app.use(cors());

const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

// Game rooms storage
const gameRooms = new Map<string, GameRoom>();
const playerRooms = new Map<string, string>(); // playerId -> roomId

// Game loop
setInterval(() => {
  gameRooms.forEach(room => {
    GameEngine.updateGame(room);
    if (room.gameState.isPlaying) {
      io.to(room.id).emit('gameStateUpdate', room.gameState);
    }
  });
}, 16.67); // ~60 FPS

io.on('connection', (socket) => {
  console.log('Player connected:', socket.id);

  socket.on('joinGame', () => {
    let room: GameRoom | undefined;
    
    // Find existing room with space or create new one
    for (const [roomId, gameRoom] of gameRooms) {
      if (gameRoom.players.length < 2) {
        room = gameRoom;
        break;
      }
    }

    if (!room) {
      const roomId = `room_${Date.now()}`;
      room = GameEngine.createGameRoom(roomId);
      gameRooms.set(roomId, room);
    }

    const playerId = socket.id;
    const success = GameEngine.addPlayerToRoom(room, playerId, socket.id);

    if (success) {
      socket.join(room.id);
      playerRooms.set(playerId, room.id);
      
      socket.emit('gameJoined', {
        playerId,
        roomId: room.id,
        side: room.players.find(p => p.id === playerId)?.side
      });

      socket.emit('gameStateUpdate', room.gameState);
      
      // Start game if room is full
      if (room.players.length === 2) {
        GameEngine.startGame(room);
        io.to(room.id).emit('gameStarted');
      }
    } else {
      socket.emit('error', 'Room is full');
    }
  });

  socket.on('paddleMove', (direction: 'up' | 'down') => {
    const roomId = playerRooms.get(socket.id);
    if (!roomId) return;

    const room = gameRooms.get(roomId);
    if (!room) return;

    GameEngine.updatePaddlePosition(room, socket.id, direction);
    io.to(roomId).emit('gameStateUpdate', room.gameState);
  });

  socket.on('disconnect', () => {
    console.log('Player disconnected:', socket.id);
    
    const roomId = playerRooms.get(socket.id);
    if (roomId) {
      const room = gameRooms.get(roomId);
      if (room) {
        GameEngine.removePlayerFromRoom(room, socket.id);
        
        if (room.players.length === 0) {
          gameRooms.delete(roomId);
        } else {
          GameEngine.stopGame(room);
          io.to(roomId).emit('playerDisconnected');
          io.to(roomId).emit('gameStateUpdate', room.gameState);
        }
      }
      playerRooms.delete(socket.id);
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});