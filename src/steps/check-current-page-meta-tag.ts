import { BaseStep, Field, StepInterface } from '../core/base-step';
import { Step, RunStepResponse, FieldDefinition, StepDefinition } from '../proto/cog_pb';

export class CheckCurrentPageMetaTag extends BaseStep implements StepInterface {

  protected stepName: string = 'Check current page meta tag';
  // tslint:disable-next-line:max-line-length
  protected stepExpression: string = 'the (?<metaName>.+) meta tag on the current page should (?<operator>be|contain|not contain|not be longer than|exist) ?(?<expectation>.+)?';
  protected stepType: StepDefinition.Type = StepDefinition.Type.VALIDATION;
  protected expectedFields: Field[] = [{
    field: 'metaName',
    type: FieldDefinition.Type.STRING,
    description: 'Meta Tag name',
  }, {
    field: 'operator',
    type: FieldDefinition.Type.STRING,
    description: 'Check Logic (be, contain, not contain, not be longer than, exist)',
  }, {
    field: 'expectation',
    type: FieldDefinition.Type.ANYSCALAR,
    description: 'Expected Value',
    optionality: FieldDefinition.Optionality.OPTIONAL,
  }];

  async executeStep(step: Step): Promise<RunStepResponse> {
    const stepData: any = step.getData().toJavaScript();
    const tag: string = stepData.metaName;
    const operator: string = stepData.operator;
    const expectation: any = stepData.expectation || null;

    // Retrieve meta tag content.
    try {
      const actual = await this.client.getMetaTagContent(tag);
      if (this.runComparison(operator, expectation, actual)) {
        return this.pass('Meta tag check passed: %s should %s %s', [tag, operator, expectation]);
      }

      // Friendlier error messaging for the "exist" operator.
      if (operator === 'exist') {
        return this.fail('Meta tag check failed: %s should %s, but it was not found on the page', [
          tag,
          operator,
        ]);
      }

      return this.fail('Meta tag check failed: %s should %s %s. It was actually %s', [
        tag,
        operator,
        expectation,
        actual,
      ]);
    } catch (e) {
      return this.error('There was a problem checking the %s meta tag: %s', [tag, e.toString()]);
    }
  }

/**
 * Compare the expected and actual values using the appropriate operator.
 */
  protected runComparison(operator, expected, actual): boolean {
    if (operator === 'exist') {
      return actual !== null;
    }

    // If we're here, we should throw an error if no meta content was found.
    // If we reason about a null value, the checks below are invalid.
    if (actual === null) {
      throw new Error("Can't evaluate meta tag that doesn't exist.");
    }

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

    if (operator === 'not be longer than') {
      return String(actual).length <= parseInt(expected, 10);
    }

    throw new Error(`Unknown check ${operator}. Should be one of: "${[
      'contain', 'not contain', 'be', 'exist', 'not be longer than',
    ].join('" "')}"`);
  }

}

export { CheckCurrentPageMetaTag as Step };
