import { BaseStep, Field, StepInterface } from '../core/base-step';
import { Step, RunStepResponse, FieldDefinition, StepDefinition } from '../proto/cog_pb';

export class CheckGoogleAnalyticsEvent extends BaseStep implements StepInterface {

  protected stepName: string = 'Check that Google Analytics tracked an event';
  protected stepExpression: string = 'google analytics should have tracked an event with category (?<ec>.+) and action (?<ea>.+) for tracking id (?<id>[a-zA-Z0-9\-]+)';
  protected stepType: StepDefinition.Type = StepDefinition.Type.VALIDATION;
  protected expectedFields: Field[] = [
    {
      field: 'ec',
      type: FieldDefinition.Type.STRING,
      description: 'Event Category',
    },
    {
      field: 'ea',
      type: FieldDefinition.Type.STRING,
      description: 'Event Action',
    },
    {
      field: 'id',
      type: FieldDefinition.Type.STRING,
      description: 'Tracking / Measurement ID associated with the GA instance/property (e.g. UA-75228722-5)',
    },
    {
      field: 'withParameters',
      type: FieldDefinition.Type.MAP,
      description: 'Parameter Checks, an optional map of Google Analytics Measurement Protocol Parameters and their expected values.',
    },
  ];

  async executeStep(step: Step): Promise<RunStepResponse> {
    const querystring = require('querystring');

    const stepData: any = step.getData().toJavaScript();
    const eventCategory: any = stepData.ec;
    const eventAction: any = stepData.ea;
    const id: any = stepData.id;
    const expectedParams: any = stepData.withParameters || {};
    let params;
    try {
      const requests = await this.client.getFinishedRequests();
      const urls = requests.filter(r => r.method == 'GET'
                                    && r.url.includes('https://www.google-analytics.com')
                                    && r.url.includes('/collect')
                                    && r.url.includes('t=event')).map(r => decodeURIComponent(r.url));
      const actual = urls.filter(url => url.includes(`tid=${id}`)
                                    && url.toLowerCase().includes(`ea=${eventAction.toLowerCase()}`)
                                    && url.toLowerCase().includes(`ec=${eventCategory.toLowerCase()}`));
      if (actual[0]) {
        params = querystring.parse(actual[0]);
        console.log(params);
      }
      if (actual.length !== 1) {
        return this.fail('expected to track 1 GA event, but there were actually %d', [actual.length]);
      } else if (!this.validateParams(expectedParams, params).isValid) {
        const paramResponse = this.validateParams(expectedParams, params);
        return this.fail('Expected %s parameter on event to be %s, but it was actually %s', [paramResponse.parameter, paramResponse.expectedValue, paramResponse.actualValue]);
      } else {
        return this.pass('GA pageview url with id %s has been loaded', [id]);
      }
    } catch (e) {
      return this.error('There was a problem checking GA event with id %s: %s', [id, e.toString()]);
    }
  }

  private validateParams(expectedParams, actualParams): any {
    for (const prop in expectedParams) {
      if (expectedParams[prop] != actualParams[prop]) {
        return { isValid: false, parameter: prop, expectedValue: expectedParams[prop], actualValue: actualParams[prop] };
      }
    }
    return { isValid: true };
  }
}

export { CheckGoogleAnalyticsEvent as Step };
