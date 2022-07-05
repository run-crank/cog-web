import { BaseStep, Field, StepInterface } from '../core/base-step';
import { Step, RunStepResponse, FieldDefinition, StepDefinition } from '../proto/cog_pb';
import { isNullOrUndefined } from 'util';

export class CheckGoogleFloodlightTag extends BaseStep implements StepInterface {

  protected stepName: string = 'Check that a Google Floodlight tag fired';
  protected stepExpression: string = 'a floodlight tag should have fired for advertiser (?<aid>\\d+), group (?<group>[a-zA-Z0-9-_]+), and activity (?<atag>[a-zA-Z0-9-_]+)';
  protected stepType: StepDefinition.Type = StepDefinition.Type.VALIDATION;
  protected expectedFields: Field[] = [
    {
      field: 'aid',
      type: FieldDefinition.Type.NUMERIC,
      description: 'Advertiser ID',
    },
    {
      field: 'group',
      type: FieldDefinition.Type.STRING,
      description: 'Group Tag String',
    },
    {
      field: 'atag',
      type: FieldDefinition.Type.STRING,
      description: 'Activity Tag String',
    },
    {
      field: 'cMethod',
      type: FieldDefinition.Type.STRING,
      optionality: FieldDefinition.Optionality.OPTIONAL,
      description: 'Counting Method (standard, unique, per session)',
    },
    {
      field: 'withVariables',
      type: FieldDefinition.Type.MAP,
      optionality: FieldDefinition.Optionality.OPTIONAL,
      description: 'Custom Variables, an optional map of variable names and their expected values',
    },
  ];

  async executeStep(step: Step): Promise<RunStepResponse> {
    const stepData: any = step.getData().toJavaScript();
    const aid: any = stepData.aid;
    const group: any = stepData.group;
    const atag: any = stepData.atag;
    const cMethod: any = stepData.cMethod;
    const variables: any = stepData.withVariables;
    try {
      //// This will ensure that NavigateTo was called
      await this.client.getCurrentPageInfo('url');
      await this.client.waitForNetworkIdle(10000, false);
      const requests = await this.client.getFinishedRequests();
      let actual = this.client.filterGoogleAdsURLs(requests, aid, group, atag);
      // Base parameter checks
      if (actual.length == 0) {
        return this.fail('Expected Floodlight tag to fire for advertiser %d, group %s, and activity %s, but no Floodlight tag fired', [
          aid,
          group,
          atag,
        ]);
      }
      // Variable checks
      if (!isNullOrUndefined(variables)) {
        const variableCheckedUrls = actual.filter((url) => this.client.includesParameters(url, variables));
        if (variableCheckedUrls.length == 0) {
          return this.fail('A Floodlight tag fire was detected for advertiser %d, group %s, and activity %s, but it did not match the expected variables.\n\n%s', [
            aid,
            group,
            atag,
            actual.join('\n\n'),
          ]);
        }
        actual = variableCheckedUrls;
      }
      // cMethod parameter checks
      if (cMethod) {
        const conversionMethodUrls = this.client.conversionMethodUrlFilter(cMethod, actual);
        if (conversionMethodUrls.length == 0) {
          return this.fail('A Floodlight tag fire was detected for advertiser %d, group %s, and activity %s, but it did not conform to the %s conversion count method.', [
            aid,
            group,
            atag,
            actual.join('\n\n'),
          ]);
        }
        actual = conversionMethodUrls;
      }
      let table;
      if (actual.length > 1) {
        table = this.createTable(actual);
      }
      // Pass if above errors did not go through
      return this.pass(
        'Successfully detected Floodlight tag fire for advertiser %d, group %s, and activity %s.',
        [
          aid,
          group,
          atag,
        ],
        [
          table,
        ]);
    } catch (e) {
      return this.error('There was a problem checking for a Floodlight tag to fire for advertiser %d, group %s, and activity %s.', [
        aid,
        group,
        atag,
        e.toString(),
      ]);
    }
  }

  private createTable(urls) {
    const headers = {};
    const rows = [];
    const headerKeys = Object.keys(this.client.getGoogleFloodlightParameters(urls[0]));
    headerKeys.forEach((key: string) => {
      headers[key] = key;
    });
    urls.forEach((url: string) => {
      rows.push(this.client.getGoogleFloodlightParameters(url));
    });
    return this.table('googleFloodlightTagRequests', 'Google Floodlight Tag Requests', headers, rows);
  }
}

export { CheckGoogleFloodlightTag as Step };
