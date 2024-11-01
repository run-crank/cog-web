import { BaseStep, Field, StepInterface, ExpectedRecord } from '../core/base-step';
import { Step, RunStepResponse, FieldDefinition, StepDefinition, RecordDefinition } from '../proto/cog_pb';

export class CheckLighthousePerformance extends BaseStep implements StepInterface {

  protected stepName: string = 'Check a page\'s Lighthouse performance score';
  // tslint:disable-next-line:max-line-length
  protected stepExpression: string = 'the (?<throttleTo>mobile|desktop) lighthouse (?<category>performance|accessibility|best-practices|seo) score should be (?<expectedScore>\\d{1,3}) or higher';
  protected stepType: StepDefinition.Type = StepDefinition.Type.VALIDATION;
  protected actionList: string[] = ['check'];
  protected targetObject: string = 'Lighthouse Performance Score';
  protected expectedFields: Field[] = [{
    field: 'throttleTo',
    type: FieldDefinition.Type.STRING,
    description: 'Throttle Level (mobile or desktop)',
  }, {
    field: 'category',
    type: FieldDefinition.Type.STRING,
    description: 'Category (performance, accessibility, best-practices, or seo)',
  }, {
    field: 'expectedScore',
    type: FieldDefinition.Type.NUMERIC,
    description: 'Expected Score',
  }];

  protected expectedRecords: ExpectedRecord[] = [{
    id: 'labData',
    type: RecordDefinition.Type.KEYVALUE,
    fields: [{
      field: 'actualScore',
      type: FieldDefinition.Type.NUMERIC,
      description: 'Performance Score',
    }, {
      field: 'firstContentfulPaint',
      type: FieldDefinition.Type.NUMERIC,
      description: 'First Contentful Paint',
    }, {
      field: 'firstMeaningfulPaint',
      type: FieldDefinition.Type.NUMERIC,
      description: 'First Meaningful Paint',
    }, {
      field: 'speedIndex',
      type: FieldDefinition.Type.NUMERIC,
      description: 'Speed Index',
    }, {
      field: 'firstCpuIdle',
      type: FieldDefinition.Type.NUMERIC,
      description: 'First CPU Idle',
    }, {
      field: 'timeToInteractive',
      type: FieldDefinition.Type.NUMERIC,
      description: 'Time to Interactive',
    }, {
      field: 'maxPotentialFirstInputDelay',
      type: FieldDefinition.Type.NUMERIC,
      description: 'Max Potential First Input Delay',
    }],
    dynamicFields: false,
  }];

  async executeStep(step: Step): Promise<RunStepResponse> {
    const stepData: any = step.getData().toJavaScript();
    const throttleTo: 'mobile' | 'desktop' = stepData.throttleTo;
    const category: 'performance' |'accessibility'|'best-practices'|'seo' = stepData.category || 'performance';
    const expectedScore: number = stepData.expectedScore;

    try {
      const currentUrl = await this.client.getCurrentPageInfo('url');
      const lhr = await this.client.getLighthouseScores(currentUrl.toString(), throttleTo, [category]);
      const categoryResults: any = Object.values(lhr.categories)[0];
      const actualScore = Math.round(categoryResults.score * 100);
      if (actualScore < expectedScore) {
        const audits = Object.values(lhr.audits);
        const recordTable = this.createFailRecord(audits, category);
        const recordKeyValue = this.createSuccessRecord(lhr, category);

        return this.fail(
          'The page\'s %s score of %d was lower than the expected score of %d in %s.\n',
          [
            category,
            actualScore,
            expectedScore,
            throttleTo,
          ],
          [
            recordTable,
            recordKeyValue,
          ]);
      }
      const record = this.createSuccessRecord(lhr, category);
      return this.pass(
        'The page\'s %s score of %d was greater than or equal to %d, as expected in %s',
        [
          category,
          actualScore,
          expectedScore,
          throttleTo,
        ],
        [
          record,
        ]);
    } catch (e) {
      console.error('Error during Lighthouse check:', e);
      return this.error('There was an error checking Lighthouse %s: %s', 
      [
        category,
        e.message || e.toString(),
      ]);
    }
  }

