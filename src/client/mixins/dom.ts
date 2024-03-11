import { Page } from 'puppeteer';

export class DomAware {
  public client: Page;

  /**
   * Retrieves the content of a meta tag with the given name.
   *
   * @param metaName - The name (or property) attribute of the meta tag whose
   *   contents to return.
   */
  public async getMetaTagContent(metaName: string): Promise<String> {
    // Special case for title.
    if (metaName === 'title') {
      return await this.client['___currentFrame'].evaluate(() => {
        try {
          return document.querySelector('title').innerText; // eslint-disable-line no-undef
        } catch (e) {
          return null;
        }
      });
    }

    return await this.client['___currentFrame'].evaluate(
      (name) => {
        try {
          return document.querySelector(`meta[name="${name}"]`)['content']; // eslint-disable-line no-undef
        } catch (e) {
          // If the meta[name] didn't exist, try [property] (open graph support).
          try {
            return document.querySelector(`meta[property="${name}"]`)['content']; // eslint-disable-line no-undef
          } catch (e) {
            // Always resolve to null so the step can handle it.
            return null;
          }
        }
      },
      metaName,
    );
  }
}
