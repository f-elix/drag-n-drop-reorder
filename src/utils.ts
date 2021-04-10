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

export const generateId = (): string => `${Math.floor(Math.random() * Date.now())}`;

export const getElMid = (el: HTMLElement): Coords | undefined => {
	if (!el) {
		return;
	}
	const rect = el.getBoundingClientRect();
	const { height, top, width, left } = rect;
	return {
		x: left + width / 2,
		y: top + height / 2
	};
};

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

const getAttrObject = (el: HTMLElement): Record<string, any> => {
	return Array.from(el.attributes).reduce((attrObj, attr) => {
		attrObj[attr.nodeName] = attr.nodeValue;
		return attrObj;
	}, {} as Record<string, any>);
};

const setAttr = (el: HTMLElement, attrObj: Record<string, any>): void => {
	Array.from(el.attributes).forEach((attr) => {
		const attrName = attr.nodeName;
		el.removeAttribute(attrName);
	});
	Object.entries(attrObj).forEach(([name, value]) => {
		el.setAttribute(name, value);
	});
};

const removeChildren = (el: HTMLElement): void => {
	while (el.firstChild) {
		el.removeChild(el.firstChild);
	}
};

export const swapElements = (fromEl: HTMLElement, toEl: HTMLElement): void => {
	const fromAttr = getAttrObject(fromEl);
	const toAttr = getAttrObject(toEl);
	const fromFrag = document.createDocumentFragment();
	const toFrag = document.createDocumentFragment();
	Array.from(fromEl.children).forEach((child) => {
		fromFrag.appendChild(child);
	});
	Array.from(toEl.children).forEach((child) => {
		toFrag.appendChild(child);
	});
	setAttr(toEl, fromAttr);
	setAttr(fromEl, toAttr);
	removeChildren(fromEl);
	removeChildren(toEl);
	fromEl.appendChild(toFrag);
	toEl.appendChild(fromFrag);
};

export const setElCoords = (el: HTMLElement, coords: { x: number; y: number }) => {
	el.style.setProperty('--x', `${coords.x}px`);
	el.style.setProperty('--y', `${coords.y}px`);
};

export const reorderArray = (array: any[], from: number, to: number): any[] => {
	const reorderedArray = array;
	reorderedArray.splice(to, 0, reorderedArray.splice(from, 1)[0]);
	return reorderedArray;
};
