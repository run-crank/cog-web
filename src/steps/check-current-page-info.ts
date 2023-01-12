import { BaseStep, Field, StepInterface } from '../core/base-step';
import { Step, RunStepResponse, FieldDefinition, StepDefinition } from '../proto/cog_pb';

export class CheckCurrentPageInfo extends BaseStep implements StepInterface {

  protected stepName: string = 'Check current page info';
  // tslint:disable-next-line:max-line-length
  protected stepExpression: string = 'the (?<field>status|text|url) of the current page should (?<operator>contain|not contain|be) (?<expectation>.+)';
  protected stepType: StepDefinition.Type = StepDefinition.Type.VALIDATION;
  protected actionList: string[] = ['check'];
  protected targetObject: string = 'Page Info';
  protected expectedFields: Field[] = [{
    field: 'field',
    type: FieldDefinition.Type.STRING,
    description: 'Page Detail (status, text, or url)',
  }, {
    field: 'operator',
    type: FieldDefinition.Type.STRING,
    description: 'Check Logic (contain, not contain, or be)',
  }, {
    field: 'expectation',
    type: FieldDefinition.Type.ANYSCALAR,
    description: 'Expected Value',
  }];

  async executeStep(step: Step): Promise<RunStepResponse> {
    const stepData: any = step.getData().toJavaScript();
    const field: string = stepData.field;
    const operator: string = stepData.operator;
    const expectation: any = stepData.expectation;

    // Navigate to URL.
    try {
      await this.client.waitForNetworkIdle(10000, false);
      const actual = await this.client.getCurrentPageInfo(field);
      if (this.runComparison(operator, expectation, actual)) {
        return this.pass('Page info check passed: %s should %s %s', [field, operator, expectation]);
      }

      let trimmedActual: string;
      if (String(actual).length > 4096) {
        trimmedActual = `${String(actual).substring(0, 4096)} ... (Contents Trimmed)`;
      } else {
        trimmedActual = String(actual);
      }
      return this.fail('Page info check failed: %s should %s %s, but it was actually %s', [
        field,
        operator,
        expectation,
        trimmedActual,
      ]);
    } catch (e) {
      return this.error('There was a problem checking page info %s: %s', [field, e.toString()]);
    }
  }

/**
 * Compare the expected and actual field values using the appropriate operator.
 */
  protected runComparison(operator, expected, actual): boolean {
    if (operator === 'contain') {
      return String(actual).toLowerCase().includes(String(expected).toLowerCase());
    }

    if (operator === 'not contain') {
      return !String(actual).toLowerCase().includes(String(expected).toLowerCase());
    }

    if (operator === 'be') {
      // tslint:disable-next-line:triple-equals
      return expected == actual;
    }

    throw new Error(`Unknown check ${operator}. Should be one of: contain, not contain, or be`);
  }

}

export { CheckCurrentPageInfo as Step };
