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

import { CycloneDXOptions, CycloneDXSBOMCreator } from './CycloneDXSBOMCreator';
import { Bom, CycloneDXComponent, Dependency } from './CycloneDXSBOMTypes';
import { LogLevel, TestLogger } from './ILogger';

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

const expectedResponse = `<?xml version="1.0"?><bom encoding="utf-8" version="1"><metadata><component type="library" bom-ref="pkg:npm/testproject@1.0.0"><group/><name>testproject</name><version>1.0.0</version><purl>pkg:npm/testproject@1.0.0</purl></component></metadata><components><component type="library" bom-ref="pkg:npm/testdependency@1.0.1"><name>testdependency</name><version>1.0.1</version><purl>pkg:npm/testdependency@1.0.1</purl><description/><externalReferences><reference type="issue-tracker"><url>git+ssh://git@github.com/slackhq/csp-html-webpack-plugin.git</url></reference></externalReferences></component><component type="library" bom-ref="pkg:npm/testdependency@1.0.3"><name>testdependency</name><version>1.0.3</version><purl>pkg:npm/testdependency@1.0.3</purl><description/></component><component type="library" bom-ref="pkg:npm/testdependency2@1.0.2"><name>testdependency2</name><version>1.0.2</version><purl>pkg:npm/testdependency2@1.0.2</purl><description/></component><component type="library" bom-ref="pkg:npm/testdependency@1.0.0"><name>testdependency</name><version>1.0.0</version><purl>pkg:npm/testdependency@1.0.0</purl><description/></component><component type="library" bom-ref="pkg:npm/%40scope/testdependency3@1.0.2"><group>@scope</group><name>testdependency3</name><version>1.0.2</version><purl>pkg:npm/%40scope/testdependency3@1.0.2</purl><description/></component></components><dependencies><dependency ref="pkg:npm/testproject@1.0.0"><dependency ref="pkg:npm/testdependency@1.0.1"/><dependency ref="pkg:npm/testdependency2@1.0.2"/><dependency ref="pkg:npm/%40scope/testdependency3@1.0.2"/></dependency><dependency ref="pkg:npm/testdependency@1.0.1"><dependency ref="pkg:npm/testdependency@1.0.3"/></dependency><dependency ref="pkg:npm/testdependency@1.0.3"/><dependency ref="pkg:npm/testdependency2@1.0.2"><dependency ref="pkg:npm/testdependency@1.0.0"/></dependency><dependency ref="pkg:npm/testdependency@1.0.0"/><dependency ref="pkg:npm/%40scope/testdependency3@1.0.2"/></dependencies></bom>`;

const expectedSpartanResponse = `<?xml version="1.0"?><bom encoding="utf-8" version="1"><metadata><component type="library" bom-ref="pkg:npm/testproject@1.0.0"><group/><name>testproject</name><version>1.0.0</version><purl>pkg:npm/testproject@1.0.0</purl></component></metadata><components><component type="library" bom-ref="pkg:npm/testdependency@1.0.1"><name>testdependency</name><version>1.0.1</version><purl>pkg:npm/testdependency@1.0.1</purl></component><component type="library" bom-ref="pkg:npm/testdependency@1.0.3"><name>testdependency</name><version>1.0.3</version><purl>pkg:npm/testdependency@1.0.3</purl></component><component type="library" bom-ref="pkg:npm/testdependency2@1.0.2"><name>testdependency2</name><version>1.0.2</version><purl>pkg:npm/testdependency2@1.0.2</purl></component><component type="library" bom-ref="pkg:npm/testdependency@1.0.0"><name>testdependency</name><version>1.0.0</version><purl>pkg:npm/testdependency@1.0.0</purl></component><component type="library" bom-ref="pkg:npm/%40scope/testdependency3@1.0.2"><group>@scope</group><name>testdependency3</name><version>1.0.2</version><purl>pkg:npm/%40scope/testdependency3@1.0.2</purl></component></components><dependencies><dependency ref="pkg:npm/testproject@1.0.0"><dependency ref="pkg:npm/testdependency@1.0.1"/><dependency ref="pkg:npm/testdependency2@1.0.2"/><dependency ref="pkg:npm/%40scope/testdependency3@1.0.2"/></dependency><dependency ref="pkg:npm/testdependency@1.0.1"><dependency ref="pkg:npm/testdependency@1.0.3"/></dependency><dependency ref="pkg:npm/testdependency@1.0.3"/><dependency ref="pkg:npm/testdependency2@1.0.2"><dependency ref="pkg:npm/testdependency@1.0.0"/></dependency><dependency ref="pkg:npm/testdependency@1.0.0"/><dependency ref="pkg:npm/%40scope/testdependency3@1.0.2"/></dependencies></bom>`;

