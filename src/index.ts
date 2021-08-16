// OSS Index
export { OSSIndexRequestService } from './OSSIndexRequestService.js';

// IQ Server
export { IqRequestService } from './IqRequestService.js';
export { IqApplicationResponse, Application } from './IqApplicationResponse.js';
export { IqThirdPartyAPIServerPollingResult } from './IqThirdPartyAPIServerPollingResult.js';
export { IqThirdPartyAPIStatusResponse } from './IqThirdPartyAPIStatusResponse.js';
export { IqServerPolicyReportResult, PolicyComponent } from './IqServerPolicyReportResult.js';
export {
  IqServerVulnerabilityDetails,
  Advisory,
  MainSeverity,
  SeverityScore,
  Source,
  Weakness,
  CweID,
} from './IqServerVulnerabilityDetails.js';
export {
  IqServerComponentPolicyEvaluationResult,
  Result,
  PolicyData,
  PolicyViolation,
  ConstraintViolation,
  Reason,
} from './IqServerComponentPolicyEvaluationResult.js';
export {
  IqServerLicenseLegalMetadataResult,
  LegalComponent,
  LicenseLegalData,
  LicenseLegalDataObligation,
  HighestEffectiveLicenseThreatGroup,
  Copyright,
  LicenseLegalMetadatum,
  LicenseLegalMetadatumObligation,
  ThreatGroup,
} from './IqServerLicenseLegalMetadataResult.js';
export {
  IqServerComponentRemediationResult,
  Remediation,
  VersionChange,
  Data,
  RemediationComponent,
} from './IqServerComponentRemediationResult.js';

// CycloneDX
export { CycloneDXSBOMCreator, CycloneDXOptions } from './CycloneDXSBOMCreator.js';
export {
  Bom,
  CycloneDXComponent,
  GenericDescription,
  Dependency,
  ExternalReference,
  Reference,
  Hash,
  HashDetails,
  LicenseContent,
  Metadata,
} from './CycloneDXSBOMTypes.js';

// Common
export {
  ComponentDetails,
  ComponentContainer,
  SonatypeComponent,
  ComponentIdentifier,
  Coordinates,
  SecurityData,
  SecurityIssue,
  LicenseData,
  LicenseDetail,
} from './ComponentDetails.js';
export { ILogger, TestLogger, DEBUG, ERROR, TRACE } from './ILogger.js';
export { RequestServiceOptions, RequestService } from './RequestService';
