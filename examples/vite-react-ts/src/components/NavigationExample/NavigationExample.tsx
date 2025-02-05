import React from 'react';
import {
  component,
  dialog,
  text,
  navigation,
  NavigationItemSchema,
  type Output,
} from '@ethereal-nexus/core';

const dialogSchema = dialog({
  rootnav: navigation({
      label: 'Navigation Root',
      showChildrenCheckbox: true,
      showRootLevel: true,
      pageProperties: [{
          label: "subtitle",
          value: "subtitle",
      }],
      required: true,
      tooltip: 'The root page from which to build the navigation. Can be a blueprint master, language master or regular page.',
    }),
  navlabel: text({
      label: 'Navigation Label',
      placeholder: 'Navigation Label',
      tooltip: 'The label for the navigation item.',
    }),
})
  .tabs({
    Properties: {
      rootnav: true,
    },
    Accessibility: {
      navlabel: true,
    },
  });

const schema = component({ version: '0.0.10' }, dialogSchema);

type Props = Output<typeof schema>

export const NavigationExample: React.FC<Props> = ({rootnav}) => {

  const renderNavItems = (items: NavigationItemSchema[]) => {
    return (
      <ul>
        {items.map((item) => (
          <li key={item.id}>
            <a href={item.url} className={item.active ? 'active' : ''}>{item.title}</a>
            {item.children && item.children.length > 0 && renderNavItems(item.children)}
          </li>
        ))}
      </ul>
    );
  };

    return (
      <div>
        <h1>Navigation Example</h1>
        <p>This is a navigation example</p>
        <div>
          {renderNavItems(rootnav)}
        </div>
      </div>
    );
  };