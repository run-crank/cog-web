import { Struct } from 'google-protobuf/google/protobuf/struct_pb';
import * as chai from 'chai';
import { default as sinon } from 'ts-sinon';
import sinonChai from 'sinon-chai';
import 'mocha';

import { Step as ProtoStep, StepDefinition, FieldDefinition, RunStepResponse } from '../../../src/proto/cog_pb';
import { Step } from '../../../src/steps/linked-in/check-linked-in-insight-tag-fired';

chai.use(sinonChai);

describe('CheckLinkedInInsightTagFiredStep', () => {
  const expect = chai.expect;
  let protoStep: ProtoStep;
  let stepUnderTest: Step;
  let clientWrapperStub: any;

  beforeEach(() => {
    // Set up test stubs.
    clientWrapperStub = sinon.stub();
    clientWrapperStub.filterLinkedInInsightTag = sinon.stub();
    clientWrapperStub.getCurrentPageInfo = sinon.stub();
    clientWrapperStub.getCurrentPageInfo.resolves();
    stepUnderTest = new Step(clientWrapperStub);
    protoStep = new ProtoStep();
  });

  describe('Metadata', () => {
    it('should return expected step metadata', () => {
      const stepDef: StepDefinition = stepUnderTest.getDefinition();
      expect(stepDef.getStepId()).to.equal('CheckLinkedInInsightTagFiredStep');
      expect(stepDef.getName()).to.equal('Check that the LinkedIn insight tag fired');
      expect(stepDef.getExpression()).to.equal('the linkedin insight tag for partner id (?<pid>.+) should have fired');
      expect(stepDef.getType()).to.equal(StepDefinition.Type.VALIDATION);
    });

    it('should return expected step fields', () => {
      const stepDef: StepDefinition = stepUnderTest.getDefinition();
      const fields: any[] = stepDef.getExpectedFieldsList().map((field: FieldDefinition) => {
        return field.toObject();
      });

      const partnerId: any = fields.filter(f => f.key === 'pid')[0];
      expect(partnerId.optionality).to.equal(FieldDefinition.Optionality.REQUIRED);
      expect(partnerId.type).to.equal(FieldDefinition.Type.STRING);
    });
  });

  describe('ExecuteStep', () => {
    describe('validated', () => {
      beforeEach(() => {
        clientWrapperStub.filterLinkedInInsightTag.resolves([{ href:'https://px.ads.linkedin.com/collect?someField=someValue' }]);
        protoStep.setData(Struct.fromJavaScript({
          pid: 256,
        }));
      });

      it('should respond with pass', async () => {
        const response = await stepUnderTest.executeStep(protoStep);
        expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.PASSED);
      });
    });

    describe('not validated', () => {
      beforeEach(() => {
        clientWrapperStub.filterLinkedInInsightTag.resolves([]);
        protoStep.setData(Struct.fromJavaScript({
          pid: 256,
        }));
      });

      it('should respond with fail', async () => {
        const response = await stepUnderTest.executeStep(protoStep);
        expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.FAILED);
      });
    });

    describe('throws any error', () => {
      beforeEach(() => {
        clientWrapperStub.filterLinkedInInsightTag.throws();
        protoStep.setData(Struct.fromJavaScript({
          pid: 256,
        }));
      });

      it('should respond with error', async () => {
        const response = await stepUnderTest.executeStep(protoStep);
        expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.ERROR);
      });
    });
  });
});
