import { Struct } from 'google-protobuf/google/protobuf/struct_pb';
import * as chai from 'chai';
import { default as sinon } from 'ts-sinon';
import sinonChai from 'sinon-chai';
import 'mocha';

import { Step as ProtoStep, StepDefinition, RecordDefinition, RunStepResponse } from '../../src/proto/cog_pb';
import { Step } from '../../src/steps/cookie-discover';

chai.use(sinonChai);

describe('DiscoverCookies', () => {
  const expect = chai.expect;
  let protoStep: ProtoStep;
  let stepUnderTest: Step;
  let clientWrapperStub: any;

  beforeEach(() => {
    clientWrapperStub = sinon.stub();
    clientWrapperStub.waitForNetworkIdle = sinon.stub();
    clientWrapperStub.getCookiesForCurrentPage = sinon.stub();
    stepUnderTest = new Step(clientWrapperStub);
    protoStep = new ProtoStep();
  });

  describe('Metadata', () => {
    it('should return expected step metadata', () => {
      const stepDef: StepDefinition = stepUnderTest.getDefinition();
      expect(stepDef.getStepId()).to.equal('DiscoverCookies');
      expect(stepDef.getName()).to.equal('Discover cookies on the current page');
      expect(stepDef.getExpression()).to.equal('discover cookies on the current page');
      expect(stepDef.getType()).to.equal(StepDefinition.Type.ACTION);
    });

    it('should return expected step records', () => {
      const stepDef: StepDefinition = stepUnderTest.getDefinition();
      const records: any[] = stepDef.getExpectedRecordsList().map((record: any) => record.toObject());

      const cookiesRecord: any = records.filter(r => r.id === 'cookies')[0];
      expect(cookiesRecord.type).to.equal(RecordDefinition.Type.KEYVALUE);
    });
  });

  describe('ExecuteStep', () => {
    describe('Cookies discovered successfully', () => {
      const cookiesArray = [
        { name: 'cookie1', value: 'value1' },
        { name: 'cookie2', value: 'value2' },
      ];

      beforeEach(() => {
        clientWrapperStub.waitForNetworkIdle.resolves();
        clientWrapperStub.getCookiesForCurrentPage.resolves(cookiesArray);

        protoStep.setData(Struct.fromJavaScript({}));
      });

      it('should respond with pass', async () => {
        const response: RunStepResponse = await stepUnderTest.executeStep(protoStep);
        expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.PASSED);
        expect(response.getMessageFormat()).to.equal('Successfully discovered cookies on the current webpage');

        const records = response.getRecordsList();
        expect(records.length).to.equal(2);
      });
    });

    describe('Error occurred while discovering cookies', () => {
      beforeEach(() => {
        clientWrapperStub.waitForNetworkIdle.rejects(new Error('Network error'));
        protoStep.setData(Struct.fromJavaScript({}));
      });

      it('should respond with error', async () => {
        const response: RunStepResponse = await stepUnderTest.executeStep(protoStep);
        expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.ERROR);
        expect(response.getMessageFormat()).to.include('There was a problem checking the cookies');
      });
    });
  });
});
