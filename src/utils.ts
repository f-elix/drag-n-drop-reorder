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

export const getElMid = (el: HTMLElement): number => {
	if (!el) {
		return 0;
	}
	const rect = el.getBoundingClientRect();
	const { height, top } = rect;
	return top + height / 2;
};

export const getPosition = (element: HTMLElement): { x: number; y: number } => {
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
		x: xPos,
		y: yPos
	};
};

export const getElOffsetMid = (el: HTMLElement): number => {
	if (!el) {
		return 0;
	}
	const top = getPosition(el).y;
	return top + el.offsetHeight / 2;
};

export const getElOffsetTop = (el: HTMLElement): number => {
	if (!el) {
		return 0;
	}
	const top = getPosition(el).y;
	return top;
};

export const getElOffsetBottom = (el: HTMLElement): number => {
	if (!el) {
		return 0;
	}
	const top = getPosition(el).y;
	return top + el.offsetHeight;
};

export const reorderArray = (array: any[], from: number, to: number): any[] => {
	const reorderedArray = array;
	reorderedArray.splice(to, 0, reorderedArray.splice(from, 1)[0]);
	return reorderedArray;
};

const getAttrObject = (el: HTMLElement): Record<string, any> => {
	const attrObj: Record<string, any> = {};
	Array.from(el.attributes).forEach((attr) => {
		attrObj[attr.nodeName] = attr.nodeValue;
	});
	return attrObj;
};

const setAttr = (el: HTMLElement, attrObj: Record<string, any>): void => {
	Array.from(el.attributes).forEach((attr) => {
		const attrName = attr.nodeName;
		if (!attrObj[attrName]) {
			el.removeAttribute(attrName);
		}
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

export const reorderElements = (fromEl: HTMLElement, toEl: HTMLElement): void => {
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
