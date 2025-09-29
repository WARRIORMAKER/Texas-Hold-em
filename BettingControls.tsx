import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { DollarSign, Coins } from 'lucide-react';

interface BettingControlsProps {
  currentBet: number;
  minRaise: number;
  maxBet: number;
  playerChips: number;
  isPlayerTurn: boolean;
  canCheck: boolean;
  onCheck: () => void;
  onCall: (amount: number) => void;
  onRaise: (amount: number) => void;
  onFold: () => void;
  onAllIn: () => void;
  className?: string;
}

export default function BettingControls({
  currentBet,
  minRaise,
  maxBet,
  playerChips,
  isPlayerTurn,
  canCheck,
  onCheck,
  onCall,
  onRaise,
  onFold,
  onAllIn,
  className
}: BettingControlsProps) {
  const [raiseAmount, setRaiseAmount] = useState(minRaise);
  const [customAmount, setCustomAmount] = useState('');

  const callAmount = currentBet;
  const minRaiseAmount = currentBet + minRaise;
  const isAllIn = raiseAmount >= playerChips;

  const handleSliderChange = (values: number[]) => {
    setRaiseAmount(values[0]);
    setCustomAmount(values[0].toString());
  };

  const handleCustomAmountChange = (value: string) => {
    setCustomAmount(value);
    const numValue = parseInt(value) || 0;
    if (numValue >= minRaiseAmount && numValue <= maxBet) {
      setRaiseAmount(numValue);
    }
  };

  const handleRaise = () => {
    onRaise(raiseAmount);
  };

  const handleCall = () => {
    onCall(callAmount);
  };

  if (!isPlayerTurn) {
    return (
      <Card className={cn("p-4 bg-muted/50", className)}>
        <p className="text-center text-muted-foreground" data-testid="waiting-turn">
          Waiting for your turn...
        </p>
      </Card>
    );
  }

  return (
    <Card className={cn("p-6 bg-card border-border", className)}>
      <div className="space-y-4">
        {/* Player Chip Count */}
        <div className="flex items-center justify-center gap-2 pb-4 border-b border-border">
          <Coins className="w-5 h-5 text-yellow-500" />
          <span className="text-lg font-semibold" data-testid="player-chips">
            {playerChips.toLocaleString()} chips
          </span>
        </div>

        {/* Current Bet Info */}
        {currentBet > 0 && (
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Current bet: <span className="font-semibold text-foreground">{currentBet}</span>
            </p>
          </div>
        )}

        {/* Action Buttons Row 1 */}
        <div className="flex gap-3">
          {canCheck ? (
            <Button
              onClick={onCheck}
              variant="outline"
              className="flex-1"
              data-testid="button-check"
            >
              Check
            </Button>
          ) : (
            <Button
              onClick={handleCall}
              variant="outline"
              className="flex-1"
              disabled={callAmount > playerChips}
              data-testid="button-call"
            >
              Call {callAmount}
            </Button>
          )}
          
          <Button
            onClick={onFold}
            variant="destructive"
            className="flex-1"
            data-testid="button-fold"
          >
            Fold
          </Button>
        </div>

        {/* Raise Controls */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">Raise Amount</span>
          </div>
          
          {/* Slider */}
          <div className="space-y-2">
            <Slider
              value={[raiseAmount]}
              onValueChange={handleSliderChange}
              min={minRaiseAmount}
              max={maxBet}
              step={minRaise}
              className="w-full"
              data-testid="slider-raise-amount"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Min: {minRaiseAmount}</span>
              <span>Max: {maxBet}</span>
            </div>
          </div>

          {/* Custom Amount Input */}
          <div className="flex gap-2">
            <Input
              type="number"
              placeholder="Custom amount"
              value={customAmount}
              onChange={(e) => handleCustomAmountChange(e.target.value)}
              min={minRaiseAmount}
              max={maxBet}
              className="flex-1"
              data-testid="input-custom-raise"
            />
            <Button
              onClick={handleRaise}
              disabled={raiseAmount < minRaiseAmount || raiseAmount > maxBet}
              className="min-w-[80px]"
              data-testid="button-raise"
            >
              {isAllIn ? 'All In' : 'Raise'}
            </Button>
          </div>
        </div>

        {/* All In Button */}
        {playerChips > minRaiseAmount && (
          <Button
            onClick={onAllIn}
            variant="secondary"
            className="w-full bg-yellow-600 hover:bg-yellow-700 text-white"
            data-testid="button-all-in"
          >
            All In ({playerChips} chips)
          </Button>
        )}
      </div>
    </Card>
  );
}