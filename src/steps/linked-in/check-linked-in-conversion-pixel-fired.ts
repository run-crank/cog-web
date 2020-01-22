import { BaseStep, Field, StepInterface } from '../../core/base-step';
import { Step, RunStepResponse, FieldDefinition, StepDefinition } from '../../proto/cog_pb';

export class CheckLinkedInConversionPixelFiredStep extends BaseStep implements StepInterface {

  protected stepName: string = 'Check that the LinkedIn Conversion Pixel fired';
  // tslint:disable-next-line:max-line-length
  protected stepExpression: string = 'the linkedin conversion pixel for partner id (?<pid>\\d+) should have fired';
  protected stepType: StepDefinition.Type = StepDefinition.Type.VALIDATION;
  protected expectedFields: Field[] = [{
    field: 'pid',
    type: FieldDefinition.Type.NUMERIC,
    description: 'LinkedIn Partner ID',
  }, {
    field: 'cid',
    type: FieldDefinition.Type.NUMERIC,
    description: 'LinkedIn Conversion ID',
  }];

  async executeStep(step: Step): Promise<RunStepResponse> {
    const stepData: any = step.getData().toJavaScript();
    const pid: number = stepData.pid;
    const cid: number = stepData.cid;

    try {
      const validated = await this.client.validateLinkedInConversionPixelFired(pid, cid);

      if (validated) {
        return this.pass('LinkedIn Conversion Pixel fired for partner ID %d and conversion ID %d', [pid, cid]);
      }

      return this.fail('Expected LinkedIn Conversion Pixel to fire for partner ID %d and conversion ID %d, but it did not fire.', [pid, cid]);
    } catch (e) {
      return this.error('There was a problem checking for LinkedIn Conversion Pixel', [
        e.toString(),
      ]);
    }
  }

}

export { CheckLinkedInConversionPixelFiredStep as Step };
