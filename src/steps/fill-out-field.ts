import { BaseStep, Field, StepInterface } from '../core/base-step';
import { Step, RunStepResponse, FieldDefinition, StepDefinition } from '../proto/cog_pb';

export class EnterValueIntoField extends BaseStep implements StepInterface {

  protected stepName: string = 'Fill out a form field';
  // tslint:disable-next-line:max-line-length
  protected stepExpression: string = 'fill out (?<domQuerySelector>.+) with (?<value>.+)';
  protected stepType: StepDefinition.Type = StepDefinition.Type.ACTION;
  protected expectedFields: Field[] = [{
    field: 'domQuerySelector',
    type: FieldDefinition.Type.STRING,
    description: "Field's DOM Query Selector",
  }, {
    field: 'value',
    type: FieldDefinition.Type.ANYSCALAR,
    description: 'Field Value',
  }];

  async executeStep(step: Step): Promise<RunStepResponse> {
    const stepData: any = step.getData().toJavaScript();
    const selector: string = stepData.domQuerySelector;
    const value: any = stepData.value;

    // Determine how to fill out the field, and then try.
    try {
      await this.client.fillOutField(selector, value);
      const screenshot = await this.client.client.screenshot({ type: 'jpeg', encoding: 'binary', quality: 60 });
      const binaryRecord = this.binary('screenshot', 'Screenshot', 'image/jpeg', screenshot);
      return this.pass('Successfully filled out %s with %s', [selector, value], [binaryRecord]);
    } catch (e) {
      return this.error('There was a problem filling out %s with %s: %s', [
        selector,
        value,
        e.toString(),
      ]);
    }
  }

}

export { EnterValueIntoField as Step };
