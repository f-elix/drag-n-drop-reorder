import { interpret } from 'xstate';
import { dragDropMachine } from './dragDrop.machine';
import { generateId, getElMid } from './utils';

export const createDnd = (el: HTMLElement | string, itemSelector: string, handleSelector: string) => {
	// const IS_PRODUCTION = process && process.env?.NODE_ENV === 'production';
	const IS_PRODUCTION = false;

	const listEl: HTMLElement = typeof el === 'string' ? (document.querySelector(el) as HTMLElement) : el;

	if (!listEl) {
		if (!IS_PRODUCTION) {
			console.warn('Invalid list element argument. Expected an HTMLElement or a valid selector, got: ' + el);
		}
		return;
	}
	if (typeof itemSelector !== 'string') {
		if (!IS_PRODUCTION) {
			console.warn('Expected a valid list items selector, got: ' + itemSelector);
		}
		return;
	}
	if (typeof handleSelector !== 'string') {
		if (!IS_PRODUCTION) {
			console.warn('Expected a valid handle selector, got: ' + handleSelector);
		}
		return;
	}

	const listItems: HTMLElement[] = Array.from(listEl.querySelectorAll(itemSelector));
	const handles: HTMLElement[] = Array.from(listEl.querySelectorAll(handleSelector));

	const service = interpret(dragDropMachine).onTransition((state) => {
		listEl.dataset.state = state.toStrings().join('.');
	});

	const onMove = (e: TouchEvent | MouseEvent) => {
		const { clientX, clientY } = e instanceof TouchEvent ? e.touches[0] : e;
		service.send({ type: 'MOVE', data: { clientCoords: { x: clientX, y: clientY } } });
	};

	const onDrop = () => {
		service.send({ type: 'DROP' });
		removeDragListeners();
	};

	const addDragListeners = () => {
		document.addEventListener('pointermove', onMove);
		document.addEventListener('touchmove', onMove);
		document.addEventListener('pointerup', onDrop);
		document.addEventListener('touchend', onDrop);
	};

	const removeDragListeners = () => {
		document.removeEventListener('pointermove', onMove);
		document.removeEventListener('touchmove', onMove);
		document.removeEventListener('pointerup', onDrop);
		document.removeEventListener('touchend', onDrop);
	};

	const onDrag = (e: TouchEvent | MouseEvent) => {
		const { clientX, clientY } = e instanceof TouchEvent ? e.touches[0] : e;
		const handle = e.currentTarget as HTMLElement;
		const item = handle.closest(itemSelector) as HTMLElement;
		const id = item.dataset.dragId;
		if (!id) {
			return;
		}
		const index = listItems.findIndex((el) => el === item);
		if (index < 0) {
			return;
		}
		const handleCoords = getElMid(handle);
		if (!handleCoords) {
			return;
		}
		service.send({
			type: 'DRAG',
			data: {
				clientCoords: { x: clientX, y: clientY },
				draggedItem: item,
				itemSelector,
				handleSelector
			}
		});
		addDragListeners();
	};

	const onTouchStart = (e: TouchEvent) => {
		e.preventDefault();
	};

	const setHandles = () => {
		handles.forEach((el) => {
			const item = el.closest(itemSelector) as HTMLElement;
			if (!item) {
				if (!IS_PRODUCTION) {
					console.warn('Handle element found outside a list item.');
				}
				return;
			}
			item.dataset.dragId = generateId();
			el.addEventListener('pointerdown', onDrag);
			el.addEventListener('touchstart', onTouchStart);
		});
	};

	const update = () => {
		setHandles();
	};

	const init = () => {
		setHandles();
		service.start();
	};

	return {
		init,
		update
	};
};
