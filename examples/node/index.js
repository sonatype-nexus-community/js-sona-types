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
import {OSSIndexRequestService, Coordinates} from 'js-sona-types';
import {join} from 'path';
import {homedir} from 'os';
import storage from 'node-persist';

const PATH = join(homedir(), '.ossindex', 'example');
const TWELVE_HOURS = 12 * 60 * 60 * 1000;

const test = async () => {
  await storage.init({dir: PATH, ttl: TWELVE_HOURS});
  
  const ossIndexRequestService = new OSSIndexRequestService({}, storage);
  
  const coordinates = [];
  coordinates.push(new Coordinates("jquery", "3.1.1"));
  
  const res = await ossIndexRequestService.callOSSIndexOrGetFromCache(coordinates, "npm");

  console.log(res);
}

test();
