export async function runWithMockedScrollIntoView(callback) {
    const scrollIntoViewOriginal = Element.prototype.scrollIntoView;

    let scrolledElement;

    Element.prototype.scrollIntoView = function() {
        scrolledElement = this;
    };

    await callback();

    // eslint-disable-next-line require-atomic-updates
    Element.prototype.scrollIntoView = scrollIntoViewOriginal;

    return scrolledElement;
}
