import { createSwaggerSpec } from "next-swagger-doc";

import "server-only";

export const getSwaggerSpec = async () => {
  const spec: Record<string, any> = createSwaggerSpec({
    apiFolder: "src/app/api/v1",
    schemaFolders: [
      "src/data"
    ],
    definition: {
      openapi: "3.0.0",
      info: {
        title: "Ethereal Nexus API",
        version: "1.0",
      },
    },
  });

  return spec;
};
