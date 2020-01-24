import { Page } from 'puppeteer';
import * as lighthouse from 'lighthouse';
import * as DesktopConfig from 'lighthouse/lighthouse-core/config/lr-desktop-config';
import * as MobileConfig from 'lighthouse/lighthouse-core/config/lr-mobile-config';

export class LighthouseAware {
  public client: Page;
  public lighthouse: any;

  async getLighthouseScores(url: string, throttleTo: 'desktop' | 'mobile' = 'desktop', categories: string[] = ['performance']) {
    const browser = this.client.browser();

    const flags = {
      port: (new URL(browser.wsEndpoint())).port,
      output: 'json',
      logLevel: 'info',
    };

    const config: any = throttleTo === 'mobile' ? MobileConfig : DesktopConfig;
    config.settings.onlyCategories = categories;

    let { lhr } = await this.lighthouse(url, flags, config);
    lhr = lhr || {};

    if (lhr.runtimeError) {
      throw new Error('Check that the URL is correct and the page is up and try again.');
    }

    return lhr;
  }
}
