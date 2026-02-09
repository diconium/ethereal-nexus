import {RefObject, useEffect, useState} from "react";
import {debounce} from "@/components/utils/debounce.ts";


export const useLinkEditor = (editorRef: RefObject<HTMLDivElement | null>, handleContentChange: () => void, isLinkEnabled: boolean) => {
  // Link state
  const [link, setLink] = useState<{  href?: string; alt?: string; target?: '_self' | '_blank'}>({ target: "_self"});

  const [linkHighlightEl, setLinkHighlightEl] = useState<HTMLSpanElement | null>(null);

  // Remove ALL temporary highlight spans (multiple selections) and anchor highlight styling
  const removeAllTempHighlights = () => {
    if (!editorRef.current) return;
    // Remove span highlights
    editorRef.current.querySelectorAll('[data-rte-link-highlight]')
      .forEach(el => {
        const span = el as HTMLElement;
        if (span instanceof HTMLAnchorElement && span.dataset.rteLinkActive === 'true') {
          // Anchor highlight: just strip dataset markers
          delete span.dataset.rteLinkActive;
          span.style.backgroundColor = '';
          span.style.outline = '';
          span.style.borderRadius = '';
        } else {
          while (span.firstChild) span.parentNode?.insertBefore(span.firstChild, span);
          span.parentNode?.removeChild(span);
        }
      });
    setLinkHighlightEl(null);
  };

  const clearLinkHighlight = () => {
    removeAllTempHighlights();
  };

  const applyAnchorHighlight = (anchor: HTMLAnchorElement) => {
    anchor.dataset.rteLinkActive = 'true';
  };

  const highlightSelectionForLink = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || !editorRef.current) return;
    // Use last non-collapsed range if multiple (e.g. multi-select)
    let targetRange: Range | null = null;

    for (let i = selection.rangeCount - 1; i >= 0; i--) {
      const r = selection.getRangeAt(i);
      if (!r.collapsed) { targetRange = r; break; }
    }
    if (!targetRange) return;
    if (!editorRef.current.contains(targetRange.commonAncestorContainer)) return;
    // Remove all existing temporary highlights first
    removeAllTempHighlights();

    const span = document.createElement('span');
    span.setAttribute('data-rte-link-highlight', 'true');
    span.style.backgroundColor = 'rgba(20,115,230,0.25)';
    span.style.outline = '1px solid var(--spectrum-global-color-blue-400)';
    span.style.borderRadius = '2px';
    try {
      targetRange.surroundContents(span);
    } catch {
      const contents = targetRange.extractContents();
      span.appendChild(contents);
      targetRange.insertNode(span);
    }
    setLinkHighlightEl(span);
    // Reselect span contents (single highlight)
    selection.removeAllRanges();
    const afterRange = document.createRange();
    afterRange.selectNodeContents(span);
    afterRange.collapse(false);
    selection.addRange(afterRange);
  };

  const addElement = (anchor: HTMLAnchorElement) => {
    const { href, alt = '', target = '_self'  } = link;

    if (href != null) {
      anchor.href = href;
    }
    anchor.title = alt;
    anchor.setAttribute('aria-label', alt);
    anchor.target = target;

    if (target === '_blank') {
      anchor.rel = 'noopener noreferrer';
    } else {
      anchor.removeAttribute('rel');
    }
  }

  const createLink = () => {
    const { href } = link;
    if (!href) return;

    // Update existing anchor if highlighted
    if (linkHighlightEl instanceof HTMLAnchorElement) {
      addElement(linkHighlightEl);
      handleContentChange();
      return;
    }

    // If we have a highlighted span, convert it directly into an anchor
    if (linkHighlightEl) {
      const anchor = document.createElement('a');
      addElement(anchor);

      while (linkHighlightEl.firstChild) {
        anchor.appendChild(linkHighlightEl.firstChild);
      }

      linkHighlightEl.replaceWith(anchor);
      setLinkHighlightEl(null);
      setLink({ target: "_self", alt: '', href: undefined });
      handleContentChange();
      return;
    }
  };

  const removeLink = () => {
    // Also clear highlight if present
    clearLinkHighlight();
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || !editorRef.current) return;
    const range = selection.getRangeAt(0);
    let currentNode: Node | null = range.startContainer;
    let anchor: HTMLAnchorElement | null = null;
    while (currentNode && currentNode !== editorRef.current) {
      if (currentNode instanceof HTMLAnchorElement) {
        anchor = currentNode;
        break;
      }
      currentNode = currentNode.parentNode;
    }
    if (!anchor || !anchor.parentNode) return;
    const parent = anchor.parentNode;
    while (anchor.firstChild) parent.insertBefore(anchor.firstChild, anchor);
    parent.removeChild(anchor);
    handleContentChange();
  };


  useEffect(() => {
    if (!isLinkEnabled) {
      // On exit remove any temp highlights
      removeAllTempHighlights();
      return;
    }

    const findAnchorAncestor = (node: Node | null): HTMLAnchorElement | null => {
      while (node && node !== editorRef.current) {
        if (node instanceof HTMLAnchorElement) return node;
        node = node.parentNode;
      }
      return null;
    };

    const handleSelectionChange = debounce(() => {
      if (!editorRef.current) return;
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return;
      const range = sel.getRangeAt(0);
      if (!editorRef.current.contains(range.commonAncestorContainer)) return; // outside editor
      const selectedText = sel.toString();

      // Detect existing anchor wrapping entire selection (start & end inside same anchor)
      const startAnchor = findAnchorAncestor(range.startContainer);
      const endAnchor = findAnchorAncestor(range.endContainer);
      if (startAnchor && startAnchor === endAnchor) {
        // Populate link state
        setLink({
          href: startAnchor.getAttribute('href') || undefined,
          alt: startAnchor.getAttribute('title') || undefined,
          target: (startAnchor.getAttribute('target') as '_self' | '_blank') || '_self'
        });
        // Highlight entire anchor (even for collapsed selection)

        applyAnchorHighlight(startAnchor);
        setLinkHighlightEl(startAnchor as any);
        return; // anchor context handled
      }

      if (!selectedText) return; // ignore collapsed selection outside anchors

      // Populate link state from existing anchor attributes
      if (startAnchor && startAnchor === endAnchor) {
        setLink({
          href: startAnchor.getAttribute('href') || undefined,
          alt: startAnchor.getAttribute('title')|| undefined,
          target: (startAnchor.getAttribute('target') as '_self' | '_blank') || '_self'
        });
        // If selection is inside anchor we skip highlighting (user is editing existing link text)
        // Allow re-highlighting only if user selects text outside anchor afterwards
        if (!selectedText) {
          clearLinkHighlight();
          return;
        }
        // We still allow highlighting of a different selection inside same anchor to apply alt/target changes
      }


      // If current highlight already matches selection, do nothing
      if (linkHighlightEl) {
        const r = document.createRange();
        r.selectNodeContents(linkHighlightEl);
        if (linkHighlightEl.contains(range.startContainer) && r.toString() === selectedText) {
          return;
        }
        // Different selection -> clear previous highlight
        clearLinkHighlight();
      }
      // Apply new highlight (only if selection not fully inside existing anchor)
      if (!(startAnchor && startAnchor === endAnchor)) {
        // highlight even for single-word drag selections
        highlightSelectionForLink();
      }
    }, 50);

    document.addEventListener('selectionchange', handleSelectionChange);
    if (editorRef.current) {
      editorRef.current.addEventListener('mouseup', handleSelectionChange);
      editorRef.current.addEventListener('keyup', handleSelectionChange);
    }
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
      if (editorRef.current) {
        editorRef.current.removeEventListener('mouseup', handleSelectionChange);
        editorRef.current.removeEventListener('keyup', handleSelectionChange);
      }
    };
  }, [isLinkEnabled, linkHighlightEl, clearLinkHighlight, highlightSelectionForLink, setLink]);




  return { link, setLink, removeLink, clearLinkHighlight, highlightSelectionForLink, linkHighlightEl, createLink }
}