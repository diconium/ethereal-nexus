import { RefObject } from 'react';

function findListAncestor(node: Node | null, root?: HTMLElement | null): HTMLUListElement | HTMLOListElement | null {
  while (node && node !== root) {
    if (node instanceof HTMLUListElement || node instanceof HTMLOListElement) return node;
    node = node.parentNode;
  }
  return null;
}

function unwrapList(list: HTMLUListElement | HTMLOListElement) {
  const parent = list.parentNode;
  if (!parent) return;
  const frag = document.createDocumentFragment();
  Array.from(list.children).forEach(li => {
    // Move li's children directly to fragment
    Array.from(li.childNodes).forEach(child => frag.appendChild(child));
  });
  parent.replaceChild(frag, list);
  return parent; // return parent for caret placement
}

function convertList(list: HTMLUListElement | HTMLOListElement, toType: 'ul' | 'ol') {
  if (list.tagName.toLowerCase() === toType) return list; // no-op
  const newList = document.createElement(toType);
  Array.from(list.children).forEach(li => {
    const newLi = document.createElement('li');
    while (li.firstChild) newLi.appendChild(li.firstChild);
    newList.appendChild(newLi);
  });
  list.replaceWith(newList);
  return newList;
}

function buildListFromFragment(listType: 'ul' | 'ol', frag: DocumentFragment) {
  const list = document.createElement(listType);
  // If fragment has multiple block/text nodes, create one li per top-level node
  const children = Array.from(frag.childNodes).filter(n => !(n.nodeType === Node.TEXT_NODE && !n.textContent?.trim()));
  if (children.length > 1) {
    children.forEach(node => {
      const li = document.createElement('li');
      li.appendChild(node);
      list.appendChild(li);
    });
  } else {
    const li = document.createElement('li');
    li.appendChild(frag);
    list.appendChild(li);
  }
  return list;
}

export const insertList = (
  listType: 'ul' | 'ol',
  editorRef?: RefObject<HTMLDivElement | null>
) => {
  const selection = window.getSelection();
  if (!selection || !selection.rangeCount) return;

  const range = selection.getRangeAt(0);
  if (editorRef?.current && !editorRef.current.contains(range.commonAncestorContainer)) return; // outside editor

  // Detect existing list context
  const existingList = findListAncestor(range.startContainer, editorRef?.current || null);
  const endList = findListAncestor(range.endContainer, editorRef?.current || null);
  const fullyInsideSameList = existingList && existingList === endList && existingList.contains(range.startContainer) && existingList.contains(range.endContainer);

  if (fullyInsideSameList && existingList) {
    // Toggle or convert
    if (existingList.tagName.toLowerCase() === listType) {
      const parent = unwrapList(existingList);
      if (parent) {
        const newRange = document.createRange();
        newRange.selectNodeContents(parent);
        newRange.collapse(false);
        selection.removeAllRanges();
        selection.addRange(newRange);
      }
      return;
    } else {
      const newList = convertList(existingList, listType);
      const newRange = document.createRange();
      newRange.selectNodeContents(newList);
      newRange.collapse(false);
      selection.removeAllRanges();
      selection.addRange(newRange);
      return;
    }
  }

  // Build new list from selection
  if (range.collapsed) {
    const list = document.createElement(listType);
    const li = document.createElement('li');
    li.innerHTML = '<br>';
    list.appendChild(li);
    range.insertNode(list);
    const newRange = document.createRange();
    newRange.setStart(li, 0);
    newRange.collapse(true);
    selection.removeAllRanges();
    selection.addRange(newRange);
    return;
  }

  const contents = range.extractContents();
  const list = buildListFromFragment(listType, contents);
  range.insertNode(list);

  // Place caret at end of new list
  const newRange = document.createRange();
  newRange.selectNodeContents(list);
  newRange.collapse(false);
  selection.removeAllRanges();
  selection.addRange(newRange);
};