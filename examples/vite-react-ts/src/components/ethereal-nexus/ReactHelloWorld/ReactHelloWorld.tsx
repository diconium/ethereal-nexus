import { webcomponent, dialog, text, type Output } from '@ethereal-nexus/core';
import React from 'react';

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
export const ReactHelloWorld: React.FC<Output<typeof schema>> = ({title, subtitle}) => {
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
ReactHelloWorld.displayName = 'ReactHelloWorld';
export default ReactHelloWorld

webcomponent(schema, ReactHelloWorld)