import { Struct } from 'google-protobuf/google/protobuf/struct_pb';
import * as chai from 'chai';
import { default as sinon } from 'ts-sinon';
import sinonChai from 'sinon-chai';
import 'mocha';

import { Step as ProtoStep, StepDefinition, FieldDefinition, RunStepResponse } from '../../src/proto/cog_pb';
import { Step } from '../../src/steps/fill-out-field';

chai.use(sinonChai);

describe('EnterValueIntoField', () => {
  const expect = chai.expect;
  let protoStep: ProtoStep;
  let stepUnderTest: Step;
  let clientWrapperStub: any;

  beforeEach(() => {
    // Set up test stubs.
    clientWrapperStub = sinon.stub();
    clientWrapperStub.fillOutField = sinon.stub();
    clientWrapperStub.client = sinon.stub();
    clientWrapperStub.client.screenshot = sinon.stub();
    clientWrapperStub.client.screenshot.returns('anyBinary');
    stepUnderTest = new Step(clientWrapperStub);
    protoStep = new ProtoStep();
  });

  it('should return expected step metadata', () => {
    const stepDef: StepDefinition = stepUnderTest.getDefinition();
    expect(stepDef.getStepId()).to.equal('EnterValueIntoField');
    expect(stepDef.getName()).to.equal('Fill out a form field');
    expect(stepDef.getType()).to.equal(StepDefinition.Type.ACTION);
    expect(stepDef.getExpression()).to.equal('fill out (?<domQuerySelector>.+) with (?<value>.+)');
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
    clientWrapperStub.fillOutField.resolves();

    // Set step data corresponding to expectations
    protoStep.setData(Struct.fromJavaScript(expectedData));

    const response: RunStepResponse = await stepUnderTest.executeStep(protoStep);
    expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.PASSED);
  });

  it('should respond with error when puppeteer cannot select value', async () => {
    const expectedData = {
      value: 'CA',
      domQuerySelector: 'select[name=Country]',
    };

    // Stub a response that matches expectations.
    clientWrapperStub.fillOutField.rejects();

    // Set step data corresponding to expectations
    protoStep.setData(Struct.fromJavaScript(expectedData));

    const response: RunStepResponse = await stepUnderTest.executeStep(protoStep);
    expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.ERROR);
  });

});
