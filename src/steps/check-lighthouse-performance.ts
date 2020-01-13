import { BaseStep, Field, StepInterface } from '../core/base-step';
import { Step, RunStepResponse, FieldDefinition, StepDefinition } from '../proto/cog_pb';

export class CheckLighthousePerformance extends BaseStep implements StepInterface {

  protected stepName: string = 'Check a page\'s Lighthouse performance score';
  // tslint:disable-next-line:max-line-length
  protected stepExpression: string = 'the (?<throttleTo>mobile|desktop) lighthouse performance score should be (?<expectedScore>\\d{1,3}) or higher';
  protected stepType: StepDefinition.Type = StepDefinition.Type.ACTION;
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
      const actualScore = performance.score * 100;
      if (actualScore < expectedScore) {
        const audits = Object.values(lhr.audits);
        return this.fail('The page\'s performance score of %d was lower than the expected score of %d.\n\n\n Opportunities for improvement:\n%s', [
          actualScore,
          expectedScore,
          audits.filter((audit: any) => audit.details && audit.details.type === 'opportunity').map((audit: any) => ` - ${audit.title}: ${audit.displayValue}\n`).join(''),
        ]);
      }

      return this.pass('The page\'s performance score of %d was greater than %d, as expected', [
        actualScore,
        expectedScore,
      ]);
    } catch (e) {
      return this.error('There was a checking lighthouse performance: %s', [
        e.toString(),
      ]);
    }
  }

}

export { CheckLighthousePerformance as Step };
