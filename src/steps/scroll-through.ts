import { BaseStep, Field, StepInterface } from '../core/base-step';
import { Step, RunStepResponse, FieldDefinition, StepDefinition } from '../proto/cog_pb';

export class ScrollThrough extends BaseStep implements StepInterface {

  protected stepName: string = 'Scroll through a percentage of a web page';
  // tslint:disable-next-line:max-line-length
  protected stepExpression: string = 'scroll through (?<depth>\\d+)% of the page';
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
      await this.client.scrollThrough(depth);
      return this.pass('Successfully scrolled through %s%% of the page', [depth]);
    } catch (e) {
      return this.error('There was a problem scrolling through %s%% of the page', [
        depth,
        e.toString(),
      ]);
    }
  }

}

export { ScrollThrough as Step };
