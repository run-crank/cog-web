import { BaseStep, Field, StepInterface } from '../core/base-step';
import { Step, RunStepResponse, FieldDefinition, StepDefinition } from '../proto/cog_pb';

export class NavigateToPage extends BaseStep implements StepInterface {

  protected stepName: string = 'Navigate to a webpage';
  // tslint:disable-next-line:max-line-length
  protected stepExpression: string = 'navigate to (?<webPageUrl>.+)';
  protected stepType: StepDefinition.Type = StepDefinition.Type.ACTION;
  protected expectedFields: Field[] = [{
    field: 'webPageUrl',
    type: FieldDefinition.Type.URL,
    description: 'Page URL',
  }];

  async executeStep(step: Step): Promise<RunStepResponse> {
    const stepData: any = step.getData().toJavaScript();
    const url: string = stepData.webPageUrl;

    // Navigate to URL.
    try {
      await this.client.navigateToUrl(url);
      const screenshot = await this.client.client.screenshot({ type: 'jpeg', encoding: 'binary', quality: 60 });
      const binaryRecord = this.binary('screenshot', 'Screenshot', 'image/jpeg', screenshot);
      const status = await this.client.client['___lastResponse']['status']();
      if (status === 404) {
        return this.fail('%s returned an Error: 404 Not Found', [url], [binaryRecord]);
      }
      return this.pass('Successfully navigated to %s', [url], [binaryRecord]);
    } catch (e) {
      const screenshot = await this.client.client.screenshot({ type: 'jpeg', encoding: 'binary', quality: 60 });
      const binaryRecord = this.binary('screenshot', 'Screenshot', 'image/jpeg', screenshot);
      return this.error(
        'There was a problem navigating to %s: %s',
        [
          url,
          e.toString(),
        ],
        [
          binaryRecord,
        ]);
    }
  }

}

export { NavigateToPage as Step };
