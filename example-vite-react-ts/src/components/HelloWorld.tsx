{/*// @ts-ignore*/}
interface Props {
    // AEMType: textfield
    // AEMPlaceholder: Type your name
    // AEMDescription: Name
    title: string;
    // AEMType: textfield
    // AEMPlaceholder: Alternative Backgound ?
    // AEMDescription: Alternative Background
    alternativeBackground: boolean;
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

const HelloWorld = ({title = "default title for Hello world Component", alternativebackground = false, datapath = "", dataconfig = "", children = {parsys: ""}}) => {

    {/*// @ts-ignore*/}
    return <div style={{'background-color':alternativebackground?'orange':'slateblue'}}>
            <h1>{title}</h1>
            <h2>{alternativebackground}</h2>
            {/*// @ts-ignore*/}
            <div dangerouslySetInnerHTML={{__html: children.parsys}}/>
            <div className="new">
                <AEMParsys datapath={datapath} dataconfig={dataconfig}></AEMParsys>
            </div>
        </div>;
};

export default HelloWorld;

import r2wc from "@r2wc/react-to-web-component"

if (!window.customElements.get('hello-world')) {
    customElements.define("hello-world", r2wc(HelloWorld, {
        props: {
            title: "string",
            alternativebackground: "boolean",
            datapath: "string",
            dataconfig: "string",
            children: "json"
        }
    }))
}