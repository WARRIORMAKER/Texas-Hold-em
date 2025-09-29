import type { Express } from "express";
import { createServer, type Server } from "http";
import { Server as SocketIOServer } from "socket.io";
import { storage } from "./storage";
import { PokerGameManager } from "./poker-game.js";
import { z } from "zod";

// Validation schemas
const joinRoomSchema = z.object({
  playerName: z.string().min(1).max(20),
  roomCode: z.string().length(6)
});

const createRoomSchema = z.object({
  playerName: z.string().min(1).max(20)
});

const playerActionSchema = z.object({
  action: z.enum(['check', 'call', 'raise', 'fold', 'all-in']),
  amount: z.number().optional()
});

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  // Initialize game manager
  const gameManager = new PokerGameManager(storage);

  io.on('connection', (socket) => {
    console.log(`Player connected: ${socket.id}`);

    // Handle room creation
    socket.on('create-room', async (data) => {
      try {
        const { playerName } = createRoomSchema.parse(data);
        const result = await gameManager.createRoom(socket.id, playerName);
        
        if (result.success) {
          socket.join(result.roomCode!);
          socket.emit('room-created', {
            roomCode: result.roomCode,
            playerId: result.playerId
          });
          
          // Send initial game state
          const gameData = await gameManager.getGameState(result.roomCode!);
          if (gameData) {
            io.to(result.roomCode!).emit('game-state-updated', {
              gameState: gameData.gameState,
              players: gameData.players
            });
          }
        } else {
          socket.emit('error', { message: result.error || 'Failed to create room' });
        }
      } catch (error) {
        console.error('Create room error:', error);
        socket.emit('error', { message: 'Invalid room creation data' });
      }
    });

    // Handle room joining
    socket.on('join-room', async (data) => {
      try {
        const { playerName, roomCode } = joinRoomSchema.parse(data);
        const result = await gameManager.joinRoom(socket.id, playerName, roomCode);
        
        if (result.success) {
          socket.join(roomCode);
          socket.emit('room-joined', {
            roomCode,
            playerId: result.playerId
          });
          
          // Notify other players
          socket.to(roomCode).emit('player-joined', {
            player: result.player
          });
          
          // Send updated game state to all players
          const gameData = await gameManager.getGameState(roomCode);
          if (gameData) {
            io.to(roomCode).emit('game-state-updated', {
              gameState: gameData.gameState,
              players: gameData.players
            });
          }
        } else {
          socket.emit('error', { message: result.error || 'Failed to join room' });
        }
      } catch (error) {
        console.error('Join room error:', error);
        socket.emit('error', { message: 'Invalid room join data' });
      }
    });

    // Handle leaving room
    socket.on('leave-room', async () => {
      try {
        const player = await gameManager.getPlayerBySocketId(socket.id);
        if (player) {
          const result = await gameManager.leaveRoom(socket.id);
          if (result.success) {
            socket.to(player.roomId).emit('player-left', { playerId: player.id });
            socket.leave(player.roomId);
            
            // Send updated game state
            const gameData = await gameManager.getGameState(player.roomId);
            if (gameData) {
              io.to(player.roomId).emit('game-state-updated', {
                gameState: gameData.gameState,
                players: gameData.players
              });
            }
          }
        }
      } catch (error) {
        console.error('Leave room error:', error);
      }
    });

    // Handle player ready
    socket.on('player-ready', async () => {
      try {
        const player = await gameManager.getPlayerBySocketId(socket.id);
        if (player) {
          await gameManager.setPlayerReady(socket.id, true);
          
          // Send updated game state
          const gameData = await gameManager.getGameState(player.roomId);
          if (gameData) {
            io.to(player.roomId).emit('game-state-updated', {
              gameState: gameData.gameState,
              players: gameData.players
            });
          }
        }
      } catch (error) {
        console.error('Player ready error:', error);
      }
    });

    // Handle deal cards
    socket.on('deal-cards', async () => {
      try {
        const player = await gameManager.getPlayerBySocketId(socket.id);
        if (player) {
          const result = await gameManager.dealCards(player.roomId);
          if (result.success) {
            // Send updated game state with cards
            const gameData = await gameManager.getGameState(player.roomId);
            if (gameData) {
              io.to(player.roomId).emit('game-state-updated', {
                gameState: gameData.gameState,
                players: gameData.players
              });
              io.to(player.roomId).emit('cards-dealt', { players: gameData.players });
              
              // Start betting round if game is in progress
              if (gameData.gameState.phase === 'betting') {
                io.to(player.roomId).emit('betting-round-started', {
                  activePlayerId: gameData.gameState.activePlayerId
                });
              }
            }
          } else {
            socket.emit('error', { message: result.error || 'Failed to deal cards' });
          }
        }
      } catch (error) {
        console.error('Deal cards error:', error);
        socket.emit('error', { message: 'Failed to deal cards' });
      }
    });

    // Handle player actions (check, call, raise, fold, all-in)
    socket.on('player-action', async (data) => {
      try {
        const { action, amount } = playerActionSchema.parse(data);
        const player = await gameManager.getPlayerBySocketId(socket.id);
        
        if (player) {
          const result = await gameManager.handlePlayerAction(socket.id, action, amount);
          if (result.success) {
            // Notify all players of the action
            io.to(player.roomId).emit('player-action-made', {
              playerId: player.id,
              action,
              amount
            });
            
            // Send updated game state
            const gameData = await gameManager.getGameState(player.roomId);
            if (gameData) {
              io.to(player.roomId).emit('game-state-updated', {
                gameState: gameData.gameState,
                players: gameData.players
              });
              
              // Check if round ended
              if (result.roundEnded) {
                io.to(player.roomId).emit('round-ended', {
                  winners: result.winners || [],
                  pot: gameData.gameState.pot
                });
              }
              
              // Check if game ended
              if (result.gameEnded) {
                io.to(player.roomId).emit('game-ended', {
                  finalResults: gameData.players
                });
              }
            }
          } else {
            socket.emit('error', { message: result.error || 'Invalid action' });
          }
        }
      } catch (error) {
        console.error('Player action error:', error);
        socket.emit('error', { message: 'Invalid player action' });
      }
    });

    // Handle disconnection
    socket.on('disconnect', async () => {
      console.log(`Player disconnected: ${socket.id}`);
      try {
        const player = await gameManager.getPlayerBySocketId(socket.id);
        if (player) {
          await gameManager.setPlayerConnected(socket.id, false);
          socket.to(player.roomId).emit('player-disconnected', { playerId: player.id });
          
          // Send updated game state
          const gameData = await gameManager.getGameState(player.roomId);
          if (gameData) {
            io.to(player.roomId).emit('game-state-updated', {
              gameState: gameData.gameState,
              players: gameData.players
            });
          }
        }
      } catch (error) {
        console.error('Disconnect handling error:', error);
      }
    });
  });

  return httpServer;
}