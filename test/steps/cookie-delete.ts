import { Struct } from 'google-protobuf/google/protobuf/struct_pb';
import * as chai from 'chai';
import { default as sinon } from 'ts-sinon';
import sinonChai from 'sinon-chai';
import 'mocha';

import { Step as ProtoStep, StepDefinition, FieldDefinition, RecordDefinition, RunStepResponse } from '../../src/proto/cog_pb';
import { Step } from '../../src/steps/cookie-delete';

chai.use(sinonChai);

describe('DeleteCookies', () => {
  const expect = chai.expect;
  let protoStep: ProtoStep;
  let stepUnderTest: Step;
  let clientWrapperStub: any;

  beforeEach(() => {
    clientWrapperStub = sinon.stub();
    clientWrapperStub.waitForNetworkIdle = sinon.stub();
    clientWrapperStub.getCookiesForCurrentPage = sinon.stub();
    clientWrapperStub.deleteCookie = sinon.stub();
    stepUnderTest = new Step(clientWrapperStub);
    protoStep = new ProtoStep();
  });

  describe('Metadata', () => {
    it('should return expected step metadata', () => {
      const stepDef: StepDefinition = stepUnderTest.getDefinition();
      expect(stepDef.getStepId()).to.equal('DeleteCookies');
      expect(stepDef.getName()).to.equal('Delete cookies on the current page');
      expect(stepDef.getExpression()).to.equal('delete (the (?<cookie>[a-zA-Z0-9_-]+) cookie|all cookies)');
      expect(stepDef.getType()).to.equal(StepDefinition.Type.ACTION);
    });

    it('should return expected step fields', () => {
      const stepDef: StepDefinition = stepUnderTest.getDefinition();
      const fields: any[] = stepDef.getExpectedFieldsList().map((field: FieldDefinition) => field.toObject());

      const cookieField: any = fields.filter(f => f.key === 'cookie')[0];
      expect(cookieField.optionality).to.equal(FieldDefinition.Optionality.OPTIONAL);
      expect(cookieField.type).to.equal(FieldDefinition.Type.STRING);
    });

    it('should return expected step records', () => {
      const stepDef: StepDefinition = stepUnderTest.getDefinition();
      const records: any[] = stepDef.getExpectedRecordsList().map((record: any) => record.toObject());

      const cookiesRecord: any = records.filter(r => r.id === 'cookies')[0];
      expect(cookiesRecord.type).to.equal(RecordDefinition.Type.KEYVALUE);
    });
  });

  describe('ExecuteStep', () => {
    describe('Delete specific cookie successfully', () => {
      const cookiesArray = [
        { name: 'cookie1', value: 'value1' },
        { name: 'cookie2', value: 'value2' },
      ];

      beforeEach(() => {
        clientWrapperStub.waitForNetworkIdle.resolves();
        clientWrapperStub.getCookiesForCurrentPage.resolves(cookiesArray);
        clientWrapperStub.deleteCookie.resolves();

        protoStep.setData(Struct.fromJavaScript({ cookie: 'cookie1' }));
      });

      it('should respond with pass', async () => {
        const response: RunStepResponse = await stepUnderTest.executeStep(protoStep);
        expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.PASSED);
        expect(response.getMessageFormat()).to.equal('Successfully deleted the cookie1 cookie');

        const records = response.getRecordsList();
        expect(records.length).to.equal(2);
      });
    });

    describe('Delete specific cookie not found', () => {
      const cookiesArray = [
        { name: 'cookie2', value: 'value2' },
      ];

      beforeEach(() => {
        clientWrapperStub.waitForNetworkIdle.resolves();
        clientWrapperStub.getCookiesForCurrentPage.resolves(cookiesArray);

        protoStep.setData(Struct.fromJavaScript({ cookie: 'cookie1' }));
      });

      it('should respond with fail', async () => {
        const response: RunStepResponse = await stepUnderTest.executeStep(protoStep);
        expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.FAILED);
        expect(response.getMessageFormat()).to.include('Unable to delete cookie: A cookie with the name cookie1 does not exist on the current page');

        const records = response.getRecordsList();
        expect(records.length).to.equal(2);
      });
    });

    describe('Delete all cookies successfully', () => {
      const cookiesArray = [
        { name: 'cookie1', value: 'value1' },
        { name: 'cookie2', value: 'value2' },
      ];

      beforeEach(() => {
        clientWrapperStub.waitForNetworkIdle.resolves();
        clientWrapperStub.getCookiesForCurrentPage.resolves(cookiesArray);
        clientWrapperStub.deleteCookie.resolves();

        protoStep.setData(Struct.fromJavaScript({}));
      });

      it('should respond with pass', async () => {
        const response: RunStepResponse = await stepUnderTest.executeStep(protoStep);
        expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.PASSED);
        expect(response.getMessageFormat()).to.equal('Successfully deleted all cookies from the page');

        const records = response.getRecordsList();
        expect(records.length).to.equal(2);
      });
    });

    describe('Error occurred while deleting cookies', () => {
      beforeEach(() => {
        clientWrapperStub.waitForNetworkIdle.rejects(new Error('Network error'));
        protoStep.setData(Struct.fromJavaScript({}));
      });

      it('should respond with error', async () => {
        const response: RunStepResponse = await stepUnderTest.executeStep(protoStep);
        expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.ERROR);
        expect(response.getMessageFormat()).to.include('There was a problem deleting the cookies');
      });
    });
  });
});
