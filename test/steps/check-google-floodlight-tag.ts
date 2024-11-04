import { Struct } from 'google-protobuf/google/protobuf/struct_pb';
import * as chai from 'chai';
import { default as sinon } from 'ts-sinon';
import * as sinonChai from 'sinon-chai';
import 'mocha';

import { Step as ProtoStep, StepDefinition, FieldDefinition, RunStepResponse } from '../../src/proto/cog_pb';
import { Step } from '../../src/steps/check-google-floodlight-tag';

chai.use(sinonChai);

describe('CheckGoogleFloodlightTag', () => {
  const expect = chai.expect;
  let protoStep: ProtoStep;
  let stepUnderTest: Step;
  let clientWrapperStub: any;

  beforeEach(() => {
    // Set up test stubs.
    clientWrapperStub = sinon.stub();
    clientWrapperStub.getFinishedRequests = sinon.stub();
    clientWrapperStub.getCurrentPageInfo = sinon.stub();
    clientWrapperStub.getCurrentPageInfo.resolves();
    clientWrapperStub.waitForNetworkIdle = sinon.stub();
    clientWrapperStub.waitForNetworkIdle.resolves();
    clientWrapperStub.filterGoogleAdsURLs = sinon.stub();
    clientWrapperStub.includesParameters = sinon.stub();
    clientWrapperStub.conversionMethodUrlFilter = sinon.stub();

    stepUnderTest = new Step(clientWrapperStub);
    protoStep = new ProtoStep();
  });

  it('should return expected step metadata', () => {
    const stepDef: StepDefinition = stepUnderTest.getDefinition();
    expect(stepDef.getStepId()).to.equal('CheckGoogleFloodlightTag');
    expect(stepDef.getName()).to.equal('Check that a Google Floodlight tag fired');
    expect(stepDef.getType()).to.equal(StepDefinition.Type.VALIDATION);
    expect(stepDef.getExpression()).to.equal('a floodlight tag should have fired for advertiser (?<aid>\\d+), group (?<group>[a-zA-Z0-9-_]+), and activity (?<atag>[a-zA-Z0-9-_]+)');
  });

  it('should return expected step fields', () => {
    const stepDef: StepDefinition = stepUnderTest.getDefinition();
    const fields: any[] = stepDef.getExpectedFieldsList().map((field: FieldDefinition) => {
      return field.toObject();
    });

    // AID field
    const aid: any = fields.filter(f => f.key === 'aid')[0];
    expect(aid.optionality).to.equal(FieldDefinition.Optionality.REQUIRED);
    expect(aid.type).to.equal(FieldDefinition.Type.NUMERIC);

    // Group field
    const group: any = fields.filter(f => f.key === 'group')[0];
    expect(group.optionality).to.equal(FieldDefinition.Optionality.REQUIRED);
    expect(group.type).to.equal(FieldDefinition.Type.STRING);

    // ATag field
    const atag: any = fields.filter(f => f.key === 'atag')[0];
    expect(atag.optionality).to.equal(FieldDefinition.Optionality.REQUIRED);
    expect(atag.type).to.equal(FieldDefinition.Type.STRING);

    // cMethod field
    const cMethod: any = fields.filter(f => f.key === 'cMethod')[0];
    expect(cMethod.optionality).to.equal(FieldDefinition.Optionality.OPTIONAL);
    expect(cMethod.type).to.equal(FieldDefinition.Type.STRING);

    // withVariables field
    const withVariables: any = fields.filter(f => f.key === 'withVariables')[0];
    expect(withVariables.optionality).to.equal(FieldDefinition.Optionality.OPTIONAL);
    expect(withVariables.type).to.equal(FieldDefinition.Type.MAP);
  });

  it('should respond with success if the client executes succesfully', async () => {
    const aidValue = 'anyaid';
    const groupValue = 'anygroup';
    const atagValue = 'anyatag';
    const ordValue = 12345;
    const variableValue = 'anyVariableValue';
    const finishedRequests = [
      {
        url: `https://ad.doubleclick.net/activity;src=${aidValue};type=${groupValue};cat=${atagValue};ord=${ordValue};anyVariable=${variableValue}`,
      },
    ];
    const dataInput = {
      aid: aidValue,
      group: groupValue,
      atag: atagValue,
      cMethod: 'standard',
      withVariables: {
        anyVariable: variableValue,
      },
    };

    // Stub a response that matches expectations.
    clientWrapperStub.getFinishedRequests.resolves(finishedRequests);
    clientWrapperStub.filterGoogleAdsURLs.returns(finishedRequests.map(req => req.url));
    clientWrapperStub.includesParameters.returns(true);
    clientWrapperStub.conversionMethodUrlFilter.returns(finishedRequests.map(req => req.url));

    // Set step data corresponding to expectations
    protoStep.setData(Struct.fromJavaScript(dataInput));

    const response: RunStepResponse = await stepUnderTest.executeStep(protoStep);
    expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.PASSED);
  });

  it('should error on client wrapper exception', async () => {
    const error = new Error('someError');
    const aidValue = 'anyaid';
    const groupValue = 'anygroup';
    const atagValue = 'anyatag';
    const variableValue = 'anyVariableValue';
    const dataInput = {
      aid: aidValue,
      group: groupValue,
      atag: atagValue,
      cMethod: 'standard',
      withVariables: {
        anyVariable: variableValue,
      },
    };

    // Stub a response that matches expectations.
    clientWrapperStub.getFinishedRequests.throws(error);

    // Set step data corresponding to expectations
    protoStep.setData(Struct.fromJavaScript(dataInput));

    const response: RunStepResponse = await stepUnderTest.executeStep(protoStep);
    expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.ERROR);
  });

});
