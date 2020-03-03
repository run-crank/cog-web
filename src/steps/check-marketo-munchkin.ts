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
    const querystring = require('querystring');
    const stepData: any = step.getData().toJavaScript();
    const id: string = stepData.id;

    try {
      await this.client.waitForNetworkIdle(10000, false);
      const actual = await this.client.getFinishedRequests();
      // Filter by munchkin host
      const munchkinFilteredUrl = actual.map(request => request.url).find(url => url.includes('://munchkin.marketo.net') && url.includes('munchkin.js'));
      if (!munchkinFilteredUrl) {
        return this.fail('The munchkin.js script was never requested.');
      }
      // Filter by ID
      const idFilteredUrl = actual.map(request => request.url).find(url => url.includes(`://${id.toLowerCase()}.mktoresp.com/webevents/visitWebPage`));
      if (!idFilteredUrl) {
        const record = this.createTable(actual.map(request => request.url).filter(url => url.includes('.mktoresp.com/webevents/visitWebPage')));
        return this.fail('No visit was logged for munchkin account %s', [id], [record]);
      }

      const record = this.createRecord(idFilteredUrl);
      return this.pass('Munchkin tracking successfully logged a page visit for munchkin id %s', [id], [record]);
    } catch (e) {
      console.log(e);
      return this.error('There was a problem checking tracking for munchkin id %s: %s', [id, e.toString()]);
    }
  }

  private createRecord(url) {
    const obj = this.getUrlParams(url);
    return this.keyValue('marketoMuchkingRequests', 'Marketo Munchkin Requests', obj);
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
    return this.table('marketoMuchkingRequests', 'Marketo Munchkin Requests', headers, rows);
  }
}

export { CheckMarketoMunchkin as Step };
