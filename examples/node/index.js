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
const thing = require('@sonatype/js-sona-types');
const pack = require('./package.json');
const {OSSIndexRequestService, TestLogger, CycloneDXSBOMCreator} = thing;

const path = require('path');
const {join} = path;

const os = require('os');
const {homedir} = os;

const storage = require('node-persist');

const PATH = join(homedir(), '.ossindex', 'example');
const TWELVE_HOURS = 12 * 60 * 60 * 1000;

const purl = require('packageurl-js');
const {PackageURL} = purl;

const test = async () => {
  await storage.init({dir: PATH, ttl: TWELVE_HOURS});

  const logger = new TestLogger();
  
  const ossIndexRequestService = new OSSIndexRequestService(
    {
      browser: false, 
      product: pack.name, 
      version: pack.version, 
      logger: logger
    }, storage);
  
  const coordinates = [];
  coordinates.push(new PackageURL("npm", undefined, "jquery", "3.1.1", undefined, undefined));
  
  const res = await ossIndexRequestService.getComponentDetails(coordinates);

  console.log(res);

  const sbom = new CycloneDXSBOMCreator(process.cwd(), {logger: logger});

  const packages = await sbom.getPackageInfoFromReadInstalled();

  const bom = await sbom.getBom(packages);

  const xml = sbom.toXml(bom, true);

  console.log(xml);
}

test();
