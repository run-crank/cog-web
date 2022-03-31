import { Page } from 'puppeteer';
export class ResponseAware {
  public client: Page;

  /**
   * Retrieves the last response object.
   */
  public async getCurrentPageInfo(detail: string): Promise<String> {
    // Immediately throw an error if we don't have a response stashed.
    if (!this.client['___currentFrame']) {
      throw new Error('No page context. Ensure this step is preceded by a page navigation step.');
    }

    if (detail === 'url') {
      if (this.client['___currentFrame'].hasOwnProperty('_url')) {
        return await this.client['___currentFrame']['url']();
      } else {
        throw 'Url is not present in current page';
      }
    }

    if (detail === 'text') {
      if (this.client['___currentFrame'].hasOwnProperty('_text')) {
        return await this.client['___currentFrame']['text']();
      } else {
        throw 'Text is not present in current page';
      }
    }

    if (detail === 'status') {
      if (this.client['___currentFrame'].hasOwnProperty('_status')) {
        return await this.client['___currentFrame']['status']();
      } else {
        throw 'Status is not present in current page';
      }
    }

    throw new Error(`Unknown page detail: ${detail}. Should be one of: url, text, or status.`);
  }
}
