import { interpret } from 'xstate';
import { dragDropMachine } from './dragDrop.machine';

interface DndOptions {
	itemSelector: string;
	handleSelector?: string;
}

interface DndInstance {
	init: () => void;
	update: () => void;
}

export const createDnd: (rootEl: HTMLElement | string, options: DndOptions) => DndInstance | undefined = (
	rootEl = 'dnd-list',
	{ itemSelector = 'dnd-item', handleSelector = 'dnd-item-handle' }
) => {
	const listEl: HTMLElement = typeof rootEl === 'string' ? (document.querySelector(rootEl) as HTMLElement) : rootEl;

	if (!listEl) {
		console.warn('Invalid list element argument. Expected an HTMLElement or a valid selector, got: ' + rootEl);
		return;
	}
	if (typeof itemSelector !== 'string') {
		console.warn('Expected a valid list items selector, got: ' + itemSelector);
		return;
	}
	if (typeof handleSelector !== 'string') {
		console.warn('Expected a valid handle selector, got: ' + handleSelector);
		return;
	}

	const listItems: HTMLElement[] = Array.from(listEl.querySelectorAll(itemSelector));
	const handles: HTMLElement[] = Array.from(listEl.querySelectorAll(handleSelector));

	const service = interpret(dragDropMachine).onTransition((state) => {
		listEl.dataset.state = state.toStrings().join('.');
	});

	let draggedItem: HTMLElement;

	const onMove = (e: TouchEvent | PointerEvent) => {
		const { clientX, clientY } = e instanceof TouchEvent ? e.touches[0] : e;
		service.send({ type: 'MOVE', data: { clientCoords: { x: clientX, y: clientY } } });
	};

	const onDrop = (e: TouchEvent | PointerEvent) => {
		service.send({ type: 'DROP' });
		removeDragListeners(e);
	};

	const addDragListeners = (e: TouchEvent | PointerEvent) => {
		if (e instanceof TouchEvent) {
			document.addEventListener('touchmove', onMove);
			document.addEventListener('touchend', onDrop);
			return;
		}
		draggedItem.setPointerCapture(e.pointerId);
		draggedItem.addEventListener('pointermove', onMove);
		draggedItem.addEventListener('pointerup', onDrop);
	};

	const removeDragListeners = (e: TouchEvent | PointerEvent) => {
		if (e instanceof TouchEvent) {
			document.removeEventListener('touchmove', onMove);
			document.removeEventListener('touchend', onDrop);
			return;
		}
		draggedItem.releasePointerCapture(e.pointerId);
		draggedItem.removeEventListener('pointermove', onMove);
		draggedItem.removeEventListener('pointerup', onDrop);
	};

	const onDrag = (e: TouchEvent | PointerEvent) => {
		const { clientX, clientY } = e instanceof TouchEvent ? e.touches[0] : e;
		const handle = e.currentTarget as HTMLElement;
		draggedItem = handle.closest(itemSelector) as HTMLElement;
		// const index = listItems.findIndex((el) => el === draggedItem);
		// if (index < 0) {
		// 	return;
		// }
		service.send({
			type: 'DRAG',
			data: {
				clientCoords: { x: clientX, y: clientY },
				draggedItem,
				itemSelector
			}
		});
		addDragListeners(e);
	};

	const onTouchStart = (e: TouchEvent) => {
		e.preventDefault();
	};

	const setItemsListeners = () => {
		const items = handles.length > 0 ? handles : listItems;
		items.forEach((el) => {
			el.addEventListener('pointerdown', onDrag);
			el.addEventListener('touchstart', onTouchStart);
		});
	};

	const update = () => {
		setItemsListeners();
	};

	const init = () => {
		setItemsListeners();
		service.start();
	};

	return {
		init,
		update
	};
};
