export type AuditEventType = 'suite_created' | 'suite_updated' | 'suite_extended' | 'code_generated' | 'code_exported';

export interface AuditEvent {
  id: string;
  timestamp: string;
  type: AuditEventType;
  title: string;
  details: string;
  testCaseId: string;
}
