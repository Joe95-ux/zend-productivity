import { Card, List } from "./types";

/**
 * Generic function to reorder an array by moving an item from one index to another
 */
export function reorderArray<T>(array: T[], fromIndex: number, toIndex: number): T[] {
  const result = Array.from(array);
  const [removed] = result.splice(fromIndex, 1);
  result.splice(toIndex, 0, removed);
  return result;
}

/**
 * Reorder cards within a list or between lists
 */
export function reorderCards(
  sourceCards: Card[],
  destinationCards: Card[],
  sourceIndex: number,
  destinationIndex: number,
  destinationListId: string
): { updatedSourceCards: Card[]; updatedDestinationCards: Card[] } {
  // Remove card from source
  const updatedSourceCards = Array.from(sourceCards);
  const [movedCard] = updatedSourceCards.splice(sourceIndex, 1);

  // Add card to destination
  const updatedDestinationCards = Array.from(destinationCards);
  updatedDestinationCards.splice(destinationIndex, 0, {
    ...movedCard,
    listId: destinationListId
  });

  // Update positions
  const finalSourceCards = updatedSourceCards.map((card, index) => ({
    ...card,
    position: index
  }));

  const finalDestinationCards = updatedDestinationCards.map((card, index) => ({
    ...card,
    position: index
  }));

  return {
    updatedSourceCards: finalSourceCards,
    updatedDestinationCards: finalDestinationCards
  };
}

/**
 * Reorder lists within a board
 */
export function reorderLists(lists: List[], fromIndex: number, toIndex: number): List[] {
  const reorderedLists = reorderArray(lists, fromIndex, toIndex);
  
  // Update positions
  return reorderedLists.map((list, index) => ({
    ...list,
    position: index
  }));
}
