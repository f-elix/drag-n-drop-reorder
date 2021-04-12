import type { Coords } from 'types/static';
import type { EventObject } from 'xstate';

export function assertEventType<TE extends EventObject, TType extends TE['type']>(
	event: TE,
	eventType: TType
): asserts event is TE & { type: TType } {
	if (event.type !== eventType) {
		throw new Error(`Invalid event: expected "${eventType}", got "${event.type}"`);
	}
}

export const getOffsetPosition = (element: HTMLElement): { left: number; top: number } => {
	let xPos = 0;
	let yPos = 0;

	let el: HTMLElement | null = element;

	while (el) {
		if (el.tagName === 'BODY') {
			// deal with browser quirks with body/window/document and page scroll
			const xScroll = el.scrollLeft || document.documentElement.scrollLeft;
			const yScroll = el.scrollTop || document.documentElement.scrollTop;

			xPos += el.offsetLeft - xScroll + el.clientLeft;
			yPos += el.offsetTop - yScroll + el.clientTop;
		} else {
			// for all other non-BODY elements
			xPos += el.offsetLeft - el.scrollLeft + el.clientLeft;
			yPos += el.offsetTop - el.scrollTop + el.clientTop;
		}

		el = el.offsetParent as HTMLElement;
	}
	return {
		left: xPos,
		top: yPos
	};
};

export const getElOffsetMid = (el: HTMLElement): Coords | undefined => {
	if (!el) {
		return;
	}
	const { left, top } = getOffsetPosition(el);
	return {
		x: left + el.offsetWidth / 2,
		y: top + el.offsetHeight / 2
	};
};

const getRect = (el: HTMLElement) => {
	return el.getBoundingClientRect();
};

export const flip: (callback: () => void, el: HTMLElement) => void = (callback, el) => {
	const firstRect = getRect(el);
	const currentElStyle = el.getAttribute('style') || '';
	callback();
	requestAnimationFrame(() => {
		const lastRect = getRect(el);
		const dx = firstRect.x - lastRect.x;
		const dy = firstRect.y - lastRect.y;
		const flipStyles = `transition-duration: 0s !important; transform: translate3d(${dx}px, ${dy}px, 0);`;
		el.setAttribute('style', flipStyles);
		requestAnimationFrame(() => {
			el.setAttribute('style', currentElStyle);
		});
	});
};

export const isInRange: (value: number, min: number, max: number) => Boolean = (value, min, max) => {
	return value >= min && value <= max;
};

export const reorderArray = (array: any[], from: number, to: number): any[] => {
	const reorderedArray = array;
	reorderedArray.splice(to, 0, reorderedArray.splice(from, 1)[0]);
	return reorderedArray;
};
