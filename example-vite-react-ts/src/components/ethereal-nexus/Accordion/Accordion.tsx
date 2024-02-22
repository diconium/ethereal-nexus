import { FC } from 'react';
import r2wc from '@r2wc/react-to-web-component';
import {
  Accordion as ReactAccordion,
  AccordionItem,
} from '@szhsin/react-accordion';

interface AEMDialogItem {
  title: string;
  html: string;
}

interface Props {
  title: string;
  tabs: Array<AEMDialogItem>;
  datapath: string;
  dataconfig: string;
}

const AEMParsys = (props: { datapath: string; dataconfig: string }) => {
  const { datapath, dataconfig } = props;

  return (
    <div className={'new'}>
      {/*// @ts-ignore*/}
      <cq data-path={datapath} data-config={dataconfig}></cq>
    </div>
  );
};
const Accordion: FC<Props> = ({ title, tabs = [], datapath, dataconfig }) => {
  return (
    <div className="accordion-wrapper">
      <h1>{title}</h1>
      {/* `transitionTimeout` prop should be equal to the transition duration in CSS */}
      <ReactAccordion transition transitionTimeout={250}>
        {tabs.map((tab) => {
          return (
            <AccordionItem header={tab.title} initialEntered>
              <div dangerouslySetInnerHTML={{ __html: tab.html }} />
            </AccordionItem>
          );
        })}
      </ReactAccordion>
      {tabs.length == 0 && (
        <div className="new">
          <AEMParsys datapath={datapath} dataconfig={dataconfig}></AEMParsys>
        </div>
      )}
    </div>
  );
};

export default Accordion;

if (!window.customElements.get('accordion-component')) {
  customElements.define(
    'accordion-component',
    r2wc(Accordion, {
      props: {
        datapath: 'string',
        dataconfig: 'string',
        tabs: 'json',
      },
    }),
  );
}
