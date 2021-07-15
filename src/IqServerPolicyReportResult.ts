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

// A response from endpoint similar to: GET /api/v2/applications/{applicationId}/reports/{reportId}/policy

export interface IqServerPolicyReportResult {
  reportTime: number;
  reportTitle: string;
  commitHash: string;
  initiator: string;
  application: Application;
  counts: Counts;
  components: PolicyComponent[];
}

export interface Application {
  id: string;
  publicId: string;
  name: string;
  organizationId: string;
  contactUserName: string;
}

export interface PolicyComponent {
  hash: string;
  matchState: string;
  componentIdentifier: ComponentIdentifier;
  packageUrl: string;
  proprietary: boolean;
  pathnames: string[];
  dependencyData?: DependencyData;
  violations: Violation[];
  displayName?: string;
}

export interface ComponentIdentifier {
  format: string;
  coordinates: Coordinates;
}

export interface Coordinates {
  artifactId: string;
  classifier: string;
  extension: string;
  groupId: string;
  version: string;
}

export interface DependencyData {
  directDependency: boolean;
  innerSource: boolean;
  innerSourceData?: InnerSourceDatum[];
  parentComponentPurls?: string[];
}

export interface InnerSourceDatum {
  ownerApplicationName: string;
  ownerApplicationId: string;
  innerSourceComponentPurl?: string;
}

export interface Violation {
  policyId: string;
  policyName: string;
  policyThreatCategory: string;
  policyThreatLevel: number;
  policyViolationId: string;
  waived: boolean;
  grandfathered: boolean;
  constraints: Constraint[];
}

export interface Constraint {
  constraintId: string;
  constraintName: string;
  conditions: Condition[];
}

export interface Condition {
  conditionSummary: string;
  conditionReason: string;
}

export interface Counts {
  partiallyMatchedComponentCount: number;
  exactlyMatchedComponentCount: number;
  totalComponentCount: number;
  grandfatheredPolicyViolationCount: number;
}
