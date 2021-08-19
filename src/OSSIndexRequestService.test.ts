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
import { Response } from 'cross-fetch';

const PATH = join(homedir(), '.ossindex', 'js-sona-types-test');
const TWELVE_HOURS = 12 * 60 * 60 * 1000;

describe('OSS Index Request Service', () => {
  let service: OSSIndexRequestService;

  beforeEach(async () => {
    rimraf.sync(PATH);
    await storage.init({ dir: PATH, ttl: TWELVE_HOURS });
  });

  beforeAll(() => {
    const logger = new TestLogger();
    service = new OSSIndexRequestService(
      { browser: false, product: 'test', version: '0.0.1', logger: logger },
      storage as any,
    );
  });

  it('can handle valid request to the service, and will give valid response', async () => {
    const expectedOutput = [
      {
        coordinates: 'pkg:npm/jquery@3.1.1',
        reference: 'https://ossindex.sonatype.org/blahblahblah',
        vulnerabilities: [],
      },
    ];

    jest.spyOn(global, 'fetch').mockReturnValueOnce(Promise.resolve(new Response(JSON.stringify(expectedOutput))));

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
    // Create 444 purls, which is 4 seperate requests, 128, 128, 128, and then an odd request of 60
    const length = 3 * 128 + 60;
    const bigPurls: PackageURL[] = [];
    const expectedOutput = [];
    for (let i = 0; i < length; i++) {
      const purl = new PackageURL('npm', '' + i, 'jquery', `3.1.${i}`, undefined, undefined);
      bigPurls.push(purl);
      expectedOutput.push({
        coordinates: purl.toString(),
        reference: 'https://ossindex.sonatype.org/blahblahblah',
        vulnerabilities: [],
      });
    }

    const responseChunks = [];
    while (expectedOutput.length > 0) {
      responseChunks.push(expectedOutput.splice(0, 128));
    }

    jest
      .spyOn(global, 'fetch')
      .mockReturnValueOnce(Promise.resolve(new Response(JSON.stringify(responseChunks[0]))))
      .mockReturnValueOnce(Promise.resolve(new Response(JSON.stringify(responseChunks[1]))))
      .mockReturnValueOnce(Promise.resolve(new Response(JSON.stringify(responseChunks[2]))))
      .mockReturnValueOnce(Promise.resolve(new Response(JSON.stringify(responseChunks[3]))));

    const res = await service.getComponentDetails(bigPurls);
    expect(res).toBeDefined();
    expect(res.componentDetails.length).toBe(bigPurls.length);
  });
});
