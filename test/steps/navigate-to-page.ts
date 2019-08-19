import { Struct } from 'google-protobuf/google/protobuf/struct_pb';
import * as chai from 'chai';
import { default as sinon } from 'ts-sinon';
import * as sinonChai from 'sinon-chai';
import 'mocha';

import { Step as ProtoStep, StepDefinition, FieldDefinition, RunStepResponse } from '../../src/proto/cog_pb';
import { Step } from '../../src/steps/navigate-to-page';

chai.use(sinonChai);

describe('NavigateToPage', () => {
  const expect = chai.expect;
  let protoStep: ProtoStep;
  let stepUnderTest: Step;
  let pageStub: any;
  let browserStub: any;

  beforeEach(() => {
    // Set up test stubs.
    browserStub = sinon.stub();
    browserStub.userAgent = sinon.stub();
    pageStub = sinon.stub();
    pageStub.goto = sinon.stub();
    pageStub.setUserAgent = sinon.stub();
    pageStub.browser = sinon.stub();
    pageStub.browser.resolves(browserStub);

    stepUnderTest = new Step(pageStub);
    protoStep = new ProtoStep();
  });

  it('should return expected step metadata', () => {
    const stepDef: StepDefinition = stepUnderTest.getDefinition();
    expect(stepDef.getStepId()).to.equal('NavigateToPage');
    expect(stepDef.getName()).to.equal('Navigate to a webpage');
    expect(stepDef.getExpression()).to.equal('navigate to (?<webPageUrl>.+)');
    expect(stepDef.getType()).to.equal(StepDefinition.Type.ACTION);
  });

  it('should return expected step fields', () => {
    const stepDef: StepDefinition = stepUnderTest.getDefinition();
    const fields: any[] = stepDef.getExpectedFieldsList().map((field: FieldDefinition) => {
      return field.toObject();
    });

    // Web Page URL field
    const pageUrl: any = fields.filter(f => f.key === 'webPageUrl')[0];
    expect(pageUrl.optionality).to.equal(FieldDefinition.Optionality.REQUIRED);
    expect(pageUrl.type).to.equal(FieldDefinition.Type.URL);
  });

  it('should set identifiable user agent', async () => {
    const originalUserAgent = 'Mozilla/a.b HeadlessChrome/x.y.z';
    const expectedUserAgent = 'Mozilla/a.b AutomatonHeadlessChrome/x.y.z';

    // Stub a successful navigation, but unsuccessful form fill.
    browserStub.userAgent.resolves(originalUserAgent);
    pageStub.setUserAgent.resolves();
    pageStub.goto.resolves();

    protoStep.setData(Struct.fromJavaScript({webPageUrl: 'https://mayaswell.exist'}));

    await stepUnderTest.executeStep(protoStep);
    expect(pageStub.setUserAgent).to.have.been.calledWith(expectedUserAgent);
  });

  it('should pass when puppeteer successfully navigates to page', async () => {
    // Stub a response that matches expectations.
    browserStub.userAgent.resolves('');
    pageStub.setUserAgent.resolves();
    pageStub.goto.resolves();

    // Set step data corresponding to expectations
    protoStep.setData(Struct.fromJavaScript({webPageUrl: 'https://mayaswell.exist'}));

    const response: RunStepResponse = await stepUnderTest.executeStep(protoStep);
    expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.PASSED);
  });

  it('should respond with error if puppeteer is unable to navigate', async () => {
    // Stub a navigation that rejects.
    browserStub.userAgent.resolves('');
    pageStub.setUserAgent.resolves();
    pageStub.goto.rejects();

    // Set step data corresponding to expectations
    protoStep.setData(Struct.fromJavaScript({webPageUrl: 'https://doesnot.exist'}));

    const response: RunStepResponse = await stepUnderTest.executeStep(protoStep);
    expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.ERROR);
  });

});
