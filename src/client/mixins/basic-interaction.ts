import { Page, PuppeteerLifeCycleEvent } from 'puppeteer';
import { Promise as Bluebird } from 'bluebird';
import { keyCodes } from '../_shared/constants/key-codes.constant';

export class BasicInteractionAware {
  public client: Page;

  public async focusFrame(domQuerySelector: string) {
    if (domQuerySelector === 'main') {
      this.client['___currentFrame'] = this.client.mainFrame();
    } else if (domQuerySelector.startsWith('index=')) {
      const index = domQuerySelector.slice(6);
      await this.client.waitForSelector('iframe');
      const frames = await this.client.evaluate(() => Array.from(document.querySelectorAll('iframe'), (el) => { // eslint-disable-line no-undef
        if (el.id) {
          return `#${el.id}`;
        } else if (el.className) {
          return `.${el.className}`;
        } else {
          return '';
        }
      }));
      const elementHandle = await this.client.$(`iframe${frames[index]}`);
      this.client['___currentFrame'] = await elementHandle.contentFrame();
    } else {
      await this.client.waitForSelector(domQuerySelector);
      const elementHandle = await this.client.$(domQuerySelector);
      this.client['___currentFrame'] = await elementHandle.contentFrame();
    }
  }

  public async scrollTo(depth: number, units: string = '%') {
    try {
      // Perform scroll.
      await this.client['___currentFrame'].evaluate(
        (d, units) => {
          const floatValue = d / 100;
          window.scroll({ // eslint-disable-line no-undef
            left: 0,
            top: units === '%' ? document.body.scrollHeight * floatValue : d, // eslint-disable-line no-undef
            behavior: 'smooth',
          });
        },
        depth,
        units,
      );

      // Wait until scroll completes. @see https://stackoverflow.com/a/57867348/12064302
      await this.client['___currentFrame'].evaluate(() => {
        return new Promise((resolve) => {
          let lastPos = null;
          let sameCount = 0;
          window.requestAnimationFrame(checkScrollY); // eslint-disable-line no-undef

          // This function will be called every painting frame for the duration
          // of the smooth scroll operation.
          function checkScrollY() {
            // Check our current position
            const newPos = window.scrollY; // eslint-disable-line no-undef

            // If the current position is the same as the last, and it was the
            // same as the last for two frames in a row, then scroll completed.
            if (newPos === lastPos) {
              sameCount = sameCount + 1;
              if (sameCount > 2) {
                // Once a scroll completes, regardless of if it landed at the
                // exact right location, we can consider the scroll complete.
                return resolve(null);
              }
            } else {
              // Otherwise, reset our counter and set our current position.
              sameCount = 0;
              lastPos = newPos;
            }

            // Check again during next painting frame
            window.requestAnimationFrame(checkScrollY); // eslint-disable-line no-undef
          }
        });
      });
    } catch (e) {
      throw Error(`Unable to scroll to ${depth} percent depth: ${e}`);
    }
  }

  /**
   * Simulates pressing a keyboard key by converting a key code to its character
   * and typing it using Puppeteer's keyboard API.
   * 
   * @param {string} key - The key to press (must exist in keyCodes constant)
   * @throws {Error} If the key is not found in keyCodes or if typing fails
   */
  public async pressKey(key: string) {
    if (!keyCodes[key]) throw Error('Key is invalid');

    try {
      await this.client.keyboard.type(String.fromCharCode(keyCodes[key]));
    } catch (e) {
      throw e;
    }
  }

   /**
   * Moves the mouse cursor over the specified element.
   * 
   * @param {string} domQuerySelector - The DOM query selector of the element to hover over
   * @throws {Error} If the element cannot be found or hovered over
   */
  public async hoverMouse(domQuerySelector: string) {
    try {
      await this.client.hover(domQuerySelector);
    } catch (e) {
      throw e;
    }
  }

  /**
   * Dispatches a custom event on a specified DOM element.
   * 
   * @param {string} selector - The CSS selector of the element to trigger the event on.
   * @param {string} eventType - The type of event (e.g., 'keydown', 'click', 'input').
   * @param {Object} eventOptions - Additional properties for the event (e.g., `{ key: 'ArrowDown' }` for keyboard events).
   */
  public async dispatchEvent(selector: string, eventType: string, eventOptions: any = {}) {
    try {
      await this.client['___currentFrame'].waitForSelector(selector);
      await this.client['___currentFrame'].evaluate(
        (sel, evtType, evtOptions) => {
          const element = document.querySelector(sel);
          if (!element) throw new Error(`Element not found: ${sel}`);

          const event = new Event(evtType, { bubbles: true, cancelable: true, ...evtOptions });

          if (evtType.startsWith('key')) {
            Object.assign(event, evtOptions);
          }

          element.dispatchEvent(event);
        },
        selector,
        eventType,
        eventOptions
      );
      console.log(`Dispatched ${eventType} event on ${selector}`);
    } catch (e) {
      throw Error(`Unable to dispatch event '${eventType}' on '${selector}': ${e}`);
    }
  }

