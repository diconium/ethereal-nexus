# Ethereal Nexus

[![diconium-dds](docs/images/diconium-dds.png  "diconium digital solutions" )](https://diconium.com/en/news/adobe-io-hybris)

## Project Overview

Ethereal Nexus is a groundbreaking project designed to facilitate the integration of remote components into Adobe Experience Manager (AEM) installations, whether on-premises or on the cloud. This innovative approach empowers AEM authors to seamlessly include remote components created with modern frontend technologies while offering them the same experience as traditional AEM components.

Key Objectives:

- **Seamless AEM Integration:** Ethereal Nexus bridges the gap between AEM and modern web development, allowing authors to harness the full potential of remote components while maintaining the familiar AEM authoring experience.

- **Modular and Scalable Applications:** By hosting UI elements on remote servers, Ethereal Nexus enables the development of modular, scalable web applications that adapt to evolving requirements.

- **Full Component Lifecycle Management:** The project includes a dashboard that empowers you to manage the complete lifecycle of your remote components, from creation and deployment to activation and retirement.

## Implementation Examples

To help you understand how to work with remote components, we provide two implementation examples:

1. **React + Vite + TypeScript Example:** In the `react-vite-typescript-example` directory, you'll discover a more complex implementation using React, Vite, and TypeScript. This example illustrates how you can build a robust web application with modern tools while incorporating remote components.
2. **Simple HTML Example:** In the `simple-html-example` directory, you'll find a basic HTML page demonstrating how to import and use remote components directly in a simple web application.


Each implementation example comes with its own README, guiding you through setup and usage.

## Getting Started

### Prerequisites

Before you begin, ensure you have the following prerequisites:

- **Node.js and npm**: Ethereal Nexus relies on Node.js for server and package management. Download and install Node.js from [nodejs.org](https://nodejs.org/). 

- **Adobe Experience Manager (AEM)** (optional): If you plan to integrate Ethereal Nexus with your AEM installation, make sure you have an AEM environment set up and running. The examples will guide you through the integration process.


#### Installation on AEM

* Manual 
    1. Download the package from the [releases page](https://github.com/diconium/remote-components/packages/1929390?version=1.2.1)
    2. Install the package via the AEM package manager
    3. Configure the endpoint to you Ethereal Nexus Dashboard.
    4. Assign your configuration to a sites project.
### OR
* On your AEM Project (Preferred)
  1. Add the Maven dependency to you AEM project on module: all file: pom.xml
    ```xml 
    <dependency>
        <groupId>com.diconium</groupId>
        <artifactId>ethereal-nexus.all</artifactId>
        <version>1.2.16</version>
    </dependency>
  ```
  2. Add the Embeded vault package definition on module: all file: pom.xml
    ```xml 
    <embedded>
        <groupId>com.diconium</groupId>
        <artifactId>ethereal-nexus.all</artifactId>
        <type>zip</type>
        <target>/apps/REPLACE_WITH_YOUR_CUSTOM_NAME-vendor-packages/remote-components/install</target>
    </embedded>
  ``` 
  3. Configure the endpoint to you Ethereal Nexus Dashboard.
  4. Assign your configuration to a sites project.

    
## Modular and Scalable Applications

Ethereal Nexus reimagines the development of web applications, making them modular and scalable without requiring full expertise in Adobe Experience Manager (AEM). In this context, "modular" means that you can create and manage individual UI components as self-contained units, and "scalable" signifies the ability to effortlessly expand your application's capabilities as your needs evolve.

### Empowering Frontend Developers

With Ethereal Nexus, we empower frontend developers to take the lead in creating and maintaining remote components. You no longer need an extensive background in AEM to develop components. Frontend developers can leverage their skills in modern web development technologies, such as HTML, CSS, JavaScript, and popular libraries like React, Vue, or Angular.

### Component Reusability

The modular approach allows you to build and reuse components across different projects. Once you've developed a remote component, it becomes a building block that can be effortlessly integrated into various applications. This reusability not only accelerates development but also ensures consistency in your user interfaces.

### Independent Development and Deployment

Developing components independently from your main application and deploying them on remote servers simplifies the development process. It minimizes potential conflicts and dependencies, providing greater flexibility to frontend developers.


## License

Ethereal Nexus is an open-source project and is available under an Apache license - see the LICENSE.md file for details.
