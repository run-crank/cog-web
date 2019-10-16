import { MarketoAware } from './mixins/marketo';
import * as grpc from 'grpc';
import { BasicInteractionAware, DomAware, ResponseAware } from './mixins';
import { Field } from '../core/base-step';
import { Page, Request } from 'puppeteer';

class ClientWrapper {

  public static expectedAuthFields: Field[] = [];

  public client: Page;

  constructor (page: Page, auth: grpc.Metadata) {
    this.client = page;
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

interface ClientWrapper extends BasicInteractionAware, DomAware, ResponseAware, MarketoAware {}

applyMixins(ClientWrapper, [BasicInteractionAware, DomAware, ResponseAware, MarketoAware]);

function applyMixins(derivedCtor: any, baseCtors: any[]) {
  baseCtors.forEach((baseCtor) => {
    Object.getOwnPropertyNames(baseCtor.prototype).forEach((name) => {
      Object.defineProperty(derivedCtor.prototype, name, Object.getOwnPropertyDescriptor(baseCtor.prototype, name));
    });
  });
}

export { ClientWrapper as ClientWrapper };
