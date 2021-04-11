import type { Coords } from '../types/static';
import { createMachine, assign } from '@xstate/compiled';
import { assertEventType, getElMid, getElOffsetMid, swapElements } from './utils';

interface DragDropContext {
	anchorCoords: Coords;
	itemSelector?: string;
	draggedItem?: HTMLElement;
	intersectingItem?: HTMLElement;
}

type DragDropEvent =
	| {
			type: 'DRAG';
			data: {
				clientCoords: Coords;
				draggedItem: HTMLElement;
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
	anchorCoords: {
		x: 0,
		y: 0
	},
	itemSelector: undefined,
	draggedItem: undefined,
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
				const { clientCoords, draggedItem, itemSelector } = event.data;
				draggedItem.dataset.state = 'dragging';
				return {
					anchorCoords: clientCoords,
					draggedItem,
					itemSelector
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
					const { itemSelector, draggedItem, anchorCoords } = context;
					if (draggedItem) {
						draggedItem.style.setProperty('--x', `${clientCoords.x - anchorCoords.x}px`);
						draggedItem.style.setProperty('--y', `${clientCoords.y - anchorCoords.y}px`);
					}
					// Check intersection
					if (!itemSelector || !draggedItem) {
						return;
					}
					const hitTests = document.elementsFromPoint(clientCoords.x, clientCoords.y);
					if (!hitTests.length) {
						return;
					}
					const hoveredItem = hitTests.filter(
						(el) => el.matches(itemSelector) && el !== draggedItem
					)[0] as HTMLElement;
					if (!hoveredItem) {
						return;
					}
					return hoveredItem;
				}
			}),
			swapItems: assign((context, event) => {
				assertEventType(event, 'MOVE');
				const { intersectingItem, draggedItem } = context;
				if (!draggedItem || !intersectingItem) {
					return context;
				}
				swapElements(draggedItem, intersectingItem);
				const anchorCoords = getElOffsetMid(intersectingItem);
				if (!anchorCoords) {
					return context;
				}
				return {
					anchorCoords,
					draggedItem: intersectingItem
				};
			})
		},
		guards: {
			isIntersecting: (context) => !!context.intersectingItem
		}
	}
);
