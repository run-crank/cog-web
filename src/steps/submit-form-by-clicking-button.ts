import { BaseStep, ExpectedRecord, Field, StepInterface } from '../core/base-step';
import { Step, RunStepResponse, FieldDefinition, StepDefinition, RecordDefinition } from '../proto/cog_pb';

import * as moment from 'moment';

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
  protected expectedRecords: ExpectedRecord[] = [{
    id: 'form',
    type: RecordDefinition.Type.KEYVALUE,
    dynamicFields: false,
    fields: [{
      field: 'selector',
      description: 'The Submit Button Selector',
      type: FieldDefinition.Type.STRING,
    }, {
      field: 'submittedAt',
      description: 'The datetime when the form was submitted',
      type: FieldDefinition.Type.DATETIME,
    }],
  }];

  async executeStep(step: Step): Promise<RunStepResponse> {
    let submittedAt;
    const stepData: any = step.getData().toJavaScript();
    const selector: string = stepData.domQuerySelector;

    try {
      await this.client.submitFormByClickingButton(selector);
      submittedAt = moment.utc(moment()).format(); // Track it on successful submit

      const keyValueRecord = this.keyValue('form', 'Form Metadata', {
        selector, submittedAt,
      });
      const screenshot = await this.client.client.screenshot({ type: 'jpeg', encoding: 'binary', quality: 60 });
      const binaryRecord = this.binary('screenshot', 'Screenshot', 'image/jpeg', screenshot);
      return this.pass('Successfully submitted form by clicking button %s', [selector], [binaryRecord, keyValueRecord]);
    } catch (e) {
      submittedAt = moment.utc(moment()).format(); // Track it when it fails
      const screenshot = await this.client.client.screenshot({ type: 'jpeg', encoding: 'binary', quality: 60 });
      const binaryRecord = this.binary('screenshot', 'Screenshot', 'image/jpeg', screenshot);
      const keyValueRecord = this.keyValue('form', 'Form Metadata', {
        selector, submittedAt,
      });
      return this.error('There was a problem submitting the form: %s', [e.toString()], [binaryRecord, keyValueRecord]);
    }
  }

}

export { SubmitFormByClickingButton as Step };
