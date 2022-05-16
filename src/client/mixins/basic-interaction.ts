import { Page } from 'puppeteer';
import { Promise as Bluebird } from 'bluebird';
import { keyCodes } from '../_shared/constants/key-codes.constant';

export class BasicInteractionAware {
  public client: Page;

  public async focusFrame(domQuerySelector: string) {
    if (domQuerySelector === 'main') {
      this.client['___currentFrame'] = this.client.mainFrame();
    } else {
      await this.client.waitForSelector(domQuerySelector);
      const elementHandle = await this.client.$(domQuerySelector);
      this.client['___currentFrame'] = await elementHandle.contentFrame();
    }
  }

  public async scrollTo(depth: number) {
    try {
      // Perform scroll.
      await this.client['___currentFrame'].evaluate(
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

      // Wait until scroll completes. @see https://stackoverflow.com/a/57867348/12064302
      await this.client['___currentFrame'].evaluate(() => {
        return new Promise((resolve) => {
          let lastPos = null;
          let sameCount = 0;
          window.requestAnimationFrame(checkScrollY);

          // This function will be called every painting frame for the duration
          // of the smooth scroll operation.
          function checkScrollY() {
            // Check our current position
            const newPos = window.scrollY;

            // If the current position is the same as the last, and it was the
            // same as the last for two frames in a row, then scroll completed.
            if (newPos === lastPos) {
              sameCount = sameCount + 1;
              if (sameCount > 2) {
                // Once a scroll completes, regardless of if it landed at the
                // exact right location, we can consider the scroll complete.
                return resolve();
              }
            } else {
              // Otherwise, reset our counter and set our current position.
              sameCount = 0;
              lastPos = newPos;
            }

            // Check again during next painting frame
            window.requestAnimationFrame(checkScrollY);
          }
        });
      });
    } catch (e) {
      throw Error(`Unable to scroll to ${depth} percent depth: ${e}`);
    }
  }

  public async pressKey(key: string) {
    if (!keyCodes[key]) throw Error('Key is invalid');

    try {
      await this.client.keyboard.type(String.fromCharCode(keyCodes[key]));
    } catch (e) {
      throw e;
    }
  }

  public async clickElement(selector: string) {
    try {
      await this.client['___currentFrame'].waitFor(selector);
      await this.client['___currentFrame'].evaluate(
        (selector) => {
          return new Promise((resolve, reject) => {
            try {
              // In the event a click handler prevents others from firing,
              // always resolve after 5s.
              setTimeout(resolve.bind(null, true), 5000);

              // Bind a click handler to the element that resolves the promise.
              document.querySelector(selector).addEventListener('click', resolve.bind(null, true));

              // Okay, now actually click the element.
              document.querySelector(selector).click();
            } catch (e) {
              // Stringify the error so that it yields useful info when caught
              // outside the context of the evaulation.
              reject(e.toString());
            }
          });
        },
        selector,
      );
    } catch (e) {
      throw Error('Element may not be visible or clickable');
    }
    let response;
    try {
      response = await this.client['___currentFrame'].waitForNavigation({ timeout: 45000 });
    } catch (e) {
      // If the button click does not navigate to a new page, do nothing.
    }
    if (response) {
      // Stash this response on the client. Adding the data to the client is the
      // only way to persist this response object between steps.
      // @see this.getCurrentPageInfo()
      this.client['___lastResponse'] = response;
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

    // Connect to Chrome DevTools and set throttling. Consider making this its
    // own step in the future.
    // @see https://fdalvi.github.io/blog/2018-02-05-puppeteer-network-throttle/
    // const devTools = await this.client.target().createCDPSession();
    // await devTools.send('Network.emulateNetworkConditions', {
    //   'offline': false,
    //   'downloadThroughput': 1.5 * 1024 * 1024 / 8,
    //   'uploadThroughput': 750 * 1024 / 8,
    //   'latency': 40
    // });

    // Make ourselves identifiable and set a more realistic desktop browser size.
    // Note: We do not use "Headless" in our UA name, because Marketo's Cloudfront
    // configuration blocks requests from UAs matching that pattern.
    await this.client.setUserAgent(ua.replace(' Chrome', ' AutomatonChrome'));
    await this.client.setViewport({ width: 1280, height: 960 });
    const response = await this.client.goto(url, { waitUntil: 'networkidle0', timeout: 90000 });
    // Run solveRecaptchas() as soon as page loads, will automatically solve captchas even if they appear later
    if (process.env.CAPTCHA_TOKEN) {
      await this.client.solveRecaptchas();
      // Also loops through all iFrames to solve captchas within
      for (const frame of this.client.mainFrame().childFrames()) {
        await frame.solveRecaptchas();
      }
    }

    // Stash this response on the client. Adding the data to the client is the
    // only way to persist this response object between steps.
    // @see this.getCurrentPageInfo()
    this.client['___lastResponse'] = response;

    // Set the current active frame by:
    this.client['___currentFrame'] = this.client.mainFrame();
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
          await this.client['___currentFrame'].select(selector, value);
        } catch (e) {
          throw Error("Drop down may not be visible or isn't selectable.");
        }
        break;

      case 'tick':
        if (value) {
          try {
            await this.client['___currentFrame'].evaluate(
              (selector) => {
                document.querySelector(selector).click();
                if (!document.querySelector(selector).checked) {
                  document.querySelector(selector).checked = true;
                }
                return true;
              },
              selector,
            );
          } catch (e) {
            throw Error("Checkbox may not be visible or isn't checkable.");
          }
        }
        break;

      case 'radio':
        try {
          await this.client['___currentFrame'].evaluate(
            (selector) => {
              document.querySelector(selector).click();
              if (!document.querySelector(selector).checked) {
                document.querySelector(selector).checked = true;
              }
              return true;
            },
            `${selector}[value="${value}"]`,
          );
        } catch (e) {
          throw Error("Radio button may not be visible or isn't selectable.");
        }
        break;

      case 'type':
        try {
          await this.client['___currentFrame'].waitForSelector(selector, { visible: true, timeout: 5000 });
          await this.client['___currentFrame'].type(selector, value);
        } catch (e) {
          try {
            await this.client['___currentFrame'].evaluate(
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
    await this.client['___currentFrame'].waitForSelector(selector);
    await Bluebird.some(
      [
        new Promise((res, rej) => {
          this.client['___currentFrame'].waitForNavigation({ timeout: 45000 })
            .then((response) => {
              if (!response) {
                throw new Error;
              }
              // Stash this response on the client. Adding the data to the client is the
              // only way to persist this response object between steps.
              // @see this.getCurrentPageInfo()
              this.client['___lastResponse'] = response;
            })
            .then(res)
            .catch(e => rej(Error('Page did not redirect')));
        }),
        new Promise((res, rej) => {
          this.client['___currentFrame'].waitForFunction(
            (selector) => {
              const el = document.querySelector(selector);
              return !el || el.offsetParent === null;
            },
            { timeout: 45000 },
            selector,
          )
            .then(res)
            .catch(e => rej(Error('Submit button still there')));
        }),
        new Promise((res, rej) => {
          this.client['___currentFrame'].waitForFunction(
            (selector) => {
              try {
                document.querySelector(selector).click();
                return true;
              } catch (e) {
                return false;
              }
            },
            {},
            selector,
          )
            .then(res)
            .catch(e => rej(Error('Unable to click submit button')));
        }),
        new Promise((res, rej) => {
          this.client['___currentFrame'].waitFor(10000)
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
    return await this.client['___currentFrame'].evaluate(
      (selector) => {
        let method: string;
        const element = document.querySelector(selector);
        const tagName = (element.tagName || '').toLowerCase();
        if (tagName === 'select') {
          method = 'choose';
        } else if (tagName === 'input' && element.type === 'checkbox') {
          method = 'tick';
        } else if (tagName === 'input' && element.type === 'radio') {
          method = 'radio';
        } else {
          method = 'type';
        }
        return method;
      },
      selector,
    );
  }
}
