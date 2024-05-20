import path from "path"
import { cosmiconfig } from "cosmiconfig"
import { z } from "zod"

export const DEFAULT_PATH = "./dist/.ethereal"

const explorer = cosmiconfig("ethereal");

const configSchema = z
  .object({
    $schema: z.string().optional(),
    url: z.string(),
    auth: z.string(),
    path: z.string().optional()
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
