import { text } from '@ethereal-nexus/core';

export const titles = {
  title: text({
    required: true,
    label: 'Title',
    placeholder: 'Title'
  }),
  subtitle: text({
    label: 'Sub-Title',
    placeholder: 'Sub-Title'
  }),
};