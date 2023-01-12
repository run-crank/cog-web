import { isNullOrUndefined } from 'util';
import { ClientWrapper } from '../client/client-wrapper';
import { StepDefinition, FieldDefinition, RecordDefinition, Step as PbStep, RunStepResponse, StepRecord, TableRecord, BinaryRecord } from '../proto/cog_pb';
import { Struct, Value } from 'google-protobuf/google/protobuf/struct_pb';
import * as util from '@run-crank/utilities';

export interface StepInterface {
  getId(): string;
  getDefinition(): StepDefinition;
  executeStep(step: PbStep): Promise<RunStepResponse>;
}

export interface Field {
  field: string;
  type: FieldDefinition.Type;
  description: string;
  help?: string;
  optionality?: number;
  bulksupport?: boolean;
}

export interface ExpectedRecord {
  id: string;
  type: RecordDefinition.Type;
  fields?: Field[];
  dynamicFields?: boolean;
}

export abstract class BaseStep {

  protected stepName: string;
  protected stepExpression: string;
  protected stepType: StepDefinition.Type;
  protected expectedFields: Field[];
  protected expectedRecords?: ExpectedRecord[];
  protected stepHelp?: string;
  protected actionList?: string[];
  protected targetObject?: string;

  constructor(protected client: ClientWrapper) {}

  getId(): string {
    return this.constructor.name;
  }

  getDefinition(): StepDefinition {
    const stepDefinition: StepDefinition = new StepDefinition();
    stepDefinition.setStepId(this.getId());
    stepDefinition.setName(this.stepName);
    stepDefinition.setType(this.stepType);
    stepDefinition.setExpression(this.stepExpression);

    if (this.stepHelp) {
      stepDefinition.setHelp(this.stepHelp);
    }

    if (this.actionList) {
      stepDefinition.setActionList(this.actionList);
    }

    if (this.targetObject) {
      stepDefinition.setTargetObject(this.targetObject);
    }

    this.expectedFields.forEach((field: Field) => {
      const expectedField = new FieldDefinition();
      expectedField.setType(field.type);
      expectedField.setKey(field.field);
      expectedField.setDescription(field.description);

      if (field.hasOwnProperty('optionality')) {
        expectedField.setOptionality(field.optionality);
      } else {
        expectedField.setOptionality(FieldDefinition.Optionality.REQUIRED);
      }

      if (field.hasOwnProperty('bulksupport')) {
        expectedField.setBulksupport(field.bulksupport);
      } else {
        expectedField.setBulksupport(false);
      }

      stepDefinition.addExpectedFields(expectedField);
    });

    (this.expectedRecords || []).forEach((record: ExpectedRecord) => {
      const expectedRecord = new RecordDefinition();
      expectedRecord.setId(record.id);
      expectedRecord.setType(record.type);
      expectedRecord.setMayHaveMoreFields(record.dynamicFields || false);
      (record.fields || []).forEach((field: Field) => {
        const guaranteedField = new FieldDefinition();
        guaranteedField.setType(field.type);
        guaranteedField.setKey(field.field);
        guaranteedField.setDescription(field.description);
        expectedRecord.addGuaranteedFields(guaranteedField);
      });
      stepDefinition.addExpectedRecords(expectedRecord);
    });

    return stepDefinition;
  }

  assert(operator: string, actualValue: string, expectedValue: string, field: string): util.AssertionResult {
    return util.assert(operator, actualValue, expectedValue, field);
  }

  protected pass(message: string, messageArgs: any[] = [], records: StepRecord[] = []): RunStepResponse {
    const response = this.outcomelessResponse(message, messageArgs);
    response.setOutcome(RunStepResponse.Outcome.PASSED);
    records.forEach((record) => {
      response.addRecords(record);
    });
    return response;
  }

  protected fail(message: string, messageArgs: any[] = [], records: StepRecord[] = []): RunStepResponse {
    const response = this.outcomelessResponse(message, messageArgs);
    response.setOutcome(RunStepResponse.Outcome.FAILED);
    records.forEach((record) => {
      response.addRecords(record);
    });
    return response;
  }

  protected error(message: string, messageArgs: any[] = [], records: StepRecord[] = []): RunStepResponse {
    const response = this.outcomelessResponse(message, messageArgs);
    response.setOutcome(RunStepResponse.Outcome.ERROR);
    records.forEach((record) => {
      response.addRecords(record);
    });
    return response;
  }

  protected keyValue(id: string, name: string, data: Record<string, any>): StepRecord {
    const record: StepRecord = this.typelessRecord(id, name);
    record.setKeyValue(Struct.fromJavaScript(data));
    return record;
  }

  protected table(id: string, name: string, headers: Record<string, string>, rows: Record<string, any>[]): StepRecord {
    const record: StepRecord = this.typelessRecord(id, name);
    const table: TableRecord = new TableRecord();
    table.setHeaders(Struct.fromJavaScript(headers));
    rows.forEach((row) => {
      table.addRows(Struct.fromJavaScript(row));
    });
    record.setTable(table);
    return record;
  }

  protected binary(id: string, name: string, mimeType: string, data: string | Uint8Array): StepRecord {
    const record: StepRecord = this.typelessRecord(id, name);
    const binary: BinaryRecord = new BinaryRecord();
    binary.setMimeType(mimeType);
    binary.setData(data);
    record.setBinary(binary);
    return record;
  }

  protected getUrlParams(url) {
    const params = {};
    if (!isNullOrUndefined(url)) {
      const requestUrl = new URL(url);
      requestUrl.searchParams.forEach((value, key) => {
        params[key] = value;
      });
    }
    return params;
  }

  private outcomelessResponse(message: string, messageArgs: any[] = []): RunStepResponse {
    const response: RunStepResponse = new RunStepResponse();
    response.setMessageFormat(message);
    messageArgs.forEach((arg) => {
      response.addMessageArgs(Value.fromJavaScript(arg));
    });
    return response;
  }

  private typelessRecord(id: string, name: string): StepRecord {
    const record: StepRecord = new StepRecord();
    record.setId(id);
    record.setName(name);
    return record;
  }

}
