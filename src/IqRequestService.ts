/*
 * Copyright 2021-Present Sonatype Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { URL } from 'url';
import { IqServerPolicyReportResult } from './IqServerPolicyReportResult';
import { ComponentDetails } from './ComponentDetails';
import { IqApplicationResponse } from './IqApplicationResponse';
import { RequestService, RequestServiceOptions } from './RequestService';
import { PackageURL } from 'packageurl-js';
import { UserAgentHelper } from './UserAgentHelper';
import { DEBUG, ERROR } from './ILogger';
import fetch from 'cross-fetch';
import cookies from 'browser-cookies';

const APPLICATION_INTERNAL_ID_ENDPOINT = '/api/v2/applications?publicId=';

export class IqRequestService implements RequestService {
  private internalId = '';
  private isInitialized = false;
  private timeoutAttempts = 0;

  constructor(readonly options: RequestServiceOptions) {
    if (!this.options.application || !this.options.user || !this.options.host || !this.options.user) {
      throw Error('Missing application, host, user, or token');
    }

    if (!this.options.timeout) {
      this.options.timeout = 60;
    }

    if (!this.options.insecure) {
      this.options.insecure = false;
    }

    if (!this.options.stage) {
      this.options.stage = 'develop';
    }
  }

  private async getHeaders(contentType?: string): Promise<string[][]> {
    const userAgent = await UserAgentHelper.getUserAgent(
      this.options.browser,
      this.options.product,
      this.options.version,
    );

    let headers = [
      ['User-Agent', userAgent],
      ['Authoriziation', this.getBasicAuth()],
    ];

    if (contentType) {
      headers = [...headers, ['Content-Type', contentType]];
    }
    if (this.options.browser) {
      const xcsrfToken = cookies.get('CLM-CSRF-TOKEN');
      if (xcsrfToken) {
        headers = [...headers, ['X-CSRF-TOKEN', xcsrfToken]];
      }
    }

    return headers;
  }

  private async init(): Promise<void> {
    try {
      this.internalId = await this.getApplicationInternalId();
      this.isInitialized = true;
    } catch (e) {
      throw new Error(e);
    }
  }

  private async getApplicationInternalId(): Promise<string> {
    try {
      const headers = await this.getHeaders();
      const res = await fetch(`${this.options.host}${APPLICATION_INTERNAL_ID_ENDPOINT}${this.options.application}`, {
        headers: headers,
      });

      if (res.status == 200) {
        const data: IqApplicationResponse = await res.json();
        return data.applications[0].id;
      } else {
        throw new Error(
          `No valid ID on response from Nexus IQ, potentially check the public application ID you are using`,
        );
      }
    } catch (err) {
      throw new Error(err);
    }
  }

  public async getComponentDetails(purl: PackageURL[]): Promise<ComponentDetails> {
    const data = {
      components: [
        {
          packageUrl: purl[0].toString().replace('%2B', '+'),
        },
      ],
    };

    try {
      if (this.options.browser) {
        const loggedIn = await this.loginViaRest();

        if (loggedIn) {
          this.options.logger.logMessage('Successfully logged in', DEBUG);
        } else {
          throw new Error('Unable to login to Nexus IQ');
        }
      }

      const headers = await this.getHeaders('application/json');

      const res = await fetch(`${this.options.host}/api/v2/components/details`, {
        method: 'POST',
        body: JSON.stringify(data),
        headers: headers,
      });

      if (res.status == 200) {
        const compDetails: ComponentDetails = await res.json();

        return compDetails;
      }
    } catch (err) {
      throw new Error('Unable to get component details');
    }
  }

  private async loginViaRest(): Promise<boolean> {
    try {
      const headers = [
        ['xsrfCookieName', 'CLM-CSRF-TOKEN'],
        ['xsrfHeaderName', 'X-CSRF-TOKEN'],
      ];

      const res = await fetch(`${this.options.host}/rest/user/session`, {
        method: 'GET',
        headers: [...headers, ['Authorization', this.getBasicAuth()]],
      });

      const resData = await res.text();

      this.options.logger.logMessage('Response from login call', DEBUG, {
        response: resData,
        status: res.status,
        statusText: res.statusText,
      });

      return true;
    } catch (err) {
      this.options.logger.logMessage('Unable to login', ERROR, { error: err });
      return false;
    }
  }

  public async getPolicyReportResults(reportUrl: string): Promise<IqServerPolicyReportResult> {
    this.options.logger.logMessage('Attempting to get policy report results', DEBUG, { reportUrl: reportUrl });

    if (reportUrl.endsWith('raw')) {
      reportUrl = reportUrl.substr(0, reportUrl.length - 3) + 'policy';
    }

    try {
      const headers = await this.getHeaders();
      const res = await fetch(`${this.options.host}/${reportUrl}`, {
        method: 'GET',
        headers: headers,
      });

      if (res.status == 200) {
        const policyResults: IqServerPolicyReportResult = await res.json();

        return policyResults;
      } else {
        const text = await res.text();
        this.options.logger.logMessage('Response from report API', ERROR, { response: text });
        throw new Error(`No valid response from Nexus IQ, look at logs for more info`);
      }
    } catch (err) {
      this.options.logger.logMessage('Unable to get results from Report API', ERROR, { error: err });
      throw new Error(`Unable to get results from Report API`);
    }
  }

  public async submitToThirdPartyAPI(data: any): Promise<string> {
    if (!this.isInitialized) {
      await this.init();
    }

    this.options.logger.logMessage('Internal ID', DEBUG, { internalId: this.internalId });

    try {
      const headers = await this.getHeaders('application/xml');
      const res = await fetch(
        `${this.options.host}/api/v2/scan/applications/${this.internalId}/sources/auditjs?stageId=${this.options.stage}`,
        { method: 'POST', body: data, headers: headers },
      );

      if (res.status == 202) {
        const data = await res.json();

        return data.statusUrl as string;
      } else {
        const text = await res.text();
        this.options.logger.logMessage('Response from third party API', ERROR, { response: text });
        throw new Error(`Unable to submit to Third Party API`);
      }
    } catch (err) {
      this.options.logger.logMessage('Unable to get results from Report API', ERROR, { error: err });
      throw new Error(`Unable to submit to Third Party API`);
    }
  }

  public async asyncPollForResults(
    url: string,
    errorHandler: (error: any) => any,
    pollingFinished: (body: any) => any,
  ): Promise<void> {
    this.options.logger.logMessage(`Polling ${url}`, DEBUG);
    let mergeUrl: URL;
    try {
      mergeUrl = this.getURLOrMerge(url);

      const headers = await this.getHeaders();

      const res = await fetch(mergeUrl.href, { method: 'GET', headers: headers });

      const body = res.status == 200;

      if (!body) {
        this.timeoutAttempts += 1;
        if (this.timeoutAttempts > this.options.timeout) {
          errorHandler({
            message:
              'Polling attempts exceeded, please either provide a higher limit via the command line using the timeout flag, or re-examine your project and logs to see if another error happened',
          });
        }
        setTimeout(() => this.asyncPollForResults(url, errorHandler, pollingFinished), 1000);
      } else {
        const data = await res.json();
        pollingFinished(data);
      }
    } catch (e) {
      errorHandler({ title: e.message });
    }
  }

  private getURLOrMerge(url: string): URL {
    try {
      return new URL(url);
    } catch (e) {
      this.options.logger.logMessage(e.title, DEBUG, { message: e.message });

      if (this.options.host.endsWith('/')) {
        return new URL(this.options.host.concat(url));
      }
      return new URL(this.options.host.concat('/' + url));
    }
  }

  private getBasicAuth(): string {
    if (this.options.browser) {
      return `Basic ${btoa(this.options.user + `:` + this.options.token)}`;
    }
    return `Basic ${Buffer.from(this.options.user + `:` + this.options.token).toString()}`;
  }
}
