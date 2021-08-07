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
export interface ComponentDetails {
  componentDetails: ComponentContainer[];
}

export interface ComponentContainer {
  component: SonatypeComponent;
  matchState: string | null | undefined;
  catalogDate: string | null | undefined;
  relativePopularity: string | null | undefined;
  securityData: SecurityData | null | undefined;
  licenseData: LicenseData | null | undefined;
}

export interface SonatypeComponent {
  packageUrl: string;
  name: string | null | undefined;
  hash: string | null | undefined;
  description?: string;
  componentIdentifier?: ComponentIdentifier;
}

export interface ComponentIdentifier {
  format: string;
  coordinates?: Coordinates;
}

export interface Coordinates {
  artifactId?: string;
  classifier?: string;
  extension?: string;
  groupId?: string;
  version: string;
}

export interface SecurityData {
  securityIssues: SecurityIssue[];
}

export interface SecurityIssue {
  id?: string;
  source: string;
  reference: string;
  severity: number;
  vector?: string;
  url: string;
  description: string | null | undefined;
}

export interface LicenseData {
  declaredLicenses: LicenseDetail[];
  effectiveLicenses: LicenseDetail[];
  observedLicenses: LicenseDetail[];
}

export interface LicenseDetail {
  licenseId: string;
  licenseName: string;
}
