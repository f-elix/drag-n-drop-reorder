import { dragDrop } from './dragDrop.machine';
import { generateId } from './utils';

const sels = {
	list: '.js-dnd-list',
	item: '.js-dnd-list-el'
};

const listParent = document.querySelector(sels.list) as HTMLElement;

const dragBtns: HTMLElement[] = Array.from(listParent.querySelectorAll(`${sels.item} button`));

const onMove = (e: TouchEvent | MouseEvent) => {
	const { clientY: y } = e instanceof TouchEvent ? e.touches[0] : e;
	dragDrop.send({ type: 'MOVE', data: { y } });
};

const onDrop = () => {
	dragDrop.send({ type: 'DROP' });
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
	const { clientY: y } = e instanceof TouchEvent ? e.touches[0] : e;
	const target = e.currentTarget as HTMLElement;
	const parent = target.closest(sels.item) as HTMLElement;
	const id = parent.dataset.id;
	if (!id) {
		return;
	}
	const listEls: HTMLElement[] = Array.from(listParent.querySelectorAll(sels.item));
	const index = listEls.findIndex((el) => el.dataset.id === id);
	if (index < 0) {
		return;
	}
	dragDrop.send({
		type: 'DRAG',
		data: { index, y, id, listEls, draggedEl: parent }
	});
	addDragListeners();
};

const onTouchStart = (e: TouchEvent) => {
	e.preventDefault();
};

dragDrop.onTransition((state) => {
	listParent.dataset.state = state.toStrings().join('.');
});

dragBtns.forEach((el) => {
	const parent = el.closest(sels.item) as HTMLElement;
	parent.dataset.id = generateId();
	el.addEventListener('pointerdown', onDrag);
	el.addEventListener('touchstart', onTouchStart);
});
