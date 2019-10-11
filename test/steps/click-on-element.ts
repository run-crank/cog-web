import { Struct } from 'google-protobuf/google/protobuf/struct_pb';
import * as chai from 'chai';
import { default as sinon } from 'ts-sinon';
import * as sinonChai from 'sinon-chai';
import 'mocha';

import { Step as ProtoStep, StepDefinition, FieldDefinition, RunStepResponse } from '../../src/proto/cog_pb';
import { Step } from '../../src/steps/click-on-element';

chai.use(sinonChai);

describe('NavigateToPage', () => {
  const expect = chai.expect;
  let protoStep: ProtoStep;
  let stepUnderTest: Step;
  let clientWrapperStub: any;

  beforeEach(() => {
    // Set up test stubs.
    clientWrapperStub = sinon.stub();
    clientWrapperStub.clickElement = sinon.stub();
    stepUnderTest = new Step(clientWrapperStub);
    protoStep = new ProtoStep();
  });

  describe('Metadata', () => {
    it('should return expected step metadata', () => {
      const stepDef: StepDefinition = stepUnderTest.getDefinition();
      expect(stepDef.getStepId()).to.equal('ClickOnElement');
      expect(stepDef.getName()).to.equal('Click an element on a page');
      expect(stepDef.getExpression()).to.equal('click the page element (?<domQuerySelector>.+)');
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
    describe('Element clicked', () => {
      const expectedSelector = '[attribute="test"]';
      beforeEach(() => {
        clientWrapperStub.clickElement.returns(Promise.resolve());
        protoStep.setData(
          Struct.fromJavaScript(
            {
              domQuerySelector: expectedSelector,
            },
          ),
        );
      });

      it('should call click element with expectedArgs', async () => {
        await stepUnderTest.executeStep(protoStep);
        expect(clientWrapperStub.clickElement).to.have.been.calledWith(expectedSelector);
      });

      it('should respond with pass', async () => {
        const response = await stepUnderTest.executeStep(protoStep);
        expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.PASSED);
      });
    });

    describe('Element not clicked', () => {
      const expectedSelector = '[attribute="test"]';
      beforeEach(() => {
        clientWrapperStub.clickElement.throws();
        protoStep.setData(
            Struct.fromJavaScript(
              {
                domQuerySelector: expectedSelector,
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
