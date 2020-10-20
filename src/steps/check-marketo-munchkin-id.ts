import { BaseStep, Field, StepInterface } from '../core/base-step';
import { Step, RunStepResponse, FieldDefinition, StepDefinition } from '../proto/cog_pb';

export class CheckMarketoMunchkinId extends BaseStep implements StepInterface {

  protected stepName: string = 'Check Marketo Munchkin Id';
  protected stepExpression: string = 'the tracking code for munchkin account id should load';
  protected stepType: StepDefinition.Type = StepDefinition.Type.ACTION;
  protected expectedFields: Field[] = [];

  async executeStep(step: Step): Promise<RunStepResponse> {
    let munchkinId: string;

    try {
      await this.client.waitForNetworkIdle(10000, false);
      const actual = await this.client.getFinishedRequests();
      // Filter by munchkin host
      const munchkinFilteredUrl = actual.map(request => request.url).find(url => url.includes('://munchkin.marketo.net') && url.includes('munchkin.js'));
      if (!munchkinFilteredUrl) {
        return this.fail('The munchkin.js script was never requested.');
      }
      // Filter by ID
      const munchkinResponse = actual.map(request => request.url).find(url => url.includes('.mktoresp.com/webevents/visitWebPage'));
      if (!munchkinResponse) {
        const record = this.createTable(actual.map(request => request.url).filter(url => url.includes('.mktoresp.com/webevents/visitWebPage')));
        return this.fail('No munchkin was logged', [], [record]);
      }
      munchkinId = munchkinResponse.toString().split('.')[0].split('//')[1];
      const record = this.createRecord(munchkinResponse);
      return this.pass('Munchkin tracking successfully logged a page visit with munchkin id %s', [munchkinId], [record]);
    } catch (e) {
      return this.error('There was a problem checking tracking for munchkin id: %s', [e.toString()]);
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

export { CheckMarketoMunchkinId as Step };
