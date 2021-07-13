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
import React from 'react';
import {OSSIndexRequestService, TestLogger} from '@sonatype/js-sona-types';
import {PackageURL} from 'packageurl-js';
import packageJson from '../package.json';

const App = (): JSX.Element => {
  const callOSSIndex = () => {
    const logger = new TestLogger();
    const service = new OSSIndexRequestService({browser: true, product: packageJson.name, version: packageJson.version, logger: logger}, localStorage);

    const coordinates = [];
    coordinates.push(new PackageURL("npm", undefined, "jquery", "3.1.1", undefined, undefined));

    service.getComponentDetails(coordinates)
      .then((res) => {
        console.log(res);
      })
      .catch((err) => {
        console.error(err);
      });
  };

  const render = (): JSX.Element => {
    callOSSIndex();

    return (
      <div>
        <h1>Check DevTools {'>'} Console</h1>
        <h2>There you will find out if this project worked, or not!</h2>
      </div>
    )
  }

  return render();
}

export default App;