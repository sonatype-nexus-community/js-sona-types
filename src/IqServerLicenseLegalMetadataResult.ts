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

// GET /api/v2/licenseLegalMetadata/application/{applicationPublicID}/component?=packageUrl={purlString}

import { ComponentIdentifier } from './ComponentDetails';

export interface IqServerLicenseLegalMetadataResult {
  component: LegalComponent;
  licenseLegalMetadata: LicenseLegalMetadatum[];
}

export interface LegalComponent {
  packageUrl: string;
  hash: string;
  componentIdentifier: ComponentIdentifier;
  displayName: string;
  licenseLegalData: LicenseLegalData;
}

export interface LicenseLegalData {
  declaredLicenses: string[];
  observedLicenses: string[];
  effectiveLicenses: string[];
  highestEffectiveLicenseThreatGroup: string;
  copyrights: Copyright[];
  licenseFiles: Copyright[];
  noticeFiles: Copyright[];
  obligations: LicenseLegalDataObligation[];
}

export interface Copyright {
  id: number | null;
  content: string;
  originalContentHash: string;
  status: string;
  relPath?: string;
}

export interface LicenseLegalDataObligation {
  name: string;
  status: string;
  comment?: string;
  ownerId?: string;
  lastUpdatedAt?: number;
  lastUpdatedByUsername?: string;
}

export interface LicenseLegalMetadatum {
  licenseId: string;
  licenseName: string;
  licenseText: null | string;
  obligations: LicenseLegalMetadatumObligation[];
  threatGroup?: ThreatGroup;
  isMulti?: boolean;
}

export interface LicenseLegalMetadatumObligation {
  name: string;
  obligationTexts: string[];
}

export interface ThreatGroup {
  name: string;
  threatLevel: number;
}
