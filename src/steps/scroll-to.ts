import { BaseStep, Field, StepInterface } from '../core/base-step';
import { Step, RunStepResponse, FieldDefinition, StepDefinition } from '../proto/cog_pb';

export class ScrollTo extends BaseStep implements StepInterface {

  protected stepName: string = 'Scroll to a percentage depth of a web page';
  // tslint:disable-next-line:max-line-length
  protected stepExpression: string = 'scroll to (?<depth>\\d+)% of the page';
  protected stepType: StepDefinition.Type = StepDefinition.Type.ACTION;
  protected expectedFields: Field[] = [{
    field: 'depth',
    type: FieldDefinition.Type.NUMERIC,
    description: 'Percent Depth',
  }];

  async executeStep(step: Step): Promise<RunStepResponse> {
    const stepData: any = step.getData().toJavaScript();
    const depth: number = stepData.depth;

    try {
      await this.client.scrollTo(depth);
      return this.pass('Successfully scrolled to %s%% of the page', [depth]);
    } catch (e) {
      return this.error('There was a problem scrolling to %s%% of the page', [
        depth,
        e.toString(),
      ]);
    }
  }

}

export { ScrollTo as Step };
