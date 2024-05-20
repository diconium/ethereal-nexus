import wretch from "wretch"
import { getConfig } from '../../utils/get-config';
import fs from 'node:fs';
import path from 'path';

const config = await getConfig()
const nexusApi = wretch(config?.url)
  .auth(`apikey ${config?.auth}`)

const publish = async (filePath: string) => {
  const form = new FormData();
  const buffer = fs.readFileSync(filePath);
  const blob = new Blob([buffer])
  const fileName = path.basename(filePath);

  form.append('file', blob, fileName);

  return await nexusApi
    .url("/api/v1/publish")
    .body(form)
    .post()
    .json()
}

export const nexus = {
  publish
}