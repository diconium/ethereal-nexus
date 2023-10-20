import fs, { readdirSync } from "fs";
import { join } from "path";
import chalk from "chalk";
import { processComponents } from "../lib/UploadComponents.js";
import { askUserToCreateExampleConfigFile } from "../lib/UserQuestions.js";
import { validateConfig } from "../lib/ConfigFile.js";
import { CONFIG_FILENAME } from "../utils/Const.js";

const __dirname = process.cwd();
const folderPath = join(__dirname, "./src/components/ethereal-nexus");

function convertCamelCaseToSpaceCase(str) {
  return str
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1 $2");
}

function convertCamelCaseToDashCase(str) {
  return str.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
}

export async function publishCommand() {
  const configPath = join(__dirname, CONFIG_FILENAME); // Assuming config.json is in the parent directory
  try {
    const config = validateConfig(fs.readFileSync(configPath, "utf-8"));

    const componentDirectories = readdirSync(folderPath, {
      withFileTypes: true,
    })
      .filter((dirent) => dirent.isDirectory())
      .map((dirent) => dirent.name);

    const components = componentDirectories.reduce(
      (componentsSpec, componentName) => {
        const entryFilePath = join(folderPath, componentName, `index.ts`);
        if (!fs.existsSync(entryFilePath)) {
          console.error(
            chalk.red(
              `${componentName} do not have a corresponding ${entryFilePath}`,
            ),
          );
          return componentsSpec;
        }

        const jsonFilePath = join(
          folderPath,
          componentName,
          `${componentName}.author.json`,
        );
        let dialog;
        try {
          const authorJsonContent = fs.readFileSync(jsonFilePath, "utf8");
          dialog = JSON.parse(authorJsonContent).dialog;
        } catch (error) {
          console.error(error);
          console.error(
            chalk.red(`${componentName} do not have a valid ${jsonFilePath}`),
          );
          return componentsSpec;
        }

        const dashCaseName = convertCamelCaseToDashCase(componentName);
        const content = fs.readFileSync(entryFilePath, "utf8");

        const versionRegex = /\/\/version:\s*(\d+(?:\.\d+){2})/;
        const match = versionRegex.exec(content);
        const componentVersion = match ? match[1] : "0.0.1";

        componentsSpec.push({
          title: convertCamelCaseToSpaceCase(componentName),
          version: componentVersion,
          name: dashCaseName,
          dialog,
        });

        return componentsSpec;
      },
      [],
    );

    await processComponents({ config, components });
  } catch (error) {
    console.error(error);
    console.error(
      chalk.red(
        `There was an error with the configuration file.\nDo you have a remote-components.config.json on the root of your project?`,
      ),
    );
    askUserToCreateExampleConfigFile();
  }
}
