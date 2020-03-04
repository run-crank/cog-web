import { BaseStep, Field, StepInterface, ExpectedRecord } from '../core/base-step';
import { Step, RunStepResponse, FieldDefinition, StepDefinition, RecordDefinition } from '../proto/cog_pb';

export class CheckLighthousePerformance extends BaseStep implements StepInterface {

  protected stepName: string = 'Check a page\'s Lighthouse performance score';
  // tslint:disable-next-line:max-line-length
  protected stepExpression: string = 'the (?<throttleTo>mobile|desktop) lighthouse performance score should be (?<expectedScore>\\d{1,3}) or higher';
  protected stepType: StepDefinition.Type = StepDefinition.Type.VALIDATION;
  protected expectedFields: Field[] = [{
    field: 'throttleTo',
    type: FieldDefinition.Type.STRING,
    description: 'Throttle Level (mobile or desktop)',
  }, {
    field: 'expectedScore',
    type: FieldDefinition.Type.NUMERIC,
    description: 'Expected Score',
  }];

  protected expectedRecords: ExpectedRecord[] = [{
    id: 'labData',
    type: RecordDefinition.Type.KEYVALUE,
    fields: [{
      field: 'actualScore',
      type: FieldDefinition.Type.NUMERIC,
      description: 'Performance Score',
    }, {
      field: 'firstContentfulPaint',
      type: FieldDefinition.Type.NUMERIC,
      description: 'First Contentful Paint',
    }, {
      field: 'firstMeaningfulPaint',
      type: FieldDefinition.Type.NUMERIC,
      description: 'First Meaningful Paint',
    }, {
      field: 'speedIndex',
      type: FieldDefinition.Type.NUMERIC,
      description: 'Speed Index',
    }, {
      field: 'firstCpuIdle',
      type: FieldDefinition.Type.NUMERIC,
      description: 'First CPU Idle',
    }, {
      field: 'timeToInteractive',
      type: FieldDefinition.Type.NUMERIC,
      description: 'Time to Interactive',
    }, {
      field: 'maxPotentialFirstInputDelay',
      type: FieldDefinition.Type.NUMERIC,
      description: 'Max Potential First Input Delay',
    }],
    dynamicFields: false,
  }];

  async executeStep(step: Step): Promise<RunStepResponse> {
    const stepData: any = step.getData().toJavaScript();
    const throttleTo: 'mobile' | 'desktop' = stepData.throttleTo;
    const expectedScore: number = stepData.expectedScore;

    try {
      const currentUrl = await this.client.getCurrentPageInfo('url');
      const lhr = await this.client.getLighthouseScores(currentUrl.toString(), throttleTo);
      const performance: any = Object.values(lhr.categories)[0];
      const actualScore = Math.round(performance.score * 100);
      if (actualScore < expectedScore) {
        const audits = Object.values(lhr.audits);
        const recordTable = this.createFailRecord(audits);
        const recordKeyValue = this.createSuccessRecord(lhr);

        return this.fail(
          'The page\'s performance score of %d was lower than the expected score of %d in %s.\n\n\n',
          [
            actualScore,
            expectedScore,
            throttleTo,
            audits.filter((audit: any) => audit.details && audit.details.type === 'opportunity' && audit.details.overallSavingsMs > 0)
            .sort((a: any, b: any) => b.details.overallSavingsMs - a.details.overallSavingsMs)
            .map((audit: any) => ` - ${audit.title}: Potential savings of ${audit.details.overallSavingsMs}ms\n`).join(''),
          ],
          [
            recordTable,
            recordKeyValue,
          ]);
      }
      const record = this.createSuccessRecord(lhr);
      return this.pass(
        'The page\'s performance score of %d was greater than or equal to %d, as expected in %s',
        [
          actualScore,
          expectedScore,
          throttleTo,
        ],
        [
          record,
        ]);
    } catch (e) {
      return this.error('There was an error checking lighthouse performance: %s', [
        e.toString(),
      ]);
    }
  }

  private createSuccessRecord(record) {
    const obj = {};
    const entries = record.timing.entries;
    obj['actualScore'] = record.categories.performance.score * 100;
    obj['firstContentfulPaint'] = entries.find(data => data.name == 'lh:computed:FirstContentfulPaint').duration;
    obj['firstMeaningfulPaint'] =  entries.find(data => data.name == 'lh:computed:FirstMeaningfulPaint').duration;
    obj['speedIndex'] = entries.find(data => data.name == 'lh:computed:SpeedIndex').duration;
    obj['firstCpuIdle'] = entries.find(data => data.name == 'lh:computed:FirstCPUIdle').duration;
    obj['timeToInteractive'] = entries.find(data => data.name == 'lh:computed:Interactive').duration;
    obj['maxPotentialFirstInputDelay'] = entries.find(data => data.name == 'lh:computed:MaxPotentialFID').duration;

    return this.keyValue('labData', 'Performance Lab Data', obj);
  }

  private createFailRecord(audits) {
    const headers = {
      title: 'Title',
      overallSavingsMs: 'Estimated Savings (ms)',
      description: 'Details',
    };
    const rows = [];
    audits.filter((audit: any) => audit.details && audit.details.type === 'opportunity' && audit.details.overallSavingsMs > 0)
    .sort((a: any, b: any) => b.details.overallSavingsMs - a.details.overallSavingsMs)
    .forEach((audit) => {
      const data = {
        title: String(audit.title) ,
        overallSavingsMs: audit.details ? String(audit.details.overallSavingsMs) : '',
        description: String(audit.description),
      };
      rows.push(data);
    });

    return this.table('performanceOpportunities', 'Performance Opportunities', headers, rows);
  }

}

export { CheckLighthousePerformance as Step };
