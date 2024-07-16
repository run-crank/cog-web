import { BaseStep, Field, StepInterface, ExpectedRecord } from '../core/base-step';
import { Step, FieldDefinition, StepDefinition, RecordDefinition, StepRecord } from '../proto/cog_pb';
import * as util from '@run-crank/utilities';
import { baseOperators } from '../client/constants/operators';

export class CheckCookie extends BaseStep implements StepInterface {

  protected stepName: string = 'Check a cookie on the current page';
  protected stepExpression: string = 'the (?<cookie>[a-zA-Z0-9_-]+) cookie should (?<operator>be set|not be set|be less than|be greater than|be one of|be|contain|not be one of|not be|not contain|match|not match) ?(?<expectation>.+)?';
  protected stepType: StepDefinition.Type = StepDefinition.Type.VALIDATION;
  protected actionList: string[] = ['check'];
  protected targetObject: string = 'Cookie';
  protected expectedFields: Field[] = [{
    field: 'cookie',
    type: FieldDefinition.Type.STRING,
    description: 'Cookie name to check',
    bulksupport: true,
  }, {
    field: 'operator',
    type: FieldDefinition.Type.STRING,
    optionality: FieldDefinition.Optionality.OPTIONAL,
    description: 'Check Logic (be, not be, contain, not contain, be greater than, be less than, be set, not be set, be one of, or not be one of)',
  }, {
    field: 'expectation',
    type: FieldDefinition.Type.ANYSCALAR,
    optionality: FieldDefinition.Optionality.OPTIONAL,
    description: 'Expected field value',
    bulksupport: true,
  }];
  protected expectedRecords: ExpectedRecord[] = [{
    id: 'cookies',
    type: RecordDefinition.Type.KEYVALUE,
    dynamicFields: true,
  }];

  async executeStep(step: Step) {
    const stepData: any = step.getData() ? step.getData().toJavaScript() : {};
    const cookieName = stepData.cookie;
    const operator: string = stepData.operator || 'be';
    const expectation = stepData.expectation || null;
  
    try {
      await this.client.waitForNetworkIdle(10000, false);
      const cookiesArray: any = await this.client.getCookiesForCurrentPage();
      const cookies = cookiesArray.reduce((acc, obj) => {
        acc[obj.name] = obj.value;
        return acc;
      }, {});

      const actual = cookies[cookieName];
      const record = this.createRecord(cookies);
      const orderedRecord = this.createOrderedRecord(cookies, stepData['__stepOrder']);

      if (actual !== undefined) {
        const result = this.assert(operator, actual, expectation, cookieName);
        return result.valid 
          ? this.pass(result.message, [], [record, orderedRecord])
          : this.fail(result.message, [], [record, orderedRecord]);
      } else {
        if (['not be set', 'not be one of'].includes(operator)) {
          return this.pass(`The ${cookieName} cookie was not set.`, [], [record, orderedRecord]);
        } else {
          return this.fail(`The ${cookieName} cookie was not found on the current page`, [], [record, orderedRecord]);
        }
      }
      
    } catch (e) {
      if (e instanceof util.UnknownOperatorError) {
        return this.error('%s Please provide one of: %s', [e.message, baseOperators.join(', ')]);
      }
      if (e instanceof util.InvalidOperandError) {
        return this.error('There was an error checking the contact field: %s', [e.message]);
      }
      return this.error('There was a problem checking the cookies: %s', [e.toString()]);
    }
  }

  createRecord(cookies: Record<string, any>): StepRecord {
    return this.keyValue('cookies', 'Checked Cookies', cookies);
  }

  createOrderedRecord(cookies, stepOrder = 1): StepRecord {
    return this.keyValue(`cookies.${stepOrder}`, `Checked Cookies from Step ${stepOrder}`, cookies);
  }
}

export { CheckCookie as Step };
