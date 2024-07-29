import React from "react";

declare global {
  namespace JSX {
    interface IntrinsicElements {
      cq: React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    }
  }
}

interface DynamicZoneProps {
  slot?: {
    childrenHtml?: string;
    dataPath?: string;
    dataConfig?: any;
  };
}

const Parsys: React.FC<DynamicZoneProps> = ({ slot }) => {
  return (
    <>
      {slot && slot.childrenHtml && (
        <div className={'new'}>
          <div dangerouslySetInnerHTML={{ __html: atob(slot.childrenHtml) }} />
        </div>
      )}
      {slot && slot.dataPath && slot.dataConfig && (
        <div className={'new'}>
          <cq data-path={slot.dataPath} data-config={JSON.stringify(slot.dataConfig)}></cq>
        </div>
      )}
    </>
  );
};

export default Parsys;