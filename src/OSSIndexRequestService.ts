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
import crossFetch from 'cross-fetch';
import { PackageURL } from 'packageurl-js';
import { ComponentContainer, ComponentDetails, SecurityIssue } from './ComponentDetails';
import { LogLevel } from './ILogger';
import { OSSIndexCoordinates } from './OSSIndexCoordinates';
import { RequestService, RequestServiceOptions } from './RequestService';
import { UserAgentHelper } from './UserAgentHelper';

const OSS_INDEX_BASE_URL = 'https://ossindex.sonatype.org/';

const COMPONENT_REPORT_ENDPOINT = 'api/v3/component-report';

const MAX_COORDINATES = 128;

const TWELVE_HOURS = 12 * 60 * 60 * 1000;

if (typeof global.fetch === 'undefined' && typeof process !== 'undefined' && process.release.name === 'node') {
  global.fetch = crossFetch;
}

export class OSSIndexRequestService implements RequestService {
  constructor(readonly options: RequestServiceOptions, readonly store: Storage) { }

  private async getHeaders(): Promise<[string, string][]> {
    const userAgent = await UserAgentHelper.getUserAgent(
      this.options.browser,
      this.options.product,
      this.options.version,
    );

    return [
      ['Content-Type', 'application/json'],
      ['User-Agent', userAgent],
    ];
  }

  private async _getResultsFromOSSIndex(data: OSSIndexCoordinates): Promise<ComponentDetails> {
    try {
      const headers = await this.getHeaders();

      const res = await fetch(`${OSS_INDEX_BASE_URL}${COMPONENT_REPORT_ENDPOINT}`, {
        method: 'POST',
        body: JSON.stringify(data),
        headers: headers,
      });

      if (res.status != 200) {
        throw Error(res.statusText);
      }

      const componentDetails: ComponentDetails = {} as ComponentDetails;

      const componentContainers: ComponentContainer[] = new Array<ComponentContainer>();

      const responseData = await res.json();

      //responseData.forEach((val) => {
      responseData.map((val) => {
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
    const response = { componentDetails: [] };
    data.map((compDetails) => {
      compDetails.componentDetails.map((compDetail) => {
        response.componentDetails.push(compDetail);
      });
    });
    return response;
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
    this.options.logger.logMessage(`Checking if results are in cache`, LogLevel.INFO);
    const inCache: ComponentDetails = { componentDetails: new Array<ComponentContainer>() } as any;
    const notInCache = new Array<PackageURL>();

    for (let i = 0; i < data.length; i++) {
      const coord = data[i];
      const dataInCache = await this.store.getItem(coord.toString());

      if (dataInCache) {
        if (this.options.browser) {
          this.options.logger.logMessage('Browser based cache', LogLevel.INFO);

          const value: Item = JSON.parse(dataInCache);

          if (new Date().getTime() > value.expiry) {
            this.options.logger.logMessage('Cache item expired', LogLevel.INFO);

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
    this.options.logger.logMessage(`Starting request to OSS Index`, LogLevel.INFO);
    const responses = new Array<ComponentDetails>();
    const results = await this.checkIfResultsAreInCache(data);
    const chunkedPurls = this.chunkData(results.notInCache);

    for (const chunk of chunkedPurls) {
      this.options.logger.logMessage(`Checking chunk against OSS Index`, LogLevel.INFO);
      try {
        const res = await this._getResultsFromOSSIndex(new OSSIndexCoordinates(chunk.map((purl) => purl.toString())));

        responses.push(res);
      } catch (err) {
        throw Error(err);
      }
    }

    const componentDetails = this.combineResponseChunks(responses);
    await this.insertResponsesIntoCache(componentDetails);
    return this.combineCacheAndResponses(componentDetails, results.inCache);
  }
}

class PurlContainer {
  constructor(readonly inCache: ComponentDetails, readonly notInCache: PackageURL[]) { }
}

interface Item {
  value: ComponentContainer;
  expiry: number;
}
