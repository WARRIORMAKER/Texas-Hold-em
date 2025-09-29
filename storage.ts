import { type User, type InsertUser, type Room, type InsertRoom, type Player, type InsertPlayer, type Card } from "@shared/schema";
import { randomUUID } from "crypto";

// Updated interface with poker game methods
export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Room methods
  getRoomById(id: string): Promise<Room | undefined>;
  getRoomByCode(code: string): Promise<Room | undefined>;
  createRoom(room: InsertRoom): Promise<Room>;
  deleteRoom(id: string): Promise<void>;
  updateRoomPlayerCount(id: string, count: number): Promise<void>;
  updateRoomGameState(id: string, updates: {
    gameState?: string;
    round?: string;
    pot?: number;
    currentBet?: number;
    deck?: string;
    communityCards?: string;
  }): Promise<void>;
  updateRoomCurrentBet(id: string, bet: number): Promise<void>;
  
  // Player methods
  getPlayerById(id: string): Promise<Player | undefined>;
  getPlayerBySocketId(socketId: string): Promise<Player | undefined>;
  getPlayersByRoomId(roomId: string): Promise<Player[]>;
  createPlayer(player: InsertPlayer): Promise<Player>;
  removePlayer(id: string): Promise<void>;
  setPlayerConnected(socketId: string, connected: boolean): Promise<void>;
  setPlayerReady(socketId: string, ready: boolean): Promise<void>;
  setPlayerHasActed(id: string, hasActed: boolean): Promise<void>;
  setPlayerFolded(id: string, folded: boolean): Promise<void>;
  setPlayerHand(id: string, cards: Card[]): Promise<void>;
  updatePlayerBet(id: string, additionalBet: number): Promise<void>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private rooms: Map<string, Room>;
  private players: Map<string, Player>;
  private playersBySocket: Map<string, string>; // socketId -> playerId
  private playersByRoom: Map<string, string[]>; // roomId -> playerId[]

  constructor() {
    this.users = new Map();
    this.rooms = new Map();
    this.players = new Map();
    this.playersBySocket = new Map();
    this.playersByRoom = new Map();
  }

  // User methods
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Room methods
  async getRoomById(id: string): Promise<Room | undefined> {
    return this.rooms.get(id);
  }

  async getRoomByCode(code: string): Promise<Room | undefined> {
    return Array.from(this.rooms.values()).find(room => room.code === code);
  }

  async createRoom(insertRoom: InsertRoom): Promise<Room> {
    const id = randomUUID();
    const room: Room = {
      ...insertRoom,
      id,
      currentPlayers: 0,
      gameState: 'waiting',
      pot: 0,
      currentBet: 0,
      round: 'pre-flop',
      deck: null,
      communityCards: null,
      createdAt: new Date()
    };
    this.rooms.set(id, room);
    this.playersByRoom.set(id, []);
    return room;
  }

  async deleteRoom(id: string): Promise<void> {
    this.rooms.delete(id);
    this.playersByRoom.delete(id);
  }

  async updateRoomPlayerCount(id: string, count: number): Promise<void> {
    const room = this.rooms.get(id);
    if (room) {
      room.currentPlayers = count;
      this.rooms.set(id, room);
    }
  }

  async updateRoomGameState(id: string, updates: {
    gameState?: string;
    round?: string;
    pot?: number;
    currentBet?: number;
    deck?: string;
    communityCards?: string;
  }): Promise<void> {
    const room = this.rooms.get(id);
    if (room) {
      Object.assign(room, updates);
      this.rooms.set(id, room);
    }
  }

  async updateRoomCurrentBet(id: string, bet: number): Promise<void> {
    const room = this.rooms.get(id);
    if (room) {
      room.currentBet = bet;
      this.rooms.set(id, room);
    }
  }

  // Player methods
  async getPlayerById(id: string): Promise<Player | undefined> {
    return this.players.get(id);
  }

  async getPlayerBySocketId(socketId: string): Promise<Player | undefined> {
    const playerId = this.playersBySocket.get(socketId);
    return playerId ? this.players.get(playerId) : undefined;
  }

  async getPlayersByRoomId(roomId: string): Promise<Player[]> {
    const playerIds = this.playersByRoom.get(roomId) || [];
    return playerIds.map(id => this.players.get(id)).filter(Boolean) as Player[];
  }

  async createPlayer(insertPlayer: InsertPlayer): Promise<Player> {
    const id = randomUUID();
    const player: Player = {
      ...insertPlayer,
      id,
      hand: null,
      isConnected: true,
      isReady: false,
      hasActed: false,
      currentBet: 0,
      position: null,
      isFolded: false,
      joinedAt: new Date()
    };
    
    this.players.set(id, player);
    this.playersBySocket.set(insertPlayer.socketId, id);
    
    // Add to room's player list
    const roomPlayers = this.playersByRoom.get(insertPlayer.roomId) || [];
    roomPlayers.push(id);
    this.playersByRoom.set(insertPlayer.roomId, roomPlayers);
    
    return player;
  }

  async removePlayer(id: string): Promise<void> {
    const player = this.players.get(id);
    if (player) {
      // Remove from socket mapping
      this.playersBySocket.delete(player.socketId);
      
      // Remove from room's player list
      const roomPlayers = this.playersByRoom.get(player.roomId) || [];
      const updatedPlayers = roomPlayers.filter(pid => pid !== id);
      this.playersByRoom.set(player.roomId, updatedPlayers);
      
      // Remove player
      this.players.delete(id);
    }
  }

  async setPlayerConnected(socketId: string, connected: boolean): Promise<void> {
    const playerId = this.playersBySocket.get(socketId);
    if (playerId) {
      const player = this.players.get(playerId);
      if (player) {
        player.isConnected = connected;
        this.players.set(playerId, player);
      }
    }
  }

  async setPlayerReady(socketId: string, ready: boolean): Promise<void> {
    const playerId = this.playersBySocket.get(socketId);
    if (playerId) {
      const player = this.players.get(playerId);
      if (player) {
        player.isReady = ready;
        this.players.set(playerId, player);
      }
    }
  }

  async setPlayerHasActed(id: string, hasActed: boolean): Promise<void> {
    const player = this.players.get(id);
    if (player) {
      player.hasActed = hasActed;
      this.players.set(id, player);
    }
  }

  async setPlayerFolded(id: string, folded: boolean): Promise<void> {
    const player = this.players.get(id);
    if (player) {
      player.isFolded = folded;
      this.players.set(id, player);
    }
  }

  async setPlayerHand(id: string, cards: Card[]): Promise<void> {
    const player = this.players.get(id);
    if (player) {
      player.hand = JSON.stringify(cards);
      this.players.set(id, player);
    }
  }

  async updatePlayerBet(id: string, additionalBet: number): Promise<void> {
    const player = this.players.get(id);
    if (player) {
      player.currentBet += additionalBet;
      player.chips -= additionalBet;
      this.players.set(id, player);
      
      // Add to room pot
      const room = this.rooms.get(player.roomId);
      if (room) {
        room.pot += additionalBet;
        this.rooms.set(player.roomId, room);
      }
    }
  }
}

export const storage = new MemStorage();