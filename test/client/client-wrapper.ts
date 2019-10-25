import * as chai from 'chai';
import { Metadata } from 'grpc';
import { default as sinon } from 'ts-sinon';
import * as sinonChai from 'sinon-chai';
import * as justForIdeTypeHinting from 'chai-as-promised';
import 'mocha';

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
      pageStub.goto = sinon.stub();

      // Stub out event emitter.
      pageStub.listenerCount = sinon.stub()
      pageStub.listenerCount.onFirstCall().returns(0);
      pageStub.listenerCount.onSecondCall().returns(1);
    });

    it('happyPath', async () => {
      const expectedUrl = 'https://example.com';
      const originalUserAgent = 'Mozilla/a.b HeadlessChrome/x.y.z';
      const expectedUserAgent = 'Mozilla/a.b AutomatonHeadlessChrome/x.y.z';
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
      pageStub.listenerCount = sinon.stub()
      pageStub.listenerCount.onFirstCall().returns(0);
      pageStub.listenerCount.onSecondCall().returns(1);
    });

    it('selectElement:happypath', async () => {
      const expectedSelector = 'select[name=Country]';
      const expectedValue = 'CA';

      // Set up test instance.
      pageStub.evaluate.onCall(0).resolves('choose');
      pageStub.select.resolves();
      pageStub.listeners.resolves([]);
      pageStub.addListener.resolves();
      clientWrapperUnderTest = new ClientWrapper(pageStub, metadata);

      // Call the method and make assertions.
      await clientWrapperUnderTest.fillOutField(expectedSelector, expectedValue);
      expect(pageStub.select).to.have.been.calledWith(expectedSelector, expectedValue);
    });

    it('selectElement:cannotSelectValue', () => {
      const expectedSelector = 'select[name=Country]';
      const expectedValue = 'CA';

      // Set up test instance.
      pageStub.evaluate.onCall(0).resolves('choose');
      pageStub.select.rejects();
      pageStub.listeners.resolves()
      pageStub.addListener.resolves();
      clientWrapperUnderTest = new ClientWrapper(pageStub, metadata);

      // Call the method and make assertions.
      return expect(clientWrapperUnderTest.fillOutField(expectedSelector, expectedValue))
        .to.be.rejected;
    });

    it('checkBox:happyPath', async () => {
      const expectedSelector = 'input[type=checkbox]';
      const expectedValue = 'yes';

      // Set up test instance.
      pageStub.evaluate.onCall(0).resolves('tick');
      pageStub.evaluate.onCall(1).resolves();
      pageStub.addListener.resolves();
      pageStub.listeners.resolves([]);
      clientWrapperUnderTest = new ClientWrapper(pageStub, metadata);

      // Call the method and make assertions.
      await clientWrapperUnderTest.fillOutField(expectedSelector, expectedValue);
      expect(pageStub.evaluate.secondCall).to.have.been.calledWith(sinon.match.any, expectedSelector);
    });

    it('checkBox:cannotTickInput', () => {
      const expectedSelector = 'input[type=checkbox]';
      const expectedValue = 'yes';

      // Set up test instance.
      pageStub.evaluate.onCall(0).resolves('tick');
      pageStub.evaluate.onCall(1).rejects();
      pageStub.addListener.resolves();
      pageStub.listeners.resolves([]);
      clientWrapperUnderTest = new ClientWrapper(pageStub, metadata);

      // Call the method and make assertions.
      return expect(clientWrapperUnderTest.fillOutField(expectedSelector, expectedValue))
        .to.be.rejected;
    });

    it('textInput:happyPath', async () => {
      const expectedSelector = 'input[name=Email]';
      const expectedValue = 'atommy@example.com';

      // Set up test instance.
      pageStub.evaluate.onCall(0).resolves('type');
      pageStub.type.resolves();
      pageStub.waitForSelector.resolves();
      pageStub.listeners.resolves([]);
      pageStub.addListener.resolves();
      clientWrapperUnderTest = new ClientWrapper(pageStub, metadata);

      // Call the method and make assertions.
      await clientWrapperUnderTest.fillOutField(expectedSelector, expectedValue);
      expect(pageStub.type).to.have.been.calledWith(expectedSelector, expectedValue);
      expect(pageStub.waitForSelector).to.have.been.calledWith(expectedSelector);
    });

    it('textInput:happyPathHiddenField', async () => {
      const expectedSelector = 'input[name=Email]';
      const expectedValue = 'atommy@example.com';

      // Set up test instance.
      pageStub.evaluate.onCall(0).resolves('type');
      pageStub.type.resolves();
      pageStub.waitForSelector.rejects();
      pageStub.evaluate.onCall(1).resolves();
      pageStub.listeners.resolves([]);
      pageStub.addListener.resolves();
      clientWrapperUnderTest = new ClientWrapper(pageStub, metadata);

      // Call the method and make assertions.
      await clientWrapperUnderTest.fillOutField(expectedSelector, expectedValue);
      expect(pageStub.evaluate).to.have.been.calledWith(sinon.match.any, expectedSelector, expectedValue);
    });

    it('textInput:cannotTypeInField', () => {
      const expectedSelector = 'input[name=Email]';
      const expectedValue = 'atommy@example.com';

      // Set up test instance.
      pageStub.evaluate.onCall(0).resolves('type');
      pageStub.type.rejects();
      pageStub.evaluate.onCall(1).rejects();
      pageStub.listeners.resolves([]);
      pageStub.addListener.resolves();
      clientWrapperUnderTest = new ClientWrapper(pageStub, metadata);

      // Call the method and make assertions.
      return expect(clientWrapperUnderTest.fillOutField(expectedSelector, expectedValue))
        .to.be.rejected;
    });

    it('sadPath:cannotFindField', () => {
      const expectedSelector = 'input';
      const expectedValue = 'anyValue';

      // Set up test instance.
      pageStub.evaluate.onCall(0).rejects();
      pageStub.listeners.resolves([]);
      pageStub.addListener.resolves();
      clientWrapperUnderTest = new ClientWrapper(pageStub, metadata);

      // Call the method and make assertions.
      return expect(clientWrapperUnderTest.fillOutField(expectedSelector, expectedValue))
        .to.be.rejected;
    });

  });

  describe('submitFormByClickingButton', () => {

    beforeEach(() => {
      pageStub = sinon.stub();
      pageStub.click = sinon.stub();
      pageStub.addListener = sinon.stub();
      pageStub.listeners = sinon.stub();
      pageStub.waitForNavigation = sinon.stub();
      pageStub.waitForFunction = sinon.stub();
      pageStub.waitFor = sinon.stub();

      // Stub out event emitter.
      pageStub.listenerCount = sinon.stub()
      pageStub.listenerCount.onFirstCall().returns(0);
      pageStub.listenerCount.onSecondCall().returns(1);
    });

    it('happyPath:submitFormAndPageRedirects', async () => {
      const expectedButtonSelector = 'button[type=submit]';

      // Set up test instance.
      pageStub.click.resolves();
      pageStub.waitForNavigation.resolves();
      pageStub.waitForFunction.resolves();
      pageStub.waitFor.rejects();
      pageStub.listeners.resolves([]);
      pageStub.addListener.resolves();
      clientWrapperUnderTest = new ClientWrapper(pageStub, metadata);

      // Call the method and make assertions.
      await clientWrapperUnderTest.submitFormByClickingButton(expectedButtonSelector);
      expect(pageStub.click).to.have.been.calledWith(expectedButtonSelector);
    });

    it('happyPath:submitFormAndButtonDisappears', async () => {
      const expectedButtonSelector = 'button[type=submit]';

      // Set up test instance.
      pageStub.click.resolves();
      pageStub.waitForNavigation.rejects();
      pageStub.waitForFunction.resolves();
      pageStub.waitFor.resolves();
      pageStub.listeners.resolves([]);
      pageStub.addListener.resolves();
      clientWrapperUnderTest = new ClientWrapper(pageStub, metadata);

      // Call the method and make assertions.
      await clientWrapperUnderTest.submitFormByClickingButton(expectedButtonSelector);
      expect(pageStub.click).to.have.been.calledWith(expectedButtonSelector);
    });

    it('sadPath:cannotDetectSuccessfulSubmit', () => {
      const expectedButtonSelector = 'button[type=submit]';

      // Set up test instance.
      pageStub.click.resolves();
      pageStub.waitForNavigation.rejects();
      pageStub.waitForFunction.rejects();
      pageStub.waitFor.resolves();
      pageStub.listeners.resolves([]);
      pageStub.addListener.resolves();
      clientWrapperUnderTest = new ClientWrapper(pageStub, metadata);

      // Call the method and make assertions.
      return expect(clientWrapperUnderTest.submitFormByClickingButton(expectedButtonSelector))
        .to.be.rejected;
    });

    it('sadPath:cannotClickSubmitButton', () => {
      const expectedButtonSelector = 'button[type=submit]';

      // Set up test instance.
      pageStub.click.rejects();
      pageStub.waitForNavigation.rejects();
      pageStub.waitForFunction.rejects();
      pageStub.waitFor.resolves();
      pageStub.listeners.resolves([]);
      pageStub.addListener.resolves();
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

      // Stub out event emitter.
      pageStub.listenerCount = sinon.stub()
      pageStub.listenerCount.onFirstCall().returns(0);
      pageStub.listenerCount.onSecondCall().returns(1);
    });

    it('sadPath:pageEvalThrows', () => {
      // Set up test instance.
      pageStub.evaluate.throws();
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
      pageStub.evaluate.resolves(expectedTitle);
      pageStub.listeners.resolves([]);
      pageStub.addListener.resolves();
      clientWrapperUnderTest = new ClientWrapper(pageStub, metadata);

      // Call the method and make assertions.
      const actual = await clientWrapperUnderTest.getMetaTagContent('title');
      expect(actual).to.be.string(expectedTitle);
    });

    it('happyPath:otherTag', async () => {
      const expectedOgDescription = 'Some Open Graph Description';

      // Set up test instance.
      pageStub.evaluate.resolves(expectedOgDescription);
      pageStub.listeners.resolves([]);
      pageStub.addListener.resolves();
      clientWrapperUnderTest = new ClientWrapper(pageStub, metadata);

      // Call the method and make assertions.
      const actual = await clientWrapperUnderTest.getMetaTagContent('og:description');
      expect(pageStub.evaluate).to.have.been.calledWith(sinon.match.any, 'og:description');
      expect(actual).to.be.string(expectedOgDescription);
    });

  });

});
