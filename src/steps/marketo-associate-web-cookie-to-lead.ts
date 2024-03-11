/*tslint:disable:no-else-after-return*/

import { BaseStep, Field, StepInterface, ExpectedRecord } from '../core/base-step';
import { Step, FieldDefinition, StepDefinition, RecordDefinition, StepRecord } from '../proto/cog_pb';

export class MarketoAssociateWebCookieStep extends BaseStep implements StepInterface {

  protected stepName: string = 'Marketo associate web cookie to lead';
  protected stepExpression: string = 'associate munchkin cookie to marketo lead (?<email>.+\@.+\..+)';
  protected stepType: StepDefinition.Type = StepDefinition.Type.ACTION;
  protected actionList: string[] = ['interact'];
  protected targetObject: string = 'Associate web cookie to Marketo lead';
  protected expectedFields: Field[] = [
    {
      field: 'email',
      type: FieldDefinition.Type.STRING,
      description: 'Lead\'s email address or id',
    },
    {
      field: 'partitionId',
      type: FieldDefinition.Type.NUMERIC,
      optionality: FieldDefinition.Optionality.OPTIONAL,
      description: 'ID of partition lead belongs to',
    },
  ];
  protected expectedRecords: ExpectedRecord[] = [{
    id: 'cookie',
    type: RecordDefinition.Type.KEYVALUE,
    fields: [{
      field: 'value',
      type: FieldDefinition.Type.STRING,
      description: 'Selector of the element',
    }, {
      field: 'name',
      type: FieldDefinition.Type.STRING,
      description: 'Selector of the element',
    }],
    dynamicFields: true,
  }];

  async executeStep(step: Step) {
    if (!this.client.marketoConnected) {
      return this.error('Marketo connection is not available');
    }
    const stepData: any = step.getData().toJavaScript();
    const reference = stepData.email;
    const partitionId: number = stepData.partitionId ? parseFloat(stepData.partitionId) : null;

    try {
      const emailRegex = /(.+)@(.+){2,}\.(.+){2,}/;
      let lookupField = 'id';
      if (emailRegex.test(reference)) {
        lookupField = 'email';
      }

      const munchkinCookie: any = await this.client.getCookie('_mkto_trk');
      if (!munchkinCookie || !munchkinCookie.length) {
        return this.error('Unable to find _mkto_trk cookie on current webpage');
      }

      const data: any = await this.client.findLeadByField(lookupField, reference, 'id', partitionId);

      if (data.success && data.result && data.result[0] && data.result[0].hasOwnProperty('id')) {
        const associate: any = await this.client.associateLeadById(data.result[0].id, munchkinCookie[0].value);

        if (associate.success && associate.requestId) {
          const record = this.createRecord(munchkinCookie[0]);
          const orderedRecord = this.createOrderedRecord(munchkinCookie[0], stepData['__stepOrder']);
          return this.pass('Successfully associated munchkin cookie %s with Marketo lead %s', [munchkinCookie[0].value, reference], [record, orderedRecord]);
        } else {
          return this.error('Unable to assocated munchkin cookie %s with Marketo lead %s', [munchkinCookie[0].value, reference]);
        }
      } else {
        return this.error('Couldn\'t find a lead associated with %s%s', [
          reference,
          partitionId ? ` in partition ${partitionId}` : '',
        ]);
      }
    } catch (e) {
      return this.error('There was an error associating the munchkin cookie with the Marketo lead: %s', [
        e.toString(),
      ]);
    }
  }

  public createRecord(cookieObj): StepRecord {
    return this.keyValue('cookie', 'Cookie retrieved', cookieObj);
  }

  public createOrderedRecord(cookieObj, stepOrder = 1): StepRecord {
    return this.keyValue(`cookie.${stepOrder}`, `Cookie retrieved from Step ${stepOrder}`, cookieObj);
  }
}

export { MarketoAssociateWebCookieStep as Step };
