import * as grpc from 'grpc';
import { BasicInteractionAware, DomAware, ResponseAware, MarketoAware, GoogleAnalyticsAware } from './mixins';
import { Field } from '../core/base-step';
import { Page, Request } from 'puppeteer';

class ClientWrapper {

  public static expectedAuthFields: Field[] = [];

  public client: Page;

  constructor (page: Page, auth: grpc.Metadata) {
    this.client = page;
    if (this.client.listenerCount('requestfinished') === 0) {
      this.client.addListener('requestfinished', (request: Request) => {
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
