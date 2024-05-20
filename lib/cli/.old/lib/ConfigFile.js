import chalk from "chalk";

export const validateConfig = (config) => {
    try {
        return JSON.parse(config)
    } catch (error) {
        console.error(chalk.red("There was an error with the content of the config file."))
    }
};