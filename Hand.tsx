import PlayingCard, { type Card } from './PlayingCard';
import { cn } from '@/lib/utils';

interface HandProps {
  cards: Card[];
  className?: string;
  title?: string;
  isDealing?: boolean;
}

export default function Hand({ cards, className, title, isDealing = false }: HandProps) {
  return (
    <div className={cn("space-y-2", className)}>
      {title && (
        <h3 className="text-lg font-semibold text-white text-center" data-testid="hand-title">
          {title}
        </h3>
      )}
      <div className="flex gap-2 justify-center" data-testid="hand-cards">
        {cards.map((card, index) => (
          <div
            key={card.id}
            className={cn(
              "transition-all duration-300",
              isDealing && "animate-pulse"
            )}
            style={{ 
              animationDelay: isDealing ? `${index * 100}ms` : '0ms' 
            }}
          >
            <PlayingCard card={card} size="lg" />
          </div>
        ))}
        {/* Show empty card slots if we have fewer than 4 cards */}
        {cards.length < 4 && Array.from({ length: 4 - cards.length }).map((_, index) => (
          <div 
            key={`empty-${index}`}
            className="w-20 h-32 border-2 border-dashed border-gray-500 rounded-md flex items-center justify-center"
            data-testid={`empty-slot-${index}`}
          >
            <span className="text-gray-500 text-xs">Empty</span>
          </div>
        ))}
      </div>
    </div>
  );
}