# Ethereal Nexus CLI

The **Ethereal Nexus CLI** is a command-line tool that allows you to publish Ethereal Nexus to a server. This tool simplifies the process of uploading JavaScript and CSS assets to a remote server for use in your frontend projects.

![](./docs/cli.gif)

## Installation

You can install the Ethereal Nexus CLI globally using npm:

```bash
npm install -g ethereal-nexus-cli
```

### Configuration
The remote-components.config.json file in your project's root folder should have the following structure:
```json
{
  "url": "https://example.com",
  "authorization" : "Basic xyz"
}
```

Make sure to replace "https://example.com" with the actual URL of your remote server where you want to publish the components.
The authorization field is not mandatory

### Usage

To use the Ethereal Nexus CLI, follow these steps:

1. Create a configuration file called remote-components.config.json in the root folder of your frontend project. This configuration file should contain the necessary settings, including the server URL and any other relevant parameters.
2. Use the publish command to upload your assets to the remote server. You can run the following command:
```bash
ethereal-nexus-cli publish
```
3. Follow the prompts to confirm and customize the upload process if required.
4. Once the upload is complete, your Ethereal Nexus will be available on the specified server.

