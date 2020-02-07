import * as grpc from 'grpc';
import { Cluster } from 'puppeteer-cluster';
import { CogServiceService as CogService } from '../proto/cog_grpc_pb';
import { Cog } from './cog';
import { ClientWrapper } from '../client/client-wrapper';

const server = new grpc.Server();
const port = process.env.PORT || 28866;
const host = process.env.HOST || '0.0.0.0';
let credentials: grpc.ServerCredentials;

if (process.env.USE_SSL) {
  credentials = grpc.ServerCredentials.createSsl(
    Buffer.from(process.env.SSL_ROOT_CRT, 'base64'), [{
      cert_chain: Buffer.from(process.env.SSL_CRT, 'base64'),
      private_key: Buffer.from(process.env.SSL_KEY, 'base64'),
    }],
    true,
  );
} else {
  credentials = grpc.ServerCredentials.createInsecure();
}

async function instantiateCluster(): Promise<Cluster> {
  return await Cluster.launch({
    concurrency: Cluster.CONCURRENCY_CONTEXT,
    maxConcurrency: 4,
    retryLimit: 3,
    retryDelay: 3000,
    timeout: 120000,
    puppeteerOptions: {
      headless: false,
      args: process.env.IN_DOCKER ? [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
      ] : [],
    },
  });
}

instantiateCluster().then((cluster) => {
  server.addService(CogService, new Cog(cluster, ClientWrapper));
  server.bind(`${host}:${port}`, credentials);
  server.start();
  console.log(`Server started, listening: ${host}:${port}`);

  process.on('SIGINT', () => {
    cluster.close();
  });
});

// Special handler for when Puppeteer Cluster is in an unrecoverable state.
// @see https://github.com/thomasdondorf/puppeteer-cluster/issues/207
process.on('unhandledRejection', (up) => {
  if (up.toString().includes('Unable to restart chrome')) {
    throw up;
  }
});

// Export server for testing.
export default server;
