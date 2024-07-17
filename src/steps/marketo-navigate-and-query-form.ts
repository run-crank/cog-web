import { BaseStep, ExpectedRecord, Field, StepInterface } from '../core/base-step';
import { FieldDefinition, RecordDefinition, RunStepResponse, Step, StepDefinition, StepRecord } from '../proto/cog_pb';

export class MarketoNavigateAndQueryForm extends BaseStep implements StepInterface {

  protected stepName: string = 'Navigate and query Marketo form fields';
  // tslint:disable-next-line:max-line-length
  protected stepExpression: string = 'navigate marketo form and query fields at (?<webPageUrl>.+)';
  protected stepType: StepDefinition.Type = StepDefinition.Type.ACTION;
  protected actionList: string[] = ['navigate'];
  protected targetObject: string = 'Navigate and fill out Marketo form';

  protected expectedFields: Field[] = [{
    field: 'webPageUrl',
    type: FieldDefinition.Type.URL,
    description: 'Page URL',
  }];

  protected expectedRecords: ExpectedRecord[] = [{
    id: 'form',
    type: RecordDefinition.Type.KEYVALUE,
    fields: [{
      field: 'url',
      type: FieldDefinition.Type.STRING,
      description: 'Url to navigate to',
    }],
    dynamicFields: true,
  }];

  async executeStep(step: Step): Promise<RunStepResponse> {
    const stepData: any = step.getData().toJavaScript();
    const url: string = stepData.webPageUrl;
    const throttle: boolean = stepData.throttle || false;
    const maxInflightRequests: number = stepData.maxInflightRequests || 0;
    const passOn404: boolean = stepData.passOn404 || false;

    // Navigate to URL.
    try {
      console.time('time');
      console.log('>>>>> STARTED TIMER FOR MARKETOO-NAVIGATE-AND-QUERY-FORM STEP');
      await this.client.navigateToUrl(url, throttle, maxInflightRequests);
      const screenshot = await this.client.client.screenshot({ type: 'jpeg', encoding: 'binary', quality: 60 });
      const binaryRecord = this.binary('screenshot', 'Screenshot', 'image/jpeg', screenshot);
      console.log('>>>>> checkpoint 6: finished taking screenshot and making binary record');
      console.timeLog('time');
      const status = await this.client.client['___lastResponse']['status']();
      console.log('>>>>> checkpoint 7: finished getting status, ending timer');
      console.timeEnd('time');
      if (status === 404 && !passOn404) {
        return this.fail('%s returned an Error: 404 Not Found', [url], [binaryRecord]);
      }
      const record = this.createRecord(url);
      const orderedRecord = this.createOrderedRecord(url, stepData['__stepOrder']);
      return this.pass('Successfully navigated to %s', [url], [binaryRecord, record, orderedRecord]);
    } catch (e) {
      try {
        const screenshot = await this.client.client.screenshot({ type: 'jpeg', encoding: 'binary', quality: 60 });
        const binaryRecord = this.binary('screenshot', 'Screenshot', 'image/jpeg', screenshot);
        return this.error(
          'There was a problem navigating to %s: %s',
          [
            url,
            e.toString(),
          ],
          [
            binaryRecord,
          ]);
      } catch (screenshotError) {
        return this.error(
          'There was a problem navigating to %s: %s',
          [
            url,
            e.toString(),
          ],
        );
      }
    }
  }

  public createRecord(url): StepRecord {
    const obj = {
      url,
    };
    const record = this.keyValue('form', 'Navigated to Page', obj);

    return record;
  }

  public createOrderedRecord(url, stepOrder = 1): StepRecord {
    const obj = {
      url,
    };
    const record = this.keyValue(`form.${stepOrder}`, `Navigated to Page from Step ${stepOrder}`, obj);

    return record;
  }

}

export { MarketoNavigateAndQueryForm as Step };
