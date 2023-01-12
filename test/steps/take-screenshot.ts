import { Struct } from 'google-protobuf/google/protobuf/struct_pb';
import * as chai from 'chai';
import { default as sinon } from 'ts-sinon';
import * as sinonChai from 'sinon-chai';
import 'mocha';

import { Step as ProtoStep, StepDefinition, FieldDefinition, RunStepResponse } from '../../src/proto/cog_pb';
import { Step } from '../../src/steps/take-screenshot';

chai.use(sinonChai);

describe('TakeScreenshot', () => {
  const expect = chai.expect;
  let protoStep: ProtoStep;
  let stepUnderTest: Step;
  let clientWrapperStub: any;

  beforeEach(() => {
    // Set up test stubs.
    clientWrapperStub = sinon.stub();
    clientWrapperStub.client = sinon.stub();
    clientWrapperStub.client.screenshot = sinon.stub();
    clientWrapperStub.client.screenshot.returns('anyBinary');
    stepUnderTest = new Step(clientWrapperStub);
    protoStep = new ProtoStep();
  });

  describe('Metadata', () => {
    it('should return expected step metadata', () => {
      const stepDef: StepDefinition = stepUnderTest.getDefinition();
      expect(stepDef.getStepId()).to.equal('TakeScreenshot');
      expect(stepDef.getName()).to.equal('Take a screenshot');
      expect(stepDef.getExpression()).to.equal('take a screenshot');
      expect(stepDef.getType()).to.equal(StepDefinition.Type.ACTION);
    });
  });

  describe('ExecuteStep', () => {
    describe('Take a Screenshot', () => {
      beforeEach(() => {
        protoStep.setData(Struct.fromJavaScript({__stepOrder: 2}));
      });

      it('should call screenshot to with expectedArgs', async () => {
        await stepUnderTest.executeStep(protoStep);
        expect(clientWrapperStub.client.screenshot).to.have.been.calledWith({ type: 'jpeg', encoding: 'binary', quality: 40, fullPage: true });
      });

      it('should respond with pass', async () => {
        const response = await stepUnderTest.executeStep(protoStep);
        expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.PASSED);
      });
    });

    describe('Screenshot to did not occur', () => {
      beforeEach(() => {
        protoStep.setData(Struct.fromJavaScript({__stepOrder: 2}));
        clientWrapperStub.client.screenshot.throws();
      });

      it('should respond with error', async () => {
        const response = await stepUnderTest.executeStep(protoStep);
        expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.ERROR);
      });
    });
  });
});
