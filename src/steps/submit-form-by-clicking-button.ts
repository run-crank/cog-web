import { BaseStep, Field, StepInterface } from '../base-step';
import { Step, RunStepResponse, FieldDefinition } from '../proto/cog_pb';
import { Value } from 'google-protobuf/google/protobuf/struct_pb';
import { Promise as Bluebird } from 'bluebird';

export class SubmitFormByClickingButton extends BaseStep implements StepInterface {

  protected stepName: string = 'Submit a form by clicking a button';

  // tslint:disable-next-line:max-line-length
  protected stepExpression: string = 'submit the form by clicking (?<domQuerySelector>.+)';

  protected expectedFields: Field[] = [{
    field: 'domQuerySelector',
    type: FieldDefinition.Type.STRING,
    description: 'DOM query selector of the button to click',
  }];

  async executeStep(step: Step): Promise<RunStepResponse> {
    const stepData: any = step.getData().toJavaScript();
    const selector: string = stepData.domQuerySelector;
    const response: RunStepResponse = new RunStepResponse();

    // Set up wait handlers and attempt to click the button. Uses Bluebird.some()
    // set to 3/4 to catch as many cases as possible, including:
    // - Click worked, redirected, and therefore button is gone.
    // - Click worked, no redirect, but button is gone and it's been 10s
    try {
      await Bluebird.some(
        [
          new Promise((res, rej) => {
            this.page.waitForNavigation({ timeout: 15000 })
              .then(res)
              .catch(e => rej(Error('Page did not redirect')));
          }),
          new Promise((res, rej) => {
            this.page.waitForFunction(
              (selector) => {
                const el = document.querySelector(selector);
                return !el || el.offsetParent === null;
              },
              { timeout: 15000 },
              selector,
            )
              .then(res)
              .catch(e => rej(Error('Submit button still there')));
          }),
          new Promise((res, rej) => {
            this.page.click(selector)
              .then(res)
              .catch((e) => {
                this.page.waitForFunction(
                  (selector) => {
                    document.querySelector(selector).click();
                    return true;
                  },
                  {},
                  selector,
                )
                  .then(res)
                  .catch(e => rej(Error('Unable to click submit button')));
              });
          }),
          new Promise((res, rej) => {
            this.page.waitFor(10000)
              .then(res)
              .catch(e => rej(Error('Waited for 10 seconds')));
          }),
        ],
        3,
      );
    } catch (e) {
      response.setOutcome(RunStepResponse.Outcome.ERROR);
      response.setMessageFormat('There was a problem submitting the form: %s');
      response.setMessageArgsList([Value.fromJavaScript(e.toString())]);
      return response;
    }

    // Successfully clicked the button
    response.setOutcome(RunStepResponse.Outcome.PASSED);
    response.setMessageFormat('Successfully clicked button %s');
    response.setMessageArgsList([Value.fromJavaScript(selector)]);

    return response;
  }

}

export { SubmitFormByClickingButton as Step };
