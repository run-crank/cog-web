import { BaseStep, Field, StepInterface } from '../core/base-step';
import { Step, RunStepResponse, FieldDefinition, StepDefinition } from '../proto/cog_pb';

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
        const record = this.createFailRecord(audits);
        return this.fail(
          'The page\'s performance score of %d was lower than the expected score of %d in %s.\n\n\n Opportunities for improvement:\n%s',
          [
            actualScore,
            expectedScore,
            throttleTo,
            audits.filter((audit: any) => audit.details && audit.details.type === 'opportunity' && audit.details.overallSavingsMs > 0)
            .sort((a: any, b: any) => b.details.overallSavingsMs - a.details.overallSavingsMs)
            .map((audit: any) => ` - ${audit.title}: Potential savings of ${audit.details.overallSavingsMs}ms\n`).join(''),
          ],
          [
            record,
          ]);
      }
      const record = this.createSuccessRecord(performance);
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

  private createSuccessRecord(performance) {
    const obj = {};
    obj['actualScore'] = performance.score * 100;
    obj['firstContentfulPaint'] = performance.auditRefs.find(data => data.id == 'first-contentful-paint').weight;
    obj['firstMeaningfulPaint'] =  performance.auditRefs.find(data => data.id == 'first-meaningful-paint').weight;
    obj['speedIndex'] = performance.auditRefs.find(data => data.id == 'speed-index').weight;
    obj['firstCpuIdle'] = performance.auditRefs.find(data => data.id == 'first-cpu-idle').weight;
    obj['timeToInteractive'] = performance.auditRefs.find(data => data.id == 'interactive').weight;
    obj['maxPotentialFirstInputDelay'] = performance.auditRefs.find(data => data.id == 'max-potential-fid').weight;

    return this.keyValue('labData', 'Performance Lab Data', obj);
  }

  private createFailRecord(audits) {
    const headers = {
      title: 'Title',
      overallSavingsMs: 'Estimated Savings (ms)',
      description: 'Details',
    };
    const rows = [];
    audits.forEach((audit) => {
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
