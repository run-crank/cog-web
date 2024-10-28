import { Struct } from 'google-protobuf/google/protobuf/struct_pb';
import * as chai from 'chai';
import { default as sinon } from 'ts-sinon';
import sinonChai from 'sinon-chai';
import 'mocha';

import { Step as ProtoStep, StepDefinition, FieldDefinition, RunStepResponse } from '../../src/proto/cog_pb';
import { Step } from '../../src/steps/check-current-page-info';

chai.use(sinonChai);

describe('CheckCurrentPageInfo', () => {
  const expect = chai.expect;
  let protoStep: ProtoStep;
  let stepUnderTest: Step;
  let clientWrapperStub: any;

  beforeEach(() => {
    // Set up test stubs.
    clientWrapperStub = sinon.stub();
    clientWrapperStub.getCurrentPageInfo = sinon.stub();
    clientWrapperStub.waitForNetworkIdle = sinon.stub();
    stepUnderTest = new Step(clientWrapperStub);
    protoStep = new ProtoStep();
  });

  it('should return expected step metadata', () => {
    const stepDef: StepDefinition = stepUnderTest.getDefinition();
    expect(stepDef.getStepId()).to.equal('CheckCurrentPageInfo');
    expect(stepDef.getName()).to.equal('Check current page info');
    expect(stepDef.getType()).to.equal(StepDefinition.Type.VALIDATION);
    expect(stepDef.getExpression()).to.equal('the (?<field>status|text|url) of the current page should (?<operator>contain|not contain|be) (?<expectation>.+)');
  });

  it('should return expected step fields', () => {
    const stepDef: StepDefinition = stepUnderTest.getDefinition();
    const fields: any[] = stepDef.getExpectedFieldsList().map((field: FieldDefinition) => {
      return field.toObject();
    });

    // Field field
    const field: any = fields.filter(f => f.key === 'field')[0];
    expect(field.optionality).to.equal(FieldDefinition.Optionality.REQUIRED);
    expect(field.type).to.equal(FieldDefinition.Type.STRING);

    // Operator field
    const operator: any = fields.filter(f => f.key === 'operator')[0];
    expect(operator.optionality).to.equal(FieldDefinition.Optionality.REQUIRED);
    expect(operator.type).to.equal(FieldDefinition.Type.STRING);

    // Expectation field
    const expectation: any = fields.filter(f => f.key === 'expectation')[0];
    expect(expectation.optionality).to.equal(FieldDefinition.Optionality.REQUIRED);
    expect(expectation.type).to.equal(FieldDefinition.Type.ANYSCALAR);
  });

  it('should pass using "contain" operator', async () => {
    const expectedResult = 'Some Text';
    const expectedData = {
      field: 'status',
      expectation: 'Text',
      operator: 'contain',
    };

    // Stub a response that matches expectations.
    clientWrapperStub.waitForNetworkIdle.resolves();
    clientWrapperStub.getCurrentPageInfo.resolves(expectedResult);

    // Set step data corresponding to expectations
    protoStep.setData(Struct.fromJavaScript(expectedData));

    const response: RunStepResponse = await stepUnderTest.executeStep(protoStep);
    expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.PASSED);
  });

  it('should pass using "not contain" operator', async () => {
    const expectedResult = 'Some Text';
    const expectedData = {
      field: 'status',
      expectation: 'Some Different Text',
      operator: 'not contain',
    };

    // Stub a response that matches expectations.
    clientWrapperStub.waitForNetworkIdle.resolves();
    clientWrapperStub.getCurrentPageInfo.resolves(expectedResult);

    // Set step data corresponding to expectations
    protoStep.setData(Struct.fromJavaScript(expectedData));

    const response: RunStepResponse = await stepUnderTest.executeStep(protoStep);
    expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.PASSED);
  });

  it('should pass using "be" operator', async () => {
    const expectedResult = '200';
    const expectedData = {
      field: 'status',
      expectation: parseInt(expectedResult),
      operator: 'be',
    };

    // Stub a response that matches expectations.
    clientWrapperStub.waitForNetworkIdle.resolves();
    clientWrapperStub.getCurrentPageInfo.resolves(expectedResult);

    // Set step data corresponding to expectations
    protoStep.setData(Struct.fromJavaScript(expectedData));

    const response: RunStepResponse = await stepUnderTest.executeStep(protoStep);
    expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.PASSED);
  });

  it('should fail using "contain" operator', async () => {
    const expectedResult = 'Some Text';
    const expectedData = {
      field: 'status',
      expectation: 'Some Different Text',
      operator: 'contain',
    };

    // Stub a response that matches expectations.
    clientWrapperStub.waitForNetworkIdle.resolves();
    clientWrapperStub.getCurrentPageInfo.resolves(expectedResult);

    // Set step data corresponding to expectations
    protoStep.setData(Struct.fromJavaScript(expectedData));

    const response: RunStepResponse = await stepUnderTest.executeStep(protoStep);
    expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.FAILED);
  });

  it('should fail using "not contain" operator', async () => {
    const expectedResult = 'Some Text';
    const expectedData = {
      field: 'status',
      expectation: 'Text',
      operator: 'not contain',
    };

    // Stub a response that matches expectations.
    clientWrapperStub.waitForNetworkIdle.resolves();
    clientWrapperStub.getCurrentPageInfo.resolves(expectedResult);

    // Set step data corresponding to expectations
    protoStep.setData(Struct.fromJavaScript(expectedData));

    const response: RunStepResponse = await stepUnderTest.executeStep(protoStep);
    expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.FAILED);
  });

  it('should fail using "be" operator', async () => {
    const expectedResult = '200';
    const expectedData = {
      field: 'status',
      expectation: 404,
      operator: 'be',
    };

    // Stub a response that matches expectations.
    clientWrapperStub.waitForNetworkIdle.resolves();
    clientWrapperStub.getCurrentPageInfo.resolves(expectedResult);

    // Set step data corresponding to expectations
    protoStep.setData(Struct.fromJavaScript(expectedData));

    const response: RunStepResponse = await stepUnderTest.executeStep(protoStep);
    expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.FAILED);
  });

  it('should error on unknown operator', async () => {
    const expectedData = {field: 'unknownField'};
    const expectedResult = 'does not matter';

    // Stub a response that matches expectations.
    clientWrapperStub.waitForNetworkIdle.resolves();
    clientWrapperStub.getCurrentPageInfo.resolves(expectedResult);

    // Set step data corresponding to expectations
    protoStep.setData(Struct.fromJavaScript(expectedData));

    const response: RunStepResponse = await stepUnderTest.executeStep(protoStep);
    expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.ERROR);
  });

  it('should error on client wrapper exception', async () => {
    const expectedData = {field: 'status'};

    // Stub a response that matches expectations.
    clientWrapperStub.getCurrentPageInfo.throws();

    // Set step data corresponding to expectations
    protoStep.setData(Struct.fromJavaScript(expectedData));

    const response: RunStepResponse = await stepUnderTest.executeStep(protoStep);
    expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.ERROR);
  });

});
