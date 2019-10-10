import { BaseStep, Field, StepInterface } from '../core/base-step';
import { Step, RunStepResponse, FieldDefinition, StepDefinition } from '../proto/cog_pb';

export class ClickOnElement extends BaseStep implements StepInterface {

  protected stepName: string = 'Click an element on a page';
  // tslint:disable-next-line:max-line-length
  protected stepExpression: string = 'click on page element (?<domQuerySelector>.+)';
  protected stepType: StepDefinition.Type = StepDefinition.Type.ACTION;
  protected expectedFields: Field[] = [{
    field: 'domQuerySelector',
    type: FieldDefinition.Type.STRING,
    description: 'Element\'s DOM Query Selector',
  }];

  async executeStep(step: Step): Promise<RunStepResponse> {
    const stepData: any = step.getData().toJavaScript();
    const selector: string = stepData.domQuerySelector;

    try {
      await this.client.clickElement(selector);
      return this.pass('Successfully clicked element: %s', [selector]);
    } catch (e) {
      return this.error('There was a problem clicking element %s: %s', [
        selector,
        e.toString(),
      ]);
    }
  }

}

export { ClickOnElement as Step };
