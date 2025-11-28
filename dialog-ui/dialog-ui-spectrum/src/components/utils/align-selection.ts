function findAlignmentWrapper(node: Node | null): HTMLElement | null {
  while (node) {
    if (node instanceof HTMLElement && node.dataset?.rteAlign === 'true') {
      return node;
    }
    node = node.parentNode as (Node | null);
  }
  return null;
}

export const alignSelection = (align: 'left' | 'right' | 'center' | 'justify') => {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return;
  const range = selection.getRangeAt(0);
  if (range.collapsed) return;

  const startWrapper = findAlignmentWrapper(range.startContainer);
  const endWrapper = findAlignmentWrapper(range.endContainer);

  // If both ends are inside the same existing alignment wrapper, just update it
  if (startWrapper && startWrapper === endWrapper) {
    startWrapper.style.textAlign = align;
    selection.removeAllRanges();
    const newRange = document.createRange();
    newRange.selectNodeContents(startWrapper);
    newRange.collapse(false);
    selection.addRange(newRange);
    return;
  }

  // Otherwise create a new wrapper (avoids nesting by not wrapping if selection == existing wrapper)
  const contents = range.extractContents();
  const wrapper = document.createElement('div');
  wrapper.dataset.rteAlign = 'true';
  wrapper.style.textAlign = align;
  wrapper.appendChild(contents);
  range.insertNode(wrapper);

  selection.removeAllRanges();
  const newRange = document.createRange();
  newRange.selectNodeContents(wrapper);
  newRange.collapse(false);
  selection.addRange(newRange);
};