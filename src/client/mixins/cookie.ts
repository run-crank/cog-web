import { Page } from 'puppeteer';

export class CookieAware {
  public client: Page;

  /**
   * Returns an array of cookies that match the given cookieName.
   *
   * @param {String} cookieName - The name of the cookie.
   * @returns {Array} - An array of cookies that match the cookieName.
   */
   public async getCookie(cookieName: string) {
    const cookies = await this.client.cookies();
    const cookieArray = cookies.filter((cookie) => cookie.name === cookieName);
    return cookieArray;
  }

  /**
   * Retrieves an array of cookies on the current page.
   *
   * @returns {Array} - An array of cookies on the current page.
   */
  public async getCookiesForCurrentPage() {
    return await this.client.cookies();
  }

  /**
   * Retrieves an array of cookies on the current page.
   * @param {Array} cookieName - The cookie name to delete.
   *
   * @returns {void}
   */
   public async deleteCookie(cookie) {
    return await this.client.deleteCookie(cookie);
  }
}
