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
import { OSSIndexCoordinates } from './OSSIndexCoordinates';
import { OSSIndexServerResult } from './OSSIndexServerResult';
import axios, { AxiosResponse } from 'axios';
import { RequestService, RequestServiceOptions } from './RequestService';
import { ComponentContainer, ComponentDetails, SecurityIssue } from './ComponentDetails';
import { PackageURL } from 'packageurl-js';
import { UserAgentHelper } from './UserAgentHelper';
import { DEBUG } from './ILogger';

const OSS_INDEX_BASE_URL = 'https://ossindex.sonatype.org/';

const COMPONENT_REPORT_ENDPOINT = 'api/v3/component-report';

const MAX_COORDINATES = 128;

const TWELVE_HOURS = 12 * 60 * 60 * 1000;

export class OSSIndexRequestService implements RequestService {
  constructor(readonly options: RequestServiceOptions, readonly store: Storage) {
    axios.interceptors.request.use((request: any) => {
      if (options.user && options.token) {
        request.auth = {
          username: options.user,
          password: options.token,
        };
      }

      request.baseURL = options.host ? options.host : OSS_INDEX_BASE_URL;

      request.headers = this.getHeaders();

      return request;
    });
  }

  private getHeaders(): Record<string, unknown> {
    return { 'Content-Type': 'application/json' };
  }

  private async _getResultsFromOSSIndex(data: OSSIndexCoordinates): Promise<ComponentDetails> {
    try {
      const userAgent = await UserAgentHelper.getUserAgent(
        this.options.browser,
        this.options.product,
        this.options.version,
      );

      const response: AxiosResponse<Array<OSSIndexServerResult>> = await axios.post(
        `${COMPONENT_REPORT_ENDPOINT}`,
        data,
        {
          headers: [userAgent],
        },
      );

      if (response.status != 200) {
        throw Error(response.statusText);
      }

      const componentDetails: ComponentDetails = {} as ComponentDetails;

      const componentContainers: ComponentContainer[] = new Array<ComponentContainer>();

      response.data.forEach((val) => {
        const purl = PackageURL.fromString(val.coordinates);

        const securityIssues: SecurityIssue[] = new Array<SecurityIssue>();
        if (val.vulnerabilities) {
          val.vulnerabilities.forEach((vuln) => {
            const source: string = vuln.cve ? 'cve' : vuln.cwe ? 'cwe' : 'unknown';
            const securityIssue: SecurityIssue = {
              id: vuln.id,
              reference: vuln.title,
              severity: vuln.cvssScore,
              url: vuln.reference,
              vector: vuln.cvssVector,
              source: source,
              description: vuln.description,
            };
            securityIssues.push(securityIssue);
          });
        }
        const componentContainer: ComponentContainer = {
          component: {
            componentIdentifier: {
              format: purl.type,
            },
            packageUrl: val.coordinates,
            name: purl.name,
            description: val.description,
            hash: '',
          },
          matchState: 'PURL',
          catalogDate: '',
          relativePopularity: '',
          securityData: { securityIssues: securityIssues },
          licenseData: undefined,
        };

        componentContainers.push(componentContainer);
      });

      componentDetails.componentDetails = componentContainers;

      return componentDetails;
    } catch (error) {
      console.log(error);

      throw new Error(`There was an error making your request to OSS Index: ${error}`);
    }
  }

  private chunkData(data: PackageURL[]): Array<Array<PackageURL>> {
    const chunks = [];
    while (data.length > 0) {
      chunks.push(data.splice(0, MAX_COORDINATES));
    }
    return chunks;
  }

  private combineResponseChunks(data: ComponentDetails[]): ComponentDetails {
    const [compDetails] = data;
    if (compDetails && compDetails.componentDetails) {
      return { componentDetails: compDetails.componentDetails };
    }
  }

  private combineCacheAndResponses(combinedChunks: ComponentDetails, dataInCache: ComponentDetails): ComponentDetails {
    if (dataInCache && dataInCache.componentDetails) {
      if (combinedChunks && combinedChunks.componentDetails) {
        return { componentDetails: combinedChunks.componentDetails.concat(dataInCache.componentDetails) };
      }
      return dataInCache;
    }
    return combinedChunks;
  }

  private async insertResponsesIntoCache(response: ComponentDetails): Promise<ComponentDetails> {
    if (response && response.componentDetails) {
      for (let i = 0; i < response.componentDetails.length; i++) {
        const item = {
          value: response.componentDetails[i],
          expiry: new Date().getTime() + TWELVE_HOURS,
        };

        await this.store.setItem(response.componentDetails[i].component.packageUrl, JSON.stringify(item));
      }

      return response;
    }
  }

  private async checkIfResultsAreInCache(data: PackageURL[]): Promise<PurlContainer> {
    this.options.logger.logMessage(`Checking if results are in cache`, DEBUG, data);
    const inCache: ComponentDetails = { componentDetails: new Array<ComponentContainer>() } as any;
    const notInCache = new Array<PackageURL>();

    for (let i = 0; i < data.length; i++) {
      const coord = data[i];
      const dataInCache = await this.store.getItem(coord.toString());

      if (dataInCache) {
        if (this.options.browser) {
          console.info('Browser based cache');

          const value: Item = JSON.parse(dataInCache);
          console.info(value);

          if (new Date().getTime() > value.expiry) {
            console.info('Cache item expired');

            await this.store.removeItem(coord.toString());
            notInCache.push(coord);
          } else {
            inCache.componentDetails.push(value.value);
          }
        } else {
          const value: Item = JSON.parse(dataInCache);
          inCache.componentDetails.push(value.value);
        }
      } else {
        notInCache.push(coord);
      }
    }

    return new PurlContainer(inCache, notInCache);
  }

  /**
   * Posts to OSS Index {@link COMPONENT_REPORT_ENDPOINT}, returns Promise of json object of response
   * @param data - {@link Coordinates} Array
   * @returns a {@link Promise} of all Responses
   */
  public async getComponentDetails(data: PackageURL[]): Promise<ComponentDetails> {
    this.options.logger.logMessage(`Starting request to OSS Index`, DEBUG, data);
    const responses = new Array<Promise<ComponentDetails>>();
    const results = await this.checkIfResultsAreInCache(data);
    const chunkedPurls = this.chunkData(results.notInCache);

    for (const chunk of chunkedPurls) {
      this.options.logger.logMessage(`Checking chunk against OSS Index`, DEBUG, chunk);
      try {
        const res = this._getResultsFromOSSIndex(new OSSIndexCoordinates(chunk.map((purl) => purl.toString())));

        responses.push(res);
      } catch (err) {
        throw Error(err);
      }
    }

    return Promise.all(responses)
      .then((resolvedResponses) => this.combineResponseChunks(resolvedResponses))
      .then((combinedResponses) => this.insertResponsesIntoCache(combinedResponses))
      .then((combinedResponses) => this.combineCacheAndResponses(combinedResponses, results.inCache))
      .catch((err) => {
        throw Error(err);
      });
  }
}

class PurlContainer {
  constructor(readonly inCache: ComponentDetails, readonly notInCache: PackageURL[]) {}
}

interface Item {
  value: ComponentContainer;
  expiry: number;
}
