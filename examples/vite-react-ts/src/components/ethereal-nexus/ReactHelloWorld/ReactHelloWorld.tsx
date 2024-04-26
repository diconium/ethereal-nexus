import r2wc from '@r2wc/react-to-web-component';
import { dialog, text, type Output } from '@ethereal-nexus/core';

const schema = dialog({
  title: text({
    label: "Title",
    placeholder: "Title",
  }),
  subtitle: text({
    label: "Title",
    placeholder: "Title",
  })
});

//version: 1.0.2
const ReactHelloWorld = ({title, subtitle}: Output<typeof schema>) => {
    return (
        <div>
            My new text Hello World from react! v.1.0.9
            <div>Props:
                <ul>
                    <li>{title}</li>
                    <li>{subtitle}</li>
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
                subtitle: 'string',
            },
        }),
    );
}
