import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { Timer, DollarSign, Users } from 'lucide-react';

interface GameInfoProps {
  pot: number;
  currentRound: 'pre-flop' | 'flop' | 'turn' | 'river' | 'showdown';
  activePlayer?: string;
  timeLeft?: number;
  totalTime?: number;
  playerCount: number;
  className?: string;
}

const roundLabels = {
  'pre-flop': 'Pre-Flop',
  'flop': 'Flop',
  'turn': 'Turn', 
  'river': 'River',
  'showdown': 'Showdown'
};

export default function GameInfo({
  pot,
  currentRound,
  activePlayer,
  timeLeft,
  totalTime = 30,
  playerCount,
  className
}: GameInfoProps) {
  const timeProgress = timeLeft ? (timeLeft / totalTime) * 100 : 0;
  const isLowTime = timeLeft && timeLeft <= 10;

  return (
    <Card className={cn("p-4 bg-card/95 backdrop-blur-sm", className)}>
      <div className="space-y-4">
        {/* Pot Information */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <DollarSign className="w-5 h-5 text-yellow-500" />
            <span className="text-sm font-medium text-muted-foreground">Current Pot</span>
          </div>
          <div className="text-2xl font-bold text-foreground" data-testid="pot-amount">
            {pot.toLocaleString()} chips
          </div>
        </div>

        {/* Game Round */}
        <div className="flex items-center justify-center">
          <Badge 
            variant="outline" 
            className="bg-primary/10 text-primary border-primary/20"
            data-testid="current-round"
          >
            {roundLabels[currentRound]}
          </Badge>
        </div>

        {/* Active Player & Timer */}
        {activePlayer && (
          <div className="space-y-2">
            <div className="flex items-center justify-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Active: <span className="font-medium text-foreground" data-testid="active-player">{activePlayer}</span>
              </span>
            </div>
            
            {timeLeft !== undefined && (
              <div className="space-y-2">
                <div className="flex items-center justify-center gap-2">
                  <Timer className={cn("w-4 h-4", isLowTime ? "text-red-500" : "text-muted-foreground")} />
                  <span className={cn("text-sm font-mono", isLowTime ? "text-red-500" : "text-foreground")} data-testid="time-left">
                    {timeLeft}s
                  </span>
                </div>
                <Progress 
                  value={timeProgress} 
                  className={cn("h-2", isLowTime && "progress-red")}
                  data-testid="timer-progress"
                />
              </div>
            )}
          </div>
        )}

        {/* Player Count */}
        <div className="flex items-center justify-center gap-2 pt-2 border-t border-border">
          <Users className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground" data-testid="player-count-info">
            {playerCount} players in game
          </span>
        </div>
      </div>
    </Card>
  );
}