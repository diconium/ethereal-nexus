// Utility for dialog DOM manipulation

/**
 * Sets min-width on the closest coral3-Dialog-wrapper ancestor of the given element.
 */
export function setDialogMinWidth(rootElement: HTMLElement | null) {
    if (!rootElement) return;
    let el: HTMLElement | null = rootElement;
    while (el && el.parentElement) {
        el = el.parentElement as HTMLElement;
        if (el.classList.contains('coral3-Dialog-wrapper')) {
            el.style.minWidth = '640px';
            el.style.maxWidth = '90vw';
            el.style.minHeight = '230px';
            el.style.maxHeight = '100vh';
            // Use setTimeout to apply centering after Coral's positioning
            setTimeout(() => {
                el!.style.position = 'fixed';
                el!.style.top = '50%';
                el!.style.left = '50%';
                el!.style.transform = 'translate(-50%, -50%)';
                el!.style.margin = '0';
            }, 0);
            break;
        }
    }
}
