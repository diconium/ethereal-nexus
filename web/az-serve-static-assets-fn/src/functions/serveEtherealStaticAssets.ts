import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { BlobServiceClient, StorageSharedKeyCredential } from '@azure/storage-blob';
import { DefaultAzureCredential } from "@azure/identity";

const STORAGE_ACCOUNT_NAME = process.env.STORAGE_ACCOUNT_NAME;
const CONTAINER_NAME = process.env.CONTAINER_NAME;
const CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING;
const USE_SHARED_KEY = process.env.USE_SHARED_KEY;


// Create the BlobServiceClient using local connection string or managed identity
let blobServiceClient;

if (CONNECTION_STRING && !USE_SHARED_KEY) {
  console.log('🔐 Using connection string to access Blob Storage with BlobServiceClient.fromConnectionString');
  blobServiceClient = BlobServiceClient.fromConnectionString(CONNECTION_STRING);
} else if(USE_SHARED_KEY === 'true' && CONNECTION_STRING) {
  console.log('🔐 Using connection string to access Blob Storage with StorageSharedKeyCredential');
  const sharedKeyCredential = new StorageSharedKeyCredential(STORAGE_ACCOUNT_NAME, CONNECTION_STRING);
  blobServiceClient = new BlobServiceClient(
    `https://${STORAGE_ACCOUNT_NAME}.blob.core.windows.net`,
    sharedKeyCredential,
  );
} else {
  const credential = new DefaultAzureCredential();
  const url = `https://${STORAGE_ACCOUNT_NAME}.blob.core.windows.net`;
  console.log('🔐 Using DefaultAzureCredential for Blob Storage access');
  console.log('🔐 DefaultAzureCredential details: ', credential);
  blobServiceClient = new BlobServiceClient(url, credential);
}


export async function serveEtherealStaticAssets(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  console.log(`Http function processed request for url "${request.url}"`);

  // Extract the path after the function route
  // Example: /api/serve-static-asset/some/path/file.txt
  // Route param 'assetPath' will contain 'some/path/file.txt'
  const assetPath = request.params.assetPath || '';

  if (!assetPath) {
    return {
      status: 400,
      body: 'Missing asset path.',
    };
  }

  try {
    console.log(`[servestaticasset] Using connection type: ${USE_SHARED_KEY ? 'Shared Key' : CONNECTION_STRING ? 'Connection String' : 'DefaultAzureCredential'}`);

    console.log(`[servestaticasset] Getting container client for: "${CONTAINER_NAME}"`);
    const containerClient = blobServiceClient.getContainerClient(CONTAINER_NAME);
    console.log(`[servestaticasset] Getting blob client for assetPath: "${assetPath}"`);

    const blobClient = containerClient.getBlobClient(assetPath);
    console.log(`[servestaticasset] Checking if blob exists: "${assetPath}"`);

    const exists = await blobClient.exists();
    console.log(`[servestaticasset] Blob exists: ${exists}`);
    if (!exists) {
      console.warn(`[servestaticasset] Blob not found: "${assetPath}"`);

      return {
        status: 404,
        body: `Blob not found: ${assetPath}`,
      };
    }
    console.log(`[servestaticasset] Fetching blob properties for: "${assetPath}"`);

    const blobProperties = await blobClient.getProperties();
    const contentType = blobProperties.contentType || 'application/octet-stream';
    console.log(`[servestaticasset] Blob content type: "${contentType}"`);
    console.log(`[servestaticasset] Downloading blob to buffer: "${assetPath}"`);

    const buffer = await blobClient.downloadToBuffer();
    console.log(`[servestaticasset] Blob downloaded, size: ${buffer.length} bytes`);

    return {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000',
        'Access-Control-Allow-Origin': '*', // Add this line
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
      },
      body: buffer,
    };

  } catch (err) {

    console.error('❌ Blob access error:', err.message);
    console.error('❌ Error stack:', err.stack);
    return {
      status: 500,
      body: 'Internal Server Error',
    };
  }

};

app.http('serveEtherealStaticAssets', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'assets/{*assetPath}',
  handler: serveEtherealStaticAssets
});
