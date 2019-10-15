import { Struct } from 'google-protobuf/google/protobuf/struct_pb';
import * as chai from 'chai';
import { default as sinon } from 'ts-sinon';
import * as sinonChai from 'sinon-chai';
import 'mocha';

import { Step as ProtoStep, StepDefinition, FieldDefinition, RunStepResponse } from '../../src/proto/cog_pb';
import { Step } from '../../src/steps/scroll-through';

chai.use(sinonChai);

describe('ClickAnElement', () => {
  const expect = chai.expect;
  let protoStep: ProtoStep;
  let stepUnderTest: Step;
  let clientWrapperStub: any;

  beforeEach(() => {
    // Set up test stubs.
    clientWrapperStub = sinon.stub();
    clientWrapperStub.scrollThrough = sinon.stub();
    stepUnderTest = new Step(clientWrapperStub);
    protoStep = new ProtoStep();
  });

  describe('Metadata', () => {
    it('should return expected step metadata', () => {
      const stepDef: StepDefinition = stepUnderTest.getDefinition();
      expect(stepDef.getStepId()).to.equal('ScrollThrough');
      expect(stepDef.getName()).to.equal('Scroll through a percentage of a web page');
      expect(stepDef.getExpression()).to.equal('scroll through (?<depth>\\d+)% of the page');
      expect(stepDef.getType()).to.equal(StepDefinition.Type.ACTION);
    });

    it('should return expected step fields', () => {
      const stepDef: StepDefinition = stepUnderTest.getDefinition();
      const fields: any[] = stepDef.getExpectedFieldsList().map((field: FieldDefinition) => {
        return field.toObject();
      });

      const pageUrl: any = fields.filter(f => f.key === 'depth')[0];
      expect(pageUrl.optionality).to.equal(FieldDefinition.Optionality.REQUIRED);
      expect(pageUrl.type).to.equal(FieldDefinition.Type.NUMERIC);
    });
  });

  describe('ExecuteStep', () => {
    describe('Scrolled through', () => {
      const expectedDepth = 50;
      beforeEach(() => {
        clientWrapperStub.scrollThrough.returns(Promise.resolve());
        protoStep.setData(
          Struct.fromJavaScript(
            {
              depth: expectedDepth,
            },
          ),
        );
      });

      it('should call scroll through with expectedArgs', async () => {
        await stepUnderTest.executeStep(protoStep);
        expect(clientWrapperStub.scrollThrough).to.have.been.calledWith(expectedDepth);
      });

      it('should respond with pass', async () => {
        const response = await stepUnderTest.executeStep(protoStep);
        expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.PASSED);
      });
    });

    describe('Scroll through did not occur', () => {
      const expectedDepth = 50;
      beforeEach(() => {
        clientWrapperStub.scrollThrough.throws();
        protoStep.setData(
            Struct.fromJavaScript(
              {
                depth: expectedDepth,
              },
            ),
          );
      });

      it('should respond with error', async () => {
        const response = await stepUnderTest.executeStep(protoStep);
        expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.ERROR);
      });
    });
  });
});
