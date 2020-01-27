import { BaseStep, Field, StepInterface } from '../core/base-step';
import { Step, RunStepResponse, FieldDefinition, StepDefinition } from '../proto/cog_pb';

import { URL } from 'url';
import * as querystring from 'querystring';

const OTHER_REQUEST_METHODS = ['POST', 'PATCH', 'PUT'];
const VALID_CONTENT_TYPES = ['application/json', 'application/json;charset=UTF-8', 'application/x-www-form-urlencoded'];

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
  }, {
    field: 'withParameters',
    type: FieldDefinition.Type.MAP,
    description: 'Parameters Include',
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

      await this.client.waitForNetworkIdle(10000, false);
      const requests = await this.client.getFinishedRequests();

      const matchingRequests = requests.filter(r => r.url.startsWith(baseUrl) && r.url.includes(pathContains)); //// string.includes(empty) is always true
      const evaluatedRequests = this.evaluateRequests(matchingRequests, withParameters);

      if (evaluatedRequests.length !== reqCount) {
        return this.fail('Expected %d matching network request(s), but %d were found:\n\n%s', [
          reqCount,
          evaluatedRequests.length,
          evaluatedRequests.map(r => `${r.url}\n`),
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

  evaluateRequests(requests, expectedParams) {
    const matching = [];

    requests.forEach((request) => {
      //// The Iterator logic can be factored out
      if (request.method == 'GET') {
        const url = new URL(request.url);

        let matched = true;

        url.searchParams.forEach((value, key) => {
          if (expectedParams.hasOwnProperty(key) && matched) {
            matched = expectedParams[key] == value;
          }
        });

        if (matched) {
          matching.push(request);
        }

      } else if (OTHER_REQUEST_METHODS.includes(request.method)) {
        const requestHasValidContentType = VALID_CONTENT_TYPES.filter(f => f.includes(request.rawRequest._headers['content-type'])).length > 0;
        if (requestHasValidContentType) {
          let matched = true;

          let postData;
          try { postData = JSON.parse(request.postData); } catch (e) { postData = querystring.parse(request.postData); }

          for (const [key, value] of Object.entries(postData)) {
            if (expectedParams.hasOwnProperty(key) && matched) {
              matched = expectedParams[key] == value;
            }
          }

          if (matched) {
            matching.push(request);
          }
        }
      }
    });

    return matching;
  }

}

export { CheckNetworkRequestStep as Step };
