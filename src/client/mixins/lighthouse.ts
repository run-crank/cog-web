import axios from 'axios';

export class LighthouseAware {
  /**
   * Runs a PageSpeed Insights audit and retrieves the Lighthouse scores.
   * @param url - The URL to run the audit on.
   * @param throttleTo - Set throttling mode to 'desktop' or 'mobile'.
   * @param categories - Categories to include in the audit report.
   * @returns The audit report as JSON.
   */
  async getLighthouseScores(
    url: string,
    throttleTo: 'desktop' | 'mobile' = 'desktop',
    categories: string[] = ['performance']
  ) {
    const apiKey = process.env.GOOGLE_PAGESPEED_API_KEY;

    let endpoint = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&strategy=${throttleTo}&key=${apiKey}`;

    // Add each category to the request URL
    categories.forEach((category) => {
      endpoint += `&category=${category}`;
    });

    try {
      const response = await axios.get(endpoint);
      
      // Check if there were any runtime errors in the response
      if (response.data.lighthouseResult.runtimeError) {
        console.error('Lighthouse runtime error:', response.data.lighthouseResult.runtimeError.message);
        throw new Error(`PageSpeed Insights test failed: ${response.data.lighthouseResult.runtimeError.message}`);
      }

      return response.data.lighthouseResult;
    } catch (error) {
      console.error('Failed to fetch audit scores:', error.message);
      throw new Error(`Failed to fetch audit scores: ${error.message}`);
    }
  }
}
