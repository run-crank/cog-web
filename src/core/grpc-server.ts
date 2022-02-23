import * as grpc from 'grpc';
import { Cluster } from 'puppeteer-cluster';
import { CogServiceService as CogService } from '../proto/cog_grpc_pb';
import { Cog } from './cog';
import { ClientWrapper } from '../client/client-wrapper';
import puppeteerExtra from 'puppeteer-extra';
import puppeteerExtraPluginRecaptcha  from 'puppeteer-extra-plugin-recaptcha';
const stealthPlugin = require('puppeteer-extra-plugin-stealth'); // needs to use require

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

  // add stealth and recaptcha plugins
  puppeteerExtra.use(stealthPlugin());
  if (process.env.CAPTCHA_TOKEN) {
    puppeteerExtra.use(
      puppeteerExtraPluginRecaptcha({
        provider: {
          id: '2captcha',
          token: process.env.CAPTCHA_TOKEN,
        },
        solveInactiveChallenges: true,
      }),
    );
  }

  return await Cluster.launch({
    puppeteer: puppeteerExtra, // Use the puppeteer-extra instance that has plugins
    concurrency: Cluster.CONCURRENCY_CONTEXT,
    maxConcurrency: process.env.hasOwnProperty('CLUSTER_MAX_CONCURRENCY') ? Number(process.env.CLUSTER_MAX_CONCURRENCY) : 4,
    retryLimit: process.env.hasOwnProperty('CLUSTER_RETRY_LIMIT') ? Number(process.env.CLUSTER_RETRY_LIMIT) : 3,
    retryDelay: process.env.hasOwnProperty('CLUSTER_RETRY_DELAY_MS') ? Number(process.env.CLUSTER_RETRY_DELAY_MS) : 3000,
    timeout: process.env.hasOwnProperty('CLUSTER_TIMEOUT_MS') ? Number(process.env.CLUSTER_TIMEOUT_MS) : 900000,
    puppeteerOptions: {
      headless: false,
      args: process.env.IN_DOCKER ? [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-features=IsolateOrigins,site-per-process',
        '--flag-switches-begin --disable-site-isolation-trials --flag-switches-end',
      ] : [
        '--disable-features=IsolateOrigins,site-per-process',
        '--flag-switches-begin --disable-site-isolation-trials --flag-switches-end',
      ],
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
