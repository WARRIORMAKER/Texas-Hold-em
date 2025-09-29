import { randomUUID } from "crypto";
import type { IStorage } from "./storage";
import type { Card, GameState, PlayerState, Room, Player } from "@shared/schema";

export class PokerGameManager {
  constructor(private storage: IStorage) {}

  // Generate a unique 6-character room code
  private generateRoomCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  }

  // Create a standard 52-card deck
  private createDeck(): Card[] {
    const suits: Card['suit'][] = ['spades', 'hearts', 'diamonds', 'clubs'];
    const values: Card['value'][] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    const deck: Card[] = [];

    for (const suit of suits) {
      for (const value of values) {
        deck.push({
          suit,
          value,
          id: `${value}-${suit}-${randomUUID()}`
        });
      }
    }

    return this.shuffleDeck(deck);
  }

  // Shuffle deck using Fisher-Yates algorithm
  private shuffleDeck(deck: Card[]): Card[] {
    const shuffled = [...deck];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  // Create a new room
  async createRoom(socketId: string, playerName: string): Promise<{
    success: boolean;
    roomCode?: string;
    playerId?: string;
    error?: string;
  }> {
    try {
      let roomCode = this.generateRoomCode();
      
      // Ensure unique room code
      while (await this.storage.getRoomByCode(roomCode)) {
        roomCode = this.generateRoomCode();
      }

      const room = await this.storage.createRoom({
        code: roomCode,
        hostId: socketId,
        maxPlayers: 6
      });

      const player = await this.storage.createPlayer({
        roomId: room.id,
        socketId,
        name: playerName,
        chips: 1000
      });

      await this.storage.updateRoomPlayerCount(room.id, 1);

      return {
        success: true,
        roomCode,
        playerId: player.id
      };
    } catch (error) {
      console.error('Create room error:', error);
      return {
        success: false,
        error: 'Failed to create room'
      };
    }
  }

  // Join an existing room
  async joinRoom(socketId: string, playerName: string, roomCode: string): Promise<{
    success: boolean;
    playerId?: string;
    player?: PlayerState;
    error?: string;
  }> {
    try {
      const room = await this.storage.getRoomByCode(roomCode);
      if (!room) {
        return { success: false, error: 'Room not found' };
      }

      if (room.currentPlayers >= room.maxPlayers) {
        return { success: false, error: 'Room is full' };
      }

      // Check if player already exists in room (reconnection)
      const existingPlayer = await this.storage.getPlayerBySocketId(socketId);
      if (existingPlayer && existingPlayer.roomId === room.id) {
        await this.storage.setPlayerConnected(socketId, true);
        return {
          success: true,
          playerId: existingPlayer.id,
          player: this.mapToPlayerState(existingPlayer)
        };
      }

      const player = await this.storage.createPlayer({
        roomId: room.id,
        socketId,
        name: playerName,
        chips: 1000
      });

      await this.storage.updateRoomPlayerCount(room.id, room.currentPlayers + 1);

      return {
        success: true,
        playerId: player.id,
        player: this.mapToPlayerState(player)
      };
    } catch (error) {
      console.error('Join room error:', error);
      return {
        success: false,
        error: 'Failed to join room'
      };
    }
  }

  // Leave room
  async leaveRoom(socketId: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const player = await this.storage.getPlayerBySocketId(socketId);
      if (!player) {
        return { success: false, error: 'Player not found' };
      }

      const room = await this.storage.getRoomById(player.roomId);
      if (!room) {
        return { success: false, error: 'Room not found' };
      }

      await this.storage.removePlayer(player.id);
      await this.storage.updateRoomPlayerCount(room.id, Math.max(0, room.currentPlayers - 1));

      // If room is empty, delete it
      if (room.currentPlayers <= 1) {
        await this.storage.deleteRoom(room.id);
      }

      return { success: true };
    } catch (error) {
      console.error('Leave room error:', error);
      return { success: false, error: 'Failed to leave room' };
    }
  }

  // Deal 4 cards to each player
  async dealCards(roomId: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const room = await this.storage.getRoomById(roomId);
      if (!room) {
        return { success: false, error: 'Room not found' };
      }

      const players = await this.storage.getPlayersByRoomId(roomId);
      if (players.length < 2) {
        return { success: false, error: 'Need at least 2 players to deal cards' };
      }

      const deck = this.createDeck();
      const communityCards: Card[] = [];

      // Deal 4 cards to each player
      for (const player of players) {
        const playerCards = deck.splice(0, 4);
        await this.storage.setPlayerHand(player.id, playerCards);
      }

      // Update room with remaining deck and start game
      await this.storage.updateRoomGameState(room.id, {
        gameState: 'playing',
        round: 'pre-flop',
        deck: JSON.stringify(deck),
        communityCards: JSON.stringify(communityCards),
        pot: 0,
        currentBet: 0
      });

      return { success: true };
    } catch (error) {
      console.error('Deal cards error:', error);
      return { success: false, error: 'Failed to deal cards' };
    }
  }

  // Handle player actions
  async handlePlayerAction(socketId: string, action: string, amount?: number): Promise<{
    success: boolean;
    roundEnded?: boolean;
    gameEnded?: boolean;
    winners?: string[];
    error?: string;
  }> {
    try {
      const player = await this.storage.getPlayerBySocketId(socketId);
      if (!player) {
        return { success: false, error: 'Player not found' };
      }

      const room = await this.storage.getRoomById(player.roomId);
      if (!room) {
        return { success: false, error: 'Room not found' };
      }

      // Validate action based on game state
      switch (action) {
        case 'fold':
          await this.storage.setPlayerFolded(player.id, true);
          break;
          
        case 'check':
          if (room.currentBet > player.currentBet) {
            return { success: false, error: 'Cannot check when there is a bet to call' };
          }
          await this.storage.setPlayerHasActed(player.id, true);
          break;
          
        case 'call':
          const callAmount = room.currentBet - player.currentBet;
          if (callAmount > player.chips) {
            return { success: false, error: 'Insufficient chips to call' };
          }
          await this.storage.updatePlayerBet(player.id, callAmount);
          await this.storage.setPlayerHasActed(player.id, true);
          break;
          
        case 'raise':
          if (!amount || amount <= room.currentBet) {
            return { success: false, error: 'Raise amount must be greater than current bet' };
          }
          if (amount > player.chips) {
            return { success: false, error: 'Insufficient chips to raise' };
          }
          await this.storage.updatePlayerBet(player.id, amount - player.currentBet);
          await this.storage.updateRoomCurrentBet(room.id, amount);
          await this.storage.setPlayerHasActed(player.id, true);
          break;
          
        case 'all-in':
          await this.storage.updatePlayerBet(player.id, player.chips);
          await this.storage.setPlayerHasActed(player.id, true);
          if (player.chips > room.currentBet) {
            await this.storage.updateRoomCurrentBet(room.id, player.chips);
          }
          break;
          
        default:
          return { success: false, error: 'Invalid action' };
      }

      return { success: true };
    } catch (error) {
      console.error('Handle player action error:', error);
      return { success: false, error: 'Failed to process action' };
    }
  }

  // Get current game state
  async getGameState(roomCode: string): Promise<{
    gameState: GameState;
    players: PlayerState[];
  } | null> {
    try {
      const room = await this.storage.getRoomByCode(roomCode);
      if (!room) return null;

      const players = await this.storage.getPlayersByRoomId(room.id);
      const playerStates = players.map(p => this.mapToPlayerState(p));

      const gameState: GameState = {
        phase: room.gameState as GameState['phase'],
        round: room.round as GameState['round'],
        pot: room.pot,
        currentBet: room.currentBet,
        activePlayerId: this.getActivePlayerId(players),
        deck: room.deck ? JSON.parse(room.deck) : [],
        communityCards: room.communityCards ? JSON.parse(room.communityCards) : [],
      };

      return {
        gameState,
        players: playerStates
      };
    } catch (error) {
      console.error('Get game state error:', error);
      return null;
    }
  }

  // Helper methods
  async getPlayerBySocketId(socketId: string): Promise<Player | null> {
    const player = await this.storage.getPlayerBySocketId(socketId);
    return player || null;
  }

  async setPlayerReady(socketId: string, ready: boolean): Promise<void> {
    await this.storage.setPlayerReady(socketId, ready);
  }

  async setPlayerConnected(socketId: string, connected: boolean): Promise<void> {
    await this.storage.setPlayerConnected(socketId, connected);
  }

  private mapToPlayerState(player: Player): PlayerState {
    return {
      id: player.id,
      name: player.name,
      chips: player.chips,
      hand: player.hand ? JSON.parse(player.hand) : [],
      currentBet: player.currentBet,
      isConnected: player.isConnected,
      isReady: player.isReady,
      hasActed: player.hasActed,
      isFolded: player.isFolded,
      position: player.position || 0
    };
  }

  private getActivePlayerId(players: Player[]): string | undefined {
    // Simple implementation - return first player who hasn't acted and isn't folded
    const activePlayers = players.filter(p => p.isConnected && !p.isFolded && !p.hasActed);
    return activePlayers[0]?.id;
  }
}