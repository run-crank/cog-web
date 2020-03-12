import { BaseStep, Field, StepInterface, ExpectedRecord } from '../core/base-step';
import { Step, RunStepResponse, FieldDefinition, StepDefinition, RecordDefinition } from '../proto/cog_pb';
import { isNullOrUndefined } from 'util';

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
    const id: any = stepData.id;
    const expectedParams: any = stepData.withParameters || {};
    let result;
    try {
      await this.client.waitForNetworkIdle(10000, false);
      const requests = await this.client.getFinishedRequests();
      const urls = requests.filter(r => r.method == 'GET'
                                        && r.url.includes('https://www.google-analytics.com')
                                        && r.url.includes('/collect')
                                        && r.url.includes('t=pageview')).map(r => r.url);
      const filteredRequest = urls.filter(url => url.includes(`tid=${id}`));
      result = filteredRequest;
      // Handle requests by required parameters
      let records = [];
      if (result.length !== 1) {
        let table;
        if (result.length > 1) {
          table = this.createTable(result);
          records.push(table);
        }
        return this.fail('Expected 1 matching GA pageview, but %d matched.', [result.length], records);
      }

      // Handle requests by optional parameters
      let filteredRequestsWithParams = [];
      if (!isNullOrUndefined(expectedParams)) {
        if (Object.keys(expectedParams).length > 0) {
          filteredRequestsWithParams = filteredRequest.filter(u => this.includesParameters(u, expectedParams));
          result = filteredRequestsWithParams;
        }
      }

      records = [];
      if (result.length !== 1) {
        const table = this.createTable(filteredRequest);
        records.push(table);
        return this.fail('Expected 1 matching GA pageview, but %d matched.', [result.length], records);
      }
      const params = this.getUrlParams(result[0]);
      const record = this.keyValue('googleAnalyticsRequest', 'Matched Google Analytics Request', params);
      records.push(record);
      return this.pass('Successfuly detected GA pageview for tracking id %s.', [id], records);
    } catch (e) {
      return this.error('There was a problem checking for a GA pageview for tracking id %s: %s', [id, e.toString()]);
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

export { CheckGoogleAnalyticsPageView as Step };
