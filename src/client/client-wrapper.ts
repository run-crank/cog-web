import * as grpc from '@grpc/grpc-js';
import { BasicInteractionAware, CookieAware, DomAware, ResponseAware, MarketoAware, GoogleAnalyticsAware, LighthouseAware, LinkedInAwareMixin, NetworkAware, GoogleAdsAware, } from './mixins';
import { Field } from '../core/base-step';
import { Page, HTTPRequest } from 'puppeteer';
import * as Marketo from 'node-marketo-rest';

class ClientWrapper {

  public static expectedAuthFields: Field[] = [];

  public client: Page;
  public idMap: any;
  public marketoClient: Marketo;
  public marketoConnected: boolean = false;
  public delayInSeconds: number;

  constructor (page: Page, auth: grpc.Metadata, idMap: any, delayInSeconds = 3) {
    this.client = page;
    this.idMap = idMap;

    // Make a marketo connection if the auth metadata is passed.
    if (auth.get('endpoint').length && auth.get('clientId').length && auth.get('clientSecret').length) {
      this.marketoClient = new Marketo({
        endpoint: `${auth.get('endpoint')[0]}/rest`,
        identity: `${auth.get('endpoint')[0]}/identity`,
        clientId: auth.get('clientId')[0],
        clientSecret: auth.get('clientSecret')[0],
        ...(!!auth.get('partnerId')[0] && { partnerId: auth.get('partnerId')[0] }),
      });
      this.marketoConnected = true;
    }

    this.delayInSeconds = delayInSeconds;

    // Keeps track of the number of inflight requests. @see this.waitForNetworkIdle()
    this.client['__networkRequestsInflight'] = this.client['__networkRequestsInflight'] || 0;

    if (this.client.listenerCount('request') === 0) {
      this.client.addListener('request', (request: HTTPRequest) => {
        if (!request.isNavigationRequest()) {
          // Used to support this.waitForNetworkIdle() method.
          this.client['__networkRequestsInflight'] = this.client['__networkRequestsInflight'] + 1;
        }
      });
    }

    if (this.client.listenerCount('requestfailed') === 0) {
      this.client.addListener('requestfailed', (request: HTTPRequest) => {
        // Used to support this.waitForNetworkIdle() method.
        this.client['__networkRequestsInflight'] = Math.max(0, this.client['__networkRequestsInflight'] - 1);

        if (request.response().status() === 204) {
          // Used to support this.getFinishedRequests() method.
          this.client['__networkRequests'] = this.client['__networkRequests'] || [];
          this.client['__networkRequests'].push({
            rawRequest: request,
            method: request.method(),
            resourceType: request.resourceType(),
            url: request.url(),
            postData: request.postData(),
          });
        }
      });
    }

    if (this.client.listenerCount('requestfinished') === 0) {
      this.client.addListener('requestfinished', (request: HTTPRequest) => {
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

          if (this.client['__networkRequestsInflight'] <= maxInflightRequests) {
            clearInterval(interval);
            return resolve(null);
          } else if (callCount >= attempts) {
            clearInterval(interval);
            if (shouldThrow) {
              return reject(Error(`Waited ${timeout}ms for network requests to finish, but there was still network activity.`));
            } else {
              // We tried our best.
              return resolve(null);
            }
          }
        },
        timeout / attempts,
      );
    });
  }

}

interface ClientWrapper extends BasicInteractionAware, DomAware, ResponseAware, MarketoAware, GoogleAnalyticsAware, LighthouseAware, LinkedInAwareMixin, NetworkAware, GoogleAdsAware, CookieAware {}

applyMixins(ClientWrapper, [BasicInteractionAware, DomAware, ResponseAware, MarketoAware, GoogleAnalyticsAware, LighthouseAware, LinkedInAwareMixin, NetworkAware, GoogleAdsAware, CookieAware]);

function applyMixins(derivedCtor: any, baseCtors: any[]) {
  baseCtors.forEach((baseCtor) => {
    Object.getOwnPropertyNames(baseCtor.prototype).forEach((name) => {
      Object.defineProperty(derivedCtor.prototype, name, Object.getOwnPropertyDescriptor(baseCtor.prototype, name));
    });
  });
}

export { ClientWrapper as ClientWrapper };
