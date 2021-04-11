import { createDnd } from './create-dnd';

{
	const dnd = createDnd('.js-dnd-list-with-handles', {
		itemSelector: '.js-dnd-list-el',
		handleSelector: '.js-dnd-handle'
	});

	if (dnd) {
		dnd.init();
	}
}

{
	const dnd = createDnd('.js-dnd-list', { itemSelector: '.js-dnd-list-el' });

	if (dnd) {
		dnd.init();
	}
}
