import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import {processComponents} from "../lib/UploadComponents.js";
import {askUserToCreateExampleConfigFile} from "../lib/UserQuestions.js";
import {validateConfig} from "../lib/ConfigFile.js";
import {CONFIG_FILENAME} from "../utils/Const.js";

const __dirname = process.cwd();
console.log(__dirname)
const folderPath = path.join(__dirname, './src/components');

function convertCamelCaseToSpaceCase(str) {
    return str
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/([A-Z])([A-Z][a-z])/g, '$1 $2')
}

function convertCamelCaseToDashCase(str) {
    return str
        .replace(/([a-z])([A-Z])/g, '$1-$2')
        .toLowerCase()
}


export function publishCommand() {
    const configPath = path.join(__dirname, CONFIG_FILENAME); // Assuming config.json is in the parent directory
    try {

        const config = validateConfig(fs.readFileSync(configPath, 'utf-8'));

        fs.readdir(folderPath, async (err, files) => {
            if (err) {
                console.error('Error reading directory:', err);
                return;
            }

            const components = files
                .filter(file => file.endsWith('.tsx') || file.endsWith('.ts'))
                .filter(file => {
                    const jsonFile = file.replace(/\.(tsx|ts)$/, '.json');
                    try {
                        const dialogJSON = fs.readFileSync(path.join(folderPath, jsonFile), 'utf8');
                        return JSON.parse(dialogJSON).dialog;
                    } catch (error) {
                        console.error(chalk.red(`${file} do not have a corresponding ${jsonFile}`));
                        return false;
                    }
                })
                .map(file => {
                    const {name} = path.parse(file);
                    const dashCaseName = convertCamelCaseToDashCase(name);
                    const filePath = path.join(folderPath, file);
                    const content = fs.readFileSync(filePath, 'utf8');

                    const versionRegex = /\/\/version:\s*(\d+(?:\.\d+){2})/;
                    const match = versionRegex.exec(content);
                    const componentVersion = match ? match[1] : '0.0.1';

                    const jsonFile = file.replace(/\.(tsx|ts)$/, '.json');
                    try {
                        const dialogJSON = fs.readFileSync(path.join(folderPath, jsonFile), 'utf8');
                        return {
                            title: convertCamelCaseToSpaceCase(name),
                            version: componentVersion,
                            name: dashCaseName,
                            dialog: JSON.parse(dialogJSON).dialog,
                        };

                    } catch (error) {
                        console.error(chalk.red(`${file} do not have a corresponding ${jsonFile}`));
                        return {};
                    }

                });


            await processComponents({config, components});


        });
    } catch (error) {
        console.error(chalk.red(`There was an error with the configuration file.\nDo you have a remote-components.config.json on the root of your project?`))
        askUserToCreateExampleConfigFile();
    }

}