import { BaseStep, Field, StepInterface } from '../base-step';
import { Step, RunStepResponse, FieldDefinition, StepDefinition } from '../proto/cog_pb';
import { Value } from 'google-protobuf/google/protobuf/struct_pb';

export class EnterValueIntoField extends BaseStep implements StepInterface {

  protected stepName: string = 'Enter value into field';
  // tslint:disable-next-line:max-line-length
  protected stepExpression: string = 'enter (?<value>.+) into field (?<domQuerySelector>.+)';
  protected stepType: StepDefinition.Type = StepDefinition.Type.ACTION;
  protected expectedFields: Field[] = [{
    field: 'value',
    type: FieldDefinition.Type.ANYSCALAR,
    description: 'Field value to enter',
  }, {
    field: 'domQuerySelector',
    type: FieldDefinition.Type.STRING,
    description: 'DOM query selector of the field',
  }];

  async executeStep(step: Step): Promise<RunStepResponse> {
    const stepData: any = step.getData().toJavaScript();
    const selector: string = stepData.domQuerySelector;
    const value: any = stepData.value;
    const response: RunStepResponse = new RunStepResponse();
    let fieldMethod: string;

    // Determine how to fill out the field, and then try.
    try {
      try {
        fieldMethod = await this.getFieldMethod(selector);
      } catch (e) {
        throw Error("Field can't be found on the page.");
      }

      // Based on type of field, fill out / click / select value.
      switch (fieldMethod) {
        case 'choose':
          try {
            await this.page.select(selector, value);
          } catch (e) {
            throw Error("Drop down may not be visible or isn't selectable.");
          }
          break;

        case 'tick':
          if (value) {
            try {
              await this.page.evaluate(
                (selector) => {
                  document.querySelector(selector).checked = true;
                  return true;
                },
                selector,
              );
            } catch (e) {
              throw Error("Checkbox may not be visible or isn't checkable.");
            }
          }
          break;

        case 'type':
          try {
            await this.page.type(selector, value);
          } catch (e) {
            throw Error("Field may not be visible or can't be typed in.");
          }
          break;
      }
    } catch (e) {
      response.setOutcome(RunStepResponse.Outcome.ERROR);
      response.setMessageFormat('There was a problem entering %s into field %s: %s');
      response.setMessageArgsList([
        Value.fromJavaScript(value),
        Value.fromJavaScript(selector),
        Value.fromJavaScript(e.toString()),
      ]);
      return response;
    }

    // Successfully filled out field on the page.
    response.setOutcome(RunStepResponse.Outcome.PASSED);
    response.setMessageFormat('Successfully entered %s into %s');
    response.setMessageArgsList([
      Value.fromJavaScript(value),
      Value.fromJavaScript(selector),
    ]);

    return response;
  }

  protected async getFieldMethod(selector: string): Promise<string> {
    return await this.page.evaluate(
      (selector) => {
        let method: string;
        const element = document.querySelector(selector);
        if (element.tagName === 'select') {
          method = 'choose';
        } else if (element.tagName === 'input' && element.type === 'checkbox') {
          method = 'tick';
        } else {
          method = 'type';
        }
        return method;
      },
      selector,
    );
  }

}

export { EnterValueIntoField as Step };