  private createSuccessRecord(record, category) {
    const obj = {};
    const audits = record.audits;
  
    obj['actualScore'] = record.categories[category].score * 100;
  
    // Performance-specific metrics
    if (category === 'performance') {
      obj['firstContentfulPaint'] = audits['first-contentful-paint']?.numericValue || 'unknown';
      obj['firstMeaningfulPaint'] = audits['first-meaningful-paint']?.numericValue || 'unknown';
      obj['speedIndex'] = audits['speed-index']?.numericValue || 'unknown';
      obj['firstCpuIdle'] = audits['first-cpu-idle']?.numericValue || 'unknown';
      obj['timeToInteractive'] = audits['interactive']?.numericValue || 'unknown';
      obj['maxPotentialFirstInputDelay'] = audits['max-potential-fid']?.numericValue || 'unknown';
    }
  
    // Accessibility-specific metrics
    if (category === 'accessibility') {
      obj['accessibilityScore'] = record.categories['accessibility'].score * 100;
      obj['colorContrast'] = audits['color-contrast']?.score || 'unknown';
      obj['ariaLabels'] = audits['aria-allowed-attr']?.score || 'unknown';
    }
  
    // SEO-specific metrics
    if (category === 'seo') {
      obj['crawlable'] = audits['is-crawlable']?.score || 'unknown';
      obj['metaDescription'] = audits['meta-description']?.score || 'unknown';
    }
  
    // Best-practices-specific metrics
    if (category === 'best-practices') {
      obj['usesHttps'] = audits['uses-https']?.score || 'unknown';
      obj['modernImageFormats'] = audits['modern-image-formats']?.score || 'unknown';
      obj['avoidDeprecatedApis'] = audits['deprecations']?.score || 'unknown';
      obj['noMixedContent'] = audits['no-mixed-content']?.score || 'unknown';
    }
  
    return this.keyValue('labData', `${category.charAt(0).toUpperCase() + category.slice(1)} Lab Data`, obj);
  }
 
  private createFailRecord(audits, category) {
    let headers = {};
    let rows = [];
  
    if (category === 'performance') {
      headers = {
        title: 'Title',
        overallSavingsMs: 'Estimated Savings (ms)',
        description: 'Details',
      };
  
      rows = audits
        .filter((audit) => audit.details?.type === 'opportunity' && audit.details.overallSavingsMs > 0)
        .sort((a, b) => b.details.overallSavingsMs - a.details.overallSavingsMs)
        .map((audit) => ({
          title: audit.title,
          overallSavingsMs: audit.details.overallSavingsMs.toFixed(2),
          description: audit.description,
        }));
    } else if (category === 'accessibility') {
      headers = {
        title: 'Title',
        description: 'Details',
      };
  
      rows = audits
        .filter((audit) => audit.score !== 1)  // Only include audits that didn't pass perfectly
        .map((audit) => ({
          title: audit.title,
          description: audit.description ? audit.description.replace(/[`]|[^\x20-\x7E]/g, '') : 'No details available',
        }));
    } else {
      headers = {
        score: 'Score',
        title: 'Title',
        description: 'Details',
      };

      rows = audits
        .filter((audit) => audit.score !== 1)  // Only include audits that didn't pass perfectly
        .map((audit) => ({
          score: audit.score !== null ? audit.score : 'N/A',
          title: audit.title,
          description: audit.description ? audit.description.replace(/[`]|[^\x20-\x7E]/g, '') : 'No details available',
        }));
    }
  
    return this.table('performanceOpportunities', `${category.charAt(0).toUpperCase() + category.slice(1)} Opportunities`, headers, rows);
  }
}

export { CheckLighthousePerformance as Step };
