import {FC} from 'react';
import r2wc from "@r2wc/react-to-web-component"

interface Props {
    productId: string;
}

const ProductTeaser: FC<Props> = ({productId}) => {
    return (
        <div>{productId}</div>
    );
};

export default ProductTeaser;

if (!window.customElements.get('wknd-article')) {
    customElements.define("wknd-article", r2wc(ProductTeaser, {
        props: {
            productId: "string",
        }
    }))
}