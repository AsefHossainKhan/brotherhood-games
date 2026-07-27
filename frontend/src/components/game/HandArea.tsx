"use client";

import { CardComponent } from "@brotherhood/shared/cards";
import { useGame } from "@/hooks/useGame";
import { useUiScale } from "@/hooks/useUiScale";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  pointerWithin,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
  type Modifier,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS, getEventCoordinates } from "@dnd-kit/utilities";

// Keep the lifted card centred under the pointer/finger so it feels physically
// "attached" to the cursor (or touch point) while dragging.
const snapCenterToCursor: Modifier = ({
  activatorEvent,
  draggingNodeRect,
  transform,
}) => {
  if (!draggingNodeRect || !activatorEvent) return transform;
  const coords = getEventCoordinates(activatorEvent);
  if (!coords) return transform;
  const offsetX = coords.x - draggingNodeRect.left;
  const offsetY = coords.y - draggingNodeRect.top;
  return {
    ...transform,
    x: transform.x + offsetX - draggingNodeRect.width / 2,
    y: transform.y + offsetY - draggingNodeRect.height / 2,
  };
};

interface Card {
  suit: string;
  rank: string;
}

interface HandAreaProps {
  cards: Card[];
}

const PLAY_ZONE_ID = "play-zone";
// Every card in the 32-card 29 deck is unique, so `suit_rank` is a stable id.
const idOf = (c: Card) => `${c.suit}_${c.rank}`;

function SortableCard({
  card,
  cardId,
  index,
  total,
  cardW,
  cardH,
  overlap,
  isSelected,
  isHovered,
  canPlay,
  onHoverChange,
  onClick,
}: {
  card: Card;
  cardId: string;
  index: number;
  total: number;
  cardW: number;
  cardH: number;
  overlap: number;
  isSelected: boolean;
  isHovered: boolean;
  canPlay: boolean;
  onHoverChange: (id: string | null) => void;
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

  const centerOffset = (total - 1) / 2;
  const normalizedPos =
    total > 1 ? (index - centerOffset) / Math.max(centerOffset, 1) : 0;
  const marginBottom = Math.abs(normalizedPos) * (cardH * 0.09);
  const rotation = normalizedPos * 3;

  // Raise the hovered / selected / dragged card above its neighbours so the
  // overlapping fan always plays the card the user actually points at.
  const zIndex = isDragging
    ? 100
    : isHovered
      ? 90
      : isSelected
        ? 70
        : index + 1;

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    marginLeft: index > 0 ? -overlap : 0,
    marginBottom,
    zIndex,
  };

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...(canPlay ? listeners : {})}
      data-testid={`card-${card.suit}-${card.rank}`}
      onHoverStart={() => canPlay && onHoverChange(cardId)}
      onHoverEnd={() => onHoverChange(null)}
      animate={{
        y: isSelected ? -20 : isHovered && canPlay ? -10 : 0,
        rotate: isDragging ? 0 : rotation,
      }}
      transition={{ type: "spring", stiffness: 320, damping: 26 }}
      whileTap={canPlay ? { scale: 0.96 } : {}}
      className={`${canPlay ? "cursor-grab active:cursor-grabbing" : ""} ${
        isDragging ? "opacity-0" : ""
      }`}
      onClick={canPlay ? onClick : undefined}
    >
      <CardComponent
        card={card as any}
        width={cardW}
        height={cardH}
        selected={isSelected}
        disabled={!canPlay}
      />
    </motion.div>
  );
}

