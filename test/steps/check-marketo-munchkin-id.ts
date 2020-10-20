import { Struct } from 'google-protobuf/google/protobuf/struct_pb';
import * as chai from 'chai';
import { default as sinon } from 'ts-sinon';
import * as sinonChai from 'sinon-chai';
import 'mocha';

import { Step as ProtoStep, StepDefinition, FieldDefinition, RunStepResponse } from '../../src/proto/cog_pb';
import { Step } from '../../src/steps/check-marketo-munchkin-id';

chai.use(sinonChai);

describe('CheckMarketoMunchkinId', () => {
  const expect = chai.expect;
  let protoStep: ProtoStep;
  let stepUnderTest: Step;
  let clientWrapperStub: any;

  beforeEach(() => {
    // Set up test stubs.
    clientWrapperStub = sinon.stub();
    clientWrapperStub.getFinishedRequests = sinon.stub();
    clientWrapperStub.waitForNetworkIdle = sinon.stub();
    stepUnderTest = new Step(clientWrapperStub);
    protoStep = new ProtoStep();
  });

  it('should return expected step metadata', () => {
    const stepDef: StepDefinition = stepUnderTest.getDefinition();
    expect(stepDef.getStepId()).to.equal('CheckMarketoMunchkinId');
    expect(stepDef.getName()).to.equal('Check Marketo Munchkin Id');
    expect(stepDef.getType()).to.equal(StepDefinition.Type.ACTION);
    expect(stepDef.getExpression()).to.equal('the tracking code for munchkin account id should load');
  });

  it('should respond with success if the client executes succesfully', async () => {
    const sampleId = 'someId';
    const expectedResult = [
      {
        url: 'https://munchkin.marketo.net/somethingsomething/munchkin.js?_mchId=anyID',
      },
      {
        url: `https://${sampleId.toLowerCase()}.mktoresp.com/webevents/visitWebPage?_mchId=${sampleId.toLowerCase()}`,
      },
    ];
    const dataInput = {};

    // Stub a response that matches expectations.
    clientWrapperStub.waitForNetworkIdle.resolves();
    clientWrapperStub.getFinishedRequests.resolves(expectedResult);

    // Set step data corresponding to expectations
    protoStep.setData(Struct.fromJavaScript(dataInput));

    const response: RunStepResponse = await stepUnderTest.executeStep(protoStep);
    expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.PASSED);
  });

  it('should respond with fail if the client returns result without munchkin url', async () => {
    const sampleId = 'someId';
    const expectedMessage = 'The munchkin.js script was never requested.';
    const expectedResult = [
      {
        url: 'no munchkin url',
      },
      {
        url: `https://${sampleId}.mktoresp.com/webevents/visitWebPage?_mchId=anyID`,
      },
    ];
    const dataInput = {};

    // Stub a response that matches expectations.
    clientWrapperStub.waitForNetworkIdle.resolves();
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
