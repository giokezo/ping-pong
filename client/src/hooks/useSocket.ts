import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { type GameState, type GameJoinedData } from '../types/game';

export const useSocket = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [playerInfo, setPlayerInfo] = useState<GameJoinedData | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const keysPressed = useRef<Set<string>>(new Set());

  useEffect(() => {
    const newSocket = io('http://localhost:3001');
    
    newSocket.on('connect', () => {
      setIsConnected(true);
      setSocket(newSocket);
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
    });

    newSocket.on('gameJoined', (data: GameJoinedData) => {
      setPlayerInfo(data);
    });

    newSocket.on('gameStateUpdate', (state: GameState) => {
      setGameState(state);
    });

    newSocket.on('gameStarted', () => {
      setGameStarted(true);
    });

    newSocket.on('playerDisconnected', () => {
      setGameStarted(false);
    });

    newSocket.on('error', (error: string) => {
      console.error('Socket error:', error);
    });

    return () => {
      newSocket.close();
    };
  }, []);

  // Handle keyboard input
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!socket || !gameStarted) return;
      
      keysPressed.current.add(event.key);
      
      if (event.key === 'ArrowUp' || event.key === 'w' || event.key === 'W') {
        socket.emit('paddleMove', 'up');
      }
      if (event.key === 'ArrowDown' || event.key === 's' || event.key === 'S') {
        socket.emit('paddleMove', 'down');
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      keysPressed.current.delete(event.key);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [socket, gameStarted]);

  const joinGame = () => {
    if (socket) {
      socket.emit('joinGame');
    }
  };

  return {
    socket,
    gameState,
    playerInfo,
    isConnected,
    gameStarted,
    joinGame
  };
};