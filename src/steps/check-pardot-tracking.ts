import { isNullOrUndefined } from 'util';
import { BaseStep, Field, StepInterface } from '../core/base-step';
import { Step, RunStepResponse, FieldDefinition, StepDefinition } from '../proto/cog_pb';

export class CheckPardotTrackingStep extends BaseStep implements StepInterface {

  protected stepName: string = 'Check that Pardot tracking loads';
  // tslint:disable-next-line:max-line-length
  protected stepExpression: string = 'the tracking code for pardot account (?<aid>\\d+) and campaign (?<cid>\\d+) should have loaded';
  protected stepType: StepDefinition.Type = StepDefinition.Type.VALIDATION;
  protected expectedFields: Field[] = [{
    field: 'aid',
    type: FieldDefinition.Type.NUMERIC,
    description: 'Pardot Account ID',
  }, {
    field: 'cid',
    type: FieldDefinition.Type.NUMERIC,
    description: 'Pardot Campaign ID',
  }, {
    field: 'customDomain',
    type: FieldDefinition.Type.URL,
    description: 'Custom Tracker Domain',
    optionality: FieldDefinition.Optionality.OPTIONAL,
  }, {
    field: 'withParameters',
    type: FieldDefinition.Type.MAP,
    description: 'Parameter Checks, an optional map of query parameters and their expected values.',
    optionality: FieldDefinition.Optionality.OPTIONAL,
  }];

  async executeStep(step: Step): Promise<RunStepResponse> {
    const querystring = require('querystring');
    const stepData: any = step.getData().toJavaScript();
    const aid = stepData.aid;
    const cid = stepData.cid;
    const withParameters = stepData.withParameters;

    try {
      //// This will ensure that NavigateTo was called
      const url = await this.client.getCurrentPageInfo('url');
      const protocol = `${url.split('//')[0]}//`;
      const customDomain = stepData.customDomain || `${protocol}pi.pardot.com`;
      // Check request with host and path
      const matchingRequests = await this.client.getNetworkRequests(customDomain, '/analytics');
      const params = {
        account_id: aid,
        campaign_id: cid,
      };
      if (matchingRequests.length == 0) {
        return this.fail('Expected Pardot tracking request to load for account %d, and campaign %d, but no tracking loaded.', [
          aid,
          cid,
        ]);
      }
      // Check request with params
      if (!isNullOrUndefined(withParameters)) {
        for (const key in withParameters) {
          params[key] = withParameters[key];
        }
      }
      const evaluatedRequests = this.client.evaluateRequests(matchingRequests, params);
      if (evaluatedRequests.length == 0) {
        return this.fail('Expected Pardot tracking request to load for account %d, and campaign %d, but no tracking loaded. \n\n%s', [
          aid,
          cid,
          matchingRequests.map(request => decodeURIComponent(request.url)).join('\n\n'),
        ]);
      }
      const record = this.createRecord(evaluatedRequests[0].rawRequest._url);
      return this.pass(
        'Successfully detected Pardot Tracking request for account id %d, and campaign id %d.', [aid, cid], [record]);
    } catch (e) {
      return this.error('There was a problem checking Pardot Tracking request: %s', [
        e.toString(),
      ]);
    }
  }

  private createRecord(url) {
    let params = {};
    params = this.getUrlParams(url);
    return this.keyValue('pardotTrackingRequest', 'Pardot Tracking Request', params);
  }

}

export { CheckPardotTrackingStep as Step };
