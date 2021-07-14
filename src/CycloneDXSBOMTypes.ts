/*
 * Copyright (c) 2020-Present Erlend Oftedal, Steve Springett, Sonatype, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

export interface Bom {
  '@serial-number': string;
  '@version': number;
  '@xmlns': string;
  metadata: Metadata;
  components: Array<CycloneDXComponent>;
  dependencies: Array<Dependency>;
}

export interface CycloneDXComponent {
  '@type': string;
  '@bom-ref': string;
  group: string;
  name: string;
  version: string;
  description?: GenericDescription;
  hashes?: Array<Hash>;
  licenses?: Array<any>;
  purl: string;
  externalReferences?: Array<ExternalReference>;
}

export interface GenericDescription {
  '#cdata': string;
  '@content-type'?: string;
}

export interface Dependency {
  '@ref': string;
  dependencies?: Array<Dependency>;
}

export interface ExternalReference {
  reference: Reference;
}

export interface Reference {
  '@type': string;
  url: string;
}

export interface Hash {
  hash: HashDetails;
}

export interface HashDetails {
  '@alg': string;
  '#text': string;
}

export interface LicenseContent {
  id?: string;
  name?: string;
  text?: GenericDescription;
}

export interface Metadata {
  timestamp: string;
  component: CycloneDXComponent;
}
