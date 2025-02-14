import { Struct } from 'google-protobuf/google/protobuf/struct_pb';
import * as chai from 'chai';
import { default as sinon } from 'ts-sinon';
import * as sinonChai from 'sinon-chai';
import 'mocha';

import { Step as ProtoStep, StepDefinition, FieldDefinition, RunStepResponse } from '../../src/proto/cog_pb';
import { Step } from '../../src/steps/dispatch-event';

chai.use(sinonChai);

describe('DispatchEvent', () => {
  const expect = chai.expect;
  let protoStep: ProtoStep;
  let stepUnderTest: Step;
  let clientWrapperStub: any;

  beforeEach(() => {
    // Set up test stubs.
    clientWrapperStub = sinon.stub();
    clientWrapperStub.dispatchEvent = sinon.stub();
    clientWrapperStub.client = sinon.stub();
    clientWrapperStub.client.screenshot = sinon.stub();
    clientWrapperStub.client.screenshot.returns('anyBinary');
    stepUnderTest = new Step(clientWrapperStub);
    protoStep = new ProtoStep();
  });

  describe('Metadata', () => {
    it('should return expected step metadata', () => {
      const stepDef: StepDefinition = stepUnderTest.getDefinition();
      expect(stepDef.getStepId()).to.equal('DispatchEvent');
      expect(stepDef.getName()).to.equal('Dispatch event on an element');
      expect(stepDef.getExpression()).to.equal('dispatch (?<eventType>.+) event on element (?<domQuerySelector>.+) with options (?<eventOptions>.+)');
      expect(stepDef.getType()).to.equal(StepDefinition.Type.ACTION);
    });

    it('should return expected step fields', () => {
      const stepDef: StepDefinition = stepUnderTest.getDefinition();
      const fields: any[] = stepDef.getExpectedFieldsList().map((field: FieldDefinition) => {
        return field.toObject();
      });

      // DOM Query Selector field
      const domQuerySelector: any = fields.filter(f => f.key === 'domQuerySelector')[0];
      expect(domQuerySelector.optionality).to.equal(FieldDefinition.Optionality.REQUIRED);
      expect(domQuerySelector.type).to.equal(FieldDefinition.Type.STRING);

      // Event Type field
      const eventType: any = fields.filter(f => f.key === 'eventType')[0];
      expect(eventType.optionality).to.equal(FieldDefinition.Optionality.REQUIRED);
      expect(eventType.type).to.equal(FieldDefinition.Type.STRING);

      // Event Options field
      const eventOptions: any = fields.filter(f => f.key === 'eventOptions')[0];
      expect(eventOptions.optionality).to.equal(FieldDefinition.Optionality.OPTIONAL);
      expect(eventOptions.type).to.equal(FieldDefinition.Type.STRING);
    });
  });

  describe('ExecuteStep', () => {
    it('should respond with success if the event was dispatched successfully', async () => {
      const expectedSelector = '.test-selector';
      const expectedEventType = 'keydown';
      const expectedEventOptions = '{"key": "ArrowDown"}';
      
      protoStep.setData(Struct.fromJavaScript({
        domQuerySelector: expectedSelector,
        eventType: expectedEventType,
        eventOptions: expectedEventOptions,
      }));

      clientWrapperStub.dispatchEvent.resolves();

      const response: RunStepResponse = await stepUnderTest.executeStep(protoStep);
      expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.PASSED);
      expect(clientWrapperStub.dispatchEvent).to.have.been.calledWith(
        expectedSelector,
        expectedEventType,
        JSON.parse(expectedEventOptions),
      );
    });

    it('should respond with error if invalid JSON is provided for eventOptions', async () => {
      const expectedSelector = '.test-selector';
      const expectedEventType = 'keydown';
      const invalidEventOptions = '{invalid json}';
      
      protoStep.setData(Struct.fromJavaScript({
        domQuerySelector: expectedSelector,
        eventType: expectedEventType,
        eventOptions: invalidEventOptions,
      }));

      const response: RunStepResponse = await stepUnderTest.executeStep(protoStep);
      expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.ERROR);
      expect(response.getMessageFormat()).to.include('Invalid event options JSON');
    });

    it('should respond with error if the client throws an error', async () => {
      const expectedSelector = '.test-selector';
      const expectedEventType = 'keydown';
      const expectedEventOptions = '{"key": "ArrowDown"}';
      const expectedError = 'Element not found';
      
      protoStep.setData(Struct.fromJavaScript({
        domQuerySelector: expectedSelector,
        eventType: expectedEventType,
        eventOptions: expectedEventOptions,
      }));

      clientWrapperStub.dispatchEvent.rejects(new Error(expectedError));

      const response: RunStepResponse = await stepUnderTest.executeStep(protoStep);
      expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.ERROR);
      expect(response.getMessageFormat()).to.include('There was a problem dispatching');
    });
  });
});