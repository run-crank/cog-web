import { Struct } from 'google-protobuf/google/protobuf/struct_pb';
import * as chai from 'chai';
import { default as sinon } from 'ts-sinon';
import * as sinonChai from 'sinon-chai';
import 'mocha';

import { Step as ProtoStep, StepDefinition, FieldDefinition, RunStepResponse } from '../../src/proto/cog_pb';
import { Step } from '../../src/steps/check-network-request';

chai.use(sinonChai);

describe('CheckNetworkRequest', () => {
  const expect = chai.expect;
  let protoStep: ProtoStep;
  let stepUnderTest: Step;
  let clientWrapperStub: any;

  beforeEach(() => {
    // Set up test stubs.
    clientWrapperStub = sinon.stub();
    clientWrapperStub.getCurrentPageInfo = sinon.stub();
    clientWrapperStub.getNetworkRequests = sinon.stub();
    clientWrapperStub.evaluateRequests = sinon.stub();
    stepUnderTest = new Step(clientWrapperStub);
    protoStep = new ProtoStep();
  });

  describe('Metadata', () => {
    it('should return expected step metadata', () => {
      const stepDef: StepDefinition = stepUnderTest.getDefinition();
      expect(stepDef.getStepId()).to.equal('CheckNetworkRequestStep');
      expect(stepDef.getName()).to.equal('Check for a specific network request');
      expect(stepDef.getExpression()).to.equal('there should be (?<reqCount>\\d+) matching network requests? for (?<baseUrl>.+)');
      expect(stepDef.getType()).to.equal(StepDefinition.Type.VALIDATION);
    });

    it('should return expected step fields', () => {
      const stepDef: StepDefinition = stepUnderTest.getDefinition();
      const fields: any[] = stepDef.getExpectedFieldsList().map((field: FieldDefinition) => {
        return field.toObject();
      });

      const reqCount: any = fields.filter(f => f.key === 'reqCount')[0];
      expect(reqCount.optionality).to.equal(FieldDefinition.Optionality.REQUIRED);
      expect(reqCount.type).to.equal(FieldDefinition.Type.NUMERIC);

      const baseUrl: any = fields.filter(f => f.key === 'baseUrl')[0];
      expect(baseUrl.optionality).to.equal(FieldDefinition.Optionality.REQUIRED);
      expect(baseUrl.type).to.equal(FieldDefinition.Type.URL);

      const pathContains: any = fields.filter(f => f.key === 'pathContains')[0];
      expect(pathContains.optionality).to.equal(FieldDefinition.Optionality.OPTIONAL);
      expect(pathContains.type).to.equal(FieldDefinition.Type.STRING);

      const withParameters: any = fields.filter(f => f.key === 'withParameters')[0];
      expect(withParameters.optionality).to.equal(FieldDefinition.Optionality.OPTIONAL);
      expect(withParameters.type).to.equal(FieldDefinition.Type.MAP);
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

    describe('Matched requests count is not equal to Expected requests count', () => {
      beforeEach(() => {
        clientWrapperStub.getCurrentPageInfo.returns(Promise.resolve('http://thisisjust.atomatest.com'));
        clientWrapperStub.getNetworkRequests.returns(Promise.resolve([]));
        clientWrapperStub.evaluateRequests.returns([{}]);
        protoStep.setData(Struct.fromJavaScript({
          reqCount: 10,
          baseUrl: 'http://thisisjust.atomatest.com',
        }));
      });

      it('should respond with fail', async () => {
        const response = await stepUnderTest.executeStep(protoStep);
        expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.FAILED);
      });
    });

    describe('Matched requests count is equal to Expected requests count', () => {
      beforeEach(() => {
        clientWrapperStub.getCurrentPageInfo.returns(Promise.resolve('http://thisisjust.atomatest.com'));
        clientWrapperStub.getNetworkRequests.returns(Promise.resolve([]));
        // tslint:disable-next-line:prefer-array-literal
      });
      describe('GET', () => {
        it('should respond with pass', async () => {
          clientWrapperStub.evaluateRequests.returns([
            {
              url: 'http://thisisjust.atomatest.com?anyKey=anyValue',
              method: 'GET',
            },
            {
              url: 'http://thisisjust.atomatest.com?anyKey=anyValue',
              method: 'GET',
            },
          ]);
          protoStep.setData(Struct.fromJavaScript({
            reqCount: 2,
            baseUrl: 'http://thisisjust.atomatest.com',
          }));
          const response = await stepUnderTest.executeStep(protoStep);
          expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.PASSED);
        });
      });
      describe('POST', () => {
        describe('JSON Payload Check', () => {
          it('should respond with pass', async () => {
            clientWrapperStub.evaluateRequests.returns([
              {
                rawRequest: { _headers: { 'content-type': 'application/json' } },
                url: 'http://thisisjust.atomatest.com',
                method: 'POST',
                postData: '{"anyKey":"anyValue"}',
              },
              {
                rawRequest: { _headers: { 'content-type': 'application/json' } },
                url: 'http://thisisjust.atomatest.com',
                method: 'POST',
                postData: '{"anyKey":"anyValue"}',
              },
            ]);
            protoStep.setData(Struct.fromJavaScript({
              reqCount: 2,
              baseUrl: 'http://thisisjust.atomatest.com',
            }));
            const response = await stepUnderTest.executeStep(protoStep);
            expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.PASSED);
          });
        });
        describe('Form Payload Check', () => {
          it('should respond with pass', async () => {
            clientWrapperStub.evaluateRequests.returns([
              {
                rawRequest: { _headers: { 'content-type': 'anyContentType' } },
                url: 'http://thisisjust.atomatest.com',
                method: 'POST',
                postData: 'anyKey=anyValue',
              },
              {
                rawRequest: { _headers: { 'content-type': 'anyContentType' } },
                url: 'http://thisisjust.atomatest.com',
                method: 'POST',
                postData: 'anyKey=anyValue',
              },
            ]);
            protoStep.setData(Struct.fromJavaScript({
              reqCount: 2,
              baseUrl: 'http://thisisjust.atomatest.com',
            }));
            const response = await stepUnderTest.executeStep(protoStep);
            expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.PASSED);
          });
        });
      });
    });
  });
});
