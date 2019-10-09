import * as grpc from 'grpc';
import { BasicInteractionAware, DomAware, ResponseAware } from './mixins';
import { Field } from '../core/base-step';
import { Page } from 'puppeteer';

class ClientWrapper {

  public static expectedAuthFields: Field[] = [];

  public client: Page;

  constructor (page: Page, auth: grpc.Metadata) {
    this.client = page;
  }

}

interface ClientWrapper extends BasicInteractionAware, DomAware, ResponseAware {}

applyMixins(ClientWrapper, [BasicInteractionAware, DomAware, ResponseAware]);

function applyMixins(derivedCtor: any, baseCtors: any[]) {
  baseCtors.forEach((baseCtor) => {
    Object.getOwnPropertyNames(baseCtor.prototype).forEach((name) => {
          // tslint:disable-next-line:max-line-length
      Object.defineProperty(derivedCtor.prototype, name, Object.getOwnPropertyDescriptor(baseCtor.prototype, name));
    });
  });
}

export { ClientWrapper as ClientWrapper };
