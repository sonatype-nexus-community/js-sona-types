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

// GET /api/v2/evaluation/applications/{applicationInternalId}/results/{resultId}

import { LicenseData, SecurityData } from './ComponentDetails';
import { PolicyComponent } from './IqServerPolicyReportResult';

export interface IqServerComponentPolicyEvaluationResult {
  submittedDate: Date;
  evaluationDate: Date;
  applicationId: string;
  results: Result[];
  isError: boolean;
  errorMessage: null;
}

export interface Result {
  component: PolicyComponent;
  matchState: string;
  catalogDate: Date;
  licenseData: LicenseData;
  securityData: SecurityData;
  policyData: PolicyData;
}

export interface PolicyData {
  policyViolations: PolicyViolation[];
}

export interface PolicyViolation {
  policyId: string;
  policyName: string;
  threatLevel: number;
  constraintViolations: ConstraintViolation[];
}

export interface ConstraintViolation {
  constraintId: string;
  constraintName: string;
  reasons: Reason[];
}

export interface Reason {
  reason: string;
}
