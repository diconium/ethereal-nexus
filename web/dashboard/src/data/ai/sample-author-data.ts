export const sampleAuthorDialogDefinition = {
  id: 'complex-dialog',
  title: 'Multifield Test Dialog',
  fields: [
    {
      type: 'tabs',
      id: 'tabs',
      name: 'tabs',
      label: 'Tabs',
      children: [
        {
          type: 'tab',
          id: 'tab_grouped',
          name: 'tab_grouped',
          label: 'Grouped',
          children: [
            {
              type: 'group',
              id: 'group',
              name: 'group',
              label: 'Group Label',
              tooltip: 'This is a tooltip for the whole group',
              children: [
                {
                  type: 'media',
                  id: 'media',
                  name: 'media',
                  label: 'Media',
                  allowedMimeTypes: ['application/pdf', 'application/zip'],
                },
                {
                  type: 'textfield',
                  id: 'grouptitle',
                  name: 'grouptitle',
                  label: 'Group Title',
                  placeholder: 'Group Title',
                },
                {
                  type: 'checkbox',
                  id: 'isadvanced',
                  name: 'isadvanced',
                  label: 'Advanced',
                },
                {
                  type: 'calendar',
                  id: 'event',
                  name: 'event',
                  label: 'Event Date',
                  placeholder: 'Choose a date',
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};

export const sampleAuthorValues = {
  group: {
    active: true,
    grouptitle: 'Grouped Title 1234',
    isadvanced: false,
  },
};
