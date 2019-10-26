import { BaseStep, Field, StepInterface } from '../core/base-step';
import { Step, RunStepResponse, FieldDefinition, StepDefinition } from '../proto/cog_pb';

export class CheckMarketoMunchkin extends BaseStep implements StepInterface {

  protected stepName: string = 'Check that Marketo Munchkin tracking loads';
  protected stepExpression: string = 'the tracking code for munchkin account id (?<id>[a-zA-Z0-9\-]+) should load';
  protected stepType: StepDefinition.Type = StepDefinition.Type.VALIDATION;
  protected expectedFields: Field[] = [{
    field: 'id',
    type: FieldDefinition.Type.STRING,
    description: "Munchkin Account ID associated with the user's Marketo instance (e.g. 460-tdh-945)",
  }];

  async executeStep(step: Step): Promise<RunStepResponse> {
    const stepData: any = step.getData().toJavaScript();
    const id: string = stepData.id;

    try {
      await this.client.waitForNetworkIdle(10000, 1);
      const actual = await this.client.getFinishedRequests();
      if (!actual.map(request => request.url).find(url => url.includes('https://munchkin.marketo.net') && url.includes('munchkin.js'))) {
        return this.fail('The munchkin.js script was never requested.');
      } else if (!actual.map(request => request.url).find(url => url.includes(`https://${id.toLowerCase()}.mktoresp.com/webevents/visitWebPage`))) {
        return this.fail('No visit was logged for munchkin account %s', [id]);
      } else {
        return this.pass('Munchkin account %s has been loaded', [id]);
      }
    } catch (e) {
      return this.error('There was a problem checking munchkin with id %s: %s', [id, e.toString()]);
    }
  }
}

export { CheckMarketoMunchkin as Step };
