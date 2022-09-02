import { BaseStep, ExpectedRecord, Field, StepInterface } from '../core/base-step';
import { Step, RunStepResponse, FieldDefinition, StepDefinition, StepRecord, RecordDefinition } from '../proto/cog_pb';

export class ClickOnElement extends BaseStep implements StepInterface {

  protected stepName: string = 'Click an element on a page';
  // tslint:disable-next-line:max-line-length
  protected stepExpression: string = 'click the page element (?<domQuerySelector>.+)';
  protected stepType: StepDefinition.Type = StepDefinition.Type.ACTION;
  protected expectedFields: Field[] = [{
    field: 'domQuerySelector',
    type: FieldDefinition.Type.STRING,
    description: 'Element\'s DOM Query Selector',
  }];

  protected expectedRecords: ExpectedRecord[] = [{
    id: 'form',
    type: RecordDefinition.Type.KEYVALUE,
    fields: [{
      field: 'selector',
      type: FieldDefinition.Type.STRING,
      description: 'Selector of the element',
    }],
    dynamicFields: true,
  }];

  async executeStep(step: Step): Promise<RunStepResponse> {
    const stepData: any = step.getData().toJavaScript();
    const selector: string = stepData.domQuerySelector;

    try {
      // Run solveRecaptchas() again before clicking anything, in case a new captcha appeared
      if (process.env.CAPTCHA_TOKEN) {
        await this.client.client.solveRecaptchas();
        for (const frame of this.client.client.mainFrame().childFrames()) {
          await frame.solveRecaptchas();
        }
      }
      await this.client.clickElement(selector);
      const screenshot = await this.client.client.screenshot({ type: 'jpeg', encoding: 'binary', quality: 60 });
      const binaryRecord = this.binary('screenshot', 'Screenshot', 'image/jpeg', screenshot);
      const record = this.createRecord(selector);
      const orderedRecord = this.createOrderedRecord(selector, stepData['__stepOrder']);
      return this.pass('Successfully clicked element: %s', [selector], [binaryRecord, record, orderedRecord]);
    } catch (e) {
      const screenshot = await this.client.client.screenshot({ type: 'jpeg', encoding: 'binary', quality: 60 });
      const binaryRecord = this.binary('screenshot', 'Screenshot', 'image/jpeg', screenshot);
      return this.error(
        'There was a problem clicking element %s: %s',
        [
          selector,
          e.toString(),
        ],
        [
          binaryRecord,
        ]);
    }
  }

  public createRecord(selector): StepRecord {
    const obj = {
      selector,
    };
    const record = this.keyValue('form', 'Clicked Element', obj);

    return record;
  }

  public createOrderedRecord(selector, stepOrder = 1): StepRecord {
    const obj = {
      selector,
    };
    const record = this.keyValue(`form.${stepOrder}`, `Clicked Element from Step ${stepOrder}`, obj);

    return record;
  }

}

export { ClickOnElement as Step };
