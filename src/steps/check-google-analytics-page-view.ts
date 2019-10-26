import { BaseStep, Field, StepInterface } from '../core/base-step';
import { Step, RunStepResponse, FieldDefinition, StepDefinition } from '../proto/cog_pb';
import { request } from 'needle';

export class CheckGoogleAnalyticsPageView extends BaseStep implements StepInterface {

  protected stepName: string = 'Check that Google Analytics tracked a pageview';
  protected stepExpression: string = 'google analytics should have tracked a pageview for tracking id (?<id>[a-zA-Z0-9\-]+)';
  protected stepType: StepDefinition.Type = StepDefinition.Type.VALIDATION;
  protected expectedFields: Field[] = [
    {
      field: 'id',
      type: FieldDefinition.Type.STRING,
      description: 'Tracking / Measurement ID associated with the GA instance/property (e.g. UA-75228722-5)',
    },
    {
      field: 'withParameters',
      type: FieldDefinition.Type.MAP,
      optionality: FieldDefinition.Optionality.OPTIONAL,
      description: 'Parameter Checks, an optional map of Google Analytics Measurement Protocol Parameters and their expected values.',
    },
  ];

  async executeStep(step: Step): Promise<RunStepResponse> {
    const querystring = require('querystring');

    const stepData: any = step.getData().toJavaScript();
    const id: any = stepData.id;
    const expectedParams: any = stepData.withParameters || {};
    let params;
    try {
      await this.client.waitForNetworkIdle(10000, 1);
      const requests = await this.client.getFinishedRequests();
      const urls = requests.filter(r => r.method == 'GET'
                                        && r.url.includes('https://www.google-analytics.com')
                                        && r.url.includes('/collect')
                                        && r.url.includes('t=pageview')).map(r => decodeURIComponent(r.url));
      let actual = urls.filter(url => url.includes(`tid=${id}`));

      actual = actual.filter(u => this.includesParameters(u, expectedParams));

      if (actual[0]) {
        params = querystring.parse(actual[0]);
      }
      if (actual.length !== 1) {
        return this.fail('Expected 1 matching GA pageview, but there were %d. Logged events include:\n\n%s', [
          actual.length,
          actual.length > 0 ? urls.join('\n\n') : '',
        ]);
      } else {
        return this.pass('Successfuly detected GA pageview for tracking id %s.', [id]);
      }
    } catch (e) {
      return this.error('There was a problem checking for a GA pageview for tracking id %s: %s', [id, e.toString()]);
    }
  }

  private includesParameters(url, expectedParams) {
    for (const p in expectedParams) {
      if (!url.toLowerCase().includes(expectedParams[p].toLowerCase())) {
        return false;
      }
    }
    return true;
  }
}

export { CheckGoogleAnalyticsPageView as Step };
