import React from 'react';

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
  };
  className?: string;
}

const Parsys: React.FC<DynamicZoneProps> = ({ slot,className }) => {
  return (
    <>
      {slot && slot.childrenHtml &&  (
        <div className={className} dangerouslySetInnerHTML={{ __html: atob(slot.childrenHtml) }} />
        )
      }

      {/*{slot && slot.dataPath && slot.dataConfig && slot.childrenHtml && (*/}
      {/*  <div className="cq-Editable-dom cq-Editable-dom--container">*/}

      {/*    {slot.childrenHtml.map((child, index) => (*/}
      {/*        <div className={'section'} key={index} dangerouslySetInnerHTML={{ __html: atob(child) }} />*/}
      {/*      ),*/}
      {/*    )*/}
      {/*    }*/}
      {/*    <div className={'new section cq-Editable-dom'}>*/}
      {/*      <cq data-path={slot.dataPath} data-config={JSON.stringify(slot.dataConfig)}></cq>*/}
      {/*    </div>*/}
      {/*    {slot.dataPathContainer && slot.dataConfigContainer && (*/}
      {/*      <cq data-path={slot.dataPathContainer} data-config={JSON.stringify(slot.dataConfigContainer)}></cq>*/}
      {/*    )}*/}
      {/*  </div>*/}
      {/*)*/}
      {/*}*/}

    </>
  );
};

export default Parsys;