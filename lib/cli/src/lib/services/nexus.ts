import wretch from "wretch"
import { getConfig } from '../../utils/get-config';
import fs from 'node:fs';
import path from 'path';

const config = await getConfig()
let nexusApi = wretch(config?.url)

// If authType is keycloak and token exists, set the cookie
if (config?.authType === 'keycloak' && config?.token) {
  // Determine if the URL is using HTTPS
  const isHttps = config?.url?.startsWith('https://');

  // Set the appropriate cookie name based on the protocol
  const cookieName = isHttps ? '__Secure-authjs.session-token' : 'authjs.session-token';

  nexusApi = nexusApi.headers({
    'Cookie': `${cookieName}=${config.token}; Secure; HttpOnly; SameSite=Strict`
  })
}

nexusApi = nexusApi.auth(`apikey ${config?.auth}`)


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
    .error(409, (error) => 409)
    .json()
}

export const nexus = {
  publish
}
