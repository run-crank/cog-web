import { BaseStep, Field, StepInterface } from '../core/base-step';
import { Step, RunStepResponse, FieldDefinition, StepDefinition } from '../proto/cog_pb';

export class HoverMouse extends BaseStep implements StepInterface {

  protected stepName: string = 'Hover Mouse';
  protected stepExpression: string = 'hover mouse to (?<domQuerySelector>.+)';
  protected stepType: StepDefinition.Type = StepDefinition.Type.ACTION;
  protected actionList: string[] = ['interact'];
  protected targetObject: string = 'Hover Mouse';
  protected expectedFields: Field[] = [{
    field: 'domQuerySelector',
    type: FieldDefinition.Type.STRING,
    description: 'Element to hover mouse to',
  }];

  async executeStep(step: Step): Promise<RunStepResponse> {
    const stepData: any = step.getData().toJavaScript();
    const domQuerySelector: string = stepData.domQuerySelector;

    try {
      await this.client.hoverMouse(domQuerySelector);
      const screenshot = await this.client.client.screenshot({ type: 'jpeg', encoding: 'binary', quality: 60 });
      const binaryRecord = this.binary('screenshot', 'Screenshot', 'image/jpeg', screenshot);
      return this.pass('Successfully hovered to %s', [domQuerySelector], [binaryRecord]);
    } catch (e) {
      const screenshot = await this.client.client.screenshot({ type: 'jpeg', encoding: 'binary', quality: 60 });
      const binaryRecord = this.binary('screenshot', 'Screenshot', 'image/jpeg', screenshot);
      return this.error(
        'There was a problem hovering to key %s: %s',
        [
          domQuerySelector,
          e.toString(),
        ],
        [
          binaryRecord,
        ]);
    }
  }

}

export { HoverMouse as Step };
