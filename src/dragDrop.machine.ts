import type { Coords } from '../types/static';
import { createMachine, assign } from '@xstate/compiled';
import { assertEventType, flip, getElOffsetMid, isColliding, isInRange } from './utils';

interface DragDropContext {
	anchorCoords: Coords;
	listItems?: HTMLElement[];
	listEl?: HTMLElement;
	itemSelector?: string;
	draggedItem?: HTMLElement;
	draggedIndex?: number;
	intersectingItem?: HTMLElement;
	lastSwappedItem?: HTMLElement;
}

type DragDropEvent =
	| {
			type: 'DRAG';
			data: {
				clientCoords: Coords;
				draggedItem: HTMLElement;
				listEl: HTMLElement;
				itemSelector: string;
			};
	  }
	| {
			type: 'MOVE';
			data: {
				clientCoords: Coords;
			};
	  }
	| { type: 'DROP' };

const initialContext: () => DragDropContext = () => ({
	listEl: undefined,
	listItems: undefined,
	anchorCoords: {
		x: 0,
		y: 0
	},
	itemSelector: undefined,
	draggedItem: undefined,
	lastSwappedItem: undefined,
	draggedIndex: undefined,
	intersectingItem: undefined
});

export const dragDropMachine = createMachine<DragDropContext, DragDropEvent, 'dragDrop'>(
	{
		id: 'dragDrop',
		initial: 'idle',
		context: initialContext(),
		states: {
			idle: {
				on: {
					DRAG: {
						target: 'dragging',
						actions: ['setDragging']
					}
				}
			},
			dragging: {
				type: 'parallel',
				states: {
					pointer: {
						on: {
							MOVE: {
								actions: ['updateCoordsAndCheckIntersection']
							}
						}
					},
					element: {
						initial: 'normal',
						states: {
							normal: {
								on: {
									MOVE: {
										cond: 'isIntersecting',
										target: 'intersecting',
										actions: ['swapItems']
									}
								}
							},
							intersecting: {
								on: {
									MOVE: [
										{
											cond: 'isIntersecting',
											internal: true
										},
										{
											target: 'normal'
										}
									]
								}
							}
						}
					}
				},
				on: {
					DROP: {
						target: 'idle',
						actions: ['clearDragging']
					}
				}
			}
		}
	},
	{
		actions: {
			setDragging: assign((_, event) => {
				assertEventType(event, 'DRAG');
				const { clientCoords, draggedItem, itemSelector, listEl } = event.data;
				const listItems = Array.from(listEl.querySelectorAll(itemSelector)) as HTMLElement[];
				const draggedIndex = listItems.indexOf(draggedItem);
				draggedItem.dataset.state = 'dragging';
				return {
					anchorCoords: clientCoords,
					draggedItem,
					draggedIndex,
					itemSelector,
					listItems,
					listEl
				};
			}),
			clearDragging: assign((context, event) => {
				assertEventType(event, 'DROP');
				const { draggedItem } = context;
				if (draggedItem) {
					draggedItem.style.removeProperty('--x');
					draggedItem.style.removeProperty('--y');
					delete draggedItem.dataset.state;
				}
				return initialContext();
			}),
			updateCoordsAndCheckIntersection: assign({
				intersectingItem: (context, event) => {
					assertEventType(event, 'MOVE');
					// Update item coords
					const { clientCoords } = event.data;
					const { itemSelector, draggedItem, anchorCoords, lastSwappedItem } = context;
					if (!draggedItem) {
						return;
					}
					draggedItem.style.setProperty('--x', `${clientCoords.x - anchorCoords.x}px`);
					draggedItem.style.setProperty('--y', `${clientCoords.y - anchorCoords.y}px`);
					// Check intersection
					if (!itemSelector || !draggedItem) {
						return;
					}
					const hitTests = document.elementsFromPoint(clientCoords.x, clientCoords.y);
					if (!hitTests.length) {
						return;
					}
					const hoveredItem = hitTests.filter(
						(el) => el.matches(itemSelector) && el !== draggedItem && el !== lastSwappedItem
					)[0] as HTMLElement;
					if (!hoveredItem) {
						return;
					}
					return hoveredItem;
				}
			}),
			swapItems: assign((context, event) => {
				assertEventType(event, 'MOVE');
				const { intersectingItem, draggedItem, draggedIndex, listItems, listEl, itemSelector } = context;
				if (
					!draggedItem ||
					!intersectingItem ||
					!itemSelector ||
					!listItems ||
					!listEl ||
					typeof draggedIndex === 'undefined'
				) {
					return context;
				}
				const intersectingIndex = listItems.indexOf(intersectingItem);
				const isNext = draggedIndex < intersectingIndex;
				const allIntersectedItems = listItems.filter((el, i) => {
					if (el === draggedItem) {
						return false;
					}
					if (isNext) {
						return isInRange(i, draggedIndex, intersectingIndex);
					} else {
						return isInRange(i, intersectingIndex, draggedIndex);
					}
				});
				if (!isNext) {
					allIntersectedItems.reverse();
				}
				allIntersectedItems.forEach((el) => {
					flip(() => {
						if (isNext) {
							el.previousElementSibling?.before(el);
						} else {
							el.nextElementSibling?.after(el);
						}
					}, el);
				});
				const anchorCoords = getElOffsetMid(draggedItem);
				const updatedListItems = Array.from(listEl.querySelectorAll(itemSelector)) as HTMLElement[];
				const lastSwappedItem = allIntersectedItems[allIntersectedItems.length - 1];
				return {
					anchorCoords,
					draggedIndex: intersectingIndex,
					listItems: updatedListItems,
					lastSwappedItem: lastSwappedItem
				};
			})
		},
		guards: {
			isIntersecting: (context) => !!context.intersectingItem
		}
	}
);
