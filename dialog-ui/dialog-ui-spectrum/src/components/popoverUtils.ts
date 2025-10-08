// Utility for handling popover isolation CSS

export function handleIsolationCSS(isOpen: boolean) {
    function fixDropdownsItemsStyling(popover: HTMLElement | null) {
        // Fix the styling issues the specific element and its siblings
        if (popover) {
            const targetElement = popover.querySelector('div:nth-child(2) > div > div:first-child');

            if (targetElement) {
                console.log('Target element found:', targetElement);

                // Get all siblings (including the target element itself)
                const parent = targetElement.parentElement;
                if (parent) {
                    const siblings = Array.from(parent.children);
                    siblings.forEach((sibling) => {
                        // Look inside each sibling for child elements
                        const childElements = Array.from(sibling.children);
                        if (childElements.length > 0) {
                            childElements.forEach((child) => {

                                // Check for div > div > span structure
                                const firstDiv = child.querySelector('div');
                                if (firstDiv) {
                                    const secondDiv = firstDiv.querySelector('div');
                                    if (secondDiv) {
                                        // Check if the second div has display: grid
                                        const computedStyle = window.getComputedStyle(secondDiv);
                                        const inlineStyle = (secondDiv as HTMLElement).style.display;

                                        if (computedStyle.display === 'grid' || inlineStyle === 'grid') {
                                            console.log(`      Second div has display: grid`);

                                            // Add padding to the grid div
                                            (secondDiv as HTMLElement).style.paddingLeft = '8px';
                                            (secondDiv as HTMLElement).style.paddingRight = '8px';

                                            // Find span elements within this second div
                                            const spans = secondDiv.querySelectorAll('span');
                                            spans.forEach((span) => {
                                                (span as HTMLElement).style.gridColumnStart = '1';

                                                // Check if the span has a sibling SVG
                                                const parent = span.parentElement;
                                                if (parent) {
                                                    const siblingSvg = parent.querySelector('svg');
                                                    if (siblingSvg && siblingSvg !== span as any) {
                                                        (siblingSvg as unknown as HTMLElement).style.gridColumn = 'end';
                                                    }
                                                }
                                            });
                                        }
                                    }
                                }
                            });
                        }
                    });
                }
            }
        }
    }

    if (isOpen) {
        // Wait for DOM update (popover might not be present immediately)
        setTimeout(() => {
            const popover = document.querySelector('[data-testid="popover"]') as HTMLElement | null;
            if (popover && popover.parentElement && popover.parentElement.parentElement) {
                popover.style.maxWidth = "453px";
                const targetParent = popover.parentElement.parentElement as HTMLElement;
                if (targetParent.style && targetParent.style.isolation === 'isolate') {
                    targetParent.style.isolation = '';
                }
            }

            fixDropdownsItemsStyling(popover);
        }, 0);
    }
}
