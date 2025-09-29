import { Spade, Heart, Diamond, Club } from "lucide-react";
import cardBackImage from "@assets/generated_images/poker_card_back_design_a981bd2b.png";
import { cn } from "@/lib/utils";

export interface Card {
  suit: 'spades' | 'hearts' | 'diamonds' | 'clubs';
  value: 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';
  id: string;
}

interface PlayingCardProps {
  card?: Card;
  isBack?: boolean;
  className?: string;
  onClick?: () => void;
  size?: 'sm' | 'md' | 'lg';
}

const suitIcons = {
  spades: Spade,
  hearts: Heart,
  diamonds: Diamond,
  clubs: Club
};

const getSuitColor = (suit: Card['suit']) => {
  return suit === 'hearts' || suit === 'diamonds' ? 'text-poker-card-red' : 'text-poker-card-black';
};

const cardSizes = {
  sm: 'w-12 h-16 text-xs',
  md: 'w-16 h-24 text-sm',
  lg: 'w-20 h-32 text-base'
};

export default function PlayingCard({ 
  card, 
  isBack = false, 
  className, 
  onClick,
  size = 'md'
}: PlayingCardProps) {
  const sizeClasses = cardSizes[size];

  if (isBack || !card) {
    return (
      <div 
        className={cn(
          "rounded-md shadow-lg border border-gray-300 overflow-hidden cursor-pointer",
          "hover-elevate active-elevate-2",
          sizeClasses,
          className
        )}
        onClick={onClick}
        data-testid="card-back"
      >
        <img 
          src={cardBackImage} 
          alt="Card back" 
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  const SuitIcon = suitIcons[card.suit];
  const suitColor = getSuitColor(card.suit);

  return (
    <div 
      className={cn(
        "bg-white rounded-md shadow-lg border border-gray-300 flex flex-col justify-between p-1 cursor-pointer",
        "hover-elevate active-elevate-2",
        sizeClasses,
        className
      )}
      onClick={onClick}
      data-testid={`card-${card.value}-${card.suit}`}
    >
      {/* Top left corner */}
      <div className={cn("flex flex-col items-center", suitColor)}>
        <span className="font-bold leading-none">{card.value}</span>
        <SuitIcon className="w-3 h-3" fill="currentColor" />
      </div>
      
      {/* Center suit icon */}
      <div className={cn("flex justify-center items-center", suitColor)}>
        <SuitIcon className="w-6 h-6" fill="currentColor" />
      </div>
      
      {/* Bottom right corner (rotated) */}
      <div className={cn("flex flex-col items-center rotate-180", suitColor)}>
        <span className="font-bold leading-none">{card.value}</span>
        <SuitIcon className="w-3 h-3" fill="currentColor" />
      </div>
    </div>
  );
}