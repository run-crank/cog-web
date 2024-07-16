import { BaseStep, Field, StepInterface, ExpectedRecord } from '../core/base-step';
import { Step, StepDefinition, FieldDefinition, RecordDefinition, StepRecord } from '../proto/cog_pb';

export class DeleteCookies extends BaseStep implements StepInterface {

  protected stepName: string = 'Delete cookies on the current page';
  protected stepExpression: string = 'delete (the (?<cookie>[a-zA-Z0-9_-]+) cookie|all cookies)';
  protected stepType: StepDefinition.Type = StepDefinition.Type.ACTION;
  protected actionList: string[] = ['delete'];
  protected targetObject: string = 'Cookie(s)';
  protected expectedFields: Field[] = [{
    field: 'cookie',
    type: FieldDefinition.Type.STRING,
    optionality: FieldDefinition.Optionality.OPTIONAL,
    description: 'Name of the cookie to delete (Leave this blank to delete ALL cookies)',
  }];
  protected expectedRecords: ExpectedRecord[] = [{
    id: 'cookies',
    type: RecordDefinition.Type.KEYVALUE,
    dynamicFields: true,
  }];

  async executeStep(step: Step) {
    const stepData: any = step.getData() ? step.getData().toJavaScript() : {};
    const cookieName = stepData.cookie || null;
  
    try {
      await this.client.waitForNetworkIdle(10000, false);
      
      if (cookieName) {
        const cookiesArray: any = await this.client.getCookiesForCurrentPage();
        const cookies = cookiesArray.reduce((acc, obj) => {
            acc[obj.name] = obj.value;
            return acc;
        }, {});
        const targetCookie = cookiesArray.find(c => c.name === cookieName);
        if (targetCookie) {
          await this.client.deleteCookie(targetCookie);
          const record = this.createRecord(cookies[cookieName]);
          const orderedRecord = this.createOrderedRecord(cookies[cookieName], stepData['__stepOrder']);
          return this.pass(`Successfully deleted the ${cookieName} cookie`, [], [record, orderedRecord])
        } else {
          const record = this.keyValue('cookies', 'Cookies on current page', cookies);
          const orderedRecord = this.keyValue(`cookies.${stepData['__stepOrder'] || 1}`, `Cookies on current page from Step ${stepData['__stepOrder'] || 1}`, cookies);;
          return this.fail(`Unable to delete cookie: A cookie with the name ${cookieName} does not exist on the current page`, [], [record, orderedRecord]);
        }        
      } else {
        const cookiesArray = await this.client.getCookiesForCurrentPage();
        const cookies = cookiesArray.reduce((acc, obj) => {
          acc[obj.name] = obj.value;
          return acc;
        }, {});
        if (cookiesArray.length > 0) {
          for (const cookie of cookiesArray) {
            await this.client.deleteCookie(cookie);
          }
        }
        const record = this.createRecord(cookies);
        const orderedRecord = this.createOrderedRecord(cookies, stepData['__stepOrder']);
        return this.pass(`Successfully deleted all cookies from the page`, [], [record, orderedRecord])
      }  
    } catch (e) {
      return this.error('There was a problem deleting the cookies: %s', [e.toString()]);
    }
  }

  createRecord(cookies: Record<string, any>): StepRecord {
    return this.keyValue('cookies', 'Deleted Cookies', cookies);
  }

  createOrderedRecord(cookies, stepOrder = 1): StepRecord {
    return this.keyValue(`cookies.${stepOrder}`, `Deleted Cookies from Step ${stepOrder}`, cookies);
  }
}

export { DeleteCookies as Step };
