import { Struct } from 'google-protobuf/google/protobuf/struct_pb';
import * as chai from 'chai';
import { default as sinon } from 'ts-sinon';
import * as sinonChai from 'sinon-chai';
import 'mocha';

import { Step as ProtoStep, StepDefinition, FieldDefinition, RunStepResponse } from '../../src/proto/cog_pb';
import { Step } from '../../src/steps/navigate-and-submit-form';

chai.use(sinonChai);

describe('NavigateAndSubmitForm', () => {
  const expect = chai.expect;
  let protoStep: ProtoStep;
  let stepUnderTest: Step;
  let clientWrapperStub: any;

  beforeEach(() => {
    // Set up test stubs.
    clientWrapperStub = sinon.stub();
    clientWrapperStub.navigateToUrl = sinon.stub();
    clientWrapperStub.client = sinon.stub();
    clientWrapperStub.client.screenshot = sinon.stub();
    clientWrapperStub.client.screenshot.returns('anyBinary');
    stepUnderTest = new Step(clientWrapperStub);
    protoStep = new ProtoStep();
  });

  it('should return expected step metadata', () => {
    const stepDef: StepDefinition = stepUnderTest.getDefinition();
    expect(stepDef.getStepId()).to.equal('NavigateAndSubmitForm');
    expect(stepDef.getName()).to.equal('Navigate and submit form');
    expect(stepDef.getExpression()).to.equal('navigate to (?<webPageUrl>.+) and find a form');
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

  it('should pass when puppeteer successfully navigates to page', async () => {
    // Stub a response that matches expectations.
    clientWrapperStub.navigateToUrl.resolves();

    // Set step data corresponding to expectations
    protoStep.setData(Struct.fromJavaScript({webPageUrl: 'https://mayaswell.exist'}));

    const response: RunStepResponse = await stepUnderTest.executeStep(protoStep);
    expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.PASSED);
  });

  it('should respond with error if puppeteer is unable to navigate', async () => {
    // Stub a navigation that rejects.
    clientWrapperStub.navigateToUrl.rejects();

    // Set step data corresponding to expectations
    protoStep.setData(Struct.fromJavaScript({webPageUrl: 'https://doesnot.exist'}));

    const response: RunStepResponse = await stepUnderTest.executeStep(protoStep);
    expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.ERROR);
  });

});
