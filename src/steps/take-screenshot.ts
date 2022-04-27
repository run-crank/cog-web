import { BaseStep, Field, StepInterface, ExpectedRecord } from '../core/base-step';
import { Step, RunStepResponse, FieldDefinition, StepDefinition } from '../proto/cog_pb';

export class TakeScreenshot extends BaseStep implements StepInterface {

  protected stepName: string = 'Take a Screenshot';
  // tslint:disable-next-line:max-line-length
  protected stepExpression: string = 'take a screenshot';
  protected stepType: StepDefinition.Type = StepDefinition.Type.ACTION;
  protected expectedFields: Field[] = [];
  protected expectedRecords: ExpectedRecord[] = [];

  async executeStep(step: Step): Promise<RunStepResponse> {
    try {
      const screenshot = await this.client.client.screenshot({ type: 'jpeg', encoding: 'binary', quality: 60, fullPage: true });
      const binaryRecord = this.binary('showScreenshot', 'Screenshot', 'image/jpeg', screenshot);
      return this.pass('Successfully took a screenshot', [], [binaryRecord]);
    } catch (e) {
      return this.error('There was a problem taking a screenshot: %s', [e.toString()], []);
    }
  }

}

export { TakeScreenshot as Step };
