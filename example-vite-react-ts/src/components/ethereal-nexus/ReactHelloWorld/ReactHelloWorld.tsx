import r2wc from '@r2wc/react-to-web-component';
//version: 1.0.2
const ReactHelloWorld = ({title = "default prop"}) => {
    return (
        <div>
            My new text Hello World from react! v.1.0.2
            <div>Props:
                <ul>
                    <li>{title}</li>
                </ul>
            </div>
        </div>
    );
};

export default ReactHelloWorld;

if (!window.customElements.get('react-hello-world')) {
    customElements.define(
        'react-hello-world',
        r2wc(ReactHelloWorld, {
            props: {
                title: 'string',
            },
        }),
    );
}
