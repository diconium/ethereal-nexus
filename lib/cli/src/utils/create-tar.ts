import { create } from 'tar'
import { minimatch } from 'minimatch'

export function createTar(folder: string, excludeList: string[]) {
  console.log(folder)
  return create(
    {
      gzip: true,
      file: `${folder}/ethereal_nexus.tar.gz`,
      filter: (path) => {
        for (const exclude of excludeList) {
          if (minimatch(path, exclude)) {
            return false
          }
        }
        return true
      },
      cwd: `${folder}/`,
      sync: true,
    },
    ['.']
  )
}