import { Struct } from 'google-protobuf/google/protobuf/struct_pb';
import * as chai from 'chai';
import { default as sinon } from 'ts-sinon';
import * as sinonChai from 'sinon-chai';
import 'mocha';

import { Step as ProtoStep, StepDefinition, FieldDefinition, RunStepResponse } from '../../src/proto/cog_pb';
import { Step } from '../../src/steps/focus-on.frame';

chai.use(sinonChai);

describe('FocusOnFrame', () => {
  const expect = chai.expect;
  let protoStep: ProtoStep;
  let stepUnderTest: Step;
  let clientWrapperStub: any;

  beforeEach(() => {
    // Set up test stubs.
    clientWrapperStub = sinon.stub();
    clientWrapperStub.focusFrame = sinon.stub();
    clientWrapperStub.client = sinon.stub();
    clientWrapperStub.client.screenshot = sinon.stub();
    clientWrapperStub.client.screenshot.returns('anyBinary');
    stepUnderTest = new Step(clientWrapperStub);
    protoStep = new ProtoStep();
  });

  describe('Metadata', () => {
    it('should return expected step metadata', () => {
      const stepDef: StepDefinition = stepUnderTest.getDefinition();
      expect(stepDef.getStepId()).to.equal('FocusOnFrame');
      expect(stepDef.getName()).to.equal('Focus on Frame');
      expect(stepDef.getExpression()).to.equal('focus on the (?<domQuerySelector>.+) frame');
      expect(stepDef.getType()).to.equal(StepDefinition.Type.ACTION);
    });

    it('should return expected step fields', () => {
      const stepDef: StepDefinition = stepUnderTest.getDefinition();
      const fields: any[] = stepDef.getExpectedFieldsList().map((field: FieldDefinition) => {
        return field.toObject();
      });

      const pageUrl: any = fields.filter(f => f.key === 'domQuerySelector')[0];
      expect(pageUrl.optionality).to.equal(FieldDefinition.Optionality.REQUIRED);
      expect(pageUrl.type).to.equal(FieldDefinition.Type.STRING);
    });
  });

  describe('ExecuteStep', () => {
    describe('Frame focused', () => {
      const frameSelector = '[id=form-if]';
      beforeEach(() => {
        clientWrapperStub.focusFrame.resolves();

        protoStep.setData(Struct.fromJavaScript({
          domQuerySelector: frameSelector,
        }));
      });

      it('should respond with pass', async () => {
        const response = await stepUnderTest.executeStep(protoStep);
        expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.PASSED);
      });
    });

    describe('Error occurred', () => {
      const frameSelector = '[id=form-if]';
      beforeEach(() => {
        clientWrapperStub.focusFrame.throws();

        protoStep.setData(Struct.fromJavaScript({
          domQuerySelector: frameSelector,
        }));
      });

      it('should respond with error', async () => {
        const response = await stepUnderTest.executeStep(protoStep);
        expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.ERROR);
      });
    });
  });
});
