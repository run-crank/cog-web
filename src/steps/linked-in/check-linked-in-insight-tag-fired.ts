import { BaseStep, Field, StepInterface } from '../../core/base-step';
import { Step, RunStepResponse, FieldDefinition, StepDefinition } from '../../proto/cog_pb';

export class CheckLinkedInInsightTagFiredStep extends BaseStep implements StepInterface {

  protected stepName: string = 'Check that the LinkedIn insight tag fired';
  // tslint:disable-next-line:max-line-length
  protected stepExpression: string = 'the linkedin insight tag for partner id (?<pid>.+) should have fired';
  protected stepType: StepDefinition.Type = StepDefinition.Type.VALIDATION;
  protected actionList: string[] = ['check'];
  protected targetObject: string = 'LinkedIn Insight Tag';
  protected expectedFields: Field[] = [{
    field: 'pid',
    type: FieldDefinition.Type.STRING,
    description: 'LinkedIn Partner ID',
  }];

  async executeStep(step: Step): Promise<RunStepResponse> {
    const stepData: any = step.getData().toJavaScript();
    const pid: string = stepData.pid;

    try {
      await this.client.getCurrentPageInfo('url'); //// Ensure context have been navigated to page and have URL
      const result = await this.client.filterLinkedInInsightTag(pid);
      if (result.length >= 1) {
        const table = this.createTable(result);
        return this.pass('LinkedIn Insight tag fired for partner ID %s', [pid], [table]);
      }

      return this.fail('Expected LinkedIn Insight tag to fire for partner ID %s, but the tag did not fire.', [pid]);
    } catch (e) {
      return this.error('There was a problem checking for LinkedIn Insight tag: %s', [
        e.toString(),
      ]);
    }
  }

  private createTable(urls) {
    const headers = {};
    const rows = [];
    const mappedUrls = urls.map((url) => url.href);
    const headerKeys = Object.keys(this.getUrlParams(mappedUrls[0]));
    headerKeys.forEach((key: string) => {
      headers[key] = key;
    });
    mappedUrls.forEach((url: string) => {
      rows.push(this.getUrlParams(url));
    });
    return this.table('linkedInInsightsTagFiredRequests', 'Matched LinkedIn Tag Fired Request', headers, rows);
  }

}

export { CheckLinkedInInsightTagFiredStep as Step };
