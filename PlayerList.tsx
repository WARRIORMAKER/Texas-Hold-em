import { Users, Wifi, WifiOff } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface Player {
  id: string;
  name: string;
  isConnected: boolean;
  hasCards: boolean;
  isReady: boolean;
}

interface PlayerListProps {
  players: Player[];
  currentPlayer?: string;
  roomCode: string;
  className?: string;
}

export default function PlayerList({ players, currentPlayer, roomCode, className }: PlayerListProps) {
  return (
    <Card className={cn("p-4 bg-card/95 backdrop-blur-sm", className)}>
      <div className="space-y-4">
        {/* Room Header */}
        <div className="text-center border-b border-border pb-3">
          <h2 className="text-lg font-semibold text-foreground" data-testid="room-title">
            Room: <span className="font-mono text-primary">{roomCode}</span>
          </h2>
          <div className="flex items-center justify-center gap-2 mt-2">
            <Users className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground" data-testid="player-count">
              {players.length} {players.length === 1 ? 'Player' : 'Players'}
            </span>
          </div>
        </div>

        {/* Players List */}
        <div className="space-y-2">
          {players.map((player) => (
            <div
              key={player.id}
              className={cn(
                "flex items-center justify-between p-3 rounded-md border transition-colors",
                "hover-elevate",
                player.id === currentPlayer ? "bg-primary/10 border-primary" : "bg-muted/50 border-border"
              )}
              data-testid={`player-${player.id}`}
            >
              <div className="flex items-center gap-3">
                {/* Connection Status */}
                {player.isConnected ? (
                  <Wifi className="w-4 h-4 text-green-500" data-testid={`status-connected-${player.id}`} />
                ) : (
                  <WifiOff className="w-4 h-4 text-red-500" data-testid={`status-disconnected-${player.id}`} />
                )}
                
                {/* Player Name */}
                <span className={cn(
                  "font-medium",
                  player.id === currentPlayer ? "text-primary" : "text-foreground"
                )}>
                  {player.name}
                  {player.id === currentPlayer && " (You)"}
                </span>
              </div>

              {/* Player Status Badges */}
              <div className="flex gap-2">
                {player.hasCards && (
                  <Badge variant="secondary" data-testid={`has-cards-${player.id}`}>
                    Has Cards
                  </Badge>
                )}
                {player.isReady && (
                  <Badge variant="default" data-testid={`ready-${player.id}`}>
                    Ready
                  </Badge>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {players.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p data-testid="empty-room">Waiting for players to join...</p>
          </div>
        )}
      </div>
    </Card>
  );
}