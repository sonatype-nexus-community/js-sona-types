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
import os from 'os';
import { UserAgentHelper } from './UserAgentHelper';

describe('RequestHelpers', () => {
  it('should return a valid user agent from getUserAgent for node ', async () => {
    const nodeVersion = process.versions;
    const environment = 'NodeJS';
    const environmentVersion = nodeVersion.node;
    const system = `${os.type()} ${os.release()}`;
    const res = await UserAgentHelper.getUserAgent(false, 'AuditJS', '1.0.0');
    const expected = `AuditJS/1.0.0 (${environment} ${environmentVersion}; ${system})`;

    expect(res).toStrictEqual(expected);
  });

  it('should return a valid user agent from getUserAgent for browser ', async () => {
    const res = await UserAgentHelper.getUserAgent(true, 'AuditJS', '1.0.0');
    const expected = `AuditJS/1.0.0`;

    expect(res).toStrictEqual(expected);
  });
});
