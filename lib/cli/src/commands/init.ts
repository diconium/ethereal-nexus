import { existsSync, promises as fs } from 'fs';
import path from 'path';
import { Command } from 'commander';
import { logger } from '../utils/logger';
import chalk from 'chalk';
import { handleError } from '../utils/handle-error';
import ora from 'ora';
import inquirer from 'inquirer';
import { configSchema, DEFAULT_PATH } from '../utils/get-config';
import { z } from 'zod';

const initOptionsSchema = z.object({
  yes: z.boolean(),
});

export const init = new Command()
  .name("init")
  .description("initialize your project configuration")
  .option('-y, --yes', 'skip confirmation prompt.', false)
  .action(async (opts) => {
    try {
      const options = initOptionsSchema.parse(opts)
      const cwd = path.resolve(process.cwd())

      // Ensure target directory exists.
      if (!existsSync(cwd)) {
        logger.error(`The path ${cwd} does not exist. Please try again.`)
        process.exit(1)
      }

      await promptForConfig(cwd, options.yes)

      logger.info("")
      logger.info(
        `${chalk.green(
          "Success!"
        )} Project initialization completed. You may now create your components.`
      )
    } catch (error) {
      handleError(error)
    }
  })

export async function promptForConfig(
  cwd: string,
  skip: boolean,
) {
  const highlight = (text: string) => chalk.cyan(text)

  const options = await inquirer
    .prompt([{
      type: 'input',
      name: 'url',
      message: `What is your ${highlight('Nexus')} instance url?`
    },
      {
        type: 'password',
        name: 'auth',
        message: `What is your ${highlight('Nexus')} instance Api Key?`
      },
      {
        type: 'input',
        name: 'path',
        default: DEFAULT_PATH,
        message: `What is the path for your library output?`
      }
    ])

  const config = configSchema.parse({
    url: options.url,
    auth: options.auth,
    path: options.path,
  })

  if (!skip) {
    const { proceed } = await inquirer
      .prompt({
      type: "confirm",
      name: "proceed",
      message: `Write configuration to ${highlight(
        ".etherealrc"
      )}. Proceed?`,
      default: true,
    })

    if (!proceed) {
      process.exit(0)
    }
  }
  logger.info("")
  const spinner = ora(`Writing .etherealrc...`).start()
  const targetPath = path.resolve(cwd, ".etherealrc")
  await fs.writeFile(targetPath, JSON.stringify(config, null, 2), "utf8")
  spinner.succeed()
}
