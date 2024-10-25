import { Struct } from 'google-protobuf/google/protobuf/struct_pb';
import * as chai from 'chai';
import { default as sinon } from 'ts-sinon';
import sinonChai from 'sinon-chai';
import 'mocha';

import { Step as ProtoStep, StepDefinition, FieldDefinition, RunStepResponse } from '../../src/proto/cog_pb';
import { Step } from '../../src/steps/check-pardot-tracking';

chai.use(sinonChai);

describe('CheckPardotTrackingStep', () => {
  const expect = chai.expect;
  let protoStep: ProtoStep;
  let stepUnderTest: Step;
  let clientWrapperStub: any;

  beforeEach(() => {
    // Set up test stubs.
    clientWrapperStub = sinon.stub();
    clientWrapperStub.getNetworkRequests = sinon.stub();
    clientWrapperStub.getCurrentPageInfo = sinon.stub();
    clientWrapperStub.getCurrentPageInfo.resolves('http://any.url.com');
    clientWrapperStub.waitForNetworkIdle = sinon.stub();
    clientWrapperStub.waitForNetworkIdle.resolves();
    clientWrapperStub.evaluateRequests = sinon.stub();

    stepUnderTest = new Step(clientWrapperStub);
    protoStep = new ProtoStep();
  });

  it('should return expected step metadata', () => {
    const stepDef: StepDefinition = stepUnderTest.getDefinition();
    expect(stepDef.getStepId()).to.equal('CheckPardotTrackingStep');
    expect(stepDef.getName()).to.equal('Check that Pardot tracking loads');
    expect(stepDef.getType()).to.equal(StepDefinition.Type.VALIDATION);
    expect(stepDef.getExpression()).to.equal('the tracking code for pardot account (?<aid>\\d+) and campaign (?<cid>\\d+) should have loaded');
  });

  it('should return expected step fields', () => {
    const stepDef: StepDefinition = stepUnderTest.getDefinition();
    const fields: any[] = stepDef.getExpectedFieldsList().map((field: FieldDefinition) => {
      return field.toObject();
    });

    // aid field
    const aid: any = fields.filter(f => f.key === 'aid')[0];
    expect(aid.optionality).to.equal(FieldDefinition.Optionality.REQUIRED);
    expect(aid.type).to.equal(FieldDefinition.Type.NUMERIC);

    // cid field
    const cid: any = fields.filter(f => f.key === 'cid')[0];
    expect(cid.optionality).to.equal(FieldDefinition.Optionality.REQUIRED);
    expect(cid.type).to.equal(FieldDefinition.Type.NUMERIC);

    // customDomain field
    const customDomain: any = fields.filter(f => f.key === 'customDomain')[0];
    expect(customDomain.optionality).to.equal(FieldDefinition.Optionality.OPTIONAL);
    expect(customDomain.type).to.equal(FieldDefinition.Type.URL);

    // withParameters field
    const withParameters: any = fields.filter(f => f.key === 'withParameters')[0];
    expect(withParameters.optionality).to.equal(FieldDefinition.Optionality.OPTIONAL);
    expect(withParameters.type).to.equal(FieldDefinition.Type.MAP);
  });

  it('should respond with success if the client executes succesfully', async () => {
    const aidValue = 'anyAID';
    const cidValue = 'anyCID';
    const sampleKey = 'anyKey';
    const sampleValue = 'anyValue';
    const finishedRequests = [
      {
        rawRequest: {
          _url: `https://pi.pardot.com/analytics?account_id=${aidValue}&campaign_id=${cidValue}&${sampleKey}=${sampleValue}`,
        },
      },
    ];
    const dataInput = {
      aid: aidValue,
      cid: cidValue,
      customDomain: null,
      withParameters: {
        anyKey: sampleValue,
      },
    };

    // Stub a response that matches expectations.
    clientWrapperStub.getNetworkRequests.returns(finishedRequests);
    clientWrapperStub.evaluateRequests.returns(finishedRequests);

    // Set step data corresponding to expectations
    protoStep.setData(Struct.fromJavaScript(dataInput));

    const response: RunStepResponse = await stepUnderTest.executeStep(protoStep);
    expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.PASSED);
  });

  it('should error on client wrapper exception', async () => {
    const error = new Error('someError');
    const aidValue = 'anyAID';
    const cidValue = 'anyCID';
    const sampleValue = 'anyValue';
    const dataInput = {
      aid: aidValue,
      cid: cidValue,
      customDomain: null,
      withParameters: {
        anyKey: sampleValue,
      },
    };

    // Stub a response that matches expectations.
    clientWrapperStub.getNetworkRequests.throws(error);

    // Set step data corresponding to expectations
    protoStep.setData(Struct.fromJavaScript(dataInput));

    const response: RunStepResponse = await stepUnderTest.executeStep(protoStep);
    expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.ERROR);
  });

});
