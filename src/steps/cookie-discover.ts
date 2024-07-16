import { BaseStep, Field, StepInterface, ExpectedRecord } from '../core/base-step';
import { Step, StepDefinition, RecordDefinition, StepRecord } from '../proto/cog_pb';

export class DiscoverCookies extends BaseStep implements StepInterface {

  protected stepName: string = 'Discover cookies on the current page';
  protected stepExpression: string = 'discover cookies on the current page';
  protected stepType: StepDefinition.Type = StepDefinition.Type.ACTION;
  protected actionList: string[] = ['discover'];
  protected targetObject: string = 'Cookies';
  protected expectedFields: Field[] = [];
  protected expectedRecords: ExpectedRecord[] = [{
    id: 'cookies',
    type: RecordDefinition.Type.KEYVALUE,
    dynamicFields: true,
  }];

  async executeStep(step: Step) {
    const stepData: any = step.getData() ? step.getData().toJavaScript() : {};
  
    try {
      await this.client.waitForNetworkIdle(10000, false);
      const cookiesArray: any = await this.client.getCookiesForCurrentPage();
      const cookies = cookiesArray.reduce((acc, obj) => {
        acc[obj.name] = obj.value;
        return acc;
      }, {});
      const record = this.createRecord(cookies);
      const orderedRecord = this.createOrderedRecord(cookies, stepData['__stepOrder']);
      return this.pass('Successfully discovered cookies on the current webpage', [], [record, orderedRecord]);     
    } catch (e) {
      return this.error('There was a problem checking the cookies: %s', [e.toString()]);
    }
  }

  createRecord(cookies: Record<string, any>): StepRecord {
    return this.keyValue('cookies', 'Discovered Cookies', cookies);
  }

  createOrderedRecord(cookies, stepOrder = 1): StepRecord {
    return this.keyValue(`cookies.${stepOrder}`, `Discovered Cookies from Step ${stepOrder}`, cookies);
  }
}

export { DiscoverCookies as Step };
