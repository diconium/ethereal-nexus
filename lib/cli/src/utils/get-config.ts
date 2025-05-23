import path from "path"
import { cosmiconfig } from "cosmiconfig"
import { z } from "zod"
import { promises as fs } from 'fs'

export const DEFAULT_PATH = "./dist/.ethereal"

const explorer = cosmiconfig("ethereal");

export const configSchema = z
  .object({
    $schema: z.string().optional(),
    url: z.string(),
    auth: z.string().optional(),
    token: z.string().optional(),
    path: z.string().optional(),
    authType: z.enum(['keycloak']).optional(),
  })
  .strict()

export type Config = z.infer<typeof configSchema>

export async function getRawConfig(cwd: string): Promise<Config | null> {
  try {
    const configResult = await explorer.search(cwd)
    if (!configResult) {
      return null
    }

    return configSchema.parse(configResult.config)
  } catch (error) {
    console.error(error.message)
    throw new Error(`Invalid configuration found in ${cwd}/components.json.`)
  }
}

export async function resolveConfigPaths(cwd: string, config: Config) {
  const sourcePath = config.path ?? DEFAULT_PATH;
  return configSchema.parse({
    ...config,
    path: path.resolve(cwd, sourcePath),
  })
}

export async function getConfig() {
  const cwd = path.resolve(process.cwd())
  const config = await getRawConfig(cwd)

  if (!config) {
    return null
  }

  return await resolveConfigPaths(cwd, config)
}

export async function saveConfig(config: Config) {
  const cwd = path.resolve(process.cwd())
  const targetPath = path.resolve(cwd, ".etherealrc")
  await fs.writeFile(targetPath, JSON.stringify(config, null, 2), "utf8")
  return config
}
