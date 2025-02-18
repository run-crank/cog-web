import { BaseStep, ExpectedRecord, Field, StepInterface } from '../core/base-step';
import { Step, RunStepResponse, FieldDefinition, StepDefinition, StepRecord, RecordDefinition } from '../proto/cog_pb';

export class DispatchEvent extends BaseStep implements StepInterface {

  protected stepName: string = 'Dispatch event on an element';
  protected stepExpression: string = 'dispatch (?<eventType>.+) event on element (?<domQuerySelector>.+) with options (?<eventOptions>.+)';
  protected stepType: StepDefinition.Type = StepDefinition.Type.ACTION;
  protected actionList: string[] = ['interact'];
  protected targetObject: string = 'Dispatch event';
  protected expectedFields: Field[] = [
    {
      field: 'domQuerySelector',
      type: FieldDefinition.Type.STRING,
      description: 'Element\'s DOM Query Selector',
    },
    {
      field: 'eventType',
      type: FieldDefinition.Type.STRING,
      description: 'Type of event to dispatch (e.g., keydown, click, input)',
    },
    {
      field: 'eventOptions',
      type: FieldDefinition.Type.STRING,
      optionality: FieldDefinition.Optionality.OPTIONAL,
      description: 'JSON string of event options (e.g., {"key": "ArrowDown"})',
    },
  ];

  protected expectedRecords: ExpectedRecord[] = [{
    id: 'form',
    type: RecordDefinition.Type.KEYVALUE,
    fields: [
      {
        field: 'selector',
        type: FieldDefinition.Type.STRING,
        description: 'Selector of the element',
      },
      {
        field: 'eventType',
        type: FieldDefinition.Type.STRING,
        description: 'Type of event dispatched',
      },
      {
        field: 'eventOptions',
        type: FieldDefinition.Type.STRING,
        description: 'Options used for the event',
      },
    ],
    dynamicFields: true,
  }];

  async executeStep(step: Step): Promise<RunStepResponse> {
    const stepData: any = step.getData().toJavaScript();
    const selector: string = stepData.domQuerySelector;
    const eventType: string = stepData.eventType;
    let eventOptions: any = {};

    try {
      // Parse the eventOptions JSON string
      eventOptions = JSON.parse(stepData.eventOptions);
    } catch (e) {
      return this.error(
        'Invalid event options JSON: %s',
        [e.toString()],
      );
    }

    try {
      await this.client.dispatchEvent(selector, eventType, eventOptions);
      const screenshot = await this.client.client.screenshot({ type: 'jpeg', encoding: 'binary', quality: 60 });
      const binaryRecord = this.binary('screenshot', 'Screenshot', 'image/jpeg', screenshot);
      const record = this.createRecord(selector, eventType, stepData.eventOptions);
      const orderedRecord = this.createOrderedRecord(selector, eventType, stepData.eventOptions, stepData['__stepOrder']);
      return this.pass(
        'Successfully dispatched %s event on element: %s',
        [eventType, selector],
        [binaryRecord, record, orderedRecord],
      );
    } catch (e) {
      const screenshot = await this.client.client.screenshot({ type: 'jpeg', encoding: 'binary', quality: 60 });
      const binaryRecord = this.binary('screenshot', 'Screenshot', 'image/jpeg', screenshot);
      return this.error(
        'There was a problem dispatching %s event on element %s: %s',
        [
          eventType,
          selector,
          e.toString(),
        ],
        [
          binaryRecord,
        ],
      );
    }
  }

  public createRecord(selector: string, eventType: string, eventOptions: string): StepRecord {
    const obj = {
      selector,
      eventType,
      eventOptions,
    };
    const record = this.keyValue('form', 'Event Dispatch', obj);

    return record;
  }

  public createOrderedRecord(selector: string, eventType: string, eventOptions: string, stepOrder = 1): StepRecord {
    const obj = {
      selector,
      eventType,
      eventOptions,
    };
    const record = this.keyValue(`form.${stepOrder}`, `Event Dispatch from Step ${stepOrder}`, obj);

    return record;
  }

}

export { DispatchEvent as Step }; 