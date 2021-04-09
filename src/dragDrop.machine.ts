import type { Coords } from '../types/static';
import { createMachine, assign } from '@xstate/compiled';
import {
	assertEventType,
	getElMid,
	getElOffsetBottom,
	getElOffsetMid,
	getElOffsetTop,
	reorderArray,
	swapElements,
	setElCoords
} from './utils';

interface DragDropContext {
	anchorCoords: Coords;
	clientCoords: Coords;
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

export const dragDropMachine = createMachine<DragDropContext, DragDropEvent, 'dragDrop'>(
	{
		id: 'dragDrop',
		initial: 'idle',
		context: {
			anchorCoords: {
				x: 0,
				y: 0
			},
			clientCoords: {
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
		},
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
			setDragging: assign((context, event) => {
				assertEventType(event, 'DRAG');
				const { clientCoords, handleSelector, draggedItem, itemSelector } = event.data;
				const handle = draggedItem.querySelector(handleSelector) as HTMLElement;
				if (!handle) {
					return context;
				}
				const anchorCoords = getElMid(handle);
				if (!anchorCoords) {
					return context;
				}
				const elCoords = {
					x: clientCoords.x - anchorCoords.x,
					y: clientCoords.y - anchorCoords.y
				};
				draggedItem.dataset.state = 'dragging';
				setElCoords(draggedItem, elCoords);
				return {
					anchorCoords,
					clientCoords,
					elCoords,
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
				return {
					anchorY: 0,
					elY: 0,
					clientY: 0,
					draggedItem: undefined,
					intersecting: false,

					draggedItemIndex: undefined,
					draggedItemId: undefined
				};
			}),
			updateCoords: assign({
				clientCoords: (_, event) => event.data.clientCoords,
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
					const { clientCoords } = event.data;
					const { itemSelector } = context;
					if (!itemSelector) {
						return;
					}
					const hoveredEl = document.elementFromPoint(clientCoords.x, clientCoords.y);
					if (!hoveredEl) {
						return;
					}
					const hoveredItem = hoveredEl.closest(itemSelector) as HTMLElement;
					if (!hoveredItem) {
						return;
					}
					return hoveredItem;
				}
			}),
			swapItems: assign((context, event) => {
				assertEventType(event, 'MOVE');
				const { clientCoords, intersectingItem, draggedItem, handleSelector } = context;
				if (!draggedItem || !intersectingItem || !handleSelector) {
					return context;
				}
				swapElements(draggedItem, intersectingItem);
				const handle = draggedItem.querySelector(handleSelector) as HTMLElement;
				if (!handle) {
					return context;
				}
				const anchorCoords = getElMid(handle);
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
