import { Struct } from 'google-protobuf/google/protobuf/struct_pb';
import * as chai from 'chai';
import { default as sinon } from 'ts-sinon';
import * as sinonChai from 'sinon-chai';
import 'mocha';

import { Step as ProtoStep, StepDefinition, FieldDefinition, RunStepResponse } from '../../src/proto/cog_pb';
import { Step } from '../../src/steps/check-current-page-meta-tag';

chai.use(sinonChai);

describe('CheckCurrentPageMetaTag', () => {
  const expect = chai.expect;
  let protoStep: ProtoStep;
  let stepUnderTest: Step;
  let clientWrapperStub: any;

  beforeEach(() => {
    // Set up test stubs.
    clientWrapperStub = sinon.stub();
    clientWrapperStub.getMetaTagContent = sinon.stub();
    clientWrapperStub.waitForNetworkIdle = sinon.stub();
    stepUnderTest = new Step(clientWrapperStub);
    protoStep = new ProtoStep();
  });

  it('should return expected step metadata', () => {
    const stepDef: StepDefinition = stepUnderTest.getDefinition();
    expect(stepDef.getStepId()).to.equal('CheckCurrentPageMetaTag');
    expect(stepDef.getName()).to.equal('Check current page meta tag');
    expect(stepDef.getType()).to.equal(StepDefinition.Type.VALIDATION);
    expect(stepDef.getExpression()).to.equal('the (?<metaName>.+) meta tag on the current page should (?<operator>be|contain|not contain|not be longer than|exist) ?(?<expectation>.+)?');
  });

  it('should return expected step fields', () => {
    const stepDef: StepDefinition = stepUnderTest.getDefinition();
    const fields: any[] = stepDef.getExpectedFieldsList().map((field: FieldDefinition) => {
      return field.toObject();
    });

    // Field field
    const metaName: any = fields.filter(f => f.key === 'metaName')[0];
    expect(metaName.optionality).to.equal(FieldDefinition.Optionality.REQUIRED);
    expect(metaName.type).to.equal(FieldDefinition.Type.STRING);

    // Operator field
    const operator: any = fields.filter(f => f.key === 'operator')[0];
    expect(operator.optionality).to.equal(FieldDefinition.Optionality.REQUIRED);
    expect(operator.type).to.equal(FieldDefinition.Type.STRING);

    // Expectation field
    const expectation: any = fields.filter(f => f.key === 'expectation')[0];
    expect(expectation.optionality).to.equal(FieldDefinition.Optionality.OPTIONAL);
    expect(expectation.type).to.equal(FieldDefinition.Type.ANYSCALAR);
  });

  it('should pass using "contain" operator', async () => {
    const expectedResult = 'Some Text';
    const expectedData = {
      metaName: 'title',
      expectation: 'Text',
      operator: 'contain',
    };

    // Stub a response that matches expectations.
    clientWrapperStub.waitForNetworkIdle.resolves();
    clientWrapperStub.getMetaTagContent.resolves(expectedResult);

    // Set step data corresponding to expectations
    protoStep.setData(Struct.fromJavaScript(expectedData));

    const response: RunStepResponse = await stepUnderTest.executeStep(protoStep);
    expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.PASSED);
  });

  it('should pass using "not contain" operator', async () => {
    const expectedResult = 'Some Text';
    const expectedData = {
      metaName: 'title',
      expectation: 'Some Different Text',
      operator: 'not contain',
    };

    // Stub a response that matches expectations.
    clientWrapperStub.waitForNetworkIdle.resolves();
    clientWrapperStub.getMetaTagContent.resolves(expectedResult);

    // Set step data corresponding to expectations
    protoStep.setData(Struct.fromJavaScript(expectedData));

    const response: RunStepResponse = await stepUnderTest.executeStep(protoStep);
    expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.PASSED);
  });

  it('should pass using "be" operator', async () => {
    const expectedResult = 'Exact Title';
    const expectedData = {
      metaName: 'title',
      expectation: 'Exact Title',
      operator: 'be',
    };

    // Stub a response that matches expectations.
    clientWrapperStub.waitForNetworkIdle.resolves();
    clientWrapperStub.getMetaTagContent.resolves(expectedResult);

    // Set step data corresponding to expectations
    protoStep.setData(Struct.fromJavaScript(expectedData));

    const response: RunStepResponse = await stepUnderTest.executeStep(protoStep);
    expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.PASSED);
  });

  it('should pass using "exist" operator', async () => {
    const expectedResult = 'Anything Not Null';
    const expectedData = {
      metaName: 'title',
      operator: 'exist',
    };

    // Stub a response that matches expectations.
    clientWrapperStub.waitForNetworkIdle.resolves();
    clientWrapperStub.getMetaTagContent.resolves(expectedResult);

    // Set step data corresponding to expectations
    protoStep.setData(Struct.fromJavaScript(expectedData));

    const response: RunStepResponse = await stepUnderTest.executeStep(protoStep);
    expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.PASSED);
  });

  it('should pass using "not be longer than" operator', async () => {
    const expectedResult = 'This string is 29 characters.';
    const expectedData = {
      metaName: 'title',
      expectation: '29 characters',
      operator: 'not be longer than',
    };

    // Stub a response that matches expectations.
    clientWrapperStub.waitForNetworkIdle.resolves();
    clientWrapperStub.getMetaTagContent.resolves(expectedResult);

    // Set step data corresponding to expectations
    protoStep.setData(Struct.fromJavaScript(expectedData));

    const response: RunStepResponse = await stepUnderTest.executeStep(protoStep);
    expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.PASSED);
  });

  it('should fail using "contain" operator', async () => {
    const expectedResult = 'Some Text';
    const expectedData = {
      metaName: 'title',
      expectation: 'Some Different Text',
      operator: 'contain',
    };

    // Stub a response that matches expectations.
    clientWrapperStub.waitForNetworkIdle.resolves();
    clientWrapperStub.getMetaTagContent.resolves(expectedResult);

    // Set step data corresponding to expectations
    protoStep.setData(Struct.fromJavaScript(expectedData));

    const response: RunStepResponse = await stepUnderTest.executeStep(protoStep);
    expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.FAILED);
  });

  it('should fail using "not contain" operator', async () => {
    const expectedResult = 'Some Text';
    const expectedData = {
      metaName: 'title',
      expectation: 'Text',
      operator: 'not contain',
    };

    // Stub a response that matches expectations.
    clientWrapperStub.waitForNetworkIdle.resolves();
    clientWrapperStub.getMetaTagContent.resolves(expectedResult);

    // Set step data corresponding to expectations
    protoStep.setData(Struct.fromJavaScript(expectedData));

    const response: RunStepResponse = await stepUnderTest.executeStep(protoStep);
    expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.FAILED);
  });

  it('should fail using "be" operator', async () => {
    const expectedResult = 'Some Title';
    const expectedData = {
      metaName: 'title',
      expectation: 'A totally different title',
      operator: 'be',
    };

    // Stub a response that matches expectations.
    clientWrapperStub.waitForNetworkIdle.resolves();
    clientWrapperStub.getMetaTagContent.resolves(expectedResult);

    // Set step data corresponding to expectations
    protoStep.setData(Struct.fromJavaScript(expectedData));

    const response: RunStepResponse = await stepUnderTest.executeStep(protoStep);
    expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.FAILED);
  });

  it('should fail using "exist" operator', async () => {
    const expectedResult = null;
    const expectedData = {
      metaName: 'title',
      operator: 'exist',
    };

    // Stub a response that matches expectations.
    clientWrapperStub.waitForNetworkIdle.resolves();
    clientWrapperStub.getMetaTagContent.resolves(expectedResult);

    // Set step data corresponding to expectations
    protoStep.setData(Struct.fromJavaScript(expectedData));

    const response: RunStepResponse = await stepUnderTest.executeStep(protoStep);
    expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.FAILED);
  });

  it('should fail using "not be longer than" operator', async () => {
    const expectedResult = 'This string is 29 characters.';
    const expectedData = {
      metaName: 'title',
      expectation: '28 characters',
      operator: 'not be longer than',
    };

    // Stub a response that matches expectations.
    clientWrapperStub.waitForNetworkIdle.resolves();
    clientWrapperStub.getMetaTagContent.resolves(expectedResult);

    // Set step data corresponding to expectations
    protoStep.setData(Struct.fromJavaScript(expectedData));

    const response: RunStepResponse = await stepUnderTest.executeStep(protoStep);
    expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.FAILED);
  });

  it('should error on unknown operator', async () => {
    const expectedData = {metaName: 'unknownField'};
    const expectedResult = 'does not matter';

    // Stub a response that matches expectations.
    clientWrapperStub.waitForNetworkIdle.resolves();
    clientWrapperStub.getMetaTagContent.resolves(expectedResult);

    // Set step data corresponding to expectations
    protoStep.setData(Struct.fromJavaScript(expectedData));

    const response: RunStepResponse = await stepUnderTest.executeStep(protoStep);
    expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.ERROR);
  });

  it('should error on client wrapper exception', async () => {
    const expectedData = {metaName: 'description'};

    // Stub a response that matches expectations.
    clientWrapperStub.getMetaTagContent.throws();

    // Set step data corresponding to expectations
    protoStep.setData(Struct.fromJavaScript(expectedData));

    const response: RunStepResponse = await stepUnderTest.executeStep(protoStep);
    expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.ERROR);
  });

});
