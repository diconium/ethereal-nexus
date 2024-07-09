import { create } from 'tar'

export function createTar(folder: string, excludeList: string) {
  console.log(folder)
  return create(
    {
      gzip: true,
      file: `${folder}/ethereal_nexus.tar.gz`,
      excludeList: excludeList,
      cwd: `${folder}/`,
      sync: true,
    },
    ['.']
  )
}