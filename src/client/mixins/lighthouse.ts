import { Page } from 'puppeteer';
import { OutputMode } from 'lighthouse';
import * as DesktopConfig from 'lighthouse/lighthouse-core/config/lr-desktop-config';
import * as MobileConfig from 'lighthouse/lighthouse-core/config/lr-mobile-config';

export class LighthouseAware {
  public client: Page;
  public lighthouse: any;

  async getLighthouseScores(url: string, throttleTo: 'desktop' | 'mobile' = 'desktop', categories: string[] = ['performance']) {
    const browser = this.client.browser();

    const flags: { port: number; output: OutputMode | OutputMode[]; logLevel: 'info' | 'silent' | 'error' | 'warn' | 'verbose' } = {
      port: Number((new URL(browser.wsEndpoint())).port),
      output: 'json',
      logLevel: 'info',
    };

    const config: any = throttleTo === 'mobile' ? MobileConfig : DesktopConfig;
    config.settings.onlyCategories = categories;

     // Set the User-Agent based on the throttleTo value
     if (throttleTo === 'mobile') {
      config.settings.extraHeaders = {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1 AutomatonChrome'
      };
    } else {
      config.settings.extraHeaders = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36 AutomatonChrome'
      };
    }

    let { lhr } = await this.lighthouse(url, flags, config);

    if (lhr.runtimeError) {
      throw new Error('Check that the URL is correct and the page is up and try again.');
    }

    return lhr;
  }
}
