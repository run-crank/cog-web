import { Page } from 'puppeteer';
import * as lighthouse from 'lighthouse';
import * as DesktopConfig from 'lighthouse/lighthouse-core/config/lr-desktop-config';
import * as MobileConfig from 'lighthouse/lighthouse-core/config/lr-mobile-config';

export class LighthouseAware {
  public client: Page;

  async getLighthouseScores(url: string, throttleTo: 'desktop' | 'mobile' = 'desktop', categories: string[] = ['performance']) {
    const browser = this.client.browser();
    browser.on('targetchanged', async (target) => {
      const page = await target.page();

      function addStyleContent(content) {
        const style = document.createElement('style');
        style.type = 'text/css';
        style.appendChild(document.createTextNode(content));
        document.head.appendChild(style);
      }

      const css = '* {color: red}';

      if (page && page.url() === url) {
        // Note: can't use page.addStyleTag due to github.com/GoogleChrome/puppeteer/issues/1955.
        // Do it ourselves.
        const client = await page.target().createCDPSession();
        await client.send('Runtime.evaluate', {
          expression: `(${addStyleContent.toString()})('${css}')`,
        });
      }
    });

    const flags = {
      port: (new URL(browser.wsEndpoint())).port,
      output: 'json',
      logLevel: 'info',
    };

    const config: any = throttleTo === 'mobile' ? MobileConfig : DesktopConfig;
    config.settings.onlyCategories = categories;
    //// config.settings.emulatedFormFactor = throttleTo;

    const { lhr } = await lighthouse(url, flags, config);
    return lhr;
  }
}
