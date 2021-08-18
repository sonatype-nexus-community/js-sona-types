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
import { OSSIndexRequestService } from './OSSIndexRequestService';
import * as rimraf from 'rimraf';
import storage from 'node-persist';
import { join } from 'path';
import { homedir } from 'os';
import { PackageURL } from 'packageurl-js';
import { TestLogger } from './ILogger';
import fetch from 'cross-fetch';
import { mocked } from 'ts-jest/utils';

const PATH = join(homedir(), '.ossindex', 'js-sona-types-test');
const TWELVE_HOURS = 12 * 60 * 60 * 1000;

jest.mock('cross-fetch', () => {
  return jest.fn();
});

describe('OSS Index Request Service', () => {
  let service: OSSIndexRequestService;

  beforeEach(() => {
    mocked(fetch).mockClear();
  });

  beforeAll(() => {
    const logger = new TestLogger();
    service = new OSSIndexRequestService(
      { browser: false, product: 'test', version: '0.0.1', logger: logger },
      storage as any,
    );
  });

  beforeEach(async () => {
    rimraf.sync(PATH);
    await storage.init({ dir: PATH, ttl: TWELVE_HOURS });
  });

  it('can handle valid request to the service, and will give valid response', async () => {
    const expectedOutput = [
      {
        coordinates: 'pkg:npm/jquery@3.1.1',
        reference: 'https://ossindex.sonatype.org/blahblahblah',
        vulnerabilities: [],
      },
    ];

    mocked(fetch).mockImplementation((): Promise<any> => {
      return Promise.resolve({
        status: 200,
        json() {
          return Promise.resolve(expectedOutput);
        },
      });
    });

    const coordinates = [];
    coordinates.push(new PackageURL('npm', undefined, 'jquery', '3.1.1', undefined, undefined));

    const res = await service.getComponentDetails(coordinates);

    expect(res).toBeDefined();
    expect(res.componentDetails.length).toBe(1);
    expect(res.componentDetails[0].component.name).toBe('jquery');
    expect(res.componentDetails[0].component.packageUrl).toBe('pkg:npm/jquery@3.1.1');
    expect(res.componentDetails[0].securityData.securityIssues.length).toBe(0);
    expect(res.componentDetails[0].component.componentIdentifier.format).toBe('npm');
    expect(res.componentDetails[0].matchState).toBe('PURL');
  });

  it('can handle an invalid request to the service, and to return an empty array', async () => {
    expect(await service.getComponentDetails([])).toStrictEqual({ componentDetails: [] });
  });

  it('can handle a multi-chunk request to the service, and to return a reliably sized array', async () => {
    // 3 x 128 + 60
    const bigPurls: PackageURL[] = [];
    for (var i = 0; i < 444; i++) {
      bigPurls.push(new PackageURL('npm', '' + i, 'jquery', '3.1.1', undefined, undefined));
    }

    const expectedOutput = [];
    for (var i = 0; i < bigPurls.length; i++) {
      expectedOutput.push({
        coordinates: 'pkg:npm/jquery@3.1.1-' + i,
        reference: 'https://ossindex.sonatype.org/blahblahblah',
        vulnerabilities: [],
      });
    }

    mocked(fetch).mockImplementation((): Promise<any> => {
      return Promise.resolve({
        status: 200,
        json() {
          return Promise.resolve(expectedOutput);
        },
      });
    });

    const res = await service.getComponentDetails(bigPurls);
    expect(res).toBeDefined();
    expect(res.componentDetails.length).toBe(bigPurls.length);
  });
});
