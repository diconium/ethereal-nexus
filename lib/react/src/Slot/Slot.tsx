import React, { HTMLAttributes, useEffect, useRef } from 'react';

type SlotProps = HTMLAttributes<HTMLSlotElement> & {
  [key: string]: any; // Spreadable props for the slotted element
}

const CLASS_IN_EDIT_MODE = "cq-Editable-dom";

export const Slot: React.FC<SlotProps> = ({ name, ...props }) => {
  const slotRef = useRef<HTMLSlotElement>(null);

  useEffect(() => {
    const slot = slotRef.current;
    if (!slot) return;


    const applyProps = () => {
      const dynamicZone = slot.assignedElements();
      Array.from(dynamicZone[0].children)
        // workaround for cq-Editable-dom in AEM editor mode that generates a new div for the Editor components
        .map(el => el.classList.value.includes(CLASS_IN_EDIT_MODE) ? Array.from(el.children) : el)
        .flat()
        .filter(el => el.tagName.includes("-"))
        .forEach(el =>
          Object.keys(props)
            .forEach(key => {
                const value = typeof props[key] === 'object' ?
                  JSON.stringify(props[key]) :
                  props[key];
                el.setAttribute(key, value)
              }
            )
        )
    };

    const observeClassChanges = () => {
      const assignedNodes = slot.assignedElements();

      if (!assignedNodes?.length) return;

      const [firstNode] = assignedNodes;

      classObserver?.observe(firstNode, { attributes: true, attributeFilter: ["class"], subtree: true });
    };

    const classObserver = new MutationObserver((mutationsList) => {
      mutationsList.forEach(mutation =>  {
        if (mutation.type === "attributes"
          && mutation.attributeName === "class"
          && mutation.target instanceof Element
          && mutation.target.classList?.contains(CLASS_IN_EDIT_MODE)) {
            applyProps();
        }
      })
    });

    applyProps();
    observeClassChanges()

    return () => {
      classObserver.disconnect();
    };
  }, [props]);

  return <slot name={name} ref={slotRef}></slot>;
};
