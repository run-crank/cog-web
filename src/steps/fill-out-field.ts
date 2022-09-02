import { BaseStep, Field, StepInterface } from '../core/base-step';
import { Step, RunStepResponse, FieldDefinition, StepDefinition, StepRecord } from '../proto/cog_pb';

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
      const record = this.createRecord(selector, value);
      const orderedRecord = this.createOrderedRecord(selector, value, stepData['__stepOrder']);
      return this.pass('Successfully filled out %s with %s', [selector, value], [binaryRecord, record, orderedRecord]);
    } catch (e) {
      const screenshot = await this.client.client.screenshot({ type: 'jpeg', encoding: 'binary', quality: 60 });
      const binaryRecord = this.binary('screenshot', 'Screenshot', 'image/jpeg', screenshot);
      return this.error(
        'There was a problem filling out %s with %s: %s',
        [
          selector,
          value,
          e.toString(),
        ],
        [
          binaryRecord,
        ]);
    }
  }

  public createRecord(selector, input): StepRecord {
    const obj = {
      selector,
      input,
    };
    const record = this.keyValue('form', 'Filled out Field', obj);

    return record;
  }

  public createOrderedRecord(selector, input, stepOrder = 1): StepRecord {
    const obj = {
      selector,
      input,
    };
    const record = this.keyValue(`form.${stepOrder}`, `Filled out Field from Step ${stepOrder}`, obj);

    return record;
  }

}

export { EnterValueIntoField as Step };
