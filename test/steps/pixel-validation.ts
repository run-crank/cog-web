import { Struct } from 'google-protobuf/google/protobuf/struct_pb';
import * as chai from 'chai';
import { default as sinon } from 'ts-sinon';
import * as sinonChai from 'sinon-chai';
import 'mocha';

import { Step as ProtoStep, StepDefinition, FieldDefinition, RunStepResponse } from '../../src/proto/cog_pb';
import { Step } from '../../src/steps/pixel-validation';

chai.use(sinonChai);

describe('PixelValidationStep', () => {
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
      expect(stepDef.getStepId()).to.equal('PixelValidationStep');
      expect(stepDef.getName()).to.equal('Check for a pixel');
      expect(stepDef.getExpression()).to.equal('there should be matching network requests for the (?<pixelName>.+) pixel');
      expect(stepDef.getType()).to.equal(StepDefinition.Type.VALIDATION);
    });

    it('should return expected step fields', () => {
      const stepDef: StepDefinition = stepUnderTest.getDefinition();
      const fields: any[] = stepDef.getExpectedFieldsList().map((field: FieldDefinition) => {
        return field.toObject();
      });

      const reqCount: any = fields.filter(f => f.key === 'pixelName')[0];
      expect(reqCount.optionality).to.equal(FieldDefinition.Optionality.REQUIRED);
      expect(reqCount.type).to.equal(FieldDefinition.Type.STRING);

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
          pixelName: 'google analytics',
          withParameters: {},
        }));
      });

      it('should respond with error', async () => {
        const response = await stepUnderTest.executeStep(protoStep);
        expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.ERROR);
      });
    });

    describe('Pixel Name is unknown', () => {
      beforeEach(() => {
        clientWrapperStub.getCurrentPageInfo.returns(Promise.resolve('http://thisisjust.atomatest.com'));
        clientWrapperStub.getNetworkRequests.returns(Promise.resolve([]));
        clientWrapperStub.evaluateRequests.returns([{}]);
        protoStep.setData(Struct.fromJavaScript({
          pixelName: 'unknown pixel name',
          withParameters: {},
        }));
      });

      it('should respond with error', async () => {
        const response = await stepUnderTest.executeStep(protoStep);
        expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.ERROR);
      });
    });

    describe('Matched requests count greater than 0', () => {
      beforeEach(() => {
        clientWrapperStub.getCurrentPageInfo.returns(Promise.resolve('http://thisisjust.atomatest.com'));
        clientWrapperStub.getNetworkRequests.returns(Promise.resolve([]));
        // tslint:disable-next-line:prefer-array-literal
      });
      describe('GET', () => {
        it('should respond with pass', async () => {
          clientWrapperStub.evaluateRequests.returns([
            {
              url: 'https://www.google-analytics.com/collect?anyKey=anyValue',
              method: 'GET',
            },
            {
              url: 'https://www.google-analytics.com/collect?anyKey=anyValue',
              method: 'GET',
            },
          ]);
          protoStep.setData(Struct.fromJavaScript({
            pixelName: 'google analytics',
            withParameters: {anyKey: 'anyValue'},
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
                url: 'https://www.google-analytics.com/collect',
                method: 'POST',
                postData: '{"anyKey":"anyValue"}',
              },
              {
                rawRequest: { _headers: { 'content-type': 'application/json' } },
                url: 'https://www.google-analytics.com/collect',
                method: 'POST',
                postData: '{"anyKey":"anyValue"}',
              },
            ]);
            protoStep.setData(Struct.fromJavaScript({
              pixelName: 'google analytics',
              withParameters: {},
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
                url: 'https://www.google-analytics.com/collect',
                method: 'POST',
                postData: 'anyKey=anyValue',
              },
              {
                rawRequest: { _headers: { 'content-type': 'anyContentType' } },
                url: 'https://www.google-analytics.com/collect',
                method: 'POST',
                postData: 'anyKey=anyValue',
              },
            ]);
            protoStep.setData(Struct.fromJavaScript({
              pixelName: 'google analytics',
              withParameters: {},
            }));
            const response = await stepUnderTest.executeStep(protoStep);
            expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.PASSED);
          });
        });
      });
    });
  });
});
