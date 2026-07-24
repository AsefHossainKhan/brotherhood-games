'use client';

import { CardComponent } from '@brotherhood/shared/cards';
import { useGame } from '@/hooks/useGame';
import { useState, useMemo, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Card {
  suit: string;
  rank: string;
}

interface HandAreaProps {
  cards: Card[];
}

function SortableCard({
  card,
  cardId,
  isSelected,
  canPlay,
  onClick,
}: {
  card: Card;
  cardId: string;
  isSelected: boolean;
  canPlay: boolean;
  onClick: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: cardId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 100 : isSelected ? 50 : 1,
  };

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...(canPlay ? listeners : {})}
      data-testid={`card-${card.suit}-${card.rank}`}
      whileHover={canPlay && !isDragging ? { y: -10 } : {}}
      whileTap={canPlay ? { scale: 0.95 } : {}}
      className={`${canPlay ? 'cursor-grab active:cursor-grabbing' : ''} ${
        isDragging ? 'opacity-80' : ''
      } ${isSelected ? '-translate-y-5' : ''}`}
      onClick={canPlay ? onClick : undefined}
    >
      <CardComponent
        card={card as any}
        width={65}
        height={91}
        selected={isSelected}
        disabled={!canPlay}
      />
    </motion.div>
  );
}

export function HandArea({ cards }: HandAreaProps) {
  const { playCard, isMyTurn, phase } = useGame();
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const serverCardsRef = useRef<Card[]>(cards);

  const [displayOrder, setDisplayOrder] = useState<string[]>(() =>
    cards.map((c, i) => `${c.suit}-${c.rank}-${i}`)
  );

  useMemo(() => {
    serverCardsRef.current = cards;
    setDisplayOrder(cards.map((c, i) => `${c.suit}-${c.rank}-${i}`));
    setSelectedIndex(null);
  }, [cards]);

  const canPlay = isMyTurn && phase === 'PLAYING';

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleCardClick = useCallback((displayIndex: number) => {
    if (!canPlay) return;

    if (selectedIndex === displayIndex) {
      const cardId = displayOrder[displayIndex];
      const serverIndex = serverCardsRef.current.findIndex(
        (_, i) => `${serverCardsRef.current[i].suit}-${serverCardsRef.current[i].rank}-${i}` === cardId
      );
      if (serverIndex !== -1) {
        playCard(serverIndex);
      }
      setSelectedIndex(null);
    } else {
      setSelectedIndex(displayIndex);
    }
  }, [canPlay, selectedIndex, displayOrder, playCard]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setDisplayOrder((items) => {
      const oldIndex = items.indexOf(String(active.id));
      const newIndex = items.indexOf(String(over.id));
      if (oldIndex === -1 || newIndex === -1) return items;
      return arrayMove(items, oldIndex, newIndex);
    });
  };

  return (
    <div className="relative z-20 border-t border-white/10 bg-black/40 backdrop-blur-sm px-4 py-3">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={displayOrder} strategy={rectSortingStrategy}>
          {/* Simple centered flex row */}
          <div className="flex items-end justify-center gap-0">
            {displayOrder.map((cardId, displayIndex) => {
              const serverIndex = serverCardsRef.current.findIndex(
                (_, i) => `${serverCardsRef.current[i].suit}-${serverCardsRef.current[i].rank}-${i}` === cardId
              );
              const card = serverCardsRef.current[serverIndex];
              if (!card) return null;

              const isSelected = selectedIndex === displayIndex;
              const totalCards = displayOrder.length;
              const centerOffset = (totalCards - 1) / 2;
              const normalizedPos = (displayIndex - centerOffset) / Math.max(centerOffset, 1);
              const marginBottom = Math.abs(normalizedPos) * 8;
              const rotation = normalizedPos * 3;

              return (
                <div
                  key={cardId}
                  style={{
                    marginBottom: `${marginBottom}px`,
                    transform: `rotate(${rotation}deg)`,
                    marginLeft: displayIndex > 0 ? '-15px' : '0',
                  }}
                >
                  <SortableCard
                    card={card}
                    cardId={cardId}
                    isSelected={isSelected}
                    canPlay={canPlay}
                    onClick={() => handleCardClick(displayIndex)}
                  />
                </div>
              );
            })}
          </div>
        </SortableContext>
      </DndContext>

      {canPlay && (
        <p className="mt-2 text-center text-xs text-white/40">
          Drag to reorder | Click to select, click again to play
        </p>
      )}
    </div>
  );
}
