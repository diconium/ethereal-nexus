import {FC} from 'react';
import r2wc from "@r2wc/react-to-web-component"
import {Accordion, AccordionItem} from '@szhsin/react-accordion';

interface AEMDialogItem {
    title: string,
    html: string,
}

//version: 0.0.1
interface Props {
    title: string,
    tabs: Array<AEMDialogItem>,
    datapath: string,
    dataconfig: string,
}

const AEMParsys = (props: { datapath: string, dataconfig: string }) => {
    const {datapath, dataconfig} = props;

    return (
        <div className={"new"}>
            {/*// @ts-ignore*/}
            <cq data-path={datapath} data-config={dataconfig}></cq>
        </div>
    );
};
const AccordionComponent: FC<Props> = ({title, tabs = [], datapath, dataconfig}) => {
    console.log(tabs)
    return (
        <div className="accordion-wrapper">
            <h1>{title}</h1>
            {/* `transitionTimeout` prop should be equal to the transition duration in CSS */}
            <Accordion transition transitionTimeout={250}>
                {tabs.map((tab) => {
                    console.log(tab);
                    console.log(tab.title);
                    return (
                        <AccordionItem header={tab.title} initialEntered>
                            <div dangerouslySetInnerHTML={{__html: tab.html}}/>
                        </AccordionItem>
                    )
                })}

            </Accordion>
            {tabs.length == 0 && (
                <div className="new">
                    <AEMParsys datapath={datapath} dataconfig={dataconfig}></AEMParsys>
                </div>
            )}
        </div>
    );
};

export default AccordionComponent;

if (!window.customElements.get('accordion-component')) {
    customElements.define("accordion-component", r2wc(AccordionComponent, {
        props: {
            datapath: "string",
            dataconfig: "string",
            tabs: "json"
        }
    }))
}