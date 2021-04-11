import type { Coords } from '../types/static';
import { createMachine, assign } from '@xstate/compiled';
import { assertEventType, getElMid, getElOffsetMid, swapElements, setElCoords } from './utils';

interface DragDropContext {
	anchorCoords: Coords;
	itemCoords: Coords;
	itemSelector?: string;
	handleSelector?: string;
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
				handleSelector: string;
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
	itemCoords: {
		x: 0,
		y: 0
	},
	itemSelector: undefined,
	handleSelector: undefined,
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
								actions: ['updateCoords']
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
				const { clientCoords, handleSelector, draggedItem, itemSelector } = event.data;
				draggedItem.dataset.state = 'dragging';
				setElCoords(draggedItem, clientCoords);
				return {
					anchorCoords: clientCoords,
					elCoords: clientCoords,
					draggedItem,
					itemSelector,
					handleSelector
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
			updateCoords: assign({
				itemCoords: (context, event) => {
					assertEventType(event, 'MOVE');
					const { anchorCoords, draggedItem } = context;
					const { clientCoords } = event.data;
					const itemCoords = {
						x: clientCoords.x - anchorCoords.x,
						y: clientCoords.y - anchorCoords.y
					};
					if (draggedItem) {
						setElCoords(draggedItem, itemCoords);
					}
					return itemCoords;
				},
				intersectingItem: (context, event) => {
					assertEventType(event, 'MOVE');
					const { itemSelector, draggedItem, handleSelector } = context;
					if (!itemSelector || !draggedItem || !handleSelector) {
						return;
					}
					const handle = draggedItem.querySelector(handleSelector) as HTMLElement;
					const handleCoords = getElMid(handle);
					if (!handleCoords) {
						return;
					}
					const hitTests = document.elementsFromPoint(handleCoords.x, handleCoords.y);
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
				const { clientCoords } = event.data;
				const { intersectingItem, draggedItem, handleSelector } = context;
				if (!draggedItem || !intersectingItem || !handleSelector) {
					return context;
				}
				swapElements(draggedItem, intersectingItem);
				const handle = intersectingItem.querySelector(handleSelector) as HTMLElement;
				if (!handle) {
					return context;
				}
				const anchorCoords = getElOffsetMid(handle);
				if (!anchorCoords) {
					return context;
				}
				const itemCoords = {
					x: clientCoords.x - anchorCoords.x,
					y: clientCoords.y - anchorCoords.y
				};
				return {
					anchorCoords,
					itemCoords,
					draggedItem: intersectingItem
				};
			})
		},
		guards: {
			isIntersecting: (context) => !!context.intersectingItem
		}
	}
);
