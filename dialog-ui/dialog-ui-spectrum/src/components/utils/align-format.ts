import {RefObject} from "react";

const mapper: Record<string, string> = {
  'bold': 'strong',
  'italic': 'em',
  'underline': 'u',
};


export const toggleInlineStyle = (command: string, editorRef: RefObject<HTMLDivElement | null>) => {
  const selection = window.getSelection();

  if (!selection || !selection.rangeCount) return;

  const range = selection.getRangeAt(0);

  if (range.collapsed) {
    // If no text is selected, just focus the editor
    return;
  }

  const selectedText = range.toString();

  if (!selectedText) return;

  const targetTagName = mapper[command] || command;

  // Simple approach: Check if the current selection's start node has the formatting
  const startContainer = range.startContainer;
  const parentElement = startContainer.nodeType === Node.TEXT_NODE
    ? startContainer.parentElement
    : startContainer as Element;

  // Check if any parent element matches our target tag
  let isFormatted = false;
  let formattedElement: Element | null = null;
  let currentElement = parentElement;

  while (currentElement && currentElement !== editorRef.current) {
    if (currentElement.tagName && currentElement.tagName.toLowerCase() === targetTagName.toLowerCase()) {
      isFormatted = true;
      formattedElement = currentElement;
      break;
    }
    currentElement = currentElement.parentElement;
  }

  if (isFormatted && formattedElement) {
    // Remove formatting by unwrapping the element
    const parent = formattedElement.parentNode;
    if (parent) {
      while (formattedElement.firstChild) {
        parent.insertBefore(formattedElement.firstChild, formattedElement);
      }
      parent.removeChild(formattedElement);
    }
  } else {
    // Apply formatting
    const element = document.createElement(targetTagName);
    try {
      range.surroundContents(element);
    } catch (e) {
      // Fallback: extract contents, wrap in element, and insert back
      const contents = range.extractContents();
      element.appendChild(contents);
      range.insertNode(element);
    }
  }

  if (selection) {
    selection.removeAllRanges();
    // Create a new range at the end of the modified content
    const newRange = document.createRange();
    newRange.selectNodeContents(editorRef.current!);
    newRange.collapse(false);
    selection.addRange(newRange);
  }
};