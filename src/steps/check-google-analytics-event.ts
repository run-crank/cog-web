import { isNullOrUndefined } from 'util';
import { BaseStep, Field, StepInterface, ExpectedRecord } from '../core/base-step';
import { Step, RunStepResponse, FieldDefinition, StepDefinition, RecordDefinition } from '../proto/cog_pb';

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
      optionality: FieldDefinition.Optionality.OPTIONAL,
      description: 'Parameter Checks, an optional map of Google Analytics Measurement Protocol Parameters and their expected values.',
    },
  ];

  protected expectedRecords: ExpectedRecord[] = [{
    id: 'googleAnalyticsRequest',
    type: RecordDefinition.Type.KEYVALUE,
    fields: [{
      field: 'cid',
      type: FieldDefinition.Type.STRING,
      description: 'Google Analytics Client ID',
    }],
    dynamicFields: true,
  }];

  async executeStep(step: Step): Promise<RunStepResponse> {
    const stepData: any = step.getData().toJavaScript();
    const eventCategory: any = encodeURIComponent(stepData.ec);
    const eventAction: any = encodeURIComponent(stepData.ea);
    const id: any = stepData.id;
    const expectedParams: any = stepData.withParameters || {};
    try {
      await this.client.waitForNetworkIdle(10000, false);
      const requests = await this.client.getFinishedRequests();
      const urls = requests.filter(r => r.method == 'GET'
                                    && r.url.includes('https://www.google-analytics.com')
                                    && r.url.includes('/collect')
                                    && r.url.includes('t=event')).map(r => r.url);
      const filteredRequest = urls.filter(url => url.includes(`tid=${id}`)
                                    && url.toLowerCase().includes(`ea=${eventAction.toLowerCase()}`)
                                    && url.toLowerCase().includes(`ec=${eventCategory.toLowerCase()}`));
      let records = [];
      let filteredRequestsWithParams = [];
      if (!isNullOrUndefined(expectedParams)) {
        if (Object.keys(expectedParams).length > 0) {
          filteredRequestsWithParams = filteredRequest.filter(u => this.includesParameters(u, expectedParams));
        }
      }

      records = [];
      if (filteredRequestsWithParams.length !== 1) {
        const table = this.createTable(filteredRequest);
        records.push(table);
        return this.fail('Expected 1 matching GA event, but %d matched.', [filteredRequestsWithParams.length], records);
      }
      const params = this.getUrlParams(filteredRequestsWithParams[0]);
      const record = this.keyValue('googleAnalyticsRequest', 'Matched Google Analytics Request', params);
      return this.pass(
        'Successfully detected GA event with category %s, and action %s for tracking id %s.',
        [
          stepData.ec,
          stepData.ea,
          stepData.id,
        ],
        [
          record,
        ]);
    } catch (e) {
      return this.error(
        'There was a problem checking for a GA event with category %s, and action %s, for tracking id %s: %s',
        [
          stepData.ec,
          stepData.ea,
          stepData.id,
          e.toString(),
        ]);
    }
  }

  private includesParameters(url, expectedParams) {
    for (const p in expectedParams) {
      if (!url.toLowerCase().includes(`${p.toLowerCase()}=${encodeURIComponent(expectedParams[p]).toLowerCase()}`)) {
        return false;
      }
    }
    return true;
  }

  private createTable(urls) {
    const headers = {};
    const rows = [];
    const headerKeys = Object.keys(this.getUrlParams(urls[0]));
    headerKeys.forEach((key: string) => {
      headers[key] = key;
    });
    urls.forEach((url: string) => {
      rows.push(this.getUrlParams(url));
    });
    return this.table('googleAnalyticsRequest', 'Matched Google Analytics Request', headers, rows);
  }

}

export { CheckGoogleAnalyticsEvent as Step };
