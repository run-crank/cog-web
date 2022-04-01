import { Page } from 'puppeteer';
export class ResponseAware {
  public client: Page;

  /**
   * Retrieves the last response object.
   */
  public async getCurrentPageInfo(detail: string): Promise<String> {
    // Immediately throw an error if we don't have a response stashed.
    if (!this.client['___lastResponse']) {
      throw new Error('No page context. Ensure this step is preceded by a page navigation step.');
    }

    if (detail === 'url') {
      return await this.client['___lastResponse']['url']();
    }

    if (detail === 'text') {
      return await this.client['___lastResponse']['text']();
    }

    if (detail === 'status') {
      return await this.client['___lastResponse']['status']();
    }

    throw new Error(`Unknown page detail: ${detail}. Should be one of: url, text, or status.`);
  }
}
