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
import { RequestHelpers } from './RequestHelpers';
import { URL } from 'url';
import { IqServerPolicyReportResult } from './IqServerPolicyReportResult';
import { ComponentDetails } from './ComponentDetails';
import { IqApplicationResponse } from './IqApplicationResponse';
import { IqThirdPartyAPIStatusResponse } from './IqThirdPartyAPIStatusResponse';
import { IqThirdPartyAPIServerPollingResult } from './IqThirdPartyAPIServerPollingResult';
import axios, { AxiosResponse } from 'axios';
import { RequestService, RequestServiceOptions } from './RequestService';
import { PackageURL } from 'packageurl-js';
import { UserAgentHelper } from './UserAgentHelper';
import { DEBUG, ERROR } from './ILogger';

const APPLICATION_INTERNAL_ID_ENDPOINT = '/api/v2/applications?publicId=';

export class IqRequestService implements RequestService {
  private internalId = '';
  private isInitialized = false;
  private timeoutAttempts = 0;
  private userAgent: Record<string, unknown>;

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

    axios.interceptors.request.use((request: any) => {
      if (options.user && options.token) {
        request.auth = {
          username: options.user,
          password: options.token,
        };
      }

      if (options.browser) {
        request.mode = 'cors';
      } else {
        const agent = RequestHelpers.getAgent(options.insecure);

        if (agent) {
          request.httpsAgent = agent;
        }
      }

      request.baseURL = options.host;

      return request;
    });
  }

  private async init(): Promise<void> {
    try {
      this.internalId = await this.getApplicationInternalId();
      this.isInitialized = true;
      this.userAgent = await UserAgentHelper.getUserAgent(
        this.options.browser,
        this.options.product,
        this.options.version,
      );
    } catch (e) {
      throw new Error(e);
    }
  }

  private async getApplicationInternalId(): Promise<string> {
    const response: AxiosResponse<IqApplicationResponse> = await axios.get(
      `${this.options.host}${APPLICATION_INTERNAL_ID_ENDPOINT}${this.options.application}`,
    );
    if (response.status == 200) {
      try {
        return response.data.applications[0].id;
      } catch (e) {
        throw new Error(
          `No valid ID on response from Nexus IQ, potentially check the public application ID you are using`,
        );
      }
    } else {
      throw new Error(
        'Unable to connect to IQ Server with http status ' +
          response.status +
          '. Check your credentials and network connectivity by hitting Nexus IQ at ' +
          this.options.host +
          ' in your browser.',
      );
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

    const response: AxiosResponse<ComponentDetails> = await axios.post(
      `${this.options.host}/api/v2/components/details`,
      data,
    );

    if (response.status == 200) {
      return response.data;
    } else {
      throw new Error('Unable to get component details');
    }
  }

  public async getPolicyReportResults(reportUrl: string): Promise<IqServerPolicyReportResult> {
    this.options.logger.logMessage('Attempting to get policy report results', DEBUG, { reportUrl: reportUrl });
    if (reportUrl.endsWith('raw')) {
      reportUrl = reportUrl.substr(0, reportUrl.length - 3) + 'policy';
    }

    const response: AxiosResponse<IqServerPolicyReportResult> = await axios.get(`${this.options.host}/${reportUrl}`, {
      headers: { ...this.userAgent },
    });

    if (response.status == 200) {
      return response.data;
    } else {
      this.options.logger.logMessage('Response from report API', ERROR, { response: response.data });
      throw new Error(`Unable to get results from Report API`);
    }
  }

  public async submitToThirdPartyAPI(data: any): Promise<string> {
    if (!this.isInitialized) {
      await this.init();
    }

    this.options.logger.logMessage('Internal ID', DEBUG, { internalId: this.internalId });

    const response: AxiosResponse<IqThirdPartyAPIStatusResponse> = await axios.post(
      `${this.options.host}/api/v2/scan/applications/${this.internalId}/sources/auditjs?stageId=${this.options.stage}`,
      data,
      {
        headers: { 'Content-Type': 'application/xml', ...this.userAgent },
      },
    );
    if (response.status == 202) {
      return response.data.statusUrl as string;
    } else {
      this.options.logger.logMessage('Response from third party API', ERROR, { response: response.data });
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

      const response: AxiosResponse<IqThirdPartyAPIServerPollingResult> = await axios.get(mergeUrl.href);

      const body = response.status == 200;
      // TODO: right now I think we cover 500s and 400s the same and we'd continue polling as a result. We should likely switch
      // to checking explicitly for a 404 and if we get a 500/401 or other throw an error
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
        pollingFinished(response.data);
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
}
