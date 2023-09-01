import * as Marketo from 'node-marketo-rest';
export class MarketoAware {
  marketoClient: Marketo;
  leadDescription: any;
  delayInSeconds: number;

  public async findLeadByField(field: string, value: string, justInCaseField: string = null, partitionId: number = null) {
    this.delayInSeconds > 0 ? await this.delay(this.delayInSeconds) : null;
    const fields = await this.describeLeadFields();
    const fieldList: string[] = fields.result.filter((field) => field.rest).map((field: any) => field.rest.name);
    let response: any = {};

    const mustHaveFields = [
      justInCaseField,
      'email',
      'updatedAt',
      'createdAt',
      'lastName',
      'firstName',
      'id',
      'leadPartitionId',
    ].filter((f) => !!f);

    if (fieldList.join(',').length > 7168 && fieldList.length >= 1000) {
      // If the length of the get request would be over 7KB, then the request
      // would fail. And if the amount of fields is over 1000, it is likely
      // not worth it to cache with the if statement below.
      // Instead, we will only request the needed fields.
      response = await this.marketoClient.lead.find(field, [value], { fields: mustHaveFields });
    } else if (fieldList.join(',').length > 7168) {
      // If the length of the get request would be over 7KB, then the request
      // would fail. Instead, we will split the request every 200 fields, and
      // combine the results.
      response = await this.marketoRequestHelperFuntion(fieldList, field, value);
    } else {
      response = await this.marketoClient.lead.find(field, [value], { fields: fieldList });
    }

    // If a partition ID was provided, filter the returned leads accordingly.
    if (partitionId && response && response.result && response.result.length) {
      response.result = response.result.filter((lead: Record<string, any>) => {
        return lead.leadPartitionId && lead.leadPartitionId === partitionId;
      });
    }

    return response;
  }

  public async associateLeadById(leadId: string, cookie: string) {
    this.delayInSeconds > 0 ? await this.delay(this.delayInSeconds) : null;
    return await this.marketoClient.lead.associateLead(leadId, cookie);
  }

  private async marketoRequestHelperFuntion(fieldList, field, value) {
    const response: any = {};
    let allFields: { [key: string]: string; } = {};

    for (let i = 0; i < fieldList.length && i <= 800; i += 200) {
      const currFields = fieldList.slice(i, i + 200);
      const currResponse = await this.marketoClient.lead.find(field, [value], { fields: currFields });
      allFields = { ...allFields, ...currResponse.result[0] };
      if (!i) {
        response.requestId = currResponse.requestId;
        response.success = currResponse.success;
      }
    }
    response.result = [allFields];

    return response;
  }

  public async describeLeadFields() {
    this.delayInSeconds > 0 ? await this.delay(this.delayInSeconds) : null;
    // This safely reduces the number of API calls that might have to be made
    // in lead field check steps, but is an imcomplete solution.
    // @todo Incorporate true caching based on https://github.com/run-crank/cli/pull/40
    if (!this.leadDescription) {
      this.leadDescription = await this.marketoClient.lead.describe();
    }

    return this.leadDescription;
  }

  public async delay(seconds: number) {
    return new Promise((resolve) => { setTimeout(resolve, seconds * 1000); });
  }
}
