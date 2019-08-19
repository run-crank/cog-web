import { BaseStep, Field, StepInterface } from '../core/base-step';
import { Step, RunStepResponse, FieldDefinition, StepDefinition } from '../proto/cog_pb';
import { Value } from 'google-protobuf/google/protobuf/struct_pb';
import { Promise as Bluebird } from 'bluebird';

export class SubmitFormByClickingButton extends BaseStep implements StepInterface {

  protected stepName: string = 'Submit a form by clicking a button';
  // tslint:disable-next-line:max-line-length
  protected stepExpression: string = 'submit the form by clicking (?<domQuerySelector>.+)';
  protected stepType: StepDefinition.Type = StepDefinition.Type.ACTION;
  protected expectedFields: Field[] = [{
    field: 'domQuerySelector',
    type: FieldDefinition.Type.STRING,
    description: 'DOM query selector of the button to click',
  }];

  async executeStep(step: Step): Promise<RunStepResponse> {
    const stepData: any = step.getData().toJavaScript();
    const selector: string = stepData.domQuerySelector;

    try {
      await this.client.submitFormByClickingButton(selector);
      return this.pass('Successfully clicked button %s', [selector]);
    } catch (e) {
      return this.error('There was a problem submitting the form: %s', [e.toString()]);
    }
  }

}

export { SubmitFormByClickingButton as Step };
