export interface Position {
  x: number;
  y: number;
}

export interface Velocity {
  x: number;
  y: number;
}

export interface Paddle {
  id: string;
  position: Position;
  width: number;
  height: number;
  side: 'left' | 'right';
}

export interface Ball {
  position: Position;
  velocity: Velocity;
  radius: number;
}

export interface GameState {
  paddles: { [playerId: string]: Paddle };
  ball: Ball;
  scores: { [playerId: string]: number };
  gameWidth: number;
  gameHeight: number;
  isPlaying: boolean;
  players: string[];
}

export interface Player {
  id: string;
  socketId: string;
  side: 'left' | 'right';
  ready: boolean;
}

export interface GameRoom {
  id: string;
  players: Player[];
  gameState: GameState;
  lastUpdate: number;
}