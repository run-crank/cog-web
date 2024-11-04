import { Struct } from 'google-protobuf/google/protobuf/struct_pb';
import * as chai from 'chai';
import { default as sinon } from 'ts-sinon';
import * as sinonChai from 'sinon-chai';
import 'mocha';

import { Step as ProtoStep, StepDefinition, FieldDefinition, RunStepResponse } from '../../src/proto/cog_pb';
import { Step } from '../../src/steps/scroll-to';

chai.use(sinonChai);

describe('ScrollToPage', () => {
  const expect = chai.expect;
  let protoStep: ProtoStep;
  let stepUnderTest: Step;
  let clientWrapperStub: any;

  beforeEach(() => {
    // Set up test stubs.
    clientWrapperStub = sinon.stub();
    clientWrapperStub.scrollTo = sinon.stub();
    clientWrapperStub.client = sinon.stub();
    clientWrapperStub.client.screenshot = sinon.stub();
    clientWrapperStub.client.screenshot.returns('anyBinary');
    stepUnderTest = new Step(clientWrapperStub);
    protoStep = new ProtoStep();
  });

  describe('Metadata', () => {
    it('should return expected step metadata', () => {
      const stepDef: StepDefinition = stepUnderTest.getDefinition();
      expect(stepDef.getStepId()).to.equal('ScrollTo');
      expect(stepDef.getName()).to.equal('Scroll on a web page');
      expect(stepDef.getExpression()).to.equal('scroll to (?<depth>\\d+)(?<units>px|%) of the page');
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
    describe('Scrolled to', () => {
      const expectedDepth = 50;
      beforeEach(() => {
        clientWrapperStub.scrollTo.returns(Promise.resolve());
        protoStep.setData(
          Struct.fromJavaScript(
            {
              depth: expectedDepth,
            },
          ),
        );
      });

      it('should call scroll to with expectedArgs', async () => {
        await stepUnderTest.executeStep(protoStep);
        expect(clientWrapperStub.scrollTo).to.have.been.calledWith(expectedDepth);
      });

      it('should respond with pass', async () => {
        const response = await stepUnderTest.executeStep(protoStep);
        expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.PASSED);
      });
    });

    describe('Scroll to did not occur', () => {
      const expectedDepth = 50;
      beforeEach(() => {
        clientWrapperStub.scrollTo.throws();
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
