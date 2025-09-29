import { useState } from 'react';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spade, Heart, Diamond, Club } from 'lucide-react';
import { cn } from '@/lib/utils';

interface JoinScreenProps {
  onJoin: (playerName: string, roomCode: string) => void;
  isConnecting?: boolean;
  error?: string;
  className?: string;
}

export default function JoinScreen({ onJoin, isConnecting = false, error, className }: JoinScreenProps) {
  const [playerName, setPlayerName] = useState('');
  const [roomCode, setRoomCode] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (playerName.trim() && roomCode.trim()) {
      onJoin(playerName.trim(), roomCode.trim().toUpperCase());
    }
  };

  const generateRoomCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const code = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    setRoomCode(code);
  };

  return (
    <div className={cn("min-h-screen bg-poker-table flex items-center justify-center p-4", className)}>
      {/* Decorative poker symbols */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <Spade className="absolute top-10 left-10 w-8 h-8 text-white/10 rotate-12" />
        <Heart className="absolute top-20 right-20 w-6 h-6 text-white/10 -rotate-12" />
        <Diamond className="absolute bottom-20 left-20 w-7 h-7 text-white/10 rotate-45" />
        <Club className="absolute bottom-10 right-10 w-9 h-9 text-white/10 -rotate-45" />
      </div>

      <Card className="w-full max-w-md bg-card/95 backdrop-blur-sm shadow-2xl">
        <CardHeader className="text-center space-y-2">
          <CardTitle className="text-2xl font-bold text-foreground" data-testid="join-title">
            4-Card Texas Hold'em
          </CardTitle>
          <p className="text-muted-foreground">
            Enter your name and room code to join the game
          </p>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="playerName" className="text-sm font-medium">
                Player Name
              </Label>
              <Input
                id="playerName"
                type="text"
                placeholder="Enter your name"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                data-testid="input-player-name"
                maxLength={20}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="roomCode" className="text-sm font-medium">
                Room Code
              </Label>
              <div className="flex gap-2">
                <Input
                  id="roomCode"
                  type="text"
                  placeholder="ABC123"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  data-testid="input-room-code"
                  maxLength={6}
                  className="font-mono"
                  required
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={generateRoomCode}
                  data-testid="button-generate-code"
                  className="whitespace-nowrap"
                >
                  Generate
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Generate a new room code or enter an existing one
              </p>
            </div>

            {error && (
              <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20">
                <p className="text-sm text-destructive" data-testid="error-message">
                  {error}
                </p>
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full" 
              disabled={!playerName.trim() || !roomCode.trim() || isConnecting}
              data-testid="button-join-room"
            >
              {isConnecting ? 'Joining...' : 'Join Room'}
            </Button>
          </form>

          <div className="mt-6 pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground text-center">
              Share your room code with friends to play together
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}