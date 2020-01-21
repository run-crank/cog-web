import { BaseStep, Field, StepInterface } from '../../core/base-step';
import { Step, RunStepResponse, FieldDefinition, StepDefinition } from '../../proto/cog_pb';

export class CheckLinkedInInsightTagFiredStep extends BaseStep implements StepInterface {

  protected stepName: string = 'Check that the LinkedIn Insight tag fired';
  // tslint:disable-next-line:max-line-length
  protected stepExpression: string = 'the linkedin insight tag for partner id (?<pid>\\d+) should have fired';
  protected stepType: StepDefinition.Type = StepDefinition.Type.ACTION;
  protected expectedFields: Field[] = [{
    field: 'pid',
    type: FieldDefinition.Type.NUMERIC,
    description: 'LinkedIn Partner ID',
  }];

  async executeStep(step: Step): Promise<RunStepResponse> {
    const stepData: any = step.getData().toJavaScript();
    const pid: number = stepData.pid;

    try {
      const validated = await this.client.validateLinkedInInsightTag(pid);

      if (validated) {
        return this.pass('LinkedIn Insight tag fired for partner ID %d', [pid]);
      }

      return this.fail('Expected LinkedIn Insight tag to fire for partner ID %d, but the tag did not fire.', [pid]);
    } catch (e) {
      return this.error('There was a problem checking for LinkedIn Insight tag', [
        e.toString(),
      ]);
    }
  }

}

export { CheckLinkedInInsightTagFiredStep as Step };
