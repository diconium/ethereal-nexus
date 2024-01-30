import fetch from 'node-fetch';
import { uploadAssets } from './UploadAssets.js';
import ora from 'ora';
import chalk from 'chalk';
import logSymbols from 'log-symbols';

const putComponentInRemoteComponentsAPI = async ({ config, element }) => {
  const requestOptions = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(element),
  };

  if (config.authorization) {
    requestOptions.headers.Authorization = config.authorization;
  }

  return await fetch(`${config.url}/api/v1/components`, requestOptions)
    .then((response) => {
      if (response.ok) {
        // console.log(`Updated component: ${JSON.stringify(element.name)} version: ${JSON.stringify(element.version)}`);
        return true;
      } else {
        console.error(
          `Updated component failed for: ${JSON.stringify(element.name)}`,
        );
        return false;
      }
    })
    .catch((error) => {
      console.error(
        `Error occurred while calling API for element: ${JSON.stringify(
          element,
        )}`,
      );
      return false;
    });
};

export const processComponents = async ({ config, components }) => {
  try {
    const spinner = ora('Uploading components...').start();

    await Promise.all(
      components.map(async (element, index) => {
        if (element.name && element.version) {
          await putComponentInRemoteComponentsAPI({ config, element }).then(
            async (success) => {
              spinner.text = `Uploading component ${element.name} [${
                index + 1
              }/${components.length}]`;

              if (success) {
                await uploadAssets({
                  config,
                  url: `${config.url}/api/v1/components/${element.name}/versions/${element.version}/assets/${element.name}`,
                  folderPath: `./dist/ethereal-nexus/${element.name}`,
                });
              } else {
                console.log('Skipping file upload due to previous failure.');
              }
            },
          );
        }
      }),
    );
    spinner.stopAndPersist({
      symbols: logSymbols.success,
      text: chalk.green(
        `Components uploaded [${components.length}/${components.length}]`,
      ),
    });
  } catch (error) {
    console.error(error);
  }
};
