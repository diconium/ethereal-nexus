import fs from 'fs';
import fetch from 'node-fetch';
import path from 'path';
import ora from "ora";

export async function uploadAssets({config, url, folderPath}) {
    const getContentTypeByExtension = (fileName) => {
        const extension = path.extname(fileName).toLowerCase()

        switch (extension) {
            case '.js':
                return 'text/javascript';
            case '.css':
                return 'text/css';
            default:
                return 'text/javascript'; // Default content type
        }
    };
    try {
        const fileNames = fs.readdirSync(folderPath);
        const spinner = ora({
            discardStdin: false,
            text: 'Uploading assets...',
        }).start();

        await Promise.all(fileNames.map(async (fileName, index) => {

            const filePath = path.join(folderPath, fileName);
            const data = fs.readFileSync(filePath);
            const contentType = getContentTypeByExtension(fileName);
            spinner.text = `Uploading asset ${fileName} [${index + 1}/${fileNames.length}]`;
            const requestOptions = {
                method: 'POST',
                body: data,
                headers: {
                    'Content-Type': contentType,
                },
            };
            if (config.authorization) {
                requestOptions.headers['Authorization'] = config.authorization;
            }
            await fetch(url, requestOptions)
                .then(response => {
                    if (response.ok) {
                        return true;
                    } else {
                        console.error(`Failed to upload file '${fileName}'. Status: ${response.status} ${response.statusText}`);
                        return false;
                    }
                })
                .catch(() => {
                    console.error(`Failed to upload file '${fileName}'. Status: ${response.status} ${response.statusText}`);
                    return false;
                });


        }));
        spinner.stop();
        return true;
    } catch (error) {
        console.error('Error uploading files:', error.message);
        return false;
    }
}