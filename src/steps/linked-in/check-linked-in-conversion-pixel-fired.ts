import { BaseStep, Field, StepInterface } from '../../core/base-step';
import { Step, RunStepResponse, FieldDefinition, StepDefinition } from '../../proto/cog_pb';

export class CheckLinkedInConversionPixelFiredStep extends BaseStep implements StepInterface {

  protected stepName: string = 'Check that the LinkedIn conversion pixel fired';
  // tslint:disable-next-line:max-line-length
  protected stepExpression: string = 'the linkedin conversion pixel for partner id (?<pid>.+) should have fired';
  protected stepType: StepDefinition.Type = StepDefinition.Type.VALIDATION;
  protected actionList: string[] = ['check'];
  protected targetObject: string = 'LinkedIn Conversion Pixel';
  protected expectedFields: Field[] = [{
    field: 'pid',
    type: FieldDefinition.Type.STRING,
    description: 'LinkedIn Partner ID',
  }, {
    field: 'cid',
    type: FieldDefinition.Type.STRING,
    description: 'LinkedIn Conversion ID',
  }];

  async executeStep(step: Step): Promise<RunStepResponse> {
    const stepData: any = step.getData().toJavaScript();
    const pid: string = stepData.pid;
    const cid: string = stepData.cid;

    try {
      await this.client.getCurrentPageInfo('url'); //// Ensure context have been navigated to page and have URL
      const result = await this.client.filterLinkedInConversionPixelFired(pid, cid);
      if (result.length >= 1) {
        const table = this.createTable(result);
        return this.pass('LinkedIn Conversion Pixel fired for partner ID %d and conversion ID %d', [pid, cid], [table]);
      }
      return this.fail('Expected LinkedIn Conversion Pixel to fire for partner ID %d and conversion ID %d, but it did not fire.', [pid, cid]);
    } catch (e) {
      return this.error('There was a problem checking for LinkedIn Conversion Pixel', [
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

export { CheckLinkedInConversionPixelFiredStep as Step };
