import * as chai from 'chai';
import { Metadata } from 'grpc';
import { default as sinon } from 'ts-sinon';
import * as sinonChai from 'sinon-chai';
import * as justForIdeTypeHinting from 'chai-as-promised';
import 'mocha';

import * as DesktopConfig from 'lighthouse/lighthouse-core/config/lr-desktop-config';

import { ClientWrapper } from '../../src/client/client-wrapper';

chai.use(sinonChai);
chai.use(require('chai-as-promised'));

describe('ClientWrapper', () => {
  const expect = chai.expect;
  let pageStub: any;
  let browserStub: any;
  let metadata: Metadata;
  let clientWrapperUnderTest: ClientWrapper;

  describe('navigateToUrl', () => {

    beforeEach(() => {
      browserStub = sinon.stub();
      browserStub.userAgent = sinon.stub();
      pageStub = sinon.stub();
      pageStub.addListener = sinon.stub();
      pageStub.listeners = sinon.stub();
      pageStub.browser = sinon.stub();
      pageStub.browser.resolves(browserStub);
      pageStub.setUserAgent = sinon.stub();
      pageStub.setViewport = sinon.stub();
      pageStub.goto = sinon.stub();
      pageStub.mainFrame = sinon.stub();

      // Stub out event emitter.
      pageStub.listenerCount = sinon.stub();
      pageStub.listenerCount.onFirstCall().returns(0);
      pageStub.listenerCount.onSecondCall().returns(1);
    });

    it('happyPath', async () => {
      const expectedUrl = 'https://example.com';
      const originalUserAgent = 'Mozilla/a.b Chrome/x.y.z';
      const expectedUserAgent = 'Mozilla/a.b AutomatonChrome/x.y.z';
      const expectedLastResponse = 'This would be a puppeteer response object';

      // Set up test instance.
      browserStub.userAgent.resolves(originalUserAgent);
      pageStub.setUserAgent.resolves();
      pageStub.listeners.resolves();
      pageStub.goto.resolves(expectedLastResponse);
      clientWrapperUnderTest = new ClientWrapper(pageStub, metadata);

      // Call the method and make assertions.
      await clientWrapperUnderTest.navigateToUrl(expectedUrl);
      expect(pageStub.setUserAgent).to.have.been.calledWith(expectedUserAgent);
      expect(pageStub.setViewport).to.have.been.calledWith(sinon.match.has('width', 1280));
      expect(pageStub.setViewport).to.have.been.calledWith(sinon.match.has('height', 960));
      expect(pageStub.goto).to.have.been.calledWith(expectedUrl, { waitUntil: 'networkidle0' });
      expect(pageStub.___lastResponse).to.be.string(expectedLastResponse);
    });

    it('sadPath', () => {
      const expectedUrl = 'https://example.com';

      // Set up test instance.
      browserStub.userAgent.resolves('AnyUser/Agent x.y.z');
      pageStub.setUserAgent.resolves();
      pageStub.listeners.resolves();
      pageStub.goto.rejects();
      clientWrapperUnderTest = new ClientWrapper(pageStub, metadata);

      // Call the method and make assertions.
      return expect(clientWrapperUnderTest.navigateToUrl(expectedUrl)).to.be.rejected;
    });

  });

  describe('fillOutField', () => {

    beforeEach(() => {
      pageStub = sinon.stub();
      pageStub.evaluate = sinon.stub();
      pageStub.waitForSelector = sinon.stub();
      pageStub.addListener = sinon.stub();
      pageStub.listeners = sinon.stub();
      pageStub.select = sinon.stub();
      pageStub.type = sinon.stub();

      // Stub out event emitter.
      pageStub.listenerCount = sinon.stub();
      pageStub.listenerCount.onFirstCall().returns(0);
      pageStub.listenerCount.onSecondCall().returns(1);

      pageStub['___currentFrame'] = sinon.stub();
      pageStub['___currentFrame'].evaluate = sinon.stub();
      pageStub['___currentFrame'].waitForSelector = sinon.stub();
      pageStub['___currentFrame'].addListener = sinon.stub();
      pageStub['___currentFrame'].listeners = sinon.stub();
      pageStub['___currentFrame'].select = sinon.stub();
      pageStub['___currentFrame'].type = sinon.stub();

      // Stub out event emitter.
      pageStub['___currentFrame'].listenerCount = sinon.stub();
      pageStub['___currentFrame'].listenerCount.onFirstCall().returns(0);
      pageStub['___currentFrame'].listenerCount.onSecondCall().returns(1);
    });

    it('selectElement:happypath', async () => {
      const expectedSelector = 'select[name=Country]';
      const expectedValue = 'CA';

      // Set up test instance.
      pageStub['___currentFrame'].evaluate.onCall(0).resolves('choose');
      pageStub['___currentFrame'].select.resolves();
      pageStub['___currentFrame'].listeners.resolves([]);
      pageStub['___currentFrame'].addListener.resolves();
      clientWrapperUnderTest = new ClientWrapper(pageStub, metadata);

      // Call the method and make assertions.
      await clientWrapperUnderTest.fillOutField(expectedSelector, expectedValue);
      expect(pageStub['___currentFrame'].select).to.have.been.calledWith(expectedSelector, expectedValue);
    });

    it('selectElement:cannotSelectValue', () => {
      const expectedSelector = 'select[name=Country]';
      const expectedValue = 'CA';

      // Set up test instance.
      pageStub['___currentFrame'].evaluate.onCall(0).resolves('choose');
      pageStub['___currentFrame'].select.rejects();
      pageStub['___currentFrame'].listeners.resolves();
      pageStub['___currentFrame'].addListener.resolves();
      clientWrapperUnderTest = new ClientWrapper(pageStub, metadata);

      // Call the method and make assertions.
      return expect(clientWrapperUnderTest.fillOutField(expectedSelector, expectedValue))
        .to.be.rejected;
    });

    it('checkBox:happyPath', async () => {
      const expectedSelector = 'input[type=checkbox]';
      const expectedValue = 'yes';

      // Set up test instance.
      pageStub['___currentFrame'].evaluate.onCall(0).resolves('tick');
      pageStub['___currentFrame'].evaluate.onCall(1).resolves();
      pageStub['___currentFrame'].addListener.resolves();
      pageStub['___currentFrame'].listeners.resolves([]);
      clientWrapperUnderTest = new ClientWrapper(pageStub, metadata);

      // Call the method and make assertions.
      await clientWrapperUnderTest.fillOutField(expectedSelector, expectedValue);
      expect(pageStub['___currentFrame'].evaluate.secondCall).to.have.been.calledWith(sinon.match.any, expectedSelector);
    });

    it('checkBox:cannotTickInput', () => {
      const expectedSelector = 'input[type=checkbox]';
      const expectedValue = 'yes';

      // Set up test instance.
      pageStub['___currentFrame'].evaluate.onCall(0).resolves('tick');
      pageStub['___currentFrame'].evaluate.onCall(1).rejects();
      pageStub['___currentFrame'].addListener.resolves();
      pageStub['___currentFrame'].listeners.resolves([]);
      clientWrapperUnderTest = new ClientWrapper(pageStub, metadata);

      // Call the method and make assertions.
      return expect(clientWrapperUnderTest.fillOutField(expectedSelector, expectedValue))
        .to.be.rejected;
    });

    it('radio:happyPath', async () => {
      const expectedSelector = 'input[type=radio]';
      const expectedValue = 'someValue';

      // Set up test instance.
      pageStub['___currentFrame'].evaluate.onCall(0).resolves('radio');
      pageStub['___currentFrame'].evaluate.onCall(1).resolves();
      pageStub['___currentFrame'].addListener.resolves();
      pageStub['___currentFrame'].listeners.resolves([]);
      clientWrapperUnderTest = new ClientWrapper(pageStub, metadata);

      // Call the method and make assertions.
      await clientWrapperUnderTest.fillOutField(expectedSelector, expectedValue);
      expect(pageStub['___currentFrame'].evaluate).to.have.been.calledWith(sinon.match.any, `${expectedSelector}[value="${expectedValue}"]`);
    });

    it('radio:cannotSelectRadioButton', async () => {
      const expectedSelector = 'input[type=radio]';
      const expectedValue = 'someValue';

      // Set up test instance.
      pageStub['___currentFrame'].evaluate.onCall(0).resolves('radio');
      pageStub['___currentFrame'].evaluate.onCall(1).rejects();
      pageStub['___currentFrame'].addListener.resolves();
      pageStub['___currentFrame'].listeners.resolves([]);
      clientWrapperUnderTest = new ClientWrapper(pageStub, metadata);

      // Call the method and make assertions.
      return expect(clientWrapperUnderTest.fillOutField(expectedSelector, expectedValue))
        .to.be.rejected;
    });

    it('textInput:happyPath', async () => {
      const expectedSelector = 'input[name=Email]';
      const expectedValue = 'atommy@example.com';

      // Set up test instance.
      pageStub['___currentFrame'].evaluate.onCall(0).resolves('type');
      pageStub['___currentFrame'].type.resolves();
      pageStub['___currentFrame'].waitForSelector.resolves();
      pageStub['___currentFrame'].listeners.resolves([]);
      pageStub['___currentFrame'].addListener.resolves();
      clientWrapperUnderTest = new ClientWrapper(pageStub, metadata);

      // Call the method and make assertions.
      await clientWrapperUnderTest.fillOutField(expectedSelector, expectedValue);
      expect(pageStub['___currentFrame'].type).to.have.been.calledWith(expectedSelector, expectedValue);
      expect(pageStub['___currentFrame'].waitForSelector).to.have.been.calledWith(expectedSelector);
    });

    it('textInput:happyPathHiddenField', async () => {
      const expectedSelector = 'input[name=Email]';
      const expectedValue = 'atommy@example.com';

      // Set up test instance.
      pageStub['___currentFrame'].evaluate.onCall(0).resolves('type');
      pageStub['___currentFrame'].type.resolves();
      pageStub['___currentFrame'].waitForSelector.rejects();
      pageStub['___currentFrame'].evaluate.onCall(1).resolves();
      pageStub['___currentFrame'].listeners.resolves([]);
      pageStub['___currentFrame'].addListener.resolves();
      clientWrapperUnderTest = new ClientWrapper(pageStub, metadata);

      // Call the method and make assertions.
      await clientWrapperUnderTest.fillOutField(expectedSelector, expectedValue);
      expect(pageStub['___currentFrame'].evaluate).to.have.been.calledWith(sinon.match.any, expectedSelector, expectedValue);
    });

    it('textInput:cannotTypeInField', () => {
      const expectedSelector = 'input[name=Email]';
      const expectedValue = 'atommy@example.com';

      // Set up test instance.
      pageStub['___currentFrame'].evaluate.onCall(0).resolves('type');
      pageStub['___currentFrame'].type.rejects();
      pageStub['___currentFrame'].evaluate.onCall(1).rejects();
      pageStub['___currentFrame'].listeners.resolves([]);
      pageStub['___currentFrame'].addListener.resolves();
      clientWrapperUnderTest = new ClientWrapper(pageStub, metadata);

      // Call the method and make assertions.
      return expect(clientWrapperUnderTest.fillOutField(expectedSelector, expectedValue))
        .to.be.rejected;
    });

    it('sadPath:cannotFindField', () => {
      const expectedSelector = 'input';
      const expectedValue = 'anyValue';

      // Set up test instance.
      pageStub['___currentFrame'].evaluate.onCall(0).rejects();
      pageStub['___currentFrame'].listeners.resolves([]);
      pageStub['___currentFrame'].addListener.resolves();
      clientWrapperUnderTest = new ClientWrapper(pageStub, metadata);

      // Call the method and make assertions.
      return expect(clientWrapperUnderTest.fillOutField(expectedSelector, expectedValue))
        .to.be.rejected;
    });

  });

  describe('submitFormByClickingButton', () => {

    beforeEach(() => {
      pageStub = sinon.stub();
      pageStub = sinon.stub();
      pageStub.addListener = sinon.stub();
      pageStub.listeners = sinon.stub();
      pageStub.waitForNavigation = sinon.stub();
      pageStub.waitForFunction = sinon.stub();
      pageStub.waitFor = sinon.stub();

      pageStub.listenerCount = sinon.stub();
      pageStub.listenerCount.onFirstCall().returns(0);
      pageStub.listenerCount.onSecondCall().returns(1);

      pageStub['___currentFrame'] = sinon.stub();
      pageStub['___currentFrame'].addListener = sinon.stub();
      pageStub['___currentFrame'].listeners = sinon.stub();
      pageStub['___currentFrame'].waitForNavigation = sinon.stub();
      pageStub['___currentFrame'].waitForSelector = sinon.stub();
      pageStub['___currentFrame'].waitForFunction = sinon.stub();
      pageStub['___currentFrame'].waitFor = sinon.stub();

      // Stub out event emitter.
      pageStub['___currentFrame'].listenerCount = sinon.stub();
      pageStub['___currentFrame'].listenerCount.onFirstCall().returns(0);
      pageStub['___currentFrame'].listenerCount.onSecondCall().returns(1);
    });

    it('happyPath:submitFormAndPageRedirects', async () => {
      const expectedButtonSelector = 'button[type=submit]';

      // Set up test instance.
      pageStub['___currentFrame'].waitForNavigation.resolves();
      pageStub['___currentFrame'].waitForFunction.resolves();
      pageStub['___currentFrame'].waitFor.rejects();
      pageStub['___currentFrame'].listeners.resolves([]);
      pageStub['___currentFrame'].addListener.resolves();
      clientWrapperUnderTest = new ClientWrapper(pageStub, metadata);

      // Call the method and make assertions.
      await clientWrapperUnderTest.submitFormByClickingButton(expectedButtonSelector);
      expect(pageStub['___currentFrame'].waitForFunction).to.have.been.calledWith(sinon.match.any, sinon.match.any, expectedButtonSelector);
    });

    it('happyPath:submitFormAndButtonDisappears', async () => {
      const expectedButtonSelector = 'button[type=submit]';

      // Set up test instance.
      pageStub['___currentFrame'].waitForNavigation.rejects();
      pageStub['___currentFrame'].waitForFunction.resolves();
      pageStub['___currentFrame'].waitFor.resolves();
      pageStub['___currentFrame'].listeners.resolves([]);
      pageStub['___currentFrame'].addListener.resolves();
      clientWrapperUnderTest = new ClientWrapper(pageStub, metadata);

      // Call the method and make assertions.
      await clientWrapperUnderTest.submitFormByClickingButton(expectedButtonSelector);
      expect(pageStub['___currentFrame'].waitForFunction).to.have.been.calledWith(sinon.match.any, sinon.match.any, expectedButtonSelector);
    });

    it('sadPath:cannotDetectSuccessfulSubmit', () => {
      const expectedButtonSelector = 'button[type=submit]';

      // Set up test instance.
      pageStub['___currentFrame'].waitForNavigation.rejects();
      pageStub['___currentFrame'].waitForFunction.onFirstCall().rejects();
      pageStub['___currentFrame'].waitForFunction.onSecondCall().resolves();
      pageStub['___currentFrame'].waitFor.resolves();
      pageStub['___currentFrame'].listeners.resolves([]);
      pageStub['___currentFrame'].addListener.resolves();
      clientWrapperUnderTest = new ClientWrapper(pageStub, metadata);

      // Call the method and make assertions.
      return expect(clientWrapperUnderTest.submitFormByClickingButton(expectedButtonSelector))
        .to.be.rejected;
    });

    it('sadPath:cannotClickSubmitButton', () => {
      const expectedButtonSelector = 'button[type=submit]';

      // Set up test instance.
      pageStub['___currentFrame'].waitForNavigation.rejects();
      pageStub['___currentFrame'].waitForFunction.rejects();
      pageStub['___currentFrame'].waitFor.resolves();
      pageStub['___currentFrame'].listeners.resolves([]);
      pageStub['___currentFrame'].addListener.resolves();
      clientWrapperUnderTest = new ClientWrapper(pageStub, metadata);

      // Call the method and make assertions.
      return expect(clientWrapperUnderTest.submitFormByClickingButton(expectedButtonSelector))
        .to.be.rejected;
    });

  });

  describe('getCurrentPageInfo', () => {

    beforeEach(() => {
      pageStub = sinon.stub();
      pageStub.listeners = sinon.stub();
      pageStub.addListener = sinon.stub();
      pageStub.___lastResponse = {
        status: sinon.stub(),
        url: sinon.stub(),
        text: sinon.stub(),
      };

      // Stub out event emitter.
      pageStub.listenerCount = sinon.stub()
      pageStub.listenerCount.onFirstCall().returns(0);
      pageStub.listenerCount.onSecondCall().returns(1);
    });

    it('sadPath:noPageContext', () => {
      // Set up test instance.
      delete pageStub.___lastResponse;
      clientWrapperUnderTest = new ClientWrapper(pageStub, metadata);
      pageStub.addListener.resolves();
      pageStub.listeners.resolves();

      // Call the method and make assertions.
      return expect(clientWrapperUnderTest.getCurrentPageInfo.bind(clientWrapperUnderTest, 'status'))
        .to.throw;
    });

    it('sadPath:unknownDetail', () => {
      // Set up test instance.
      delete pageStub.___lastResponse;
      clientWrapperUnderTest = new ClientWrapper(pageStub, metadata);
      pageStub.listeners.resolves();
      pageStub.addListener.resolves();

      // Call the method and make assertions.
      return expect(clientWrapperUnderTest.getCurrentPageInfo.bind(clientWrapperUnderTest, 'unknown'))
        .to.throw;
    });

    it('happyPath:url', async () => {
      const expectedUrl = 'https://example.com';

      // Set up test instance.
      pageStub.___lastResponse.url.resolves(expectedUrl);
      pageStub.listeners.resolves([]);
      pageStub.addListener.resolves();
      clientWrapperUnderTest = new ClientWrapper(pageStub, metadata);

      // Call the method and make assertions.
      const actual = await clientWrapperUnderTest.getCurrentPageInfo('url');
      expect(actual).to.be.string(expectedUrl);
    });

    it('happyPath:content', async () => {
      const expectedContent = '<html><body>Example</body></html>';

      // Set up test instance.
      pageStub.___lastResponse.text.resolves(expectedContent);
      pageStub.listeners.resolves([]);
      pageStub.addListener.resolves();
      clientWrapperUnderTest = new ClientWrapper(pageStub, metadata);

      // Call the method and make assertions.
      const actual = await clientWrapperUnderTest.getCurrentPageInfo('text');
      expect(actual).to.be.string(expectedContent);
    });

    it('happyPath:status', async () => {
      const expectedStatus = '200';

      // Set up test instance.
      pageStub.___lastResponse.status.resolves(expectedStatus);
      pageStub.listeners.resolves([]);
      pageStub.addListener.resolves();
      clientWrapperUnderTest = new ClientWrapper(pageStub, metadata);

      // Call the method and make assertions.
      const actual = await clientWrapperUnderTest.getCurrentPageInfo('status');
      expect(actual).to.be.string(expectedStatus);
    });

  });

  describe('getMetaTagContent', () => {

    beforeEach(() => {
      pageStub = sinon.stub();
      pageStub.listeners = sinon.stub();
      pageStub.addListener = sinon.stub();
      pageStub.evaluate = sinon.stub();

      pageStub['___currentFrame'] = sinon.stub();
      pageStub['___currentFrame'].waitFor = sinon.stub();
      pageStub['___currentFrame'].evaluate = sinon.stub();

      // Stub out event emitter.
      pageStub.listenerCount = sinon.stub();
      pageStub.listenerCount.onFirstCall().returns(0);
      pageStub.listenerCount.onSecondCall().returns(1);
    });

    it('sadPath:elementNotFound', () => {
      // Set up test instance.
      pageStub['___currentFrame'].waitFor.rejects();
      pageStub['___currentFrame'].evaluate.resolves();
      pageStub.listeners.resolves([]);
      pageStub.addListener.resolves();
      clientWrapperUnderTest = new ClientWrapper(pageStub, metadata);

      // Call the method and make assertions.
      return expect(clientWrapperUnderTest.getMetaTagContent.bind(clientWrapperUnderTest, 'title'))
        .to.throw;
    });

    it('sadPath:pageEvalThrows', () => {
      // Set up test instance.
      pageStub['___currentFrame'].waitFor.resolves();
      pageStub['___currentFrame'].evaluate.throws();
      pageStub.listeners.resolves([]);
      pageStub.addListener.resolves();
      clientWrapperUnderTest = new ClientWrapper(pageStub, metadata);

      // Call the method and make assertions.
      return expect(clientWrapperUnderTest.getMetaTagContent.bind(clientWrapperUnderTest, 'title'))
        .to.throw;
    });

    it('happyPath:title', async () => {
      const expectedTitle = 'Some Page Title';

      // Set up test instance.
      pageStub['___currentFrame'].waitFor.resolves();
      pageStub['___currentFrame'].evaluate.resolves(expectedTitle);
      pageStub.listeners.resolves([]);
      pageStub.addListener.resolves();
      clientWrapperUnderTest = new ClientWrapper(pageStub, metadata);

      // Call the method and make assertions.
      const actual = await clientWrapperUnderTest.getMetaTagContent('title');
      expect(actual).to.be.string(expectedTitle);
      expect(pageStub['___currentFrame'].waitFor).to.have.been.calledWith('title');
    });

    it('happyPath:otherTag', async () => {
      const expectedOgDescription = 'Some Open Graph Description';

      // Set up test instance.
      pageStub['___currentFrame'].waitFor.resolves();
      pageStub['___currentFrame'].evaluate.resolves(expectedOgDescription);
      pageStub.listeners.resolves([]);
      pageStub.addListener.resolves();
      clientWrapperUnderTest = new ClientWrapper(pageStub, metadata);

      // Call the method and make assertions.
      const actual = await clientWrapperUnderTest.getMetaTagContent('og:description');
      expect(pageStub['___currentFrame'].waitFor).to.have.been.calledWith('meta[name="og:description"], meta[property="og:description"]');
      expect(pageStub['___currentFrame'].evaluate).to.have.been.calledWith(sinon.match.any, 'og:description');
      expect(actual).to.be.string(expectedOgDescription);
    });

  });

  describe('clickElement', () => {
    beforeEach(() => {
      pageStub = sinon.stub();
      pageStub.listeners = sinon.stub();
      pageStub.addListener = sinon.stub();
      pageStub.evaluate = sinon.stub();
      pageStub['___currentFrame'] = sinon.stub();
      pageStub['___currentFrame'].evaluate = sinon.stub();
      pageStub['___currentFrame'].waitFor = sinon.stub();

      // Stub out event emitter.
      pageStub.listenerCount = sinon.stub();
      pageStub.listenerCount.onFirstCall().returns(0);
      pageStub.listenerCount.onSecondCall().returns(1);

      clientWrapperUnderTest = new ClientWrapper(pageStub, metadata);
    });

    describe('happyPath:selectorClicked', () => {
      const expectedSelector = 'button';

      beforeEach(() => {
        pageStub['___currentFrame'].waitFor.resolves();
        pageStub['___currentFrame'].evaluate.resolves();
      });

      it('should call with expectedArgs', async () => {
        await clientWrapperUnderTest.clickElement(expectedSelector);
        expect(pageStub['___currentFrame'].waitFor).to.have.been.calledWith(expectedSelector);
        expect(pageStub['___currentFrame'].evaluate).to.have.been.calledWith(sinon.match.any, expectedSelector);
      });
    });

    describe('sadPath:elementNotFound', () => {
      const expectedSelector = 'button';

      beforeEach(() => {
        pageStub['___currentFrame'].waitFor.rejects();
        pageStub['___currentFrame'].evaluate.resolves();
      });

      it('should throw', () => {
        return expect(clientWrapperUnderTest.clickElement.bind(clientWrapperUnderTest, expectedSelector))
        .to.throw;
      });
    });
  });

  describe('sadPath:evaluationError', () => {
    const expectedSelector = 'button';

    beforeEach(() => {
      pageStub['___currentFrame'].waitFor.resolves();
      pageStub['___currentFrame'].evaluate.rejects();
    });

    it('should throw', () => {
      return expect(clientWrapperUnderTest.clickElement.bind(clientWrapperUnderTest, expectedSelector))
      .to.throw;
    });
  });

  describe('getLighthouseScores', () => {
    let lighthouse;
    beforeEach(() => {
      pageStub = sinon.stub();
      pageStub.listeners = sinon.stub();
      pageStub.addListener = sinon.stub();

      pageStub.$ = sinon.stub();
      pageStub.browser = sinon.stub();

      const browser: any = sinon.stub();
      browser.wsEndpoint = sinon.stub();
      browser.wsEndpoint.returns('ws://127.0.0.1:2897/devtools/browser/7604989c-8305-487a-b2a9-1634ef5fde6a');
      pageStub.browser.returns(browser);

      // Stub out event emitter.
      pageStub.listenerCount = sinon.stub();
      pageStub.listenerCount.onFirstCall().returns(0);
      pageStub.listenerCount.onSecondCall().returns(1);

      lighthouse = sinon.stub();
      lighthouse.returns(Promise.resolve({}));

      clientWrapperUnderTest = new ClientWrapper(pageStub, null, lighthouse);
    });

    it('should call lighthouse with expected url', async () => {
      await clientWrapperUnderTest.getLighthouseScores('http://crank.run', 'desktop');
      expect(lighthouse.getCall(0).args[0]).to.equal('http://crank.run');
    });

    it('should call lighthouse with expected flags', async () => {
      await clientWrapperUnderTest.getLighthouseScores('http://crank.run', 'desktop');

      expect(lighthouse.getCall(0).args[1].port).to.equal('2897');
    });

    it('should call lighthouse with expected config', async () => {
      const expectedConfig = DesktopConfig;
      expectedConfig.settings.onlyCategories = ['performance'];
      await clientWrapperUnderTest.getLighthouseScores('http://crank.run', 'desktop');
      expect(lighthouse.getCall(0).args[2]).to.equal(expectedConfig);
    });
  });

  describe('focusFrame', () => {
    beforeEach(() => {
      pageStub = sinon.stub();
      pageStub.listeners = sinon.stub();
      pageStub.addListener = sinon.stub();

      pageStub.$ = sinon.stub();
      pageStub.waitForSelector = sinon.stub();

      // Stub out event emitter.
      pageStub.listenerCount = sinon.stub();
      pageStub.listenerCount.onFirstCall().returns(0);
      pageStub.listenerCount.onSecondCall().returns(1);

      clientWrapperUnderTest = new ClientWrapper(pageStub, metadata);
    });

    describe('main', () => {
      const selector = 'main';
      const frame = 'mainFrame';
      beforeEach(() => {
        pageStub.mainFrame = sinon.stub();
        pageStub.mainFrame.returns(frame);
      });
      it('should set the ___currentFrame of the page', async () => {
        await clientWrapperUnderTest.focusFrame(selector);
        expect(pageStub['___currentFrame']).to.equal(frame);
      });
    });

    describe('any selector', () => {
      const selector = 'iframe';
      const frame = 'contentFrame';
      beforeEach(() => {
        const elementHandleStub: any = sinon.stub();
        elementHandleStub.contentFrame = sinon.stub();
        elementHandleStub.contentFrame.resolves(frame);
        pageStub.waitForSelector.resolves();
        pageStub.$.resolves(elementHandleStub);
      });

      it('should set ___currentFrame of the page', async () => {
        await clientWrapperUnderTest.focusFrame(selector);
        expect(pageStub['___currentFrame']).to.equal(frame);
      });
    });

    describe('LinkedIn', () => {

    });
  });

  describe('Check Network Requests', () => {
    describe('GET requests', () => {
      beforeEach(() => {
        clientWrapperUnderTest = new ClientWrapper(pageStub, new Metadata());
      });

      it('should return at least 1 request that matched with expected query params', () => {
        const requests = [
          {
            method: 'GET',
            url: 'http://thisisjust.atomatest.com?id=1&query=test',
          },
        ];

        const expectedParams = {
          id: '1',
          query: 'test',
        };

        const result = clientWrapperUnderTest.evaluateRequests(requests, expectedParams);
        expect(result.length).to.be.greaterThan(0);
      });

      it('should return no request(s) when query params are not matched', () => {
        const requests = [
          {
            method: 'GET',
            url: 'http://thisisjust.atomatest.com?id=1&query=test',
          },
        ];

        const expectedParams = {
          id: '1000000',
          color: '000000',
        };

        const result = clientWrapperUnderTest.evaluateRequests(requests, expectedParams);
        expect(result.length).to.equal(0);
      });
    });

    describe('POST requests', () => {
      beforeEach(() => {
        clientWrapperUnderTest = new ClientWrapper(pageStub, new Metadata());
      });

      it('should return at least 1 request that matched with expected query params', () => {
        const expectedParams = {
          name: 'Atomatommy',
          country: 'US',
        };

        const requests = [
          {
            method: 'POST',
            url: 'http://thisisjust.atomatest.com/api/users',
            postData: JSON.stringify(expectedParams),
            rawRequest: {
              _headers: {
                'content-type': 'application/json',
              },
            },
          },
        ];

        const result = clientWrapperUnderTest.evaluateRequests(requests, expectedParams);
        expect(result.length).to.be.greaterThan(0);
      });

      it('should return no request(s) when postData are not matched', () => {
        const expectedParams = {
          wrongProperty: 'Wrong Property',
          wrongValue: 'Wrong Value',
        };

        const requests = [
          {
            method: 'POST',
            url: 'http://thisisjust.atomatest.com/api/users',
            postData: JSON.stringify({ name: 'Atomatommy' }),
            rawRequest: {
              _headers: {
                'content-type': 'application/json',
              },
            },
          },
        ];

        const result = clientWrapperUnderTest.evaluateRequests(requests, expectedParams);
        expect(result.length).to.equal(0);
      });

      it('should throw error when a not supported content type is evaluated', () => {
        const expectedParams = {
          wrongProperty: 'Wrong Property',
          wrongValue: 'Wrong Value',
        };

        const requests = [
          {
            method: 'POST',
            url: 'http://thisisjust.atomatest.com/api/users',
            postData: JSON.stringify({ name: 'Atomatommy' }),
            rawRequest: {
              _headers: {
                'content-type': 'invalid/content-type',
              },
            },
          },
        ];

        expect(clientWrapperUnderTest.evaluateRequests.bind(null, requests, expectedParams)).to.throw();
      });
    });
  });
});
