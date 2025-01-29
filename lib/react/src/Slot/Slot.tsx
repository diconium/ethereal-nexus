import React, { HTMLAttributes, useEffect, useRef } from 'react';

type SlotProps = HTMLAttributes<HTMLSlotElement> & {
  [key: string]: any; // Spreadable props for the slotted element
}

export const Slot: React.FC<SlotProps> = ({ name, ...props }) => {
  const slotRef = useRef<HTMLSlotElement>(null);

  useEffect(() => {
    const slot = slotRef.current;
    if (!slot) return;

    const applyProps = () => {
      const dynamicZone = slot.assignedElements();
      Array.from(dynamicZone[0].children)
        // workaround for cq-Editable-dom in AEM editor mode that generates a new div for the Editor components
        .map(el => el.classList.value.includes("section") ? Array.from(el.children) : el)
        .flat()
        .filter(el => el.tagName.includes("-"))
        .forEach(el =>
            Object.keys(props)
              .forEach(key => el.setAttribute(key, JSON.stringify(props[key]))
          )
        )
    };

    slot.addEventListener("slotchange", applyProps);
    applyProps();

    return () => {
      slot.removeEventListener("slotchange", applyProps);
    };
  }, [props]);

  return <slot name={name} ref={slotRef}></slot>;
};
