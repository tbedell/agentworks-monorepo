import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Card } from '../components/kanban/types';

export interface FloatingCardState {
  cardId: string;
  card: Card;
  position: { x: number; y: number };
  size: { width: number; height: number };
  minimized: boolean;
  zIndex: number;
}

interface FloatingCardsStore {
  // Map of cardId to floating card state
  openCards: Record<string, FloatingCardState>;

  // Max z-index for layering
  maxZIndex: number;

  // Actions
  openCard: (card: Card, initialPosition?: { x: number; y: number }) => void;
  closeCard: (cardId: string) => void;
  closeAllCards: () => void;
  updatePosition: (cardId: string, position: { x: number; y: number }) => void;
  updateSize: (cardId: string, size: { width: number; height: number }) => void;
  minimizeCard: (cardId: string) => void;
  restoreCard: (cardId: string) => void;
  bringToFront: (cardId: string) => void;
  updateCardData: (cardId: string, card: Card) => void;

  // Computed
  getOpenCardIds: () => string[];
  isCardOpen: (cardId: string) => boolean;
}

const DEFAULT_SIZE = { width: 480, height: 400 };
const INITIAL_OFFSET = { x: 100, y: 100 };
const STACK_OFFSET = 30;

export const useFloatingCardsStore = create<FloatingCardsStore>()(
  persist(
    (set, get) => ({
      openCards: {},
      maxZIndex: 1000,

      openCard: (card, initialPosition) => {
        const currentCards = get().openCards;

        // If card is already open, just bring it to front
        if (currentCards[card.id]) {
          get().bringToFront(card.id);
          return;
        }

        // Calculate position - stack cards with offset
        const openCount = Object.keys(currentCards).length;
        const position = initialPosition || {
          x: INITIAL_OFFSET.x + (openCount * STACK_OFFSET),
          y: INITIAL_OFFSET.y + (openCount * STACK_OFFSET),
        };

        const newZIndex = get().maxZIndex + 1;

        set(state => ({
          openCards: {
            ...state.openCards,
            [card.id]: {
              cardId: card.id,
              card,
              position,
              size: DEFAULT_SIZE,
              minimized: false,
              zIndex: newZIndex,
            },
          },
          maxZIndex: newZIndex,
        }));
      },

      closeCard: (cardId) => {
        set(state => {
          const { [cardId]: removed, ...remaining } = state.openCards;
          return { openCards: remaining };
        });
      },

      closeAllCards: () => {
        set({ openCards: {} });
      },

      updatePosition: (cardId, position) => {
        set(state => {
          if (!state.openCards[cardId]) return state;
          return {
            openCards: {
              ...state.openCards,
              [cardId]: {
                ...state.openCards[cardId],
                position,
              },
            },
          };
        });
      },

      updateSize: (cardId, size) => {
        set(state => {
          if (!state.openCards[cardId]) return state;
          return {
            openCards: {
              ...state.openCards,
              [cardId]: {
                ...state.openCards[cardId],
                size,
              },
            },
          };
        });
      },

      minimizeCard: (cardId) => {
        set(state => {
          if (!state.openCards[cardId]) return state;
          return {
            openCards: {
              ...state.openCards,
              [cardId]: {
                ...state.openCards[cardId],
                minimized: true,
              },
            },
          };
        });
      },

      restoreCard: (cardId) => {
        set(state => {
          if (!state.openCards[cardId]) return state;
          return {
            openCards: {
              ...state.openCards,
              [cardId]: {
                ...state.openCards[cardId],
                minimized: false,
              },
            },
          };
        });
        get().bringToFront(cardId);
      },

      bringToFront: (cardId) => {
        set(state => {
          if (!state.openCards[cardId]) return state;
          const newZIndex = state.maxZIndex + 1;
          return {
            openCards: {
              ...state.openCards,
              [cardId]: {
                ...state.openCards[cardId],
                zIndex: newZIndex,
              },
            },
            maxZIndex: newZIndex,
          };
        });
      },

      updateCardData: (cardId, card) => {
        set(state => {
          if (!state.openCards[cardId]) return state;
          return {
            openCards: {
              ...state.openCards,
              [cardId]: {
                ...state.openCards[cardId],
                card,
              },
            },
          };
        });
      },

      getOpenCardIds: () => Object.keys(get().openCards),

      isCardOpen: (cardId) => !!get().openCards[cardId],
    }),
    {
      name: 'floating-cards-store',
      partialize: (state) => ({
        openCards: state.openCards,
        maxZIndex: state.maxZIndex,
      }),
    }
  )
);
