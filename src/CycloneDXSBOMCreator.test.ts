/*
 * Copyright 2019-Present Sonatype Inc.
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

import { CycloneDXSBOMCreator } from './CycloneDXSBOMCreator';
import { Bom } from './CycloneDXSBOMTypes';
import { TestLogger } from './ILogger';

// Test object with circular dependency, scoped dependency, dependency with dependency
const object = {
  name: 'testproject',
  version: '1.0.0',
  description: 'Test Description',
  dependencies: {
    testdependency: {
      name: 'testdependency',
      version: '1.0.1',
      bugs: {
        url: 'git+ssh://git@github.com/slackhq/csp-html-webpack-plugin.git',
      },
      dependencies: {
        testdependency: {
          name: 'testdependency',
          version: '1.0.3',
        },
      },
    },
    testdependency2: {
      name: 'testdependency2',
      version: '1.0.2',
      repository: {
        url: 'git@slack-github.com:anuj/csp-html-webpack-plugin.git',
      },
      dependencies: {
        testdependency: {
          name: 'testdependency',
          version: '1.0.0',
        },
      },
    },
    '@scope/testdependency3': {
      name: '@scope/testdependency3',
      version: '1.0.2',
    },
  },
};

const expectedResponse = `<?xml version=\"1.0\"?><bom encoding=\"utf-8\" version=\"1\"><metadata><component type=\"library\" bom-ref=\"pkg:npm/testproject@1.0.0\"><group/><name>testproject</name><version>1.0.0</version><purl>pkg:npm/testproject@1.0.0</purl></component></metadata><components><component type=\"library\" bom-ref=\"pkg:npm/testdependency@1.0.1\"><name>testdependency</name><version>1.0.1</version><purl>pkg:npm/testdependency@1.0.1</purl><description/><externalReferences><reference type=\"issue-tracker\"><url>git+ssh://git@github.com/slackhq/csp-html-webpack-plugin.git</url></reference></externalReferences></component><component type=\"library\" bom-ref=\"pkg:npm/testdependency@1.0.3\"><name>testdependency</name><version>1.0.3</version><purl>pkg:npm/testdependency@1.0.3</purl><description/></component><component type=\"library\" bom-ref=\"pkg:npm/testdependency2@1.0.2\"><name>testdependency2</name><version>1.0.2</version><purl>pkg:npm/testdependency2@1.0.2</purl><description/></component><component type=\"library\" bom-ref=\"pkg:npm/testdependency@1.0.0\"><name>testdependency</name><version>1.0.0</version><purl>pkg:npm/testdependency@1.0.0</purl><description/></component><component type=\"library\" bom-ref=\"pkg:npm/%40scope/testdependency3@1.0.2\"><group>@scope</group><name>testdependency3</name><version>1.0.2</version><purl>pkg:npm/%40scope/testdependency3@1.0.2</purl><description/></component></components><dependencies><dependency ref=\"pkg:npm/testproject@1.0.0\"><dependency ref=\"pkg:npm/testdependency@1.0.1\"/><dependency ref=\"pkg:npm/testdependency2@1.0.2\"/><dependency ref=\"pkg:npm/%40scope/testdependency3@1.0.2\"/></dependency><dependency ref=\"pkg:npm/testdependency@1.0.1\"><dependency ref=\"pkg:npm/testdependency@1.0.3\"/></dependency><dependency ref=\"pkg:npm/testdependency@1.0.3\"/><dependency ref=\"pkg:npm/testdependency2@1.0.2\"><dependency ref=\"pkg:npm/testdependency@1.0.0\"/></dependency><dependency ref=\"pkg:npm/testdependency@1.0.0\"/><dependency ref=\"pkg:npm/%40scope/testdependency3@1.0.2\"/></dependencies></bom>`;

const expectedSpartanResponse = `<?xml version=\"1.0\"?><bom encoding=\"utf-8\" version=\"1\"><metadata><component type=\"library\" bom-ref=\"pkg:npm/testproject@1.0.0\"><group/><name>testproject</name><version>1.0.0</version><purl>pkg:npm/testproject@1.0.0</purl></component></metadata><components><component type=\"library\" bom-ref=\"pkg:npm/testdependency@1.0.1\"><name>testdependency</name><version>1.0.1</version><purl>pkg:npm/testdependency@1.0.1</purl></component><component type=\"library\" bom-ref=\"pkg:npm/testdependency@1.0.3\"><name>testdependency</name><version>1.0.3</version><purl>pkg:npm/testdependency@1.0.3</purl></component><component type=\"library\" bom-ref=\"pkg:npm/testdependency2@1.0.2\"><name>testdependency2</name><version>1.0.2</version><purl>pkg:npm/testdependency2@1.0.2</purl></component><component type=\"library\" bom-ref=\"pkg:npm/testdependency@1.0.0\"><name>testdependency</name><version>1.0.0</version><purl>pkg:npm/testdependency@1.0.0</purl></component><component type=\"library\" bom-ref=\"pkg:npm/%40scope/testdependency3@1.0.2\"><group>@scope</group><name>testdependency3</name><version>1.0.2</version><purl>pkg:npm/%40scope/testdependency3@1.0.2</purl></component></components><dependencies><dependency ref=\"pkg:npm/testproject@1.0.0\"><dependency ref=\"pkg:npm/testdependency@1.0.1\"/><dependency ref=\"pkg:npm/testdependency2@1.0.2\"/><dependency ref=\"pkg:npm/%40scope/testdependency3@1.0.2\"/></dependency><dependency ref=\"pkg:npm/testdependency@1.0.1\"><dependency ref=\"pkg:npm/testdependency@1.0.3\"/></dependency><dependency ref=\"pkg:npm/testdependency@1.0.3\"/><dependency ref=\"pkg:npm/testdependency2@1.0.2\"><dependency ref=\"pkg:npm/testdependency@1.0.0\"/></dependency><dependency ref=\"pkg:npm/testdependency@1.0.0\"/><dependency ref=\"pkg:npm/%40scope/testdependency3@1.0.2\"/></dependencies></bom>`;

describe('CycloneDXSbomCreator', () => {
  it('should create an sbom string given a minimal valid object', async () => {
    const sbomCreator = new CycloneDXSBOMCreator(process.cwd(), { logger: new TestLogger() });

    const bom: Bom = await sbomCreator.getBom(object);

    const sbomString = sbomCreator.toXml(bom, false);

    expect(sbomString).toBe(expectedResponse);
  });

  it('should create a spartan sbom string given a minimal valid object', async () => {
    const sbomCreator = new CycloneDXSBOMCreator(process.cwd(), { spartan: true, logger: new TestLogger() });

    const bom: Bom = await sbomCreator.getBom(object);

    const sbomString = sbomCreator.toXml(bom, false);

    expect(sbomString).toBe(expectedSpartanResponse);
  });
});
