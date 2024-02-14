import readline from "readline";
import chalk from "chalk";
import fs from "fs";

export function askUserToCreateExampleConfigFile() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    rl.question(chalk.yellow('Config file does not exist. Do you want to create it? [Y/n]: '), (answer) => {
        function createConfigFile() {
            const defaultConfig = {
                url: 'https://example.com/',
                authorization: 'apikey <YOUR_NEXUS_API_KEY_HERE>'
            };
            fs.writeFileSync('./remote-components.config.json', JSON.stringify(defaultConfig, null, 4), 'utf-8');
            console.log(chalk.green('Config file created. Please edit with the correct parameters'));
        }

        if (answer.trim().toLowerCase() === 'y') {
            createConfigFile();
        } else {
            console.log('Config file not created. Exiting.');
        }
        rl.close();
    });
}