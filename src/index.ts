import { createDnd } from './create-dnd';

const dnd = createDnd('.js-dnd-list', '.js-dnd-list-el', 'button');

if (dnd) {
	dnd.init();
}
