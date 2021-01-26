import { createMachine, interpret, assign } from '@xstate/compiled';
import { inspect } from '@xstate/inspect';
import {
	assertEventType,
	getElMid,
	getElOffsetBottom,
	getElOffsetMid,
	getElOffsetTop,
	reorderArray,
	reorderElements
} from './utils';

enum Intersections {
	prev = 'prev',
	next = 'next'
}

interface DragDropContext {
	anchorY: number;
	clientY: number;
	elY: number;
	draggedIndex?: number;
	draggedId?: string;
	listEls?: HTMLElement[];
	draggedEl?: HTMLElement;
	intersecting: Intersections | boolean;
}

type DragDropEvent =
	| {
			type: 'DRAG';
			data: {
				y: number;
				index: number;
				id: string;
				listEls: HTMLElement[];
				draggedEl: HTMLElement;
			};
	  }
	| {
			type: 'MOVE';
			data: {
				y: number;
			};
	  }
	| { type: 'DROP' };

const dragDropMachine = createMachine<DragDropContext, DragDropEvent, 'dragDrop'>(
	{
		id: 'dragDrop',
		initial: 'idle',
		context: {
			anchorY: 0,
			elY: 0,
			clientY: 0,
			draggedIndex: undefined,
			draggedId: undefined,
			listEls: undefined,
			draggedEl: undefined,
			intersecting: false
		},
		states: {
			idle: {
				on: {
					DRAG: {
						target: 'dragging',
						actions: ['setDraggingData', 'setDraggingElState']
					}
				}
			},
			dragging: {
				type: 'parallel',
				states: {
					pointer: {
						on: {
							MOVE: {
								actions: ['updateCoords', 'setElCoords']
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
										actions: ['reorderList']
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
			setDraggingData: assign((context, event) => {
				assertEventType(event, 'DRAG');
				const { y, id, index, listEls, draggedEl } = event.data;
				const draggedElMid = getElOffsetMid(draggedEl);
				const elY = y - draggedElMid;
				return {
					anchorY: draggedElMid,
					elY: elY,
					clientY: y,
					draggedIndex: index,
					draggedId: id,
					listEls,
					draggedEl
				};
			}),
			setDraggingElState: (context, event) => {
				assertEventType(event, 'DRAG');
				const { draggedEl, elY } = context;
				if (!draggedEl) {
					return;
				}
				draggedEl.dataset.state = 'dragging';
				draggedEl.style.setProperty('--y', `${elY}px`);
			},
			clearDragging: assign((context, event) => {
				assertEventType(event, 'DROP');
				const { draggedEl } = context;
				if (draggedEl) {
					draggedEl.style.removeProperty('--y');
					draggedEl.dataset.state = '';
				}
				return {
					anchorY: 0,
					elY: 0,
					clientY: 0,
					draggedIndex: undefined,
					draggedId: undefined,
					listEls: undefined,
					draggedEl: undefined,
					intersecting: false
				};
			}),
			updateCoords: assign((context, event) => {
				assertEventType(event, 'MOVE');
				const { listEls, draggedIndex, draggedEl } = context;
				let intersecting: Intersections | boolean = false;
				if (!listEls || !draggedEl || typeof draggedIndex === 'undefined') {
					return {
						elY: event.data.y - context.anchorY,
						clientY: event.data.y,
						intersecting
					};
				}
				const targetMid = getElMid(draggedEl);
				const prevEl = listEls[draggedIndex - 1];
				const prevElBottom = getElOffsetBottom(prevEl);
				const nextEl = listEls[draggedIndex + 1];
				const nextElTop = getElOffsetTop(nextEl);
				const isIntersectingPrev = !!prevEl && targetMid <= prevElBottom;
				const isIntersectingNext = !!nextEl && targetMid >= nextElTop;
				if (isIntersectingPrev) {
					intersecting = Intersections.prev;
				} else if (isIntersectingNext) {
					intersecting = Intersections.next;
				}
				const elY = event.data.y - context.anchorY;
				return {
					elY,
					clientY: event.data.y,
					intersecting
				};
			}),
			setElCoords: (context, event) => {
				assertEventType(event, 'MOVE');
				const { draggedEl, elY } = context;
				if (!draggedEl) {
					return;
				}
				draggedEl.style.setProperty('--y', `${elY}px`);
			},
			reorderList: assign((context, event) => {
				assertEventType(event, 'MOVE');
				const { draggedIndex, listEls, intersecting, draggedEl } = context;
				if (typeof draggedIndex === 'undefined' || !listEls || !draggedEl || !intersecting) {
					return context;
				}
				// Swap elements
				const elsLastIndex = listEls.length - 1;
				const parentEl: HTMLElement | null = draggedEl.parentElement;
				if (!parentEl) {
					return context;
				}
				let intersectedIndex = draggedIndex;
				if (intersecting === Intersections.prev) {
					intersectedIndex = draggedIndex - 1 < 0 ? 0 : draggedIndex - 1;
				} else if (intersecting === Intersections.next) {
					intersectedIndex = draggedIndex + 1 > elsLastIndex ? elsLastIndex : draggedIndex + 1;
				}
				const intersectedEl = listEls[intersectedIndex];
				reorderElements(draggedEl, intersectedEl);
				// Update dragging context
				const updatedListEls = Array.from(parentEl.children) as HTMLElement[];
				const updatedDraggedEl = updatedListEls[intersectedIndex];
				const newAnchorY = getElOffsetMid(updatedDraggedEl);
				return {
					anchorY: newAnchorY,
					elY: context.clientY - newAnchorY,
					draggedIndex: intersectedIndex,
					listEls: updatedListEls,
					draggedEl: updatedDraggedEl
				};
			})
		},
		guards: {
			isIntersecting: (context) => !!context.intersecting
		}
	}
);

export const dragDrop = interpret(dragDropMachine).start();
