import child_process from 'node:child_process';

export function createTar(folder: string, excludeList: string) {
  child_process.execSync(`tar -czvf ${folder}/ethereal_nexus.tar.gz --exclude=${excludeList} -C ${folder} .`, {stdio : 'pipe' });
}