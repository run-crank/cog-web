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
      description: 'Counting Method (standard, unique, per session)',
    },
    {
      field: 'withVariables ',
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
    const variables: any = stepData.withVariables || {};
    try {
      await this.client.waitForNetworkIdle(10000, false);
      const requests = await this.client.getFinishedRequests();
      let actual = this.client.filterGoogleAdsURLs(requests, aid, group, atag);
      console.log(actual);
      // Base parameter checks
      if (actual.length == 0) {
        return this.fail('Expected Floodlight tag to fire for advertiser %d, group %s, and activity %s, but the no Floodlight tag fire was detected.', [
          aid,
          group,
          atag,
        ]);
      }
      // Variable checks
      if (!isNullOrUndefined(variables)) {
        const variableCheckedUrls = actual.filter(url => this.client.includesParameters(url, variables));
        if (variableCheckedUrls.length == 0) {
          return this.fail('Expected Floodlight tag to fire for advertiser %d, group %s, and activity %s, but the no Floodlight tag fire was detected. \n\n%s', [
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
          return this.fail('A floodlight tag fire was detected for advertiser %d, group %s, and activity %s, but it did not conform to the %s conversion count method.\n\n%s', [
            aid,
            group,
            atag,
            actual.join('\n\n'),
          ]);
        }
        actual = conversionMethodUrls;
      }
      // Pass if above errors did not go through
      return this.pass('Successfully detected Floodlight tag to fire for advertiser %d, group %s, and activity %s.', [
        aid,
        group,
        atag,
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
}

export { CheckGoogleFloodlightTag as Step };