describe('CycloneDXSbomCreator', () => {
  it('should create an sbom string given a minimal valid object', async () => {
    const sbomCreator = new CycloneDXSBOMCreator(process.cwd(), { logger: new TestLogger(LogLevel.WARN) });

    const bom: Bom = await sbomCreator.getBom(object);

    const sbomString = sbomCreator.toXml(bom, false);

    expect(sbomString).toBe(expectedResponse);
  });

  it('should create a spartan sbom string given a minimal valid object', async () => {
    const sbomCreator = new CycloneDXSBOMCreator(process.cwd(), {
      spartan: true,
      logger: new TestLogger(LogLevel.WARN),
    });

    const bom: Bom = await sbomCreator.getBom(object);

    const sbomString = sbomCreator.toXml(bom, false);

    expect(sbomString).toBe(expectedSpartanResponse);
  });

  it('should return the supplied type "framework", component values, xml SerialNumber and Timestamp', async () => {
    const sbomCreator = new CycloneDXSBOMCreator(process.cwd(), {
      spartan: true,
      logger: new TestLogger(LogLevel.DEBUG),
      includeBomSerialNumber: true,
      includeTimestamp: true,
    } as CycloneDXOptions);

    const littleObject = {
      name: '@jsonScope/jsonProjectName.jsonModuleName',
      version: '-1',
      keywords: ['FrameWorK', 'Yadda'],
    };
    const bom: Bom = await sbomCreator.getBom(littleObject);

    const expectedComponent: CycloneDXComponent = {
      '@bom-ref': 'pkg:npm/%40jsonScope/jsonProjectName.jsonModuleName@-1',
      '@type': 'framework',
      group: '@jsonScope',
      name: 'jsonProjectName.jsonModuleName',
      purl: 'pkg:npm/%40jsonScope/jsonProjectName.jsonModuleName@-1',
      version: '-1',
    } as CycloneDXComponent;

    const expectedBom: Bom = {
      '@serial-number': bom['@serial-number'].toString(), // force serial number
      '@version': 1,
      '@xmlns': 'https://cyclonedx.org/schema/bom/1.3',
      metadata: {
        timestamp: bom.metadata.timestamp.toString(), // force timestamp
        component: expectedComponent,
      },
      components: [],
      dependencies: [
        {
          '@ref': 'pkg:npm/%40jsonScope/jsonProjectName.jsonModuleName@-1',
          dependencies: [],
        } as Dependency,
      ],
    };
    expect(bom).toStrictEqual(expectedBom);

    const sbomString = sbomCreator.toXml(bom, false);

    const expectedXml =
      '<?xml version="1.0"?><bom encoding="utf-8" serialNumber="holderSerialNumber" version="1"><metadata><timestamp>holderTimeStamp</timestamp><component type="framework" bom-ref="pkg:npm/%40jsonScope/jsonProjectName.jsonModuleName@-1"><group>@jsonScope</group><name>jsonProjectName.jsonModuleName</name><version>-1</version><purl>pkg:npm/%40jsonScope/jsonProjectName.jsonModuleName@-1</purl></component></metadata><components/><dependencies><dependency ref="pkg:npm/%40jsonScope/jsonProjectName.jsonModuleName@-1"/></dependencies></bom>'
        .replace('holderSerialNumber', bom['@serial-number'])
        .replace('holderTimeStamp', bom.metadata.timestamp);
    expect(sbomString).toBe(expectedXml);
  });

  it('should ignore extraneous package', async () => {
    const sbomCreator = new CycloneDXSBOMCreator(process.cwd(), {
      spartan: true,
      logger: new TestLogger(LogLevel.DEBUG),
    } as CycloneDXOptions);

    const littleObject = {
      name: '@jsonScope/jsonProjectName.jsonModuleName',
      version: '-1',
      extraneous: true,
    };
    try {
      await sbomCreator.getBom(littleObject);
      expect('error should have been thrown').toBe('error was not thrown');
    } catch (e: any) {
      expect(e.toString()).toBe('Error: Node does not exist: pkg:npm/%40jsonScope/jsonProjectName.jsonModuleName@-1');
    }
  });

  it('should process license data with unknown license', async () => {
    const sbomCreator = new CycloneDXSBOMCreator(process.cwd(), {
      logger: new TestLogger(LogLevel.DEBUG),
      includeLicenseData: true,
    } as CycloneDXOptions);

    const littleObject = {
      name: '@jsonScope/jsonProjectName.jsonModuleName',
      version: '-1',
      dependencies: {
        childDependency: {
          name: 'childDepName',
          license: 'someLicense',
        },
      },
    };

    const bom: Bom = await sbomCreator.getBom(littleObject);
    expect(bom.components![0].licenses![0].license.name).toBe(littleObject.dependencies.childDependency.license);
    expect(bom.metadata.component.version).toBe(littleObject.version);
  });

  it('should process license data with known license', async () => {
    const sbomCreator = new CycloneDXSBOMCreator(process.cwd(), {
      logger: new TestLogger(LogLevel.DEBUG),
      includeLicenseData: true,
    } as CycloneDXOptions);

    const littleObject = {
      name: '@jsonScope/jsonProjectName.jsonModuleName',
      version: '-1',
      dependencies: {
        childDependency: {
          name: 'childDepName',
          license: 'AGPL-1.0',
        },
      },
    };

    const bom: Bom = await sbomCreator.getBom(littleObject);
    expect(bom.components![0].licenses![0].license.id).toBe(littleObject.dependencies.childDependency.license);
    expect(bom.metadata.component.version).toBe(littleObject.version);
  });
});
