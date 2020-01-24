import { Struct } from 'google-protobuf/google/protobuf/struct_pb';
import * as chai from 'chai';
import { default as sinon } from 'ts-sinon';
import * as sinonChai from 'sinon-chai';
import 'mocha';

import { Step as ProtoStep, StepDefinition, FieldDefinition, RunStepResponse } from '../../../src/proto/cog_pb';
import { Step } from '../../../src/steps/linked-in/check-linked-in-conversion-pixel-fired';

chai.use(sinonChai);

describe('CheckLinkedInConversionPixelFiredStep', () => {
  const expect = chai.expect;
  let protoStep: ProtoStep;
  let stepUnderTest: Step;
  let clientWrapperStub: any;

  beforeEach(() => {
    // Set up test stubs.
    clientWrapperStub = sinon.stub();
    clientWrapperStub.validateLinkedInConversionPixelFired = sinon.stub();
    stepUnderTest = new Step(clientWrapperStub);
    protoStep = new ProtoStep();
  });

  describe('Metadata', () => {
    it('should return expected step metadata', () => {
      const stepDef: StepDefinition = stepUnderTest.getDefinition();
      expect(stepDef.getStepId()).to.equal('CheckLinkedInConversionPixelFiredStep');
      expect(stepDef.getName()).to.equal('Check that the LinkedIn Conversion Pixel fired');
      expect(stepDef.getExpression()).to.equal('the linkedin conversion pixel for partner id (?<pid>\\d+) should have fired');
      expect(stepDef.getType()).to.equal(StepDefinition.Type.VALIDATION);
    });

    it('should return expected step fields', () => {
      const stepDef: StepDefinition = stepUnderTest.getDefinition();
      const fields: any[] = stepDef.getExpectedFieldsList().map((field: FieldDefinition) => {
        return field.toObject();
      });

      const partnerId: any = fields.filter(f => f.key === 'pid')[0];
      expect(partnerId.optionality).to.equal(FieldDefinition.Optionality.REQUIRED);
      expect(partnerId.type).to.equal(FieldDefinition.Type.NUMERIC);

      const conversionId: any = fields.filter(f => f.key === 'cid')[0];
      expect(conversionId.optionality).to.equal(FieldDefinition.Optionality.REQUIRED);
      expect(conversionId.type).to.equal(FieldDefinition.Type.NUMERIC);
    });
  });

  describe('ExecuteStep', () => {
    describe('validated', () => {
      beforeEach(() => {
        clientWrapperStub.validateLinkedInConversionPixelFired.returns(Promise.resolve(true));
        protoStep.setData(Struct.fromJavaScript({
          pid: 256,
          cid: 512,
        }));
      });

      it('should respond with pass', async () => {
        const response = await stepUnderTest.executeStep(protoStep);
        expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.PASSED);
      });
    });

    describe('not validated', () => {
      beforeEach(() => {
        clientWrapperStub.validateLinkedInConversionPixelFired.returns(Promise.resolve(false));
        protoStep.setData(Struct.fromJavaScript({
          pid: 256,
          cid: 512,
        }));
      });

      it('should respond with fail', async () => {
        const response = await stepUnderTest.executeStep(protoStep);
        expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.FAILED);
      });
    });

    describe('throws any error', () => {
      beforeEach(() => {
        clientWrapperStub.validateLinkedInConversionPixelFired.throws();
        protoStep.setData(Struct.fromJavaScript({
          pid: 256,
          cid: 512,
        }));
      });

      it('should respond with error', async () => {
        const response = await stepUnderTest.executeStep(protoStep);
        expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.ERROR);
      });
    });
  });
});
