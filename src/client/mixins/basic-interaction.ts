import { Page } from 'puppeteer';
import { Promise as Bluebird } from 'bluebird';

export class BasicInteractionAware {
  public client: Page;

  public async scrollTo(depth: number) {
    try {
      // Perform scroll.
      await this.client.evaluate(
        (percent) => {
          const floatValue = percent / 100;
          window.scroll({
            left: 0,
            top: document.body.scrollHeight * floatValue,
            behavior: 'smooth',
          });
        },
        depth,
      );

      // Wait until scroll completes.
      await this.client.waitFor(
        (percent) => {
          const floatValue = percent / 100;
          return window.scrollY + window.innerHeight >= document.body.scrollHeight * floatValue;
        },
        {},
        depth,
      );
    } catch (e) {
      throw Error(`Unable to scroll to ${depth} percent depth: ${e}`);
    }
  }

  public async clickElement(selector: string) {
    try {
      await this.client.click(selector);
    } catch (e) {
      try {
        await this.client.evaluate(
          async (selector) => {
            document.querySelector(selector).click();
            return true;
          },
          selector,
        );
      } catch (e) {
        throw Error('Element may not be visible or clickable');
      }
    }
  }

  /**
   * Attempts to navigate to the given URL. If an error occurred, this method
   * throws an error. Otherwise, it will resolve on successful navigation.
   *
   * @param {String} url - The URL of the page to nagivate to.
   */
  public async navigateToUrl(url: string) {
    this.client['__networkRequests'] = null;
    const browser = await this.client.browser();
    const ua = await browser.userAgent();

    // Make ourselves identifiable and set a more realistic desktop browser size.
    await this.client.setUserAgent(ua.replace(' Chrome', ' AutomatonHeadlessChrome'));
    await this.client.setViewport({ width: 1280, height: 960 });
    const response = await this.client.goto(url, { waitUntil: 'networkidle0' });

    // Stash this response on the client. Adding the data to the client is the
    // only way to persist this response object between steps.
    // @see this.getCurrentPageDetails()
    this.client['___lastResponse'] = response;
  }

  /**
   * Attempts to fill in the given value into the field denoted by the given
   * DOM query selector. If there was an error, this method throws an error.
   * Otherwise, it will resolve on successful form field fill.
   *
   * @param {String} selector - The DOM Query Selector of the element.
   * @param {*} value - The value to enter into the field.
   */
  public async fillOutField(selector: string, value: any) {
    const fieldMethod = await this.getFieldMethod(selector);

    // Based on type of field, fill out / click / select value.
    switch (fieldMethod) {
      case 'choose':
        try {
          await this.client.select(selector, value);
        } catch (e) {
          throw Error("Drop down may not be visible or isn't selectable.");
        }
        break;

      case 'tick':
        if (value) {
          try {
            await this.client.evaluate(
              (selector) => {
                document.querySelector(selector).checked = true;
                return true;
              },
              selector,
            );
          } catch (e) {
            throw Error("Checkbox may not be visible or isn't checkable.");
          }
        }
        break;

      case 'type':
        try {
          await this.client.waitForSelector(selector, { visible: true, timeout: 5000 });
          await this.client.type(selector, value);
        } catch (e) {
          try {
            await this.client.evaluate(
              (selector, value) => {
                document.querySelector(selector).focus();
                document.querySelector(selector).value = value;
                document.querySelector(selector).blur();
                return true;
              },
              selector, value,
            );
          } catch (e) {
            throw Error("Field may not be visible, or exist, or it can't be typed in.");
          }
        }
        break;
    }
  }

  /**
   * Attempts to submit a form by clicking a button with a given DOM Query
   * Selector. If there was a problem submitting the form, this method will
   * throw an error. If the form was submitted successfully, it will resolve.
   *
   * @param {String} selector - DOM Query Selector of the button to click.
   */
  public async submitFormByClickingButton(selector: string) {
    // Set up wait handlers and attempt to click the button. Uses Bluebird.some()
    // set to 3/4 to catch as many cases as possible, including:
    // - Click worked, redirected, and therefore button is gone.
    // - Click worked, no redirect, but button is gone and it's been 10s
    await Bluebird.some(
      [
        new Promise((res, rej) => {
          this.client.waitForNavigation({ timeout: 15000 })
            .then(res)
            .catch(e => rej(Error('Page did not redirect')));
        }),
        new Promise((res, rej) => {
          this.client.waitForFunction(
            (selector) => {
              const el = document.querySelector(selector);
              return !el || el.offsetParent === null;
            },
            { timeout: 15000 },
            selector,
          )
            .then(res)
            .catch(e => rej(Error('Submit button still there')));
        }),
        new Promise((res, rej) => {
          this.client.click(selector)
            .then(res)
            .catch((e) => {
              this.client.waitForFunction(
                (selector) => {
                  document.querySelector(selector).click();
                  return true;
                },
                {},
                selector,
              )
                .then(res)
                .catch(e => rej(Error('Unable to click submit button')));
            });
        }),
        new Promise((res, rej) => {
          this.client.waitFor(10000)
            .then(res)
            .catch(e => rej(Error('Waited for 10 seconds')));
        }),
      ],
      3,
    );
  }

  /**
   * Returns a method name representing how to enter a value into an element,
   * found using the given DOM Query Selector.
   *
   * @param {String} selector - The domQuerySelector of the element.
   * @returns {String} - One of choose (for select elements), tick (for
   *   checkbox inputs), or type (for any other input).
   */
  private async getFieldMethod(selector: string) {
    return await this.client.evaluate(
      (selector) => {
        let method: string;
        const element = document.querySelector(selector);
        if (element.tagName === 'select') {
          method = 'choose';
        } else if (element.tagName === 'input' && element.type === 'checkbox') {
          method = 'tick';
        } else {
          method = 'type';
        }
        return method;
      },
      selector,
    );
  }
}
