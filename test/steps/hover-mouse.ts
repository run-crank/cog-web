import { Struct } from 'google-protobuf/google/protobuf/struct_pb';
import * as chai from 'chai';
import { default as sinon } from 'ts-sinon';
import * as sinonChai from 'sinon-chai';
import 'mocha';

import { Step as ProtoStep, StepDefinition, FieldDefinition, RunStepResponse } from '../../src/proto/cog_pb';
import { Step } from '../../src/steps/hover-mouse';

chai.use(sinonChai);

describe('HoverMouse', () => {
  const expect = chai.expect;
  let protoStep: ProtoStep;
  let stepUnderTest: Step;
  let clientWrapperStub: any;

  beforeEach(() => {
    // Set up test stubs.
    clientWrapperStub = sinon.stub();
    clientWrapperStub.hoverMouse = sinon.stub();
    clientWrapperStub.client = sinon.stub();
    clientWrapperStub.client.screenshot = sinon.stub();
    clientWrapperStub.client.screenshot.returns('anyBinary');
    stepUnderTest = new Step(clientWrapperStub);
    protoStep = new ProtoStep();
  });

  it('should return expected step metadata', () => {
    const stepDef: StepDefinition = stepUnderTest.getDefinition();
    expect(stepDef.getStepId()).to.equal('HoverMouse');
    expect(stepDef.getName()).to.equal('Hover Mouse');
    expect(stepDef.getType()).to.equal(StepDefinition.Type.ACTION);
    expect(stepDef.getExpression()).to.equal('hover mouse to (?<domQuerySelector>.+)');
  });

  it('should return expected step fields', () => {
    const stepDef: StepDefinition = stepUnderTest.getDefinition();
    const fields: any[] = stepDef.getExpectedFieldsList().map((field: FieldDefinition) => {
      return field.toObject();
    });

    // domQuerySelector field
    const domQuerySelector: any = fields.filter(f => f.key === 'domQuerySelector')[0];
    expect(domQuerySelector.optionality).to.equal(FieldDefinition.Optionality.REQUIRED);
    expect(domQuerySelector.type).to.equal(FieldDefinition.Type.STRING);
  });

  it('should pass when puppeteer successfully selects value', async () => {
    const expectedData = {
      value: 'CA',
      domQuerySelector: 'select[name=Country]',
    };

    // Stub a response that matches expectations.
    clientWrapperStub.hoverMouse.resolves();

    // Set step data corresponding to expectations
    protoStep.setData(Struct.fromJavaScript(expectedData));

    const response: RunStepResponse = await stepUnderTest.executeStep(protoStep);
    expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.PASSED);
  });

  it('should respond with error when puppeteer cannot select value', async () => {
    const expectedData = {
      domQuerySelector: 'select[name=Country]',
    };

    // Stub a response that matches expectations.
    clientWrapperStub.hoverMouse.rejects();

    // Set step data corresponding to expectations
    protoStep.setData(Struct.fromJavaScript(expectedData));

    const response: RunStepResponse = await stepUnderTest.executeStep(protoStep);
    expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.ERROR);
  });

});