  public async clickElement(selector: string) {
    try {
      let response;
      await this.client['___currentFrame'].waitForTimeout(selector);
      await Promise.all([
        new Promise(async (resolve, reject) => {
          try {
            response = await this.client['___currentFrame'].waitForNavigation({ timeout: 15000 });
            resolve(null);
          } catch (e) {
            // If the page does not navigate, resolve and do nothing
            resolve(null);
          }
        }),
        new Promise(async (resolve, reject) => {
          try {
            // In the event a click handler prevents others from firing,
            // always resolve after 5s.
            setTimeout(resolve.bind(null, true), 5000);

            let clickSuccess;
            // First, try clicking using document.querySelector().click()
            try {
              clickSuccess = await this.client['___currentFrame'].waitForFunction(
                (selector) => {
                  try {
                    document.querySelector(selector).click(); // eslint-disable-line no-undef
                    return true;
                  } catch (e) {
                    return false;
                  }
                },
                { timeout: 2500},
                selector,
              );
            } catch (error) {
              clickSuccess = false;
            }

            // If the first click fails, try using the frame.click from puppeteer
            if (!clickSuccess) {
              await this.client['___currentFrame'].waitForSelector(selector);
              await this.client['___currentFrame'].click(selector);
            }

            resolve(null);
          } catch (e) {
            // Stringify the error so that it yields useful info when caught
            // outside the context of the evaulation.
            reject(e.toString());
          }
        }),
      ]);
      if (response) {
        // Stash this response on the client. Adding the data to the client is the
        // only way to persist this response object between steps.
        // @see this.getCurrentPageInfo()
        this.client['___lastResponse'] = response;
      }
    } catch (e) {
      throw Error('Element may not be visible or clickable');
    }
  }

  /**
   * Attempts to navigate to the given URL. If an error occurred, this method
   * throws an error. Otherwise, it will resolve on successful navigation.
   *
   * @param {String} url - The URL of the page to nagivate to.
   * @param {Boolean} throttle - Will throttle down the browser speed. Defaults to false.
   * @param {Number} maxInflightRequests - Max number of network connections in flight before navigation is considered done. Defaults to 0.
   * @param {Number} networkIdleTime - Time in ms that the network must be idle before navigation is considered done. Defaults to 500.
   */
  public async navigateToUrl(url: string, throttle: boolean = false, maxInflightRequests: number = 0) {
    console.log('>>>>> inside navigateToUrl basic interaction');
    console.timeLog('time');
    this.client['__networkRequests'] = null;
    const browser = await this.client.browser();
    const ua = await browser.userAgent();
    console.log('>>>>> checkpoint 1: finished setting up browser');
    console.timeLog('time');
    if (throttle) {
      // Connect to Chrome DevTools and set throttling. Consider making this its
      // own step in the future.
      // @see https://fdalvi.github.io/blog/2018-02-05-puppeteer-network-throttle/
      const devTools = await this.client.target().createCDPSession();
      await devTools.send('Network.emulateNetworkConditions', {
        offline: false,
        downloadThroughput: 1.5 * 1024 * 1024 / 8,
        uploadThroughput: 750 * 1024 / 8,
        latency: 40,
      });
    }
    let waitUntilSetting: PuppeteerLifeCycleEvent = maxInflightRequests === 0 ? 'networkidle0' : 'networkidle2';
    if (url.endsWith('.pdf')) {
      waitUntilSetting = 'domcontentloaded';
    }
    // Make ourselves identifiable and set a more realistic desktop browser size.
    // Note: We do not use "Headless" in our UA name, because Marketo's Cloudfront
    // configuration blocks requests from UAs matching that pattern.
    await this.client.setUserAgent(ua.replace(' Chrome', ' AutomatonChrome'));
    await this.client.setViewport({ width: 1920, height: 1080 });
    console.log('>>>>> checkpoint 2: finished setting UA and viewport');
    console.timeLog('time');
    const response = await this.client.goto(url, { waitUntil: waitUntilSetting, timeout: 90000 });
    console.log('>>>>> RESPONSE:', response);
    console.log('>>>>> checkpoint 3: finished navigating to page or timed out after 90s');
    console.timeLog('time');
    // Run solveRecaptchas() as soon as page loads, will automatically solve captchas even if they appear later
    if (process.env.CAPTCHA_TOKEN) {
      await this.client.solveRecaptchas();
      // Also loops through all iFrames to solve captchas within
      for (const frame of this.client.mainFrame().childFrames()) {
        await frame.solveRecaptchas();
      }
    }
    console.log('>>>>> checkpoint 4: finished finding/solving captchas');
    console.timeLog('time');

    // Stash this response on the client. Adding the data to the client is the
    // only way to persist this response object between steps.
    // @see this.getCurrentPageInfo()
    this.client['___lastResponse'] = response;

    // Set the current active frame by:
    this.client['___currentFrame'] = this.client.mainFrame();
    console.log('>>>>> checkpoint 5: end of navigateToUrl basic interaction');
    console.timeLog('time');
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
          throw Error('Drop down may not be visible or isn\'t selectable.');
        }
        break;

