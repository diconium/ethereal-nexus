import {FC} from 'react';
import r2wc from "@r2wc/react-to-web-component"

interface Props {
    // AEMType: textfield
    // AEMPlaceholder: Type your name
    // AEMDescription: Name
    title: string;
    // AEMType: textfield
    // AEMPlaceholder: Type your description
    // AEMDescription: Description
    description: string;
    // AEMType: image
    // AEMPlaceholder: Choose an Image
    // AEMDescription: Please select an Image
    imageurl: string;
    // AEMType: textfield
    // AEMPlaceholder: Choose an Image Alt text
    // AEMDescription: Alt text
    imageAlt: string;
    // AEMType: pathbrowser
    // AEMPlaceholder: Choose Page
    // AEMDescription: Please choose an url.
    url: string;
}

const WKNDArticle: FC<Props> = ({title, description, imageurl, imageAlt, url}) => {
    return (
        <ul className={"cmp-image-list"}>
            <article className={"cmp-image-list__item-content"}>
                <a className={"cmp-image-list__item-image-link"} href={url + ".html"}>
                    <div className={"cmp-image-list__item-image"}>
                        <img className={"cmp-image__image"} src={imageurl} alt={imageAlt}/>
                    </div>
                </a>
                <a className={"cmp-image-list__item-title-link"}>
                <span className={"cmp-image-list__item-title"}>
                    {title}
                </span>
                </a>
                <span className={"cmp-image-list__item-description"}>
                    <p>{description}</p>
                </span>
            </article>
        </ul>
    );
};

export default WKNDArticle;

if (!window.customElements.get('wknd-article')) {
    customElements.define("wknd-article", r2wc(WKNDArticle, {
        props: {
            title: "string",
            description: "string",
            imageurl: "string",
            imageAlt: "string",
            url: "string",
        }
    }))
}