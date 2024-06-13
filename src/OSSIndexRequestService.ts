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
import { PackageURL } from 'packageurl-js';
import { ComponentContainer, ComponentDetails, componentReportToComponentContainer } from './ComponentDetails';
import { LogLevel } from './ILogger';
import { RequestService, RequestServiceOptions } from './RequestService';
import { UserAgentHelper } from './UserAgentHelper';

import {
  Configuration, 
  ComponentVulnerabilityReportsApi,
} from "@sonatype/ossindex-api-client"
import { ILogger } from '.';

const OSS_INDEX_BASE_URL = 'https://ossindex.sonatype.org';
const MAX_COORDINATES = 128;
const TWELVE_HOURS = 12 * 60 * 60 * 1000;


export class OSSIndexRequestService implements RequestService {

  private logger: ILogger

  private apiClientConfiguration: Configuration | undefined = undefined

  /**
   * Historical wrapper to call /component-report API for OSS Index
   * 
   * @param options 
   * @param store 
   * @deprecated
   */
  constructor(readonly options: RequestServiceOptions, readonly store: Storage) { 
    this.logger = this.options.logger
  }

  /**
   * Posts to OSS Index /component-report, returns Promise of json object of response.
   * 
   * @param data - {@link PackageURL} Array
   * @returns a {@link Promise} of {@link ComponentDetails}
   * @deprecated
   */
  public async getComponentDetails(data: PackageURL[]): Promise<ComponentDetails> {
    this.logger.logMessage(`Starting request to OSS Index`, LogLevel.INFO);

    const cacheResults: CacheQueryResult = await this.checkIfResultsAreInCache(data);
    const allResponses: ComponentDetails = cacheResults.inCache
    const chunkedPurls = this.chunkPurls(cacheResults.notInCache);
    const apiClientConfiguration = await this._getApiConfiguration()
    const apiClient = new ComponentVulnerabilityReportsApi(apiClientConfiguration)

    for (const chunk of chunkedPurls) {
      this.logger.logMessage(`Checking chunk against OSS Index`, LogLevel.INFO);
      try {
        let response
        if (apiClientConfiguration.username == undefined || apiClientConfiguration.password == undefined) {
          this.logger.logMessage('Calling OSS Index without authentication', LogLevel.INFO)
          response = await apiClient.componentReport({
            body: {
              "coordinates": chunk.map((purl) => purl.toString())
            }
          })
        } else {
          this.logger.logMessage('Calling OSS Index WITH authentication', LogLevel.INFO)
          response = await apiClient.authorizedComponentReport({
            body: {
              "coordinates": chunk.map((purl) => purl.toString())
            }
          })
        }

        for (const componentReport of response) {
          const cd = componentReportToComponentContainer(componentReport)
          if (cd !== undefined) {
            allResponses.componentDetails.push(cd)
            await this.insertResponseIntoCache(cd)
          }
        }
      } catch (err) {
        this.logger.logMessage(`Error calling OSS Index`, LogLevel.ERROR)
        if (err instanceof Error) {
          throw err
        }
        throw new Error("Unknown error in getComponentDetails");
      }
    }

    return allResponses
  }

  /**
   * Get API Configuration for API Client
   * 
   * @param force_new
   * @returns 
   */
  private async _getApiConfiguration(force_new = false): Promise<Configuration> {
    if (this.apiClientConfiguration !== undefined && force_new == false) {
      return this.apiClientConfiguration
    }
    const userAgent = await UserAgentHelper.getUserAgent(
      this.options.browser,
      this.options.product,
      this.options.version,
    );

    this.apiClientConfiguration = new Configuration({
      basePath: OSS_INDEX_BASE_URL,
      username: this.options.user,
      password: this.options.token,
      headers: {
        'User-Agent': userAgent
      }
    })

    return this.apiClientConfiguration
  }

  private chunkPurls(data: PackageURL[]): Array<Array<PackageURL>> {
    const chunks = [];
    while (data.length > 0) {
      chunks.push(data.splice(0, MAX_COORDINATES));
    }
    return chunks;
  }

  private async insertResponseIntoCache(component: ComponentContainer): Promise<void> {
    const item = {
      value: component,
      expiry: new Date().getTime() + TWELVE_HOURS,
    };

    await this.store.setItem(component.component.packageUrl, JSON.stringify(item));
  }

  private async checkIfResultsAreInCache(data: PackageURL[]): Promise<CacheQueryResult> {
    this.logger.logMessage(`Checking if any of ${data.length} PURLs are in cache`, LogLevel.INFO);

    const inCache: ComponentDetails = { componentDetails: new Array<ComponentContainer>() }
    const notInCache = new Array<PackageURL>()

    for (let i = 0; i < data.length; i++) {
      const coord = data[i];
      const dataInCache = await this.store.getItem(coord.toString());

      if (dataInCache) {
        if (this.options.browser) {
          this.options.logger.logMessage(`Browser based cache: ${coord.toString()}`, LogLevel.TRACE);

          const value: CacheItem = JSON.parse(dataInCache);

          if (new Date().getTime() > value.expiry) {
            this.options.logger.logMessage(`Cache item expired: ${coord.toString()}`, LogLevel.TRACE);

            await this.store.removeItem(coord.toString());
            notInCache.push(coord);
          } else {
            inCache.componentDetails.push(value.value);
          }
        } else {
          this.logger.logMessage(`Parsing data from cache: ${dataInCache}`, LogLevel.INFO)
          const value: CacheItem = JSON.parse(dataInCache);
          inCache.componentDetails.push(value.value);
        }
      } else {
        notInCache.push(coord);
      }
    }

    return new CacheQueryResult(inCache, notInCache);
  }
}

class CacheQueryResult {
  constructor(readonly inCache: ComponentDetails, readonly notInCache: PackageURL[]) { }
}

interface CacheItem {
  value: ComponentContainer;
  expiry: number;
}
