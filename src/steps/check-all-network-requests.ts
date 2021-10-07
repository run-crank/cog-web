import { BaseStep, Field, StepInterface } from '../core/base-step';
import { Step, RunStepResponse, FieldDefinition, StepDefinition } from '../proto/cog_pb';

export class CheckAllNetworkRequestsStep extends BaseStep implements StepInterface {

  protected stepName: string = 'Check for all network requests';
  // tslint:disable-next-line:max-line-length
  protected stepExpression: string = 'there should be network requests from the page';
  protected stepType: StepDefinition.Type = StepDefinition.Type.VALIDATION;
  protected expectedFields: Field[] = [];

  async executeStep(step: Step): Promise<RunStepResponse> {
    const sources = {};

    try {
      //// This will ensure that NavigateTo was called
      await this.client.getCurrentPageInfo('url');

      const networkRequests = await this.client.getFinishedRequests();
      // Get all network requests fired by the webpage
      networkRequests.forEach((request) => {
        if (request.url) {
          const removeHttp = request.url.split('://');
          // Collect sources and count by baseUrl
          const baseUrl = removeHttp[1] ? `${removeHttp[0]}://${removeHttp[1].split('/')[0]}` : removeHttp[0];
          if (!Object.keys(sources).includes(baseUrl)) {
            sources[baseUrl] = { url: baseUrl, count: 1 };
          } else {
            sources[baseUrl].count += 1;
          }
        }
      });

      const urls = Object.keys(sources);

      const records = [];
      if (urls.length === 0) {
        return this.fail(
          'Expected network request(s), but %d were found:\n\n', [
            urls.length,
          ],
          records);
      }
      if (urls.length > 0) {
        records.push(this.createTable(sources));
      }
      return this.pass(
        '%d sources found, as expected',
        [
          urls.length,
        ],
        records);
    } catch (e) {
      return this.error('There was a problem checking network request: %s', [
        e.toString(),
      ]);
    }
  }

  private createTable(sources) {
    const headers = {};
    const rows = [];
    headers['fires'] = 'fires';
    headers['url'] = 'url';

    Object.keys(sources).forEach((source) => {
      const url = sources[source].url;
      const count = sources[source].count;
      rows.push({ url, fires: count });
    });

    const headerKeys = Object.keys(rows[0] || {});
    headerKeys.forEach((key: string) => {
      headers[key] = key;
    });
    return this.table('pixels', 'Network Sources', headers, rows);
  }
}

export { CheckAllNetworkRequestsStep as Step };
