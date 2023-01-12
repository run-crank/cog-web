import { baseOperators } from '../client/constants/operators';
import { BaseStep, Field, StepInterface } from '../core/base-step';
import { Step, RunStepResponse, FieldDefinition, StepDefinition } from '../proto/cog_pb';
import * as util from '@run-crank/utilities';

export class CompareValues extends BaseStep implements StepInterface {

  protected stepName: string = 'Compare two values';
  // tslint:disable-next-line:max-line-length
  protected stepExpression: string = 'the value (?<value>.+) should (?<operator>be less than|be greater than|be one of|be|contain|not be one of|not be|not contain|match|not match) (?<expectation>.+)';
  protected stepType: StepDefinition.Type = StepDefinition.Type.VALIDATION;
  protected actionList: string[] = ['check'];
  protected targetObject: string = 'Compare two values';
  protected expectedFields: Field[] = [{
    field: 'value',
    type: FieldDefinition.Type.STRING,
    description: 'Value',
  }, {
    field: 'operator',
    type: FieldDefinition.Type.STRING,
    description: 'Check Logic (be, not be, contain, not contain, be greater than, be less than, be one of, or not be one of)',
  }, {
    field: 'expectation',
    type: FieldDefinition.Type.STRING,
    description: 'Expected Value',
  }];

  async executeStep(step: Step) {
    const stepData: any = step.getData() ? step.getData().toJavaScript() : {};
    const value = stepData.value;
    const expectation = stepData.expectation;
    const operator = stepData.operator;

    try {
      const result = this.assert(operator, value, expectation, '');

      return result.valid ? this.pass(result.message, [])
        : this.fail(result.message, []);
    } catch (e) {
      if (e instanceof util.UnknownOperatorError) {
        return this.error('%s Please provide one of: %s', [e.message, baseOperators.join(', ')]);
      }
      if (e instanceof util.InvalidOperandError) {
        return this.error(e.message);
      }
      return this.error('There was an error while comparing values: %s', [e.message]);
    }
  }
}

export { CompareValues as Step };
