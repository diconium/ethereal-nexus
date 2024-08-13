import { hidden, image, multifield, object, optional, pathbrowser, rte, text } from '@ethereal-nexus/core';

export const entries = {
  title: text({
    label: 'Title',
    placeholder: 'Title'
  }),
  subtitle: text({
    label: 'Sub-Title',
    placeholder: 'Sub-Title'
  }),
  image: image({
    label: 'Image',
    placeholder: 'Some Image'
  }),
  imagetwo: image({
    label: 'Image 2',
    placeholder: 'Some 2nd Image',
    tooltip: 'This is the second image'
  }),
  datetime: optional(
    hidden({
      type: 'string'
    })
  ),
  rich: rte({
    label: 'This is a RTE',
    placeholder: 'Place any text here'
  }),
  banners: multifield({
    label: 'Banners',
    children: object({
      title: text({
        label: 'Title',
        placeholder: 'Title'
      }),
      link: pathbrowser({
        label: 'Link',
        placeholder: 'Link'
      })
    })
  })
};