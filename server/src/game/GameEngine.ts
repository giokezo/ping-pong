import { GameState, Ball, Paddle, GameRoom, Player } from '../types/game';

export class GameEngine {
  private static readonly GAME_WIDTH = 800;
  private static readonly GAME_HEIGHT = 400;
  private static readonly PADDLE_WIDTH = 10;
  private static readonly PADDLE_HEIGHT = 80;
  private static readonly BALL_RADIUS = 8;
  private static readonly PADDLE_SPEED = 6;
  private static readonly BALL_SPEED = 4;

  static createGameRoom(roomId: string): GameRoom {
    return {
      id: roomId,
      players: [],
      gameState: this.createInitialGameState(),
      lastUpdate: Date.now()
    };
  }

  static createInitialGameState(): GameState {
    return {
      paddles: {},
      ball: {
        position: { x: this.GAME_WIDTH / 2, y: this.GAME_HEIGHT / 2 },
        velocity: { x: this.BALL_SPEED, y: this.BALL_SPEED },
        radius: this.BALL_RADIUS
      },
      scores: {},
      gameWidth: this.GAME_WIDTH,
      gameHeight: this.GAME_HEIGHT,
      isPlaying: false,
      players: []
    };
  }

  static addPlayerToRoom(room: GameRoom, playerId: string, socketId: string): boolean {
    if (room.players.length >= 2) {
      return false;
    }

    const side: 'left' | 'right' = room.players.length === 0 ? 'left' : 'right';
    
    const player: Player = {
      id: playerId,
      socketId,
      side,
      ready: false
    };

    room.players.push(player);
    room.gameState.players.push(playerId);

    // Create paddle for player
    const paddle: Paddle = {
      id: playerId,
      position: {
        x: side === 'left' ? 20 : this.GAME_WIDTH - 30,
        y: this.GAME_HEIGHT / 2 - this.PADDLE_HEIGHT / 2
      },
      width: this.PADDLE_WIDTH,
      height: this.PADDLE_HEIGHT,
      side
    };

    room.gameState.paddles[playerId] = paddle;
    room.gameState.scores[playerId] = 0;

    return true;
  }

  static removePlayerFromRoom(room: GameRoom, playerId: string): void {
    room.players = room.players.filter(p => p.id !== playerId);
    room.gameState.players = room.gameState.players.filter(id => id !== playerId);
    delete room.gameState.paddles[playerId];
    delete room.gameState.scores[playerId];
    room.gameState.isPlaying = false;
  }

  static updatePaddlePosition(room: GameRoom, playerId: string, direction: 'up' | 'down'): void {
    const paddle = room.gameState.paddles[playerId];
    if (!paddle) return;

    const moveDistance = direction === 'up' ? -this.PADDLE_SPEED : this.PADDLE_SPEED;
    const newY = paddle.position.y + moveDistance;

    // Keep paddle within bounds
    paddle.position.y = Math.max(0, Math.min(this.GAME_HEIGHT - paddle.height, newY));
  }

  static updateGame(room: GameRoom): void {
    if (!room.gameState.isPlaying || room.players.length < 2) {
      return;
    }

    const currentTime = Date.now();
    const deltaTime = Math.min((currentTime - room.lastUpdate) / 16.67, 2); // Cap delta time and normalize to 60fps
    
    const { ball } = room.gameState;

    // Update ball position
    ball.position.x += ball.velocity.x * deltaTime;
    ball.position.y += ball.velocity.y * deltaTime;

    // Ball collision with top/bottom walls
    if (ball.position.y <= ball.radius || ball.position.y >= this.GAME_HEIGHT - ball.radius) {
      ball.velocity.y = -ball.velocity.y;
      ball.position.y = Math.max(ball.radius, Math.min(this.GAME_HEIGHT - ball.radius, ball.position.y));
    }

    // Ball collision with paddles
    this.checkPaddleCollisions(room);

    // Check for scoring
    this.checkScoring(room);

    room.lastUpdate = currentTime;
  }

  private static checkPaddleCollisions(room: GameRoom): void {
    const { ball, paddles } = room.gameState;

    for (const paddle of Object.values(paddles)) {
      if (this.ballPaddleCollision(ball, paddle)) {
        // Calculate hit position on paddle (0 = top, 1 = bottom)
        const hitPosition = (ball.position.y - paddle.position.y) / paddle.height;
        const normalizedHit = Math.max(0, Math.min(1, hitPosition)); // Clamp between 0 and 1
        
        // Calculate angle based on hit position
        const maxAngle = Math.PI / 3; // 60 degrees max
        const angle = (normalizedHit - 0.5) * maxAngle;
        
        // Calculate new velocity
        const speed = Math.sqrt(ball.velocity.x * ball.velocity.x + ball.velocity.y * ball.velocity.y);
        const direction = paddle.side === 'left' ? 1 : -1;
        
        ball.velocity.x = direction * speed * Math.cos(angle);
        ball.velocity.y = speed * Math.sin(angle);

        // Move ball out of paddle to prevent sticking
        if (paddle.side === 'left') {
          ball.position.x = paddle.position.x + paddle.width + ball.radius + 1;
        } else {
          ball.position.x = paddle.position.x - ball.radius - 1;
        }
        
        break; // Only handle one collision per frame
      }
    }
  }

  private static ballPaddleCollision(ball: Ball, paddle: Paddle): boolean {
    // Check if ball is moving toward the paddle
    const movingTowardPaddle = (paddle.side === 'left' && ball.velocity.x < 0) || 
                              (paddle.side === 'right' && ball.velocity.x > 0);
    
    if (!movingTowardPaddle) return false;

    // AABB collision detection
    return (
      ball.position.x - ball.radius < paddle.position.x + paddle.width &&
      ball.position.x + ball.radius > paddle.position.x &&
      ball.position.y - ball.radius < paddle.position.y + paddle.height &&
      ball.position.y + ball.radius > paddle.position.y
    );
  }

  private static checkScoring(room: GameRoom): void {
    const { ball } = room.gameState;

    if (ball.position.x < -ball.radius) {
      // Right player scores
      const rightPlayer = room.players.find(p => p.side === 'right');
      if (rightPlayer) {
        room.gameState.scores[rightPlayer.id]++;
        this.resetBall(room, 'right');
      }
    } else if (ball.position.x > this.GAME_WIDTH + ball.radius) {
      // Left player scores
      const leftPlayer = room.players.find(p => p.side === 'left');
      if (leftPlayer) {
        room.gameState.scores[leftPlayer.id]++;
        this.resetBall(room, 'left');
      }
    }
  }

  private static resetBall(room: GameRoom, lastScorer: 'left' | 'right'): void {
    const { ball } = room.gameState;
    
    // Reset position to center
    ball.position.x = this.GAME_WIDTH / 2;
    ball.position.y = this.GAME_HEIGHT / 2;
    
    // Ball goes toward the player who didn't score
    const direction = lastScorer === 'left' ? 1 : -1;
    const randomAngle = (Math.random() - 0.5) * 0.5; // Random angle up to ±0.25 radians
    
    ball.velocity.x = this.BALL_SPEED * direction * Math.cos(randomAngle);
    ball.velocity.y = this.BALL_SPEED * Math.sin(randomAngle);
  }

  static startGame(room: GameRoom): void {
    if (room.players.length === 2) {
      room.gameState.isPlaying = true;
      this.resetBall(room, Math.random() > 0.5 ? 'left' : 'right');
    }
  }

  static stopGame(room: GameRoom): void {
    room.gameState.isPlaying = false;
  }
}