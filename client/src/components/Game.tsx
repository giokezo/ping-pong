import React, { useEffect, useRef } from 'react';
import { type GameState } from '../types/game';

interface GameProps {
  gameState: GameState;
  playerId: string;
  playerSide: 'left' | 'right';
}

export const Game: React.FC<GameProps> = ({ gameState, playerId, playerSide }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Set canvas background
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw center line
    ctx.strokeStyle = '#fff';
    ctx.setLineDash([5, 15]);
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, 0);
    ctx.lineTo(canvas.width / 2, canvas.height);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw paddles
    ctx.fillStyle = '#fff';
    Object.values(gameState.paddles).forEach(paddle => {
      ctx.fillRect(
        paddle.position.x,
        paddle.position.y,
        paddle.width,
        paddle.height
      );
    });

    // Draw ball
    ctx.beginPath();
    ctx.arc(
      gameState.ball.position.x,
      gameState.ball.position.y,
      gameState.ball.radius,
      0,
      2 * Math.PI
    );
    ctx.fill();

    // Draw scores
    ctx.font = '32px Arial';
    ctx.textAlign = 'center';
    
    const players = Object.keys(gameState.scores);
    if (players.length >= 2) {
      const leftPlayer = players.find(id => gameState.paddles[id]?.side === 'left');
      const rightPlayer = players.find(id => gameState.paddles[id]?.side === 'right');
      
      if (leftPlayer) {
        ctx.fillText(
          gameState.scores[leftPlayer].toString(),
          canvas.width / 4,
          50
        );
      }
      
      if (rightPlayer) {
        ctx.fillText(
          gameState.scores[rightPlayer].toString(),
          (canvas.width * 3) / 4,
          50
        );
      }
    }
  }, [gameState]);

  return (
    <div className="game-container">
      <canvas
        ref={canvasRef}
        width={gameState.gameWidth}
        height={gameState.gameHeight}
        style={{
          border: '2px solid #fff',
          background: '#000'
        }}
      />
      <div className="game-info">
        <p>You are the {playerSide} player</p>
        <p>Use Arrow Keys or W/S to move your paddle</p>
        {!gameState.isPlaying && (
          <p>Waiting for opponent or game to start...</p>
        )}
      </div>
    </div>
  );
};