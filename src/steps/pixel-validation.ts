import { BaseStep, Field, StepInterface } from '../core/base-step';
import { Step, RunStepResponse, FieldDefinition, StepDefinition } from '../proto/cog_pb';
import { URL } from 'url';

export class PixelValidationStep extends BaseStep implements StepInterface {

  protected stepName: string = 'Check for a pixel';
  protected stepExpression: string = 'there should be network requests for the (?<pixelName>.+) pixel';
  protected stepType: StepDefinition.Type = StepDefinition.Type.VALIDATION;
  protected actionList: string[] = ['check'];
  protected targetObject: string = 'Pixel';
  protected expectedFields: Field[] = [{
    field: 'pixelName',
    type: FieldDefinition.Type.STRING,
    description: 'Pixel Name',
  }, {
    field: 'withParameters',
    type: FieldDefinition.Type.MAP,
    description: 'Parameters Include',
    optionality: FieldDefinition.Optionality.OPTIONAL,
  }, {
    field: 'customDomain',
    type: FieldDefinition.Type.URL,
    description: 'Custom Tracker Domain',
    optionality: FieldDefinition.Optionality.OPTIONAL,
  }];

  async executeStep(step: Step): Promise<RunStepResponse> {
    const stepData: any = step.getData().toJavaScript();
    const pixelName = stepData.pixelName.toLowerCase();
    const withParameters = stepData.withParameters || {};

    const pixelMap = {
      'marketo munchkin': {
        baseUrls: ['https://munchkin.marketo.net'],
        pathContains: 'munchkin.js',
      },
      hubspot: {
        baseUrls: ['https://hs.analytics', 'https://js.hs-scripts.com', 'https://js.hs-analytics.net'],
        pathContains: '',
      },
      pardot: {
        baseUrls: ['https://pi.pardot.com'],
        pathContains: 'analytics',
      },
      eloqua: {
        baseUrls: ['https://t.eloqua.com'],
        pathContains: 'visitor',
      },
      bizible: {
        baseUrls: ['https://cdn.bizible.com'],
        pathContains: '',
      },
      'google ads': {
        baseUrls: ['https://googleads.g.doubleclick.net'],
        pathContains: 'pagead',
      },
      'google analytics ua': {
        baseUrls: ['https://www.google-analytics.com', 'https://analytics.google.com'],
        pathContains: 'collect',
        params: {v: 1},
      },
      'google analytics ga4': {
        baseUrls: ['https://www.google-analytics.com', 'https://analytics.google.com'],
        pathContains: 'collect',
        params: {v: 2},
      },
      'google floodlight': {
        baseUrls: ['https://ad.doubleclick.net', 'https://fls.doubleclick.net'],
        pathContains: 'analytics.js',
      },
      'google remarketing': {
        baseUrls: ['https://www.googleadservices.com'],
        pathContains: 'pagead',
      },
      'linkedin insight': {
        baseUrls: ['https://px.ads.linkedin.com', 'https://dc.ads.linkedin.com'],
        pathContains: '',
      },
      facebook: {
        baseUrls: ['https://www.facebook.com'],
        pathContains: 'tr',
      },
      twitter: {
        baseUrls: ['https://analytics.twitter.com'],
        pathContains: '',
      },
      hotjar: {
        baseUrls: ['https://vars.hotjar.com'],
        pathContains: '',
      },
      heap: {
        baseUrls: ['https://cdn.heapanalytics.com'],
        pathContains: 'js',
      },
      mouseflow: {
        baseUrls: ['https://n2.mouseflow.com'],
        pathContains: 'event',
      },
      quora: {
        baseUrls: ['https://q.quora.com'],
        pathContains: 'ad',
      },
      salesloft: {
        baseUrls: ['https://scout-cdn.salesloft.com'],
        pathContains: 'sl.js',
      },
      drift: {
        baseUrls: ['https://event.api.drift.com'],
        pathContains: 'track',
      },
    };

    if (!pixelMap[pixelName]) {
      return this.error(
        'Unknown pixel name: %s', [
          pixelName,
        ]);
    }

    const baseUrls = pixelMap[pixelName].baseUrls || [];
    const pathContains = pixelMap[pixelName].pathContains || '';
    if (stepData.customDomain) {
      baseUrls.push(stepData.customDomain);
    }

    // Add any parameters required by the pixel to the user defined "withParameters" object
    if (pixelMap[pixelName].params) {
      for (const key in pixelMap[pixelName].params) {
        withParameters[key] = pixelMap[pixelName].params[key];
      }
    }

    try {
      //// This will ensure that NavigateTo was called
      await this.client.getCurrentPageInfo('url');

      const matchingRequests = [];
      for (const baseUrl of baseUrls) {
        matchingRequests.push(...await this.client.getNetworkRequests(baseUrl, pathContains));
      }
      const evaluatedRequests = this.client.evaluateRequests(matchingRequests, withParameters);

      const records = [];
      if (!evaluatedRequests.length) {
        return this.fail(
          'Expected matching network requests for the %s pixel, but %d were found:\n\n', [
            pixelName,
            evaluatedRequests.length,
          ],
          records);
      }
      records.push(this.createTable(evaluatedRequests));
      return this.pass(
        'Network requests found for the %s pixel, as expected',
        [
          pixelName,
        ],
        records);
    } catch (e) {
      return this.error('There was a problem checking network request: %s', [
        e.toString(),
      ]);
    }
  }

  private createTable(requests) {
    const headers = {};
    const rows = [];
    headers['url'] = 'url';
    requests.forEach((request) => {
      const url = new URL(request.url);
      let params = {};
      if (request.method == 'POST') {
        params = this.getPostRequestParams(request);
      } else {
        params = this.getUrlParams(request.url);
      }
      params['url'] = `${url.origin}${url.pathname}`;
      rows.push(params);
    });
    const headerKeys = Object.keys(rows[0] || {});
    headerKeys.forEach((key: string) => {
      headers[key] = key;
    });
    return this.table('networkRequests', 'Network Requests', headers, rows);
  }

  private getPostRequestParams(request) {
    if (request.rawRequest?._headers?.['content-type'].includes('application/json')) {
      return JSON.parse(request.postData);
    } else {
      return this.getUrlParams(`${request.url}?${request.postData}`);
    }
  }
}

export { PixelValidationStep as Step };
