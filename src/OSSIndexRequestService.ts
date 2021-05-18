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
import {OSSIndexCoordinates} from './OSSIndexCoordinates.js';
import {Coordinates} from './Coordinates.js';
import {OSSIndexServerResult} from './OSSIndexServerResult.js';
import axios, {AxiosResponse} from 'axios';

const OSS_INDEX_BASE_URL = 'https://ossindex.sonatype.org/';

const COMPONENT_REPORT_ENDPOINT = 'api/v3/component-report';

const MAX_COORDINATES = 128;

const TWELVE_HOURS = 12 * 60 * 60 * 1000;

export interface Options {
  user?: string;
  token?: string;
  baseURL?: string;
  browser: boolean;
}

export class OSSIndexRequestService {
  constructor(readonly options: Options, readonly store: Storage) {

    axios.interceptors.request.use((request: any) => {
      if (options.user && options.token) {
        request.auth = {
          username: options.user,
          password: options.token
        }
      }

      request.baseURL = (options.baseURL) ? options.baseURL : OSS_INDEX_BASE_URL;

      request.headers = this.getHeaders();

      return request;
    });
  }



  private getHeaders(): object {
    return {'Content-Type': 'application/json'};
  }

  private async getResultsFromOSSIndex(data: OSSIndexCoordinates): Promise<Array<OSSIndexServerResult>> {
     try {
      const response: AxiosResponse<Array<OSSIndexServerResult>> = await axios.post(
        `${COMPONENT_REPORT_ENDPOINT}`,
        data
        );

      return response.data;
     } catch (error) {
       throw new Error(`There was an error making your request to OSS Index: ${error}`);
     }
  }

  private chunkData(data: Coordinates[]): Array<Array<Coordinates>> {
    const chunks = [];
    while (data.length > 0) {
      chunks.push(data.splice(0, MAX_COORDINATES));
    }
    return chunks;
  }

  private combineResponseChunks(data: [][]): Array<OSSIndexServerResult> {
    return [].concat.apply([], data);
  }

  private combineCacheAndResponses(
    combinedChunks: Array<OSSIndexServerResult>,
    dataInCache: Array<OSSIndexServerResult>,
  ): Array<OSSIndexServerResult> {
    return combinedChunks.concat(dataInCache);
  }

  private async insertResponsesIntoCache(response: Array<OSSIndexServerResult>): Promise<Array<OSSIndexServerResult>> {
    for (let i = 0; i < response.length; i++) {
      const item = {
        value: response[i],
        expiry: new Date().getTime() + TWELVE_HOURS,
      };

      await this.store.setItem(
        response[i].coordinates, 
        JSON.stringify(item),
      );
    }

    return response;
  }

  private async checkIfResultsAreInCache(data: Coordinates[], format = 'npm'): Promise<PurlContainer> {
    const inCache = new Array<OSSIndexServerResult>();
    const notInCache = new Array<Coordinates>();

    for (let i = 0; i < data.length; i++) {
      const coord = data[i];
      const dataInCache = await this.store.getItem(coord.toPurl(format));

      if (dataInCache) {
        if (this.options.browser) {
          console.info("Browser based cache");

          const value: Item = JSON.parse(dataInCache);
          console.info(value);

          if (new Date().getTime() > value.expiry) {
            console.info("Cache item expired");

            await this.store.removeItem(coord.toPurl(format));
            notInCache.push(coord);
          } else {
            inCache.push(value.value);
          }
        } else {
          const value: Item = JSON.parse(dataInCache);
          inCache.push(value.value);
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
  public async callOSSIndexOrGetFromCache(data: Coordinates[], format = 'npm'): Promise<Array<OSSIndexServerResult>> {
    const responses = new Array();
    const results = await this.checkIfResultsAreInCache(data, format);
    const chunkedPurls = this.chunkData(results.notInCache);

    for (const chunk of chunkedPurls) {
      try {
        const res = this.getResultsFromOSSIndex(new OSSIndexCoordinates(chunk.map((x) => x.toPurl(format))));
        responses.push(res);
      } catch (e) {
        throw new Error(e);
      }
    }

    return Promise.all(responses)
      .then((resolvedResponses) => this.combineResponseChunks(resolvedResponses))
      .then((combinedResponses) => this.insertResponsesIntoCache(combinedResponses))
      .then((combinedResponses) => this.combineCacheAndResponses(combinedResponses, results.inCache))
      .catch((err) => {
        throw err;
      });
  }
}

class PurlContainer {
  constructor(readonly inCache: OSSIndexServerResult[], readonly notInCache: Coordinates[]) {}
}

interface Item {
  value: any;
  expiry: number;
}
