import { Page } from 'puppeteer';

export class MarketoAware {
  public client: Page;

  public async getFinishedRequests(): Promise<any> {
    return this.client['__networkRequests'];
  }
}
