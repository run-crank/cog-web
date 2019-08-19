import { Struct } from 'google-protobuf/google/protobuf/struct_pb';
import * as chai from 'chai';
import { default as sinon } from 'ts-sinon';
import * as sinonChai from 'sinon-chai';
import 'mocha';

import { Step as ProtoStep, StepDefinition, FieldDefinition, RunStepResponse } from '../../src/proto/cog_pb';
import { Step } from '../../src/steps/submit-form-by-clicking-button';

chai.use(sinonChai);

describe('SubmitFormByClickingButton', () => {
  const expect = chai.expect;
  let protoStep: ProtoStep;
  let stepUnderTest: Step;
  let pageStub: any;

  beforeEach(() => {
    // Set up test stubs.
    pageStub = sinon.stub();
    pageStub.waitForNavigation = sinon.stub();
    pageStub.waitForFunction = sinon.stub();
    pageStub.click = sinon.stub();
    pageStub.waitFor = sinon.stub();

    stepUnderTest = new Step(pageStub);
    protoStep = new ProtoStep();
  });

  it('should return expected step metadata', () => {
    const stepDef: StepDefinition = stepUnderTest.getDefinition();
    expect(stepDef.getStepId()).to.equal('SubmitFormByClickingButton');
    expect(stepDef.getName()).to.equal('Submit a form by clicking a button');
    expect(stepDef.getExpression()).to.equal('submit the form by clicking (?<domQuerySelector>.+)');
    expect(stepDef.getType()).to.equal(StepDefinition.Type.ACTION);
  });

  it('should return expected step fields', () => {
    const stepDef: StepDefinition = stepUnderTest.getDefinition();
    const fields: any[] = stepDef.getExpectedFieldsList().map((field: FieldDefinition) => {
      return field.toObject();
    });

    // Submit Button Selector field
    const selector: any = fields.filter(f => f.key === 'domQuerySelector')[0];
    expect(selector.optionality).to.equal(FieldDefinition.Optionality.REQUIRED);
    expect(selector.type).to.equal(FieldDefinition.Type.STRING);
  });

  it('should pass when puppeteer submits form and page redirects', async () => {
    const expectedButtonSelector = 'button[type=submit]';

    // Stub a response that matches expectations.
    pageStub.click.resolves();
    pageStub.waitForNavigation.resolves();
    pageStub.waitForFunction.resolves();
    pageStub.waitFor.rejects();

    // Set step data corresponding to expectations
    protoStep.setData(Struct.fromJavaScript({domQuerySelector: expectedButtonSelector}));

    const response: RunStepResponse = await stepUnderTest.executeStep(protoStep);
    expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.PASSED);
    expect(pageStub.click).to.have.been.calledWith(expectedButtonSelector);
  });

  it('should pass when puppeteer submits form and button goes away', async () => {
    // Stub a response that matches expectations.
    pageStub.click.resolves();
    pageStub.waitForNavigation.rejects();
    pageStub.waitForFunction.resolves();
    pageStub.waitFor.resolves();

    // Set step data corresponding to expectations
    protoStep.setData(Struct.fromJavaScript({domQuerySelector: 'button[type=submit]'}));

    const response: RunStepResponse = await stepUnderTest.executeStep(protoStep);
    expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.PASSED);
  });

  it('should result in error when puppeteer cannot detect successful submit', async () => {
    // Stub a response that matches expectations.
    pageStub.click.resolves();
    pageStub.waitForNavigation.rejects();
    pageStub.waitForFunction.rejects();
    pageStub.waitFor.resolves();

    // Set step data corresponding to expectations
    protoStep.setData(Struct.fromJavaScript({domQuerySelector: 'button[type=submit]'}));

    const response: RunStepResponse = await stepUnderTest.executeStep(protoStep);
    expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.ERROR);
  });

  it('should result in error when puppeteer cannot click button', async () => {
    // Stub a response that matches expectations.
    pageStub.click.rejects();
    pageStub.waitForNavigation.rejects();
    pageStub.waitForFunction.rejects();
    pageStub.waitFor.resolves();

    // Set step data corresponding to expectations
    protoStep.setData(Struct.fromJavaScript({domQuerySelector: 'button[type=submit]'}));

    const response: RunStepResponse = await stepUnderTest.executeStep(protoStep);
    expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.ERROR);
  });

});
