import { BaseStep, Field, StepInterface } from '../core/base-step';
import { Step, RunStepResponse, FieldDefinition, StepDefinition } from '../proto/cog_pb';

export class EnterValueIntoField extends BaseStep implements StepInterface {

  protected stepName: string = 'Enter value into field';
  // tslint:disable-next-line:max-line-length
  protected stepExpression: string = 'enter (?<value>.+) into field (?<domQuerySelector>.+)';
  protected stepType: StepDefinition.Type = StepDefinition.Type.ACTION;
  protected expectedFields: Field[] = [{
    field: 'value',
    type: FieldDefinition.Type.ANYSCALAR,
    description: 'Field value to enter',
  }, {
    field: 'domQuerySelector',
    type: FieldDefinition.Type.STRING,
    description: 'DOM query selector of the field',
  }];

  async executeStep(step: Step): Promise<RunStepResponse> {
    const stepData: any = step.getData().toJavaScript();
    const selector: string = stepData.domQuerySelector;
    const value: any = stepData.value;

    // Determine how to fill out the field, and then try.
    try {
      await this.client.fillOutField(selector, value);
      return this.pass('Successfully entered %s into %s', [value, selector]);
    } catch (e) {
      return this.error('There was a problem entering %s into field %s: %s', [
        value,
        selector,
        e.toString(),
      ]);
    }
  }

}

export { EnterValueIntoField as Step };
