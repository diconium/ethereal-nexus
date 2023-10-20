import {FC} from 'react';
import r2wc from "@r2wc/react-to-web-component"

//version: 1.0.0
export interface Props {
    // AEMType: textfield
    // AEMPlaceholder: Type your name
    // AEMDescription: Name
    name: string;
    // AEMType: image
    // AEMPlaceholder: Choose an Image
    // AEMDescription: Please select an Image
    image: string;
    // AEMType: pathbrowser
    // AEMPlaceholder: Choose Page
    // AEMDescription: Please choose an url.
    url: string;
}

const MyComponent: FC<Props> = ({name, image, url}) => {
    return (
        <div>
            <h1>Hello, {name}!</h1>
            <img src={image} style={{maxWidth: '100%', height: 'auto'}}></img>
            <a href={url}>Profile</a>
        </div>
    );
};

export default MyComponent;

if (!window.customElements.get('my-component')) {
    customElements.define("my-component", r2wc(MyComponent, {
        props: {
            name: "string",
            image: "string",
            url: "string"
        }
    }))
}