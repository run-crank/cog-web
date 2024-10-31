import { Flags } from 'lighthouse';
import { Page } from 'puppeteer';
const loadLighthouse = require('../../../esm-imports/lighthouse-import');

export class LighthouseAware {
  public client: Page;

  async getLighthouseScores(url: string, throttleTo: 'desktop' | 'mobile' = 'desktop', categories: string[] = ['performance']) {
    const browser = this.client.browser();

    const flags: Flags = {
      port: Number(new URL(browser.wsEndpoint()).port),
      output: 'json',
      logLevel: 'info',
    };

    const config = {
      extends: 'lighthouse:default',
      settings: {
        onlyCategories: categories,
        maxWaitForLoad: 45000,
        formFactor: throttleTo,
        screenEmulation: throttleTo === 'mobile' ? {
          mobile: true,
          width: 375,
          height: 667,
          deviceScaleFactor: 2,
          disabled: false,
        } : {
          mobile: false,
          width: 1350,
          height: 940,
          deviceScaleFactor: 1,
          disabled: false,
        },
        // Set the User-Agent based on the throttleTo value
        emulatedUserAgent: throttleTo === 'mobile'
          ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1 AutomatonChrome'
            : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) AutomatonChrome/91.0.4472.124 Safari/537.36',
      },
    };

    const lighthouse = await loadLighthouse();
    const { lhr } = await lighthouse(url, flags, config);

    if (lhr.runtimeError) {
      console.error('Lighthouse runtime error:', lhr.runtimeError.message);
      throw new Error(`Lighthouse test failed: ${lhr.runtimeError.message}`);
    }

    return lhr;
  }
}
