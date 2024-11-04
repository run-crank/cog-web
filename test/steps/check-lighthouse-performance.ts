import { Struct } from 'google-protobuf/google/protobuf/struct_pb';
import * as chai from 'chai';
import { default as sinon } from 'ts-sinon';
import * as sinonChai from 'sinon-chai';
import 'mocha';

import { Step as ProtoStep, StepDefinition, FieldDefinition, RunStepResponse } from '../../src/proto/cog_pb';
import { Step } from '../../src/steps/check-lighthouse-performance';

chai.use(sinonChai);

describe('CheckLighthousePerformance', () => {
  const expect = chai.expect;
  let protoStep: ProtoStep;
  let stepUnderTest: Step;
  let clientWrapperStub: any;

  beforeEach(() => {
    // Set up test stubs.
    clientWrapperStub = sinon.stub();
    clientWrapperStub.getCurrentPageInfo = sinon.stub();
    clientWrapperStub.getLighthouseScores = sinon.stub();
    stepUnderTest = new Step(clientWrapperStub);
    protoStep = new ProtoStep();
  });

  describe('Metadata', () => {
    it('should return expected step metadata', () => {
      const stepDef: StepDefinition = stepUnderTest.getDefinition();
      expect(stepDef.getStepId()).to.equal('CheckLighthousePerformance');
      expect(stepDef.getName()).to.equal('Check a page\'s Lighthouse performance score');
      expect(stepDef.getExpression()).to.equal('the (?<throttleTo>mobile|desktop) lighthouse (?<category>performance|accessibility|best-practices|seo) score should be (?<expectedScore>\\d{1,3}) or higher');
      expect(stepDef.getType()).to.equal(StepDefinition.Type.VALIDATION);
    });

    it('should return expected step fields', () => {
      const stepDef: StepDefinition = stepUnderTest.getDefinition();
      const fields: any[] = stepDef.getExpectedFieldsList().map((field: FieldDefinition) => {
        return field.toObject();
      });

      const throttleTo: any = fields.filter(f => f.key === 'throttleTo')[0];
      expect(throttleTo.optionality).to.equal(FieldDefinition.Optionality.REQUIRED);
      expect(throttleTo.type).to.equal(FieldDefinition.Type.STRING);

      const expectedScore: any = fields.filter(f => f.key === 'expectedScore')[0];
      expect(expectedScore.optionality).to.equal(FieldDefinition.Optionality.REQUIRED);
      expect(expectedScore.type).to.equal(FieldDefinition.Type.NUMERIC);
    });
  });

  describe('ExecuteStep', () => {
    describe('current page url not set', () => {
      it('should respond with error', async () => {
        protoStep.setData(Struct.fromJavaScript({ throttleTo: 'mobile', expectedScore: 50 }));
        clientWrapperStub.getCurrentPageInfo.throws();
        const response = await stepUnderTest.executeStep(protoStep);
        expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.ERROR);
      });
    });

    describe('actual score is greater than or equal expected score', () => {
      beforeEach(() => {
        clientWrapperStub.getCurrentPageInfo.returns(Promise.resolve('http://google.com'));
        clientWrapperStub.getLighthouseScores.returns(Promise.resolve({
          timing:
          {
            entries: [
              { name: 'lh:computed:FirstContentfulPaint', duration: 3 },
              { name: 'lh:computed:FirstMeaningfulPaint', duration: 3 },
              { name: 'lh:computed:SpeedIndex', duration: 3 },
              { name: 'lh:computed:FirstCPUIdle', duration: 3 },
              { name: 'lh:computed:Interactive', duration: 3 },
              { name: 'lh:computed:MaxPotentialFID', duration: 3 },
            ],
          },
          audits: {
            someAudit: {
              title: 'someAudit',
              details: {
                type: 'opportunity',
                overallSavingMs: 123,
              },
              description: 'someDescription',
            },
          },
          categories: {
            performance: {
              score: 0.75,
            },
          },
        }));
      });

      it('should respond with pass when expectedScore is equal to actualScore', async () => {
        protoStep.setData(Struct.fromJavaScript({ throttleTo: 'mobile', expectedScore: 75 }));
        const response = await stepUnderTest.executeStep(protoStep);
        expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.PASSED);
      });

      it('should respond with pass when actual score is greater than the expected score', async () => {
        protoStep.setData(Struct.fromJavaScript({ throttleTo: 'mobile', expectedScore: 60 }));
        const response = await stepUnderTest.executeStep(protoStep);
        expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.PASSED);
      });
    });

    describe('actual score is less than expected score', () => {
      beforeEach(() => {
        clientWrapperStub.getCurrentPageInfo.returns(Promise.resolve('http://google.com'));
        clientWrapperStub.getLighthouseScores.returns(Promise.resolve({
          timing:
          {
            entries: [
              { name: 'lh:computed:FirstContentfulPaint', duration: 3 },
              { name: 'lh:computed:FirstMeaningfulPaint', duration: 3 },
              { name: 'lh:computed:SpeedIndex', duration: 3 },
              { name: 'lh:computed:FirstCPUIdle', duration: 3 },
              { name: 'lh:computed:Interactive', duration: 3 },
              { name: 'lh:computed:MaxPotentialFID', duration: 3 },
            ],
          },
          audits: {
            someAudit: {
              title: 'someAudit',
              details: {
                type: 'opportunity',
                overallSavingMs: 123,
              },
              description: 'someDescription',
            },
          },
          categories: {
            performance: {
              score: 0.75,
            },
          },
        }));
      });

      it('should respond with fail when expectedScore is less than the actualScore', async () => {
        protoStep.setData(Struct.fromJavaScript({ throttleTo: 'mobile', expectedScore: 100 }));
        const response = await stepUnderTest.executeStep(protoStep);
        expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.FAILED);
      });
    });
  });
});