      case 'tick':
        if (value) {
          try {
            await this.client['___currentFrame'].evaluate(
              (selector) => {
                document.querySelector(selector).click(); // eslint-disable-line no-undef
                if (!document.querySelector(selector).checked) { // eslint-disable-line no-undef
                  document.querySelector(selector).checked = true; // eslint-disable-line no-undef
                }
                return true;
              },
              selector,
            );
          } catch (e) {
            throw Error('Checkbox may not be visible or isn\'t checkable.');
          }
        }
        break;

      case 'radio':
        try {
          await this.client['___currentFrame'].evaluate(
            (selector) => {
              document.querySelector(selector).click(); // eslint-disable-line no-undef
              if (!document.querySelector(selector).checked) { // eslint-disable-line no-undef
                document.querySelector(selector).checked = true; // eslint-disable-line no-undef
              }
              return true;
            },
            `${selector}[value="${value}"]`,
          );
        } catch (e) {
          throw Error('Radio button may not be visible or isn\'t selectable.');
        }
        break;

      case 'type':
        try {
          await this.client['___currentFrame'].waitForSelector(selector, { visible: true, timeout: 5000 });
          await this.client['___currentFrame'].type(selector, value);
          await this.client['___currentFrame'].evaluate(
            (selector, value) => {
              document.querySelector(selector).blur(); // eslint-disable-line no-undef
              return true;
            },
            selector, value,
          );
        } catch (e) {
          try {
            await this.client['___currentFrame'].evaluate(
              (selector, value) => {
                document.querySelector(selector).focus(); // eslint-disable-line no-undef
                document.querySelector(selector).value = value; // eslint-disable-line no-undef
                document.querySelector(selector).blur(); // eslint-disable-line no-undef
                return true;
              },
              selector, value,
            );
          } catch (e) {
            throw Error('Field may not be visible, or exist, or it can\'t be typed in.');
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
    const delayMS = (ms) => {
      return new Promise(resolve => setTimeout(resolve, ms));
    }
    await this.client['___currentFrame'].waitForSelector(selector);
    await Bluebird.some(
      [
        new Promise((res, rej) => {
          this.client['___currentFrame'].waitForNavigation({ timeout: 15000 })
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
            .catch((e) => rej(Error('Page did not redirect')));
        }),
        new Promise((res, rej) => {
          this.client['___currentFrame'].waitForFunction(
            (selector) => {
              const el = document.querySelector(selector); // eslint-disable-line no-undef
              return !el || el.offsetParent === null;
            },
            { timeout: 15000 },
            selector,
          )
            .then(res)
            .catch((e) => rej(Error('Submit button still there')));
        }),
        new Promise((res, rej) => {
          this.client['___currentFrame'].waitForFunction(
            (selector) => {
              try {
                document.querySelector(selector).click(); // eslint-disable-line no-undef
                return true;
              } catch (e) {
                return false;
              }
            },
            {},
            selector,
          )
            .then(res)
            .catch((e) => rej(Error('Unable to click submit button')));
        }),
        new Promise((res, rej) => {
          delayMS(10000)
            .then(res)
            .catch((e) => rej(Error('Waited for 10 seconds')));
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
        const element = document.querySelector(selector); // eslint-disable-line no-undef
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
