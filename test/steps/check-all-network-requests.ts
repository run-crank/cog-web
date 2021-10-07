import { Struct } from 'google-protobuf/google/protobuf/struct_pb';
import * as chai from 'chai';
import { default as sinon } from 'ts-sinon';
import * as sinonChai from 'sinon-chai';
import 'mocha';

import { Step as ProtoStep, StepDefinition, FieldDefinition, RunStepResponse } from '../../src/proto/cog_pb';
import { Step } from '../../src/steps/check-all-network-requests';

chai.use(sinonChai);

describe('CheckAllNetworkRequests', () => {
  const expect = chai.expect;
  let protoStep: ProtoStep;
  let stepUnderTest: Step;
  let clientWrapperStub: any;

  beforeEach(() => {
    // Set up test stubs.
    clientWrapperStub = sinon.stub();
    clientWrapperStub.getCurrentPageInfo = sinon.stub();
    clientWrapperStub.getFinishedRequests = sinon.stub();
    stepUnderTest = new Step(clientWrapperStub);
    protoStep = new ProtoStep();
  });

  describe('Metadata', () => {
    it('should return expected step metadata', () => {
      const stepDef: StepDefinition = stepUnderTest.getDefinition();
      expect(stepDef.getStepId()).to.equal('CheckAllNetworkRequestsStep');
      expect(stepDef.getName()).to.equal('Check for all network requests');
      expect(stepDef.getExpression()).to.equal('there should be network requests from the page');
      expect(stepDef.getType()).to.equal(StepDefinition.Type.VALIDATION);
    });

    it('should return expected step fields', () => {
      const stepDef: StepDefinition = stepUnderTest.getDefinition();
      const fields: any[] = stepDef.getExpectedFieldsList().map((field: FieldDefinition) => {
        return field.toObject();
      });

      expect(fields.length).to.equal(0);
    });
  });

  describe('ExecuteStep', () => {
    describe('Navigate To not called', () => {
      beforeEach(() => {
        clientWrapperStub.getCurrentPageInfo.throws();
        protoStep.setData(Struct.fromJavaScript({
          reqCount: 1,
          baseUrl: 'http://thisisjust.atomatest.com',
        }));
      });

      it('should respond with error', async () => {
        const response = await stepUnderTest.executeStep(protoStep);
        expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.ERROR);
      });
    });

    describe('Zero requests should result in an error', () => {
      beforeEach(() => {
        clientWrapperStub.getCurrentPageInfo.returns(Promise.resolve('http://thisisjust.atomatest.com'));
        clientWrapperStub.getFinishedRequests.returns(Promise.resolve([]));
      });

      it('should respond with fail', async () => {
        const response = await stepUnderTest.executeStep(protoStep);
        expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.FAILED);
      });
    });

    describe('One or more requests should result in pass', () => {
      beforeEach(() => {
        clientWrapperStub.getCurrentPageInfo.returns(Promise.resolve('http://thisisjust.atomatest.com'));
        clientWrapperStub.getFinishedRequests.returns(Promise.resolve([{ url: 'https://www.someurl.com' }]));
        // tslint:disable-next-line:prefer-array-literal
      });

      it('should respond with pass', async () => {
        const response = await stepUnderTest.executeStep(protoStep);
        expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.PASSED);
      });
    });
  });
});
