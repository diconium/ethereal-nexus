import path from 'path';
import chalk from 'chalk';
import { existsSync, readdirSync } from 'node:fs';
import { Command } from 'commander';
import { z } from 'zod';
import { handleError } from '../utils/handle-error';
import { logger } from '../utils/logger';
import { getConfig } from '../utils/get-config';
import { getTarExcludeList, ignoreCommonFiles } from '../utils/get-tar-exclude-list';
import { createTar } from '../utils/create-tar';
import ora from 'ora';
import { nexus } from '../lib/services/nexus';

const addOptionsSchema = z.object({
  components: z.array(z.string()).optional(),
  yes: z.boolean(),
  overwrite: z.boolean(),
  all: z.boolean(),
  path: z.string().optional()
});

export const publish = new Command()
  .name('publish')
  .description('publish a component to your project')
  .argument('[components...]', 'the components to add')
  .option('-y, --yes', 'skip confirmation prompt.', false)
  .option('-o, --overwrite', 'overwrite existing versions.', false)
  .option('-a, --all', 'add all available components', false)
  .option('-p, --path <path>', 'the path to .ethereal folder where the component are.')
  .action(async (components, opts) => {
    try {
      const options = addOptionsSchema.parse({
        components,
        ...opts
      });
      if (!options.all && !options.components?.length) {
        logger.warn(
          `Either [components...] or --all need to be passed.`
        );
        process.exit(1);
      }

      const config = await getConfig();
      if (!config) {
        logger.warn(
          `Configuration is missing. Please run ${chalk.green(
            `'init'`
          )} to create an .ethereal file.`
        );
        process.exit(1);
      }

      const distPath = config?.path;
      if (!distPath || !existsSync(distPath)) {
        logger.error(`The path ${distPath} does not exist. Please try again.`);
        process.exit(1);
      }

      const selectedComponents = options.all
        ? readdirSync(distPath).filter(folder => !ignoreCommonFiles.includes(folder))
        : options.components!;

      const componentPaths = selectedComponents.map(folder => path.resolve(distPath, folder));
      const excludeList = getTarExcludeList();
      const spinner = ora({
        discardStdin: false,
        text: `${chalk.green('Taring files...\n')}`
      }).start();
      for (const folder of componentPaths) {
        spinner.text = `Taring ${folder}...\n`;
        createTar(folder, excludeList);
        spinner.stopAndPersist({
          text: folder,
          symbol: chalk.green('✔')
        });
      }

      spinner.start(`Publishing...\n`);
      for (const folder of componentPaths) {
        spinner.text = `Publishing ${folder}...\n`;
        const tar = `${folder}/ethereal_nexus.tar.gz`;
        try {
          await nexus.publish(tar);
        } catch (e) {
          logger.error(`Failed to publish ${tar}.`, e);
          process.exit(1);
        }

        spinner.stopAndPersist({
          text: folder,
          symbol: chalk.green('✔')
        });
      }
      spinner.stop();

      spinner.succeed(`Done.`);
    } catch (error) {
      handleError(error);
    }
  });