function PlayDropZone({
  dragging,
  activeCard,
}: {
  dragging: boolean;
  activeCard: Card | null;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: PLAY_ZONE_ID });
  const scale = useUiScale();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const w = Math.round(66 * scale);
  const h = Math.round(92 * scale);

  // Rendered through a portal on <body> so no ancestor `backdrop-filter`
  // (the hand dock uses one) turns this `position: fixed` node into a
  // containing block, which would collapse its measured drop rect to 0px.
  const node = (
    <div
      ref={setNodeRef}
      className="pointer-events-none flex items-center justify-center"
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        top: 40,
        bottom: 132,
        zIndex: 10,
      }}
    >
      {dragging && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="flex flex-col items-center gap-2"
        >
          <motion.div
            animate={{ scale: isOver ? 1.08 : 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            style={{ width: w, height: h }}
            className={`relative flex items-center justify-center rounded-xl border-2 border-dashed transition-colors ${
              isOver
                ? "border-green-400 bg-green-400/15 shadow-[0_0_36px_-4px_rgba(74,222,128,0.85)]"
                : "border-white/30 bg-black/35"
            }`}
          >
            {isOver && activeCard ? (
              <div className="opacity-70">
                <CardComponent
                  card={activeCard as any}
                  width={w - 10}
                  height={h - 10}
                />
              </div>
            ) : (
              <span className="text-2xl text-white/40">↑</span>
            )}
          </motion.div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold shadow transition-colors ${
              isOver ? "bg-green-500 text-white" : "bg-black/60 text-white/70"
            }`}
          >
            {isOver ? "Release to play" : "Drag here to play"}
          </span>
        </motion.div>
      )}
    </div>
  );

  if (!mounted) return null;
  return createPortal(node, document.body);
}

export function HandArea({ cards }: HandAreaProps) {
  const { playCard, requestTrumpReveal, isMyTurn, phase, leadSuit, trump } =
    useGame();
  const canPlay = isMyTurn && phase === "PLAYING";

  // When I hold no card of the led suit and the trump is still hidden, playing
  // any card automatically reveals the trump — there is no separate reveal step.
  const autoRevealOnPlay =
    !!leadSuit &&
    !cards.some((c) => c.suit === leadSuit) &&
    !trump.isRevealed &&
    !!trump.type;

  const scale = useUiScale();
  const cardH = Math.round(92 * scale);
  const cardW = Math.round(cardH * 0.71);
  const overlap = Math.round(cardW * 0.42);
  const [order, setOrder] = useState<string[]>(() => cards.map(idOf));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  // Order-independent signature of the current hand contents.
  const handKey = useMemo(() => [...cards.map(idOf)].sort().join(","), [cards]);

  // When the hand contents change (a card was played / new deal), keep the
  // user's manual ordering for surviving cards and append any new ones.
  useEffect(() => {
    const ids = cards.map(idOf);
    const idSet = new Set(ids);
    setOrder((prev) => {
      const kept = prev.filter((id) => idSet.has(id));
      const added = ids.filter((id) => !kept.includes(id));
      return [...kept, ...added];
    });
    setSelectedId(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handKey]);

  const cardById = useMemo(() => {
    const m = new Map<string, Card>();
    for (const c of cards) m.set(idOf(c), c);
    return m;
  }, [cards]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const play = useCallback(
    (cardId: string) => {
      const serverIndex = cards.findIndex((c) => idOf(c) === cardId);
      if (serverIndex !== -1) {
        // Void in the led suit with a hidden trump → reveal it as we play.
        if (autoRevealOnPlay) requestTrumpReveal();
        playCard(serverIndex);
      }
      setSelectedId(null);
    },
    [cards, playCard, requestTrumpReveal, autoRevealOnPlay],
  );

  const handleCardClick = useCallback(
    (cardId: string) => {
      if (!canPlay) return;
      if (selectedId === cardId) play(cardId);
      else setSelectedId(cardId);
    },
    [canPlay, selectedId, play],
  );

  // Prefer the play zone when the pointer is over it, otherwise fall back to
  // sorting collisions between the hand cards.
  const collisionDetection: CollisionDetection = useCallback((args) => {
    const pointerHits = pointerWithin(args);
    const onPlayZone = pointerHits.find((h) => h.id === PLAY_ZONE_ID);
    if (onPlayZone) return [onPlayZone];
    return closestCenter(args);
  }, []);

  const handleDragStart = (event: DragStartEvent) => {
    setDragging(true);
    setActiveId(String(event.active.id));
    setSelectedId(null);
    setHoveredId(null);
  };

  const handleDragCancel = () => {
    setDragging(false);
    setActiveId(null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setDragging(false);
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    // Dropped onto the play zone → play the card.
    if (over.id === PLAY_ZONE_ID) {
      play(String(active.id));
      return;
    }

    // Otherwise reorder within the hand.
    if (active.id === over.id) return;
    setOrder((items) => {
      const oldIndex = items.indexOf(String(active.id));
      const newIndex = items.indexOf(String(over.id));
      if (oldIndex === -1 || newIndex === -1) return items;
      return arrayMove(items, oldIndex, newIndex);
    });
  };

  const activeCard = activeId ? cardById.get(activeId) : null;

  return (
    <div
      className={`relative z-20 shrink-0 border-t bg-black/40 px-4 pb-2 pt-1.5 backdrop-blur-sm transition-all ${
        canPlay
          ? "border-green-400/60 shadow-[0_-4px_24px_-6px_rgba(74,222,128,0.45)]"
          : "border-white/10"
      }`}
    >
      {/* Compact status + hint row, docked with the hand (no floating box). */}
      {canPlay && (
        <div className="mb-0.5 flex items-center justify-center gap-2 text-[11px]">
          <span className="rounded-full bg-green-500/90 px-2 py-0.5 font-bold text-white shadow">
            Your turn
          </span>
          <span className="text-white/50">
            {dragging
              ? "Release over the table to play"
              : "Drag \u2191 to play \u00b7 drag \u2194 to reorder \u00b7 or tap twice"}
          </span>
        </div>
      )}
      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetection}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        {canPlay && (
          <PlayDropZone dragging={dragging} activeCard={activeCard ?? null} />
        )}
        <SortableContext items={order} strategy={horizontalListSortingStrategy}>
          <div className="flex origin-bottom items-end justify-center">
            {order.map((cardId, index) => {
              const card = cardById.get(cardId);
              if (!card) return null;
              return (
                <SortableCard
                  key={cardId}
                  card={card}
                  cardId={cardId}
                  index={index}
                  total={order.length}
                  cardW={cardW}
                  cardH={cardH}
                  overlap={overlap}
                  isSelected={selectedId === cardId}
                  isHovered={hoveredId === cardId}
                  canPlay={canPlay}
                  onHoverChange={setHoveredId}
                  onClick={() => handleCardClick(cardId)}
                />
              );
            })}
          </div>
        </SortableContext>

        {/* Lifted card that stays pinned to the pointer / finger while dragging. */}
        <DragOverlay modifiers={[snapCenterToCursor]} dropAnimation={null}>
          {activeCard ? (
            <div
              data-testid="drag-overlay-card"
              className="pointer-events-none -rotate-2 drop-shadow-[0_12px_20px_rgba(0,0,0,0.55)]"
            >
              <CardComponent
                card={activeCard as any}
                width={cardW}
                height={cardH}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
