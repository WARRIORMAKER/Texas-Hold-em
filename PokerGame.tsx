import { useState, useEffect, useCallback } from 'react';
import { useSocket } from '@/components/SocketProvider';
import JoinScreen from '@/components/JoinScreen';
import GameScreen from '@/components/GameScreen';
import { type Player } from '@/components/PlayerList';
import { type Card } from '@/components/PlayingCard';
import { useToast } from '@/hooks/use-toast';
import type { GameState, PlayerState } from '@shared/schema';

export default function PokerGame() {
  const { socket, isConnected } = useSocket();
  const { toast } = useToast();
  
  const [gameState, setGameState] = useState<'joining' | 'playing'>('joining');
  const [currentPlayerId, setCurrentPlayerId] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [joinError, setJoinError] = useState('');
  
  // Game state
  const [players, setPlayers] = useState<Player[]>([]);
  const [playerHand, setPlayerHand] = useState<Card[]>([]);
  const [gameInfo, setGameInfo] = useState<GameState>({
    phase: 'waiting',
    round: 'pre-flop',
    pot: 0,
    currentBet: 0,
    deck: [],
    communityCards: []
  });
  
  const [isDealing, setIsDealing] = useState(false);
  const [playerChips, setPlayerChips] = useState(1000);

  // Convert backend PlayerState to frontend Player format
  const convertPlayerState = useCallback((playerState: PlayerState): Player => ({
    id: playerState.id,
    name: playerState.name,
    isConnected: playerState.isConnected,
    hasCards: playerState.hand.length > 0,
    isReady: playerState.isReady
  }), []);

  // Socket event handlers
  useEffect(() => {
    if (!socket) return;

    // Handle successful room creation/joining
    socket.on('room-created', ({ roomCode, playerId }) => {
      setCurrentPlayerId(playerId);
      setRoomCode(roomCode);
      setGameState('playing');
      setIsConnecting(false);
      toast({
        title: "Room Created",
        description: `Room ${roomCode} has been created successfully!`
      });
    });

    socket.on('room-joined', ({ roomCode, playerId }) => {
      setCurrentPlayerId(playerId);
      setRoomCode(roomCode);
      setGameState('playing');
      setIsConnecting(false);
      toast({
        title: "Room Joined",
        description: `Successfully joined room ${roomCode}!`
      });
    });

    // Handle game state updates
    socket.on('game-state-updated', ({ gameState: newGameState, players: newPlayers }) => {
      setGameInfo(newGameState);
      setPlayers(newPlayers.map(convertPlayerState));
      
      // Update player's hand and chips
      const currentPlayer = newPlayers.find(p => p.id === currentPlayerId);
      if (currentPlayer) {
        setPlayerHand(currentPlayer.hand);
        setPlayerChips(currentPlayer.chips);
      }
    });

    // Handle cards being dealt
    socket.on('cards-dealt', ({ players: newPlayers }) => {
      setIsDealing(false);
      const currentPlayer = newPlayers.find(p => p.id === currentPlayerId);
      if (currentPlayer) {
        setPlayerHand(currentPlayer.hand);
      }
      toast({
        title: "Cards Dealt",
        description: "Each player has been dealt 4 cards!"
      });
    });

    // Handle player actions
    socket.on('player-action-made', ({ playerId, action, amount }) => {
      const player = players.find(p => p.id === playerId);
      const playerName = player?.name || 'Unknown';
      
      let message = `${playerName} ${action}`;
      if (amount) {
        message += ` ${amount} chips`;
      }
      
      toast({
        title: "Player Action",
        description: message,
        duration: 2000
      });
    });

    // Handle betting round start
    socket.on('betting-round-started', ({ activePlayerId }) => {
      setGameInfo(prev => ({ ...prev, activePlayerId }));
    });

    // Handle errors
    socket.on('error', ({ message }) => {
      setIsConnecting(false);
      setJoinError(message);
      toast({
        title: "Error",
        description: message,
        variant: "destructive"
      });
    });

    // Handle player events
    socket.on('player-joined', ({ player }) => {
      toast({
        title: "Player Joined",
        description: `${player.name} joined the room!`
      });
    });

    socket.on('player-left', ({ playerId }) => {
      const player = players.find(p => p.id === playerId);
      if (player) {
        toast({
          title: "Player Left",
          description: `${player.name} left the room.`
        });
      }
    });

    // Cleanup listeners
    return () => {
      socket.off('room-created');
      socket.off('room-joined');
      socket.off('game-state-updated');
      socket.off('cards-dealt');
      socket.off('player-action-made');
      socket.off('betting-round-started');
      socket.off('error');
      socket.off('player-joined');
      socket.off('player-left');
    };
  }, [socket, currentPlayerId, players, convertPlayerState, toast]);

  // Handle joining/creating room
  const handleJoin = useCallback(async (playerName: string, roomCode: string) => {
    if (!socket || !isConnected) {
      setJoinError('Not connected to server');
      return;
    }

    setIsConnecting(true);
    setJoinError('');

    // If room code is empty or very short, create a new room
    if (!roomCode || roomCode.trim().length < 3) {
      console.log('Creating new room for player:', playerName);
      socket.emit('create-room', { playerName });
    } else {
      // Try to join existing room first
      console.log('Attempting to join room:', { playerName, roomCode });
      socket.emit('join-room', { playerName, roomCode });
      
      // Set a shorter timeout to create room if join fails
      setTimeout(() => {
        if (gameState === 'joining' && isConnecting) {
          console.log('Join failed, creating new room for player:', playerName);
          socket.emit('create-room', { playerName });
        }
      }, 1000);
    }
  }, [socket, isConnected, gameState, isConnecting]);

  // Handle dealing cards
  const handleDealCards = useCallback(() => {
    if (!socket) return;
    
    setIsDealing(true);
    socket.emit('deal-cards', {});
  }, [socket]);

  // Handle leaving room
  const handleLeaveRoom = useCallback(() => {
    if (!socket) return;
    
    socket.emit('leave-room', {});
    setGameState('joining');
    setCurrentPlayerId('');
    setRoomCode('');
    setPlayers([]);
    setPlayerHand([]);
    setGameInfo({
      phase: 'waiting',
      round: 'pre-flop',
      pot: 0,
      currentBet: 0,
      deck: [],
      communityCards: []
    });
    setJoinError('');
    setPlayerChips(1000);
  }, [socket]);

  // Betting action handlers
  const handleCheck = useCallback(() => {
    if (!socket) return;
    socket.emit('player-action', { action: 'check' });
  }, [socket]);

  const handleCall = useCallback((amount: number) => {
    if (!socket) return;
    socket.emit('player-action', { action: 'call', amount });
  }, [socket]);

  const handleRaise = useCallback((amount: number) => {
    if (!socket) return;
    socket.emit('player-action', { action: 'raise', amount });
  }, [socket]);

  const handleFold = useCallback(() => {
    if (!socket) return;
    socket.emit('player-action', { action: 'fold' });
  }, [socket]);

  const handleAllIn = useCallback(() => {
    if (!socket) return;
    socket.emit('player-action', { action: 'all-in' });
  }, [socket]);

  // Determine game state
  const currentPlayer = players.find(p => p.id === currentPlayerId);
  const isPlayerTurn = gameInfo.activePlayerId === currentPlayerId;
  const canCheck = gameInfo.currentBet === 0 || (currentPlayer?.hasCards && gameInfo.currentBet === 0);
  const canDeal = players.length >= 2;

  // Get connection status
  const connectionStatus: 'connected' | 'disconnected' | 'reconnecting' = 
    isConnected ? 'connected' : 'disconnected';

  if (gameState === 'joining') {
    return (
      <JoinScreen
        onJoin={handleJoin}
        isConnecting={isConnecting}
        error={!isConnected ? 'Connecting to server...' : joinError}
      />
    );
  }

  return (
    <GameScreen
      players={players}
      currentPlayer={currentPlayerId}
      roomCode={roomCode}
      playerHand={playerHand}
      onDealCards={handleDealCards}
      onLeaveRoom={handleLeaveRoom}
      canDeal={canDeal}
      isDealing={isDealing}
      connectionStatus={connectionStatus}
      
      // Betting props
      pot={gameInfo.pot}
      currentBet={gameInfo.currentBet}
      playerChips={playerChips}
      isPlayerTurn={isPlayerTurn}
      canCheck={canCheck}
      gamePhase={gameInfo.phase}
      currentRound={gameInfo.round}
      activePlayer={players.find(p => p.id === gameInfo.activePlayerId)?.name}
      
      // Betting callbacks
      onCheck={handleCheck}
      onCall={handleCall}
      onRaise={handleRaise}
      onFold={handleFold}
      onAllIn={handleAllIn}
    />
  );
}