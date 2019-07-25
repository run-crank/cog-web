import { Struct } from 'google-protobuf/google/protobuf/struct_pb';
import * as chai from 'chai';
import { default as sinon } from 'ts-sinon';
import * as sinonChai from 'sinon-chai';
import 'mocha';

import { Step as ProtoStep, StepDefinition, FieldDefinition, RunStepResponse } from '../../src/proto/cog_pb';
import { Step } from '../../src/steps/fill-out-field';

chai.use(sinonChai);

describe('EnterValueIntoField', () => {
  const expect = chai.expect;
  let protoStep: ProtoStep;
  let stepUnderTest: Step;
  let pageStub: any;

  beforeEach(() => {
    // Set up test stubs.
    pageStub = sinon.stub();
    pageStub.evaluate = sinon.stub();
    pageStub.select = sinon.stub();
    pageStub.type = sinon.stub();

    stepUnderTest = new Step(pageStub);
    protoStep = new ProtoStep();
  });

  it('should return expected step metadata', () => {
    const stepDef: StepDefinition = stepUnderTest.getDefinition();
    expect(stepDef.getStepId()).to.equal('EnterValueIntoField');
    expect(stepDef.getName()).to.equal('Enter value into field');
    expect(stepDef.getExpression()).to.equal('enter (?<value>.+) into field (?<domQuerySelector>.+)');
  });

  it('should return expected step fields', () => {
    const stepDef: StepDefinition = stepUnderTest.getDefinition();
    const fields: any[] = stepDef.getExpectedFieldsList().map((field: FieldDefinition) => {
      return field.toObject();
    });

    // Value field
    const value: any = fields.filter(f => f.key === 'value')[0];
    expect(value.optionality).to.equal(FieldDefinition.Optionality.REQUIRED);
    expect(value.type).to.equal(FieldDefinition.Type.ANYSCALAR);

    // DOM Query Selector field
    const selector: any = fields.filter(f => f.key === 'domQuerySelector')[0];
    expect(selector.optionality).to.equal(FieldDefinition.Optionality.REQUIRED);
    expect(selector.type).to.equal(FieldDefinition.Type.STRING);
  });

  it('should pass when puppeteer successfully selects value', async () => {
    const expectedData = {
      value: 'CA',
      domQuerySelector: 'select[name=Country]',
    };

    // Stub a response that matches expectations.
    pageStub.evaluate.onCall(0).resolves('choose');
    pageStub.select.resolves();

    // Set step data corresponding to expectations
    protoStep.setData(Struct.fromJavaScript(expectedData));

    const response: RunStepResponse = await stepUnderTest.executeStep(protoStep);
    expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.PASSED);
    expect(pageStub.select).to.have.been.calledWith(expectedData.domQuerySelector, expectedData.value);
  });

  it('should respond with error when puppeteer cannot select value', async () => {
    const expectedData = {
      value: 'CA',
      domQuerySelector: 'select[name=Country]',
    };

    // Stub a response that matches expectations.
    pageStub.evaluate.onCall(0).resolves('choose');
    pageStub.select.rejects();

    // Set step data corresponding to expectations
    protoStep.setData(Struct.fromJavaScript(expectedData));

    const response: RunStepResponse = await stepUnderTest.executeStep(protoStep);
    expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.ERROR);
  });

  it('should pass when puppeteer successfully ticks checkbox', async () => {
    const expectedData = {
      value: 'yes',
      domQuerySelector: 'input[type=checkbox]',
    };

    // Stub a response that matches expectations.
    pageStub.evaluate.onCall(0).resolves('tick');
    pageStub.evaluate.onCall(1).resolves();

    // Set step data corresponding to expectations
    protoStep.setData(Struct.fromJavaScript(expectedData));

    const response: RunStepResponse = await stepUnderTest.executeStep(protoStep);
    expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.PASSED);
    expect(pageStub.evaluate.secondCall).to.have.been.calledWith(sinon.match.any, expectedData.domQuerySelector);
  });

  it('should respond with error when puppeteer cannot tick checkbox', async () => {
    const expectedData = {
      value: 'yes',
      domQuerySelector: 'input[type=checkbox]',
    };

    // Stub a response that matches expectations.
    pageStub.evaluate.onCall(0).resolves('tick');
    pageStub.evaluate.onCall(1).rejects();

    // Set step data corresponding to expectations
    protoStep.setData(Struct.fromJavaScript(expectedData));

    const response: RunStepResponse = await stepUnderTest.executeStep(protoStep);
    expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.ERROR);
  });

  it('should pass when puppeteer successfully enters text into field', async () => {
    const expectedData = {
      value: 'atommy@example.com',
      domQuerySelector: 'input[name=Email]',
    };

    // Stub a response that matches expectations.
    pageStub.evaluate.onCall(0).resolves('type');
    pageStub.type.resolves();

    // Set step data corresponding to expectations
    protoStep.setData(Struct.fromJavaScript(expectedData));

    const response: RunStepResponse = await stepUnderTest.executeStep(protoStep);
    expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.PASSED);
    expect(pageStub.type).to.have.been.calledWith(expectedData.domQuerySelector, expectedData.value);
  });

  it('should respond with error when puppeteer cannot enter text into field', async () => {
    const expectedData = {
      value: 'atommy@example.com',
      domQuerySelector: 'input[name=Email]',
    };

    // Stub a response that matches expectations.
    pageStub.evaluate.onCall(0).resolves('type');
    pageStub.type.rejects();

    // Set step data corresponding to expectations
    protoStep.setData(Struct.fromJavaScript(expectedData));

    const response: RunStepResponse = await stepUnderTest.executeStep(protoStep);
    expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.ERROR);
  });

  it('should respond with error if puppeteer is unable to find field', async () => {
    const expectedData = {
      value: 'atommy@example.com',
      domQuerySelector: 'input[name=Email]',
    };

    // Stub a response that matches expectations.
    pageStub.evaluate.onCall(0).rejects()

    // Set step data corresponding to expectations
    protoStep.setData(Struct.fromJavaScript(expectedData));

    const response: RunStepResponse = await stepUnderTest.executeStep(protoStep);
    expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.ERROR);
  });

});
