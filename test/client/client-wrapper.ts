import * as chai from 'chai';
import { default as sinon } from 'ts-sinon';
import * as sinonChai from 'sinon-chai';
import * as justForIdeTypeHinting from 'chai-as-promised';
import 'mocha';

import { ClientWrapper } from '../../src/client/client-wrapper';
import { Metadata } from 'grpc';

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
      pageStub.browser = sinon.stub();
      pageStub.browser.resolves(browserStub);
      pageStub.setUserAgent = sinon.stub();
      pageStub.goto = sinon.stub();
    });

    it('happyPath', async () => {
      const expectedUrl = 'https://example.com';
      const originalUserAgent = 'Mozilla/a.b HeadlessChrome/x.y.z';
      const expectedUserAgent = 'Mozilla/a.b AutomatonHeadlessChrome/x.y.z';

      // Set up test instance.
      browserStub.userAgent.resolves(originalUserAgent);
      pageStub.setUserAgent.resolves();
      pageStub.goto.resolves();
      clientWrapperUnderTest = new ClientWrapper(pageStub, metadata);

      // Call the method and make assertions.
      await clientWrapperUnderTest.navigateToUrl(expectedUrl);
      expect(pageStub.setUserAgent).to.have.been.calledWith(expectedUserAgent);
      expect(pageStub.goto).to.have.been.calledWith(expectedUrl, { waitUntil: 'networkidle0' });
    });

    it('sadPath', () => {
      const expectedUrl = 'https://example.com';

      // Set up test instance.
      browserStub.userAgent.resolves('AnyUser/Agent x.y.z');
      pageStub.setUserAgent.resolves();
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
      pageStub.select = sinon.stub();
      pageStub.type = sinon.stub();
    })

    it('selectElement:happypath', async () => {
      const expectedSelector = 'select[name=Country]';
      const expectedValue = 'CA';

      // Set up test instance.
      pageStub.evaluate.onCall(0).resolves('choose');
      pageStub.select.resolves();
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
      clientWrapperUnderTest = new ClientWrapper(pageStub, metadata);

      // Call the method and make assertions.
      await clientWrapperUnderTest.fillOutField(expectedSelector, expectedValue);
      expect(pageStub.type).to.have.been.calledWith(expectedSelector, expectedValue);
    });

    it('textInput:cannotTypeInField', () => {
      const expectedSelector = 'input[name=Email]';
      const expectedValue = 'atommy@example.com';

      // Set up test instance.
      pageStub.evaluate.onCall(0).resolves('type');
      pageStub.type.rejects();
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
      pageStub.waitForNavigation = sinon.stub();
      pageStub.waitForFunction = sinon.stub();
      pageStub.waitFor = sinon.stub();
    })

    it('happyPath:submitFormAndPageRedirects', async () => {
      const expectedButtonSelector = 'button[type=submit]';

      // Set up test instance.
      pageStub.click.resolves();
      pageStub.waitForNavigation.resolves();
      pageStub.waitForFunction.resolves();
      pageStub.waitFor.rejects();
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
      clientWrapperUnderTest = new ClientWrapper(pageStub, metadata);

      // Call the method and make assertions.
      return expect(clientWrapperUnderTest.submitFormByClickingButton(expectedButtonSelector))
        .to.be.rejected;
    });

  });

});
