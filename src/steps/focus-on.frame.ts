import { BaseStep, Field, StepInterface } from '../core/base-step';
import { Step, RunStepResponse, FieldDefinition, StepDefinition, StepRecord } from '../proto/cog_pb';

export class FocusOnFrame extends BaseStep implements StepInterface {

  protected stepName: string = 'Focus on Frame';
  // tslint:disable-next-line:max-line-length
  protected stepExpression: string = 'focus on the (?<domQuerySelector>.+) frame';
  protected stepType: StepDefinition.Type = StepDefinition.Type.ACTION;
  protected expectedFields: Field[] = [{
    field: 'domQuerySelector',
    type: FieldDefinition.Type.STRING,
    description: 'The iframe\'s DOM query selector, or "main" for the main frame',
  }];

  async executeStep(step: Step): Promise<RunStepResponse> {
    const stepData: any = step.getData().toJavaScript();
    const iframeSelector: string = stepData.domQuerySelector;

    try {
      await this.client.focusFrame(iframeSelector);
      const screenshot = await this.client.client.screenshot({ type: 'jpeg', encoding: 'binary', quality: 60 });
      const binaryRecord = this.binary('screenshot', 'Screenshot', 'image/jpeg', screenshot);
      return this.pass('Successfully focused on frame %s', [iframeSelector], [binaryRecord]);
    } catch (e) {
      return this.error('Unable to focus on frame %s, the frame may no longer exist on the page: %s', [
        iframeSelector,
        e.toString(),
      ]);
    }
  }

}

export { FocusOnFrame as Step };
