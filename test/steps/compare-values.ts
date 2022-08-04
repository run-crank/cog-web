import { Struct } from 'google-protobuf/google/protobuf/struct_pb';
import * as chai from 'chai';
import { default as sinon } from 'ts-sinon';
import * as sinonChai from 'sinon-chai';
import 'mocha';

import { Step as ProtoStep, StepDefinition, FieldDefinition, RunStepResponse } from '../../src/proto/cog_pb';
import { Step } from '../../src/steps/compare-values';

chai.use(sinonChai);

describe('CompareValues', () => {
  const expect = chai.expect;
  let protoStep: ProtoStep;
  let stepUnderTest: Step;
  let clientWrapperStub: any;

  beforeEach(() => {
    // Set up test stubs.
    stepUnderTest = new Step(clientWrapperStub);
    protoStep = new ProtoStep();
  });

  describe('Metadata', () => {
    it('should return expected step metadata', () => {
      const stepDef: StepDefinition = stepUnderTest.getDefinition();
      expect(stepDef.getStepId()).to.equal('CompareValues');
      expect(stepDef.getName()).to.equal('Compare two values');
      expect(stepDef.getExpression()).to.equal('the (?<field>[a-zA-Z0-9_-]+) value (?<value>.+) should (?<operator>be less than|be greater than|be one of|be|contain|not be one of|not be|not contain|match|not match) (?<expectation>.+)');
      expect(stepDef.getType()).to.equal(StepDefinition.Type.VALIDATION);
    });

    it('should return expected step fields', () => {
      const stepDef: StepDefinition = stepUnderTest.getDefinition();
      const fields: any[] = stepDef.getExpectedFieldsList().map((field: FieldDefinition) => {
        return field.toObject();
      });

      const field: any = fields.filter(f => f.key === 'field')[0];
      expect(field.optionality).to.equal(FieldDefinition.Optionality.REQUIRED);
      expect(field.type).to.equal(FieldDefinition.Type.STRING);

      const value: any = fields.filter(f => f.key === 'value')[0];
      expect(value.optionality).to.equal(FieldDefinition.Optionality.REQUIRED);
      expect(value.type).to.equal(FieldDefinition.Type.STRING);

      const operator: any = fields.filter(f => f.key === 'operator')[0];
      expect(operator.optionality).to.equal(FieldDefinition.Optionality.REQUIRED);
      expect(operator.type).to.equal(FieldDefinition.Type.STRING);

      const expectation: any = fields.filter(f => f.key === 'expectation')[0];
      expect(expectation.optionality).to.equal(FieldDefinition.Optionality.REQUIRED);
      expect(expectation.type).to.equal(FieldDefinition.Type.STRING);
    });
  });

  it("should respond with a pass if the field value matches the expectation with 'be' operator", async () => {
    protoStep.setData(Struct.fromJavaScript({
      field: 'anyField',
      value: 'anyValue',
      operator: 'be',
      expectation: 'anyValue',
    }));

    const response: RunStepResponse = await stepUnderTest.executeStep(protoStep);
    expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.PASSED);
  });

  it("should respond with a pass if the field value matches the expectation with 'contain' operator", async () => {
    protoStep.setData(Struct.fromJavaScript({
      field: 'anyField',
      value: '123anyValue123',
      operator: 'contain',
      expectation: 'anyValue',
    }));

    const response: RunStepResponse = await stepUnderTest.executeStep(protoStep);
    expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.PASSED);
  });

  it("should respond with a pass if the field value satisfies the expectation with number value and 'be greater than' operator", async () => {
    protoStep.setData(Struct.fromJavaScript({
      field: 'anyField',
      value: '5',
      operator: 'be greater than',
      expectation: '1',
    }));

    const response: RunStepResponse = await stepUnderTest.executeStep(protoStep);
    expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.PASSED);
  });

  it("should respond with a pass if the field value satisfies the expectation with date value and 'be greater than' operator", async () => {
    protoStep.setData(Struct.fromJavaScript({
      field: 'anyField',
      value: '2020-12-12',
      operator: 'be greater than',
      expectation: '2012-12-12',
    }));

    const response: RunStepResponse = await stepUnderTest.executeStep(protoStep);
    expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.PASSED);
  });

  it("should respond with a pass if the field value matches the expectation with 'not be' operator", async () => {
    protoStep.setData(Struct.fromJavaScript({
      field: 'anyField',
      value: 'anyValue',
      operator: 'not be',
      expectation: 'notAnyValue',
    }));

    const response: RunStepResponse = await stepUnderTest.executeStep(protoStep);
    expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.PASSED);
  });

  it("should respond with a pass if the field value matches the expectation with 'not contain' operator", async () => {
    protoStep.setData(Struct.fromJavaScript({
      field: 'anyField',
      value: 'anyValue',
      operator: 'not contain',
      expectation: 'notValue',
    }));

    const response: RunStepResponse = await stepUnderTest.executeStep(protoStep);
    expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.PASSED);
  });

  it("should respond with a pass if the field value satisfies the expectation with number value and 'be less than' operator", async () => {
    protoStep.setData(Struct.fromJavaScript({
      field: 'anyField',
      value: '5',
      operator: 'be less than',
      expectation: '10',
    }));

    const response: RunStepResponse = await stepUnderTest.executeStep(protoStep);
    expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.PASSED);
  });

  it("should respond with a pass if the field value satisfies the expectation with date value and 'be less than' operator", async () => {
    protoStep.setData(Struct.fromJavaScript({
      field: 'anyField',
      value: '2012-12-12',
      operator: 'be less than',
      expectation: '2020-12-12',
    }));

    const response: RunStepResponse = await stepUnderTest.executeStep(protoStep);
    expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.PASSED);
  });

  it("should respond with an error if the field value is not a date or number and 'be less than' operator", async () => {
    protoStep.setData(Struct.fromJavaScript({
      field: 'anyField',
      value: 'anyValue',
      operator: 'be less than',
      expectation: 'anyValue',
    }));

    const response: RunStepResponse = await stepUnderTest.executeStep(protoStep);
    expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.ERROR);
  });

  it("should respond with an error if the field value is not a date or number and 'be greater than' operator", async () => {
    protoStep.setData(Struct.fromJavaScript({
      field: 'anyField',
      value: 'anyValue',
      operator: 'be greater than',
      expectation: 'anyValue',
    }));

    const response: RunStepResponse = await stepUnderTest.executeStep(protoStep);
    expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.ERROR);
  });

  it('should respond with an error if the operator is invalid', async () => {
    protoStep.setData(Struct.fromJavaScript({
      field: 'anyField',
      value: 'anyValue',
      operator: 'someOtherOperator',
      expectation: 'anyValue',
    }));

    const response: RunStepResponse = await stepUnderTest.executeStep(protoStep);
    expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.ERROR);
  });
});
