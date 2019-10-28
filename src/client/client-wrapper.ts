import * as grpc from 'grpc';
import { BasicInteractionAware, DomAware, ResponseAware, MarketoAware, GoogleAnalyticsAware } from './mixins';
import { Field } from '../core/base-step';
import { Page, Request } from 'puppeteer';

class ClientWrapper {

  public static expectedAuthFields: Field[] = [];

  public client: Page;

  constructor (page: Page, auth: grpc.Metadata) {
    this.client = page;

    // Keeps track of the number of inflight requests. @see this.waitForNetworkIdle()
    this.client['__networkRequestsInflight'] = this.client['__networkRequestsInflight'] || 0;

    if (this.client.listenerCount('request') === 0) {
      this.client.addListener('request', (request: Request) => {
        if (!request.isNavigationRequest()) {
          // Used to support this.waitForNetworkIdle() method.
          this.client['__networkRequestsInflight'] = this.client['__networkRequestsInflight'] + 1;
        }
      });
    }

    if (this.client.listenerCount('requestfailed') === 0) {
      this.client.addListener('requestfailed', () => {
        // Used to support this.waitForNetworkIdle() method.
        this.client['__networkRequestsInflight'] = Math.max(0, this.client['__networkRequestsInflight'] - 1);
      });
    }

    if (this.client.listenerCount('requestfinished') === 0) {
      this.client.addListener('requestfinished', (request: Request) => {
        // Used to support this.waitForNetworkIdle() method.
        this.client['__networkRequestsInflight'] = Math.max(0, this.client['__networkRequestsInflight'] - 1);

        // Used to support this.getFinishedRequests() method.
        this.client['__networkRequests'] = this.client['__networkRequests'] || [];
        this.client['__networkRequests'].push({
          rawRequest: request,
          method: request.method(),
          resourceType: request.resourceType(),
          url: request.url(),
          postData: request.postData(),
        });
      });
    }
  }

  public async getFinishedRequests(): Promise<any> {
    return this.client['__networkRequests'];
  }

  /**
   * Helper method that waits for an idle network before proceeding.
   *
   * @param {number} timeout - Number of milliseconds to wait for an idle
   *   network.
   * @param {boolean} shouldThrow - Whether or not to throw an error if the
   *   network does not become idle within the given timeout. Defaults to
   *   true.
   * @param {number} maxInflightRequests - Threshold for number of requests in
   *   flight to consider as "idle." Defaults to 0, which emulates Puppeteer's
   *   networkidle0 option on page navigation methods.
   */
  public async waitForNetworkIdle(timeout: number, shouldThrow = true, maxInflightRequests = 0): Promise<undefined> {
    return new Promise((resolve, reject) => {
      const attempts = 10;
      let callCount = 0;

      // Otherwise, set a max timeout and interval.
      const interval = setInterval(
        () => {
          callCount = callCount + 1;

          console.log(`Still ${this.client['__networkRequestsInflight']} requests inflight`);
          if (this.client['__networkRequestsInflight'] <= maxInflightRequests) {
            clearInterval(interval);
            return resolve();
          } else if (callCount >= attempts) {
            clearInterval(interval);
            if (shouldThrow) {
              return reject(Error(`Waited ${timeout}ms for network requests to finish, but there was still network activity.`));
            } else {
              // We tried our best.
              return resolve();
            }
          }
        },
        timeout / attempts,
      );
    });
  }

}

interface ClientWrapper extends BasicInteractionAware, DomAware, ResponseAware, MarketoAware, GoogleAnalyticsAware {}

applyMixins(ClientWrapper, [BasicInteractionAware, DomAware, ResponseAware, MarketoAware, GoogleAnalyticsAware]);

function applyMixins(derivedCtor: any, baseCtors: any[]) {
  baseCtors.forEach((baseCtor) => {
    Object.getOwnPropertyNames(baseCtor.prototype).forEach((name) => {
      Object.defineProperty(derivedCtor.prototype, name, Object.getOwnPropertyDescriptor(baseCtor.prototype, name));
    });
  });
}

export { ClientWrapper as ClientWrapper };
