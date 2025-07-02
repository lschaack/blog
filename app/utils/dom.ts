// Get element position relative to entire document
// https://stackoverflow.com/a/26230989
// TODO: Test simplified version on different browsers:
// https://stackoverflow.com/a/18673641
export const getAbsoluteOffset = (element: HTMLElement) => {
  const clientRect = element.getBoundingClientRect();

  const body = document.body;
  const docEl = document.documentElement;

  const scrollTop = window.pageYOffset || docEl.scrollTop || body.scrollTop;
  const scrollLeft = window.pageXOffset || docEl.scrollLeft || body.scrollLeft;

  const clientTop = docEl.clientTop || body.clientTop || 0;
  const clientLeft = docEl.clientLeft || body.clientLeft || 0;

  const offsetTop = clientRect.top + scrollTop - clientTop;
  const offsetLeft = clientRect.left + scrollLeft - clientLeft;

  return {
    offsetTop,
    offsetLeft,
  };
}
