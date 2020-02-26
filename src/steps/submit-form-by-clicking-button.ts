import { BaseStep, Field, StepInterface } from '../core/base-step';
import { Step, RunStepResponse, FieldDefinition, StepDefinition, StepRecord } from '../proto/cog_pb';

export class SubmitFormByClickingButton extends BaseStep implements StepInterface {

  protected stepName: string = 'Submit a form by clicking a button';
  // tslint:disable-next-line:max-line-length
  protected stepExpression: string = 'submit the form by clicking (?<domQuerySelector>.+)';
  protected stepType: StepDefinition.Type = StepDefinition.Type.ACTION;
  protected expectedFields: Field[] = [{
    field: 'domQuerySelector',
    type: FieldDefinition.Type.STRING,
    description: "Button's DOM Query Selector",
  }];

  async executeStep(step: Step): Promise<RunStepResponse> {
    const stepData: any = step.getData().toJavaScript();
    const selector: string = stepData.domQuerySelector;
    try {
      await this.client.submitFormByClickingButton(selector);
      const screenshot = await this.client.client.screenshot({ type: 'jpeg', encoding: 'binary', quality: 60 });
      const binaryRecord = this.binary('screenshot', 'Screenshot', 'image/jpeg', screenshot);
      return this.pass('Successfully submitted form by clicking button %s', [selector], [binaryRecord]);
    } catch (e) {
      return this.error('There was a problem submitting the form: %s', [e.toString()]);
    }
  }

}

export { SubmitFormByClickingButton as Step };
