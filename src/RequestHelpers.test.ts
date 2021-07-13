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
import { HttpsProxyAgent } from 'https-proxy-agent';
import { Agent as HttpsAgent } from 'https';

describe('RequestHelpers', () => {
  it('getAgent() should return undefined when no env variable is set', () => {
    process.env.http_proxy = 'no-proxy';

    const res = RequestHelpers.getAgent();
    expect(res).toBeUndefined();
  });

  it('getAgent() should return a proxy httpAgent when env variable is set', () => {
    process.env.http_proxy = 'http://test.local:8080';
    const res: any = RequestHelpers.getAgent();
    expect(res).toBeDefined();
    if (res) {
      expect(res).toBeInstanceOf(HttpsProxyAgent);
      expect(res.proxy.host).toBe('test.local');
      expect(res.proxy.port).toBe(8080);
    }
  });

  it('getAgent() should return an insecure httpAgent', () => {
    const res: any = RequestHelpers.getAgent(true);
    expect(res).toBeDefined();
    if (res) {
      expect(res).toBeInstanceOf(HttpsAgent);
      expect(res.options.rejectUnauthorized).toBe(false);
    }
  });

  it('should return undefined when no env variable is set', () => {
    process.env.http_proxy = 'no-proxy';

    const res = RequestHelpers.getHttpAgent();
    expect(res).toBeUndefined();
  });
});
