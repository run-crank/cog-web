import { Page } from 'puppeteer';

export class GoogleAnalyticsAware  {
  public client: Page;

  public async getFinishedGoogleAnalyticsRequests(): Promise<any> {
    return this.client['__networkRequests'];
  }
}
