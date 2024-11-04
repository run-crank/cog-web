import { Struct } from 'google-protobuf/google/protobuf/struct_pb';
import * as chai from 'chai';
import { default as sinon } from 'ts-sinon';
import * as sinonChai from 'sinon-chai';
import 'mocha';

import { Step as ProtoStep, StepDefinition, FieldDefinition, RecordDefinition, RunStepResponse } from '../../src/proto/cog_pb';
import { Step } from '../../src/steps/cookie-check';

chai.use(sinonChai);

describe('CheckCookie', () => {
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
      expect(stepDef.getStepId()).to.equal('CheckCookie');
      expect(stepDef.getName()).to.equal('Check a cookie on the current page');
      expect(stepDef.getExpression()).to.equal('the (?<cookie>[a-zA-Z0-9_-]+) cookie should (?<operator>be set|not be set|be less than|be greater than|be one of|be|contain|not be one of|not be|not contain|match|not match) ?(?<expectation>.+)?');
      expect(stepDef.getType()).to.equal(StepDefinition.Type.VALIDATION);
    });

    it('should return expected step fields', () => {
      const stepDef: StepDefinition = stepUnderTest.getDefinition();
      const fields: any[] = stepDef.getExpectedFieldsList().map((field: FieldDefinition) => field.toObject());

      const cookieField: any = fields.filter(f => f.key === 'cookie')[0];
      expect(cookieField.optionality).to.equal(FieldDefinition.Optionality.REQUIRED);
      expect(cookieField.type).to.equal(FieldDefinition.Type.STRING);

      const operatorField: any = fields.filter(f => f.key === 'operator')[0];
      expect(operatorField.optionality).to.equal(FieldDefinition.Optionality.OPTIONAL);
      expect(operatorField.type).to.equal(FieldDefinition.Type.STRING);

      const expectationField: any = fields.filter(f => f.key === 'expectation')[0];
      expect(expectationField.optionality).to.equal(FieldDefinition.Optionality.OPTIONAL);
      expect(expectationField.type).to.equal(FieldDefinition.Type.ANYSCALAR);
    });

    it('should return expected step records', () => {
      const stepDef: StepDefinition = stepUnderTest.getDefinition();
      const records: any[] = stepDef.getExpectedRecordsList().map((record: any) => record.toObject());

      const cookiesRecord: any = records.filter(r => r.id === 'cookies')[0];
      expect(cookiesRecord.type).to.equal(RecordDefinition.Type.KEYVALUE);
    });
  });

  describe('ExecuteStep', () => {
    describe('Cookie exists and meets expectation', () => {
      const cookiesArray = [
        { name: 'cookie1', value: 'value1' },
        { name: 'cookie2', value: 'value2' },
      ];

      beforeEach(() => {
        clientWrapperStub.waitForNetworkIdle.resolves();
        clientWrapperStub.getCookiesForCurrentPage.resolves(cookiesArray);

        protoStep.setData(Struct.fromJavaScript({
          cookie: 'cookie1',
          operator: 'be set',
          expectation: 'value1',
        }));
      });

      it('should respond with pass', async () => {
        const response: RunStepResponse = await stepUnderTest.executeStep(protoStep) as RunStepResponse;
        expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.PASSED);
        expect(response.getMessageFormat()).to.equal('cookie1 field was set, as expected. The actual value is "value1"');

        const records = response.getRecordsList();
        expect(records.length).to.equal(2);
      });
    });

    describe('Cookie does not exist and not set', () => {
      const cookiesArray = [
        { name: 'cookie2', value: 'value2' },
      ];

      beforeEach(() => {
        clientWrapperStub.waitForNetworkIdle.resolves();
        clientWrapperStub.getCookiesForCurrentPage.resolves(cookiesArray);

        protoStep.setData(Struct.fromJavaScript({
          cookie: 'cookie1',
          operator: 'not be set',
        }));
      });

      it('should respond with pass', async () => {
        const response: RunStepResponse = await stepUnderTest.executeStep(protoStep) as RunStepResponse;
        expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.PASSED);
        expect(response.getMessageFormat()).to.equal('The cookie1 cookie was not set.');

        const records = response.getRecordsList();
        expect(records.length).to.equal(2);
      });
    });

    describe('Unknown operator error', () => {
      const cookiesArray = [
        { name: 'cookie2', value: 'value2' },
      ];
      beforeEach(() => {
        clientWrapperStub.waitForNetworkIdle.resolves();
        clientWrapperStub.getCookiesForCurrentPage.resolves(cookiesArray);

        protoStep.setData(Struct.fromJavaScript({
          cookie: 'cookie2',
          operator: 'unknown-operator',
        }));
      });

      it('should respond with error', async () => {
        const response: RunStepResponse = await stepUnderTest.executeStep(protoStep) as RunStepResponse;
        expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.ERROR);
        expect(response.getMessageFormat()).to.include('Please provide one of');

        const records = response.getRecordsList();
        expect(records.length).to.equal(0);
      });
    });

    describe('Cookie not found', () => {
      beforeEach(() => {
        clientWrapperStub.waitForNetworkIdle.resolves();
        clientWrapperStub.getCookiesForCurrentPage.resolves([]);

        protoStep.setData(Struct.fromJavaScript({
          cookie: 'cookie1',
          operator: 'be set',
        }));
      });

      it('should respond with fail', async () => {
        const response: RunStepResponse = await stepUnderTest.executeStep(protoStep) as RunStepResponse;
        expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.FAILED);
        expect(response.getMessageFormat()).to.include('The cookie1 cookie was not found on the current page');

        const records = response.getRecordsList();
        expect(records.length).to.equal(2);
      });
    });

    describe('Error occurred while checking cookies', () => {
      beforeEach(() => {
        clientWrapperStub.waitForNetworkIdle.rejects(new Error('Network error'));
        protoStep.setData(Struct.fromJavaScript({
          cookie: 'cookie1',
          operator: 'be set',
        }));
      });

      it('should respond with error', async () => {
        const response: RunStepResponse = await stepUnderTest.executeStep(protoStep) as RunStepResponse;
        expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.ERROR);
        expect(response.getMessageFormat()).to.include('There was a problem checking the cookies');

        const records = response.getRecordsList();
        expect(records.length).to.equal(0);
      });
    });
  });
});
