import { BaseStep, Field, StepInterface } from '../base-step';
import { Step, RunStepResponse, FieldDefinition, StepDefinition } from '../proto/cog_pb';
import { Value } from 'google-protobuf/google/protobuf/struct_pb';

export class NavigateToPage extends BaseStep implements StepInterface {

  protected stepName: string = 'Navigate to a webpage';
  // tslint:disable-next-line:max-line-length
  protected stepExpression: string = 'navigate to (?<webPageUrl>.+)';
  protected stepType: StepDefinition.Type = StepDefinition.Type.ACTION;
  protected expectedFields: Field[] = [{
    field: 'webPageUrl',
    type: FieldDefinition.Type.URL,
    description: 'Absolute URI of the web page to navigate to',
  }];

  async executeStep(step: Step): Promise<RunStepResponse> {
    const stepData: any = step.getData().toJavaScript();
    const url: string = stepData.webPageUrl;
    const response: RunStepResponse = new RunStepResponse();

    // Navigate to URL.
    try {
      // Modify UA string to aid in identification as a friendly bot.
      const browser = await this.page.browser();
      const ua = await browser.userAgent();
      await this.page.setUserAgent(ua.replace(' HeadlessChrome', ' AutomatonHeadlessChrome'));
      await this.page.goto(url, { waitUntil: 'networkidle0' });
    } catch (e) {
      response.setOutcome(RunStepResponse.Outcome.ERROR);
      response.setMessageFormat('There was a problem navigating to %s: %s');
      response.setMessageArgsList([
        Value.fromJavaScript(url),
        Value.fromJavaScript(e.toString()),
      ]);
      return response;
    }

    // Successfully navigated to the page.
    response.setOutcome(RunStepResponse.Outcome.PASSED);
    response.setMessageFormat('Successfully navigated to %s');
    response.setMessageArgsList([Value.fromJavaScript(url)]);

    return response;
  }

}

export { NavigateToPage as Step };
