import React from 'react';
import { useSocket } from './hooks/useSocket';
import { Game } from './components/Game';
import './App.css';

function App() {
  const {
    gameState,
    playerInfo,
    isConnected,
    gameStarted,
    joinGame
  } = useSocket();

  if (!isConnected) {
    return (
      <div className="app">
        <div className="loading">
          <h1>Connecting to server...</h1>
        </div>
      </div>
    );
  }

  if (!playerInfo) {
    return (
      <div className="app">
        <div className="menu">
          <h1>Multiplayer Pong</h1>
          <button onClick={joinGame} className="join-button">
            Join Game
          </button>
        </div>
      </div>
    );
  }

  if (!gameState) {
    return (
      <div className="app">
        <div className="loading">
          <h1>Loading game...</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <h1>Multiplayer Pong</h1>
      <Game 
        gameState={gameState}
        playerId={playerInfo.playerId}
        playerSide={playerInfo.side}
      />
    </div>
  );
}

export default App;