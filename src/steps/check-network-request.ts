import { BaseStep, Field, StepInterface } from '../core/base-step';
import { Step, RunStepResponse, FieldDefinition, StepDefinition } from '../proto/cog_pb';

export class CheckNetworkRequestStep extends BaseStep implements StepInterface {

  protected stepName: string = 'Check for a specific network request';
  // tslint:disable-next-line:max-line-length
  protected stepExpression: string = 'there should be (?<reqCount>\\d+) matching network requests? for (?<baseUrl>.+)';
  protected stepType: StepDefinition.Type = StepDefinition.Type.VALIDATION;
  protected expectedFields: Field[] = [{
    field: 'reqCount',
    type: FieldDefinition.Type.NUMERIC,
    description: '# of Requests',
  }, {
    field: 'baseUrl',
    type: FieldDefinition.Type.URL,
    description: 'Base URL Is',
  }, {
    field: 'pathContains',
    type: FieldDefinition.Type.STRING,
    description: 'Path Contains',
    optionality: FieldDefinition.Optionality.OPTIONAL,
  }, {
    field: 'withParameters',
    type: FieldDefinition.Type.MAP,
    description: 'Parameters Include',
    optionality: FieldDefinition.Optionality.OPTIONAL,
  }];

  async executeStep(step: Step): Promise<RunStepResponse> {
    const stepData: any = step.getData().toJavaScript();
    const reqCount = stepData.reqCount;
    const baseUrl = stepData.baseUrl;
    const pathContains = stepData.pathContains || '';
    const withParameters = stepData.withParameters;

    try {
      //// This will ensure that NavigateTo was called
      await this.client.getCurrentPageInfo('url');

      const matchingRequests = await this.client.getNetworkRequests(baseUrl, pathContains);
      const evaluatedRequests = this.client.evaluateRequests(matchingRequests, withParameters);

      if (evaluatedRequests.length !== reqCount) {
        return this.fail('Expected %d matching network request(s), but %d were found:\n\n%s', [
          reqCount,
          evaluatedRequests.length,
          evaluatedRequests.map(r => `${r.url}\n\n`).join(''),
        ]);
      }

      return this.pass('%d network requests found, as expected', [
        evaluatedRequests.length,
      ]);
    } catch (e) {
      return this.error('There was a problem checking network request: %s', [
        e.toString(),
      ]);
    }
  }

}

export { CheckNetworkRequestStep as Step };
