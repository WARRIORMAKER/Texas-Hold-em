import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const rooms = pgTable("rooms", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code", { length: 6 }).notNull().unique(),
  hostId: varchar("host_id").notNull(),
  maxPlayers: integer("max_players").notNull().default(6),
  currentPlayers: integer("current_players").notNull().default(0),
  gameState: text("game_state").notNull().default('waiting'), // waiting, playing, finished
  pot: integer("pot").notNull().default(0),
  currentBet: integer("current_bet").notNull().default(0),
  round: text("round").notNull().default('pre-flop'), // pre-flop, flop, turn, river, showdown
  deck: text("deck"), // JSON string of remaining cards
  communityCards: text("community_cards"), // JSON string of community cards
  createdAt: timestamp("created_at").defaultNow(),
});

export const players = pgTable("players", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  roomId: varchar("room_id").notNull(),
  socketId: text("socket_id").notNull(),
  name: text("name").notNull(),
  chips: integer("chips").notNull().default(1000),
  hand: text("hand"), // JSON string of player cards
  isConnected: boolean("is_connected").notNull().default(true),
  isReady: boolean("is_ready").notNull().default(false),
  hasActed: boolean("has_acted").notNull().default(false),
  currentBet: integer("current_bet").notNull().default(0),
  position: integer("position"), // seat position at table
  isFolded: boolean("is_folded").notNull().default(false),
  joinedAt: timestamp("joined_at").defaultNow(),
});

// Zod schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertRoomSchema = createInsertSchema(rooms).pick({
  code: true,
  hostId: true,
  maxPlayers: true,
});

export const insertPlayerSchema = createInsertSchema(players).pick({
  roomId: true,
  socketId: true,
  name: true,
  chips: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertRoom = z.infer<typeof insertRoomSchema>;
export type Room = typeof rooms.$inferSelect;

export type InsertPlayer = z.infer<typeof insertPlayerSchema>;
export type Player = typeof players.$inferSelect;

// Game-specific types
export interface Card {
  suit: 'spades' | 'hearts' | 'diamonds' | 'clubs';
  value: 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';
  id: string;
}

export interface GameState {
  phase: 'waiting' | 'dealing' | 'betting' | 'showdown' | 'finished';
  round: 'pre-flop' | 'flop' | 'turn' | 'river' | 'showdown';
  pot: number;
  currentBet: number;
  activePlayerId?: string;
  deck: Card[];
  communityCards: Card[];
  winners?: string[];
}

export interface PlayerState {
  id: string;
  name: string;
  chips: number;
  hand: Card[];
  currentBet: number;
  isConnected: boolean;
  isReady: boolean;
  hasActed: boolean;
  isFolded: boolean;
  position: number;
}

// Socket event types
export interface SocketEvents {
  // Client to server
  'join-room': { playerName: string; roomCode: string };
  'create-room': { playerName: string };
  'leave-room': {};
  'player-ready': {};
  'deal-cards': {};
  'player-action': { 
    action: 'check' | 'call' | 'raise' | 'fold' | 'all-in';
    amount?: number;
  };
  
  // Server to client
  'room-joined': { roomCode: string; playerId: string };
  'room-created': { roomCode: string; playerId: string };
  'player-joined': { player: PlayerState };
  'player-left': { playerId: string };
  'player-disconnected': { playerId: string };
  'player-reconnected': { playerId: string };
  'game-state-updated': { gameState: GameState; players: PlayerState[] };
  'cards-dealt': { players: PlayerState[] };
  'betting-round-started': { activePlayerId: string };
  'player-action-made': { playerId: string; action: string; amount?: number };
  'round-ended': { winners: string[]; pot: number };
  'game-ended': { finalResults: PlayerState[] };
  'error': { message: string };
}