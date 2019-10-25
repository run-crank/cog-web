import { Struct } from 'google-protobuf/google/protobuf/struct_pb';
import * as chai from 'chai';
import { default as sinon } from 'ts-sinon';
import * as sinonChai from 'sinon-chai';
import 'mocha';

import { Step as ProtoStep, StepDefinition, FieldDefinition, RunStepResponse } from '../../src/proto/cog_pb';
import { Step } from '../../src/steps/check-google-analytics-page-view';

chai.use(sinonChai);

describe('CheckGoogleAnalyticsPageView', () => {
  const expect = chai.expect;
  let protoStep: ProtoStep;
  let stepUnderTest: Step;
  let clientWrapperStub: any;

  beforeEach(() => {
    // Set up test stubs.
    clientWrapperStub = sinon.stub();
    clientWrapperStub.getFinishedRequests = sinon.stub();
    stepUnderTest = new Step(clientWrapperStub);
    protoStep = new ProtoStep();
  });

  it('should return expected step metadata', () => {
    const stepDef: StepDefinition = stepUnderTest.getDefinition();
    expect(stepDef.getStepId()).to.equal('CheckGoogleAnalyticsPageView');
    expect(stepDef.getName()).to.equal('Check that Google Analytics tracked a pageview');
    expect(stepDef.getType()).to.equal(StepDefinition.Type.VALIDATION);
    expect(stepDef.getExpression()).to.equal('google analytics should have tracked a pageview for tracking id (?<id>[a-zA-Z0-9\-]+)');
  });

  it('should return expected step fields', () => {
    const stepDef: StepDefinition = stepUnderTest.getDefinition();
    const fields: any[] = stepDef.getExpectedFieldsList().map((field: FieldDefinition) => {
      return field.toObject();
    });

    // Id field
    const id: any = fields.filter(f => f.key === 'id')[0];
    expect(id.optionality).to.equal(FieldDefinition.Optionality.REQUIRED);
    expect(id.type).to.equal(FieldDefinition.Type.STRING);

    // withParameters field
    const withParam: any = fields.filter(f => f.key === 'withParameters')[0];
    expect(withParam.optionality).to.equal(FieldDefinition.Optionality.OPTIONAL);
    expect(withParam.type).to.equal(FieldDefinition.Type.MAP);
  });

  it('should respond with success if the client executes succesfully', async () => {
    const sampleId = 'someId';
    const expectedResult = [
      {
        url: `https://www.google-analytics.com/collect?t=pageview&tid=${sampleId}&someKey=someValue`,
        method: 'GET',
      },
    ];
    const dataInput = {
      id: sampleId,
      withParameters: {
        someKey: 'someValue',
      },
    };

    // Stub a response that matches expectations.
    clientWrapperStub.getFinishedRequests.resolves(expectedResult);

    // Set step data corresponding to expectations
    protoStep.setData(Struct.fromJavaScript(dataInput));

    const response: RunStepResponse = await stepUnderTest.executeStep(protoStep);
    expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.PASSED);
  });

  it('should respond with fail if the client returns result with no request', async () => {
    const sampleId = 'someId';
    const expectedMessage = 'expected to track 1 GA pageview, but there were actually %d: %s';
    const expectedResult = [
    ];
    const dataInput = {
      id: sampleId,
      withParameters: {
        someKey: 'someValue',
      },
    };

    // Stub a response that matches expectations.
    clientWrapperStub.getFinishedRequests.resolves(expectedResult);

    // Set step data corresponding to expectations
    protoStep.setData(Struct.fromJavaScript(dataInput));

    const response: RunStepResponse = await stepUnderTest.executeStep(protoStep);
    expect(response.getMessageFormat()).to.equal(expectedMessage);
    expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.FAILED);
  });

  it('should respond with fail if the client returns result with multiple matching requests', async () => {
    const sampleId = 'someId';
    const expectedMessage = 'expected to track 1 GA pageview, but there were actually %d: %s';
    const expectedResult = [
      {
        url: `https://www.google-analytics.com/collect?t=pageview&tid=${sampleId}&someKey=someValue`,
        method: 'GET',
      },
      {
        url: `https://www.google-analytics.com/collect?t=pageview&tid=${sampleId}&someKey=someValue`,
        method: 'GET',
      },
    ];
    const dataInput = {
      id: sampleId,
      withParameters: {
        someKey: 'someValue',
      },
    };

    // Stub a response that matches expectations.
    clientWrapperStub.getFinishedRequests.resolves(expectedResult);

    // Set step data corresponding to expectations
    protoStep.setData(Struct.fromJavaScript(dataInput));

    const response: RunStepResponse = await stepUnderTest.executeStep(protoStep);
    expect(response.getMessageFormat()).to.equal(expectedMessage);
    expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.FAILED);
  });

  it('should respond with fail if the client returns result with a parameter that doesnt match', async () => {
    const sampleId = 'someId';
    const expectedMessage = 'expected to track 1 GA pageview, but there were actually %d: %s';
    const expectedResult = [
      {
        url: `https://www.google-analytics.com/collect?t=pageview&tid=${sampleId}&someKey=someOtherValue`,
        method: 'GET',
      },
    ];
    const dataInput = {
      id: sampleId,
      withParameters: {
        someKey: 'someValue',
      },
    };

    // Stub a response that matches expectations.
    clientWrapperStub.getFinishedRequests.resolves(expectedResult);

    // Set step data corresponding to expectations
    protoStep.setData(Struct.fromJavaScript(dataInput));

    const response: RunStepResponse = await stepUnderTest.executeStep(protoStep);
    expect(response.getMessageFormat()).to.equal(expectedMessage);
    expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.FAILED);
  });

  it('should error on client wrapper exception', async () => {
    const error = new Error('someError');
    const expectedData = { id: 'someId' };

    // Stub a response that matches expectations.
    clientWrapperStub.getFinishedRequests.throws(error);

    // Set step data corresponding to expectations
    protoStep.setData(Struct.fromJavaScript(expectedData));

    const response: RunStepResponse = await stepUnderTest.executeStep(protoStep);
    expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.ERROR);
  });

});
