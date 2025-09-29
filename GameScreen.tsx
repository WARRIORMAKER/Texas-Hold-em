import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import PlayerList, { type Player } from './PlayerList';
import Hand from './Hand';
import BettingControls from './BettingControls';
import GameInfo from './GameInfo';
import { type Card as PlayingCardType } from './PlayingCard';
import { Shuffle, LogOut, Wifi, WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GameScreenProps {
  players: Player[];
  currentPlayer: string;
  roomCode: string;
  playerHand: PlayingCardType[];
  onDealCards: () => void;
  onLeaveRoom: () => void;
  canDeal: boolean;
  isDealing?: boolean;
  connectionStatus: 'connected' | 'disconnected' | 'reconnecting';
  
  // Betting props
  pot: number;
  currentBet: number;
  playerChips: number;
  isPlayerTurn: boolean;
  canCheck: boolean;
  gamePhase: 'waiting' | 'dealing' | 'betting' | 'showdown' | 'finished';
  currentRound: 'pre-flop' | 'flop' | 'turn' | 'river' | 'showdown';
  activePlayer?: string;
  timeLeft?: number;
  
  // Betting callbacks
  onCheck: () => void;
  onCall: (amount: number) => void;
  onRaise: (amount: number) => void;
  onFold: () => void;
  onAllIn: () => void;
  
  className?: string;
}

export default function GameScreen({
  players,
  currentPlayer,
  roomCode,
  playerHand,
  onDealCards,
  onLeaveRoom,
  canDeal,
  isDealing = false,
  connectionStatus,
  pot,
  currentBet,
  playerChips,
  isPlayerTurn,
  canCheck,
  gamePhase,
  currentRound,
  activePlayer,
  timeLeft,
  onCheck,
  onCall,
  onRaise,
  onFold,
  onAllIn,
  className
}: GameScreenProps) {
  const [showPlayerList, setShowPlayerList] = useState(true);

  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'text-green-500';
      case 'disconnected': return 'text-red-500';
      case 'reconnecting': return 'text-yellow-500';
      default: return 'text-gray-500';
    }
  };

  const getConnectionStatusText = () => {
    switch (connectionStatus) {
      case 'connected': return 'Connected';
      case 'disconnected': return 'Disconnected';
      case 'reconnecting': return 'Reconnecting...';
      default: return 'Unknown';
    }
  };

  return (
    <div className={cn("min-h-screen bg-poker-table", className)}>
      <div className="flex h-screen">
        {/* Sidebar */}
        {showPlayerList && (
          <div className="w-80 p-4 bg-poker-table-dark/50 backdrop-blur-sm">
            <PlayerList
              players={players}
              currentPlayer={currentPlayer}
              roomCode={roomCode}
            />
          </div>
        )}

        {/* Main Game Area */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <header className="p-4 bg-black/20 backdrop-blur-sm border-b border-white/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPlayerList(!showPlayerList)}
                  data-testid="button-toggle-players"
                  className="text-white hover:bg-white/10"
                >
                  {showPlayerList ? 'Hide Players' : 'Show Players'}
                </Button>
                
                <Badge variant="outline" className="bg-black/20 text-white border-white/20">
                  Room: {roomCode}
                </Badge>
              </div>

              <div className="flex items-center gap-4">
                {/* Connection Status */}
                <div className="flex items-center gap-2">
                  {connectionStatus === 'connected' ? (
                    <Wifi className={cn("w-4 h-4", getConnectionStatusColor())} />
                  ) : (
                    <WifiOff className={cn("w-4 h-4", getConnectionStatusColor())} />
                  )}
                  <span className={cn("text-sm", getConnectionStatusColor())} data-testid="connection-status">
                    {getConnectionStatusText()}
                  </span>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={onLeaveRoom}
                  data-testid="button-leave-room"
                  className="text-white border-white/20 hover:bg-red-500/20"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Leave Room
                </Button>
              </div>
            </div>
          </header>

          {/* Game Content */}
          <main className="flex-1 flex flex-col p-6 gap-6">
            {/* Game Info and Central Area */}
            <div className="flex-1 flex gap-6">
              {/* Game Information */}
              <div className="w-80">
                <GameInfo
                  pot={pot}
                  currentRound={currentRound}
                  activePlayer={activePlayer}
                  timeLeft={timeLeft}
                  playerCount={players.length}
                />
              </div>

              {/* Central Action Area */}
              <div className="flex-1 flex items-center justify-center">
                {gamePhase === 'waiting' ? (
                  <Card className="p-8 bg-black/30 backdrop-blur-sm border-white/20">
                    <div className="text-center space-y-6">
                      <h2 className="text-2xl font-bold text-white" data-testid="game-status">
                        {isDealing ? 'Dealing Cards...' : 'Ready to Deal'}
                      </h2>
                      
                      <Button
                        onClick={onDealCards}
                        disabled={!canDeal || isDealing}
                        size="lg"
                        data-testid="button-deal-cards"
                        className="bg-primary hover:bg-primary/90 text-primary-foreground"
                      >
                        {isDealing ? (
                          <>
                            <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                            Dealing...
                          </>
                        ) : (
                          <>
                            <Shuffle className="w-4 h-4 mr-2" />
                            Deal 4 Cards
                          </>
                        )}
                      </Button>

                      {!canDeal && !isDealing && (
                        <p className="text-sm text-gray-300" data-testid="deal-disabled-reason">
                          Waiting for more players...
                        </p>
                      )}
                    </div>
                  </Card>
                ) : (
                  <div className="text-center text-white">
                    <h2 className="text-2xl font-bold mb-4" data-testid="game-phase">
                      {gamePhase === 'betting' && 'Betting Round'}
                      {gamePhase === 'dealing' && 'Dealing Cards'}
                      {gamePhase === 'showdown' && 'Showdown'}
                      {gamePhase === 'finished' && 'Game Finished'}
                    </h2>
                    {activePlayer && (
                      <p className="text-lg" data-testid="active-player-display">
                        {activePlayer === currentPlayer ? "Your turn!" : `${activePlayer}'s turn`}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Section: Hand and Betting */}
            <div className="flex gap-6">
              {/* Player Hand */}
              <div className="flex-1">
                <Hand
                  cards={playerHand}
                  title="Your Hand"
                  isDealing={isDealing}
                />
              </div>

              {/* Betting Controls */}
              {gamePhase === 'betting' && (
                <div className="w-96">
                  <BettingControls
                    currentBet={currentBet}
                    minRaise={50} // TODO: make this configurable
                    maxBet={playerChips}
                    playerChips={playerChips}
                    isPlayerTurn={isPlayerTurn}
                    canCheck={canCheck}
                    onCheck={onCheck}
                    onCall={onCall}
                    onRaise={onRaise}
                    onFold={onFold}
                    onAllIn={onAllIn}
                  />
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}