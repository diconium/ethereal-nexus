import { RefObject } from 'react';

function getSelectionRange(): Range | null {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return null;
  return sel.getRangeAt(0);
}

function findListItem(node: Node | null): HTMLLIElement | null {
  while (node) {
    if (node instanceof HTMLLIElement) return node;
    node = node.parentNode;
  }
  return null;
}

function retainSelectionOnNodes(nodes: HTMLElement[]) {
  if (!nodes.length) return;
  const sel = window.getSelection();
  if (!sel) return;
  sel.removeAllRanges();
  const r = document.createRange();
  r.setStartBefore(nodes[0]);
  r.setEndAfter(nodes[nodes.length - 1]);
  sel.addRange(r);
}

function getSelectedListItems(editorRef: RefObject<HTMLDivElement | null>): HTMLLIElement[] {
  const range = getSelectionRange();
  if (!range || !editorRef.current) return [];
  if (!editorRef.current.contains(range.commonAncestorContainer)) return [];
  const allLis = Array.from(editorRef.current.querySelectorAll('li')) as HTMLLIElement[];
  const raw = allLis.filter(li => range.intersectsNode(li));
  if (raw.length <= 1) return raw; // single selection case
  // Compute depth (number of ancestor LIs) for each li
  const depthMap = new Map<HTMLLIElement, number>();
  raw.forEach(li => {
    let depth = 0; let p: Node | null = li.parentNode;
    while (p) {
      if (p instanceof HTMLLIElement) depth++;
      p = p.parentNode;
    }
    depthMap.set(li, depth);
  });
  const maxDepth = Math.max(...Array.from(depthMap.values()));
  // Keep only deepest items to avoid selecting ancestor containers implicitly
  return raw.filter(li => depthMap.get(li) === maxDepth);
}

function groupByParentList(items: HTMLLIElement[]): Map<Element, HTMLLIElement[]> {
  const map = new Map<Element, HTMLLIElement[]>();
  items.forEach(li => {
    const parent = li.parentElement; // ul/ol
    if (!parent) return;
    if (!map.has(parent)) map.set(parent, []);
    map.get(parent)!.push(li);
  });
  // Ensure order preserved
  for (const [, arr] of map.entries()) {
    arr.sort((a, b) => {
      if (a === b) return 0;
      return a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
    });
  }
  return map;
}

export function indentIncrease(editorRef: RefObject<HTMLDivElement | null>) {
  const selectedItems = getSelectedListItems(editorRef);
  if (selectedItems.length === 0) return;

  // If only one item fallback to previous logic
  const groups = groupByParentList(selectedItems);
  const moved: HTMLLIElement[] = [];

  for (const [, lis] of groups.entries()) {
    // Process contiguous blocks: slice by gaps in previousElementSibling chain
    let block: HTMLLIElement[] = [];
    const flush = () => {
      if (!block.length) return;
      const first = block[0];
      const prevLi = first.previousElementSibling as HTMLLIElement | null;
      if (!prevLi) { block = []; return; } // cannot indent first item in list
      const parentList = first.parentElement!;
      const listType = parentList.tagName.toLowerCase();
      let subList = Array.from(prevLi.children).find(ch => ch.tagName && ch.tagName.toLowerCase() === listType) as (HTMLUListElement | HTMLOListElement | undefined);
      if (!subList) {
        subList = document.createElement(listType) as (HTMLUListElement | HTMLOListElement);
        prevLi.appendChild(subList);
      }
      block.forEach(li => {
        subList!.appendChild(li);
        moved.push(li);
      });
      block = [];
    };

    for (let i = 0; i < lis.length; i++) {
      const li = lis[i];
      if (block.length === 0) {
        block.push(li);
      } else {
        const prev = block[block.length - 1];
        if (prev.nextElementSibling === li) {
          block.push(li);
        } else {
          flush();
          block.push(li);
        }
      }
    }
    flush();
  }

  retainSelectionOnNodes(moved);
}

export function indentDecrease(editorRef: RefObject<HTMLDivElement | null>) {
  const selectedItems = getSelectedListItems(editorRef);
  if (selectedItems.length === 0) return;
  const groups = groupByParentList(selectedItems);
  const moved: HTMLLIElement[] = [];

  for (const [parentList, lis] of groups.entries()) {
    // parentList is ul/ol; its parent may be LI (nested) or other
    const parentLi = findListItem(parentList.parentElement);
    if (!parentLi) continue; // can't outdent top-level group
    const outerList = parentLi.parentElement as (HTMLUListElement | HTMLOListElement | null);
    if (!outerList) continue;

    // Maintain original order
    lis.sort((a, b) => {
      if (a === b) return 0;
      return a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
    });

    lis.forEach(li => {
      outerList.insertBefore(li, parentLi.nextSibling);
      moved.push(li);
    });

    // Remove empty sublist if no items remain
    if (parentList.children.length === 0) {
      parentList.remove();
    }
  }

  retainSelectionOnNodes(moved);
}
