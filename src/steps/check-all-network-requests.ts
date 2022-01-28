import { BaseStep, Field, StepInterface } from '../core/base-step';
import { Step, RunStepResponse, FieldDefinition, StepDefinition } from '../proto/cog_pb';

export class CheckAllNetworkRequestsStep extends BaseStep implements StepInterface {

  protected stepName: string = 'Check for all network requests';
  // tslint:disable-next-line:max-line-length
  protected stepExpression: string = 'there should be consistent network requests from the page';
  protected stepType: StepDefinition.Type = StepDefinition.Type.VALIDATION;
  protected expectedFields: Field[] = [{
    field: 'previousRequests',
    type: FieldDefinition.Type.MAP,
    description: 'Previous Network Requests',
    optionality: FieldDefinition.Optionality.OPTIONAL,
  }];

  async executeStep(step: Step): Promise<RunStepResponse> {
    const stepData: any = step.getData().toJavaScript();
    const previousRequests = stepData.previousRequests;
    const sources = {};
    const missingSources = {};
    const newSources = {};

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
        if (previousRequests) {
          const previousUrls = Object.keys(previousRequests);
          let passing = urls.length === previousUrls.length;
          urls.forEach((newUrl) => {
            if (!previousUrls.includes(newUrl)) {
              passing = false;
              newSources[newUrl] = { url: newUrl, count: sources[newUrl].count };
            }
          });
          previousUrls.forEach((oldUrl) => {
            if (!urls.includes(oldUrl)) {
              passing = false;
              missingSources[oldUrl] = { url: oldUrl, count: previousRequests[oldUrl] };
            }
          });
          if (passing) {
            records.push(this.createTable('pixels', 'Network Sources', sources));
            return this.pass(
              '%d sources found, as expected',
              [
                urls.length,
              ],
              records);
          } else {
            records.push(this.createTable('pixels', 'Network Sources', sources));
            records.push(this.createTable('newPixels', 'New Network Sources', newSources));
            records.push(this.createTable('missingPixels', 'Missing Network Sources', missingSources));
            return this.fail(
              'Network Sources have changes since the last run of this scenario',
              [
                (urls.length),
              ],
              records);
          }
        } else {
          records.push(this.createTable('pixels', 'Network Sources', sources));
          return this.pass(
            '%d sources found, as expected',
            [
              urls.length,
            ],
            records);
        }
      }
    } catch (e) {
      return this.error('There was a problem checking network request: %s', [
        e.toString(),
      ]);
    }
  }

  private createTable(id, name, sources) {
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
    return this.table(id, name, headers, rows);
  }
}

export { CheckAllNetworkRequestsStep as Step };
