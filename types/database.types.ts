export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// ── Enums ─────────────────────────────────────────────────────

export type UserRole = 'gc' | 'subcontractor';
export type AppRole  = 'admin' | 'project_manager' | 'auditor' | 'finance' | 'subcontractor';
export type ProjectStatus = 'active' | 'archived';
export type ComplianceStatus = 'compliant' | 'warning' | 'non_compliant';
export type DocumentType = 'COI' | 'Certified Payroll' | 'W9';
export type DocumentStatus = 'pending' | 'approved' | 'rejected' | 'pending_verification';
export type DocumentEventType = 'uploaded' | 'ai_review' | 'notification_sent' | 'manual_override' | 'superseded';
export type SystemLogLevel = 'info' | 'warn' | 'error';
export type AuditStatus = 'Pending' | 'Verified' | 'Flagged';
export type AccessResult = 'GRANTED' | 'DENIED';
export type ComplianceDocType = 'COI' | 'License' | 'Golden Thread';
export type PaymentStatus = 'Clear to Pay' | 'Compliance Hold' | 'Manual Review';
export type NudgeAlertType = 'flagged' | 'expiry_7d' | 'expiry_48h' | 'hard_stop';
export type NudgeChannel   = 'email' | 'sms' | 'whatsapp';
export type NudgeStatus    = 'sent' | 'failed' | 'skipped';
export type SafetyDocType  = 'RAMS' | 'Safety Policy' | 'Training Records';
export type SafetyRiskLevel = 'Low' | 'Medium' | 'High' | 'Critical';
export type SafetyApprovalStatus = 'Under Review' | 'Approved' | 'Rejected';
export type FaceMatchResult = 'match' | 'suspected_impersonation' | 'no_profile_photo' | 'error';
export type NotificationLogType = 'EXPIRY_WARNING' | 'AUDIT_REJECTION' | 'ACCESS_REVOKED';
export type NotificationChannel = 'EMAIL' | 'SMS';
export type NotificationStatus  = 'sent' | 'failed' | 'skipped';

export type DocumentEventMetadata = {
  result?: 'approved' | 'rejected' | 'pending_verification';
  reason?: string | null;
  recipient?: string;
  note?: string;
  previous_status?: string;
  type?: 'expiry_warning';
  days_until_expiry?: number;
  company_name?: string;
  source?: string;
  // AI review enrichment
  extracted_company?: string;
  expiry_date?: string;
  coverage_amount?: number;
  // Versioning
  superseded_by?: string;
};

// ── Database ───────────────────────────────────────────────────

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string;
          name: string;
          size: string | null;
          owner_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          size?: string | null;
          owner_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          size?: string | null;
          owner_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          company_name: string | null;
          role: UserRole;
          app_role: AppRole | null;
          organization_id: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          company_name?: string | null;
          role: UserRole;
          app_role?: AppRole | null;
          organization_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          company_name?: string | null;
          role?: UserRole;
          app_role?: AppRole | null;
          organization_id?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      projects: {
        Row: {
          id: string;
          created_at: string;
          name: string;
          location: string | null;
          status: ProjectStatus;
          organization_id: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          name: string;
          location?: string | null;
          status?: ProjectStatus;
          organization_id?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          name?: string;
          location?: string | null;
          status?: ProjectStatus;
          organization_id?: string | null;
        };
        Relationships: [];
      };
      subcontractors: {
        Row: {
          id: string;
          project_id: string;
          user_id: string | null;
          company_name: string;
          contact_email: string;
          compliance_status: ComplianceStatus;
          organization_id: string | null;
          risk_score: number;
          primary_contact_name: string | null;
          primary_contact_phone: string | null;
          invite_token: string | null;
          invite_expires_at: string | null;
          portal_submitted_at: string | null;
          payment_status: PaymentStatus;
          profile_photo_url: string | null;
          safety_induction_complete: boolean;
          induction_date: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          user_id?: string | null;
          company_name: string;
          contact_email: string;
          compliance_status?: ComplianceStatus;
          organization_id?: string | null;
          risk_score?: number;
          primary_contact_name?: string | null;
          primary_contact_phone?: string | null;
          invite_token?: string | null;
          invite_expires_at?: string | null;
          portal_submitted_at?: string | null;
          payment_status?: PaymentStatus;
          profile_photo_url?: string | null;
          safety_induction_complete?: boolean;
          induction_date?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          user_id?: string | null;
          company_name?: string;
          contact_email?: string;
          compliance_status?: ComplianceStatus;
          organization_id?: string | null;
          invite_token?: string | null;
          invite_expires_at?: string | null;
          portal_submitted_at?: string | null;
          risk_score?: number;
          primary_contact_name?: string | null;
          primary_contact_phone?: string | null;
          payment_status?: PaymentStatus;
          profile_photo_url?: string | null;
          safety_induction_complete?: boolean;
          induction_date?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'subcontractors_project_id_fkey';
            columns: ['project_id'];
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          },
        ];
      };
      system_logs: {
        Row: {
          id: string;
          event: string;
          level: SystemLogLevel;
          message: string;
          metadata: Record<string, unknown>;
          created_at: string;
        };
        Insert: {
          id?: string;
          event: string;
          level: SystemLogLevel;
          message: string;
          metadata?: Record<string, unknown>;
          created_at?: string;
        };
        Update: never;
        Relationships: [];
      };
      document_events: {
        Row: {
          id: string;
          document_id: string;
          event_type: DocumentEventType;
          actor: string | null;
          metadata: DocumentEventMetadata;
          created_at: string;
        };
        Insert: {
          id?: string;
          document_id: string;
          event_type: DocumentEventType;
          actor?: string | null;
          metadata?: DocumentEventMetadata;
          created_at?: string;
        };
        Update: {
          id?: string;
          document_id?: string;
          event_type?: DocumentEventType;
          actor?: string | null;
          metadata?: DocumentEventMetadata;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'document_events_document_id_fkey';
            columns: ['document_id'];
            referencedRelation: 'documents';
            referencedColumns: ['id'];
          },
        ];
      };
      documents: {
        Row: {
          id: string;
          subcontractor_id: string;
          type: DocumentType;
          status: DocumentStatus;
          expiry_date: string | null;
          file_path: string | null;
          rejection_reason: string | null;
          last_notified_at: string | null;
          organization_id: string | null;
          is_current: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          subcontractor_id: string;
          type: DocumentType;
          status?: DocumentStatus;
          expiry_date?: string | null;
          file_path?: string | null;
          rejection_reason?: string | null;
          last_notified_at?: string | null;
          organization_id?: string | null;
          is_current?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          subcontractor_id?: string;
          type?: DocumentType;
          status?: DocumentStatus;
          expiry_date?: string | null;
          file_path?: string | null;
          rejection_reason?: string | null;
          last_notified_at?: string | null;
          organization_id?: string | null;
          is_current?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'documents_subcontractor_id_fkey';
            columns: ['subcontractor_id'];
            referencedRelation: 'subcontractors';
            referencedColumns: ['id'];
          },
        ];
      };
      prequal_submissions: {
        Row: {
          id: string;
          subcontractor_id: string | null;
          had_site_incident: boolean | null;
          bonding_capacity_usd: number | null;
          trade_accreditation_no: string | null;
          submitted_at: string | null;
          status: 'pending' | 'approved' | 'rejected';
          review_notes: string | null;
        };
        Insert: {
          id?: string;
          subcontractor_id?: string | null;
          had_site_incident?: boolean | null;
          bonding_capacity_usd?: number | null;
          trade_accreditation_no?: string | null;
          submitted_at?: string | null;
          status?: 'pending' | 'approved' | 'rejected';
          review_notes?: string | null;
        };
        Update: {
          id?: string;
          subcontractor_id?: string | null;
          had_site_incident?: boolean | null;
          bonding_capacity_usd?: number | null;
          trade_accreditation_no?: string | null;
          submitted_at?: string | null;
          status?: 'pending' | 'approved' | 'rejected';
          review_notes?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'prequal_submissions_subcontractor_id_fkey';
            columns: ['subcontractor_id'];
            referencedRelation: 'subcontractors';
            referencedColumns: ['id'];
          },
        ];
      };
      safety_documents: {
        Row: {
          id: string;
          subcontractor_id: string | null;
          project_id: string | null;
          organization_id: string | null;
          doc_type: string;
          file_path: string;
          risk_level: string | null;
          identified_hazards: Json | null;
          has_risk_matrix: boolean | null;
          has_emergency_procedures: boolean | null;
          approval_status: string | null;
          notes: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          subcontractor_id?: string | null;
          project_id?: string | null;
          organization_id?: string | null;
          doc_type: string;
          file_path: string;
          risk_level?: string | null;
          identified_hazards?: Json | null;
          has_risk_matrix?: boolean | null;
          has_emergency_procedures?: boolean | null;
          approval_status?: string | null;
          notes?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          subcontractor_id?: string | null;
          project_id?: string | null;
          organization_id?: string | null;
          doc_type?: string;
          file_path?: string;
          risk_level?: string | null;
          identified_hazards?: Json | null;
          has_risk_matrix?: boolean | null;
          has_emergency_procedures?: boolean | null;
          approval_status?: string | null;
          notes?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'safety_documents_subcontractor_id_fkey';
            columns: ['subcontractor_id'];
            referencedRelation: 'subcontractors';
            referencedColumns: ['id'];
          },
        ];
      };
      audit_events: {
        Row: {
          id: string;
          subcontractor_id: string | null;
          organization_id: string | null;
          user_id: string | null;
          event_type: 'Audit' | 'Gate Scan' | 'Manual Override' | 'Nudge Sent' | 'Invite Sent' | 'Portal Submission' | 'Payment Update' | 'Safety Audit' | 'Role Change' | 'Access Denied';
          description: string;
          actor: string;
          metadata: Record<string, unknown>;
          created_at: string;
        };
        Insert: {
          id?: string;
          subcontractor_id?: string | null;
          organization_id?: string | null;
          user_id?: string | null;
          event_type: 'Audit' | 'Gate Scan' | 'Manual Override' | 'Nudge Sent' | 'Invite Sent' | 'Portal Submission' | 'Payment Update' | 'Safety Audit' | 'Role Change' | 'Access Denied';
          description: string;
          actor?: string;
          metadata?: Record<string, unknown>;
          created_at?: string;
        };
        Update: never;
        Relationships: [
          {
            foreignKeyName: 'audit_events_subcontractor_id_fkey';
            columns: ['subcontractor_id'];
            referencedRelation: 'subcontractors';
            referencedColumns: ['id'];
          },
        ];
      };
      gc_notifications: {
        Row: {
          id: string;
          organization_id: string | null;
          message: string;
          is_read: boolean | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          organization_id?: string | null;
          message: string;
          is_read?: boolean | null;
          created_at?: string | null;
        };
        Update: {
          is_read?: boolean;
        };
        Relationships: [];
      };
      compliance_docs: {
        Row: {
          id: string;
          subcontractor_id: string;
          organization_id: string | null;
          doc_type: ComplianceDocType;
          doc_name: string;
          audit_status: AuditStatus;
          expiry_date: string | null;
          file_path: string | null;
          notes: string | null;
          verified_by: string | null;
          verified_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          subcontractor_id: string;
          organization_id?: string | null;
          doc_type: ComplianceDocType;
          doc_name: string;
          audit_status?: AuditStatus;
          expiry_date?: string | null;
          file_path?: string | null;
          notes?: string | null;
          verified_by?: string | null;
          verified_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          subcontractor_id?: string;
          organization_id?: string | null;
          doc_type?: ComplianceDocType;
          doc_name?: string;
          audit_status?: AuditStatus;
          expiry_date?: string | null;
          file_path?: string | null;
          notes?: string | null;
          verified_by?: string | null;
          verified_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'compliance_docs_subcontractor_id_fkey';
            columns: ['subcontractor_id'];
            referencedRelation: 'subcontractors';
            referencedColumns: ['id'];
          },
        ];
      };
      nudge_logs: {
        Row: {
          id:                string;
          subcontractor_id:  string;
          organization_id:   string | null;
          alert_type:        NudgeAlertType;
          channel:           NudgeChannel;
          recipient_contact: string;
          status:            NudgeStatus;
          metadata:          Record<string, unknown> | null;
          created_at:        string | null;
        };
        Insert: {
          id?:               string;
          subcontractor_id?: string | null;
          organization_id?:  string | null;
          alert_type:        string;
          channel:           string;
          recipient_contact: string;
          status?:           string | null;
          metadata?:         Record<string, unknown> | null;
          created_at?:       string | null;
        };
        Update: never;
        Relationships: [
          {
            foreignKeyName: 'nudge_logs_subcontractor_id_fkey';
            columns: ['subcontractor_id'];
            referencedRelation: 'subcontractors';
            referencedColumns: ['id'];
          },
        ];
      };
      site_access_logs: {
        Row: {
          id: string;
          subcontractor_id: string;
          organization_id: string | null;
          result: AccessResult;
          denial_reasons: string[] | null;
          scanned_by: string | null;
          gate_location: string | null;
          qr_payload: string | null;
          photo_url: string | null;
          face_match_score: number | null;
          face_match_result: FaceMatchResult | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          subcontractor_id: string;
          organization_id?: string | null;
          result: AccessResult;
          denial_reasons?: string[] | null;
          scanned_by?: string | null;
          gate_location?: string | null;
          qr_payload?: string | null;
          photo_url?: string | null;
          face_match_score?: number | null;
          face_match_result?: FaceMatchResult | null;
          created_at?: string;
        };
        Update: {
          photo_url?: string | null;
          face_match_score?: number | null;
          face_match_result?: FaceMatchResult | null;
        };
        Relationships: [
          {
            foreignKeyName: 'site_access_logs_subcontractor_id_fkey';
            columns: ['subcontractor_id'];
            referencedRelation: 'subcontractors';
            referencedColumns: ['id'];
          },
        ];
      };
      in_app_notifications: {
        Row: {
          id:              string;
          user_id:         string | null;
          organization_id: string | null;
          type:            string | null;
          title:           string;
          message:         string;
          link:            string | null;
          is_read:         boolean | null;
          created_at:      string | null;
        };
        Insert: {
          id?:             string;
          user_id?:        string | null;
          organization_id?: string | null;
          type?:           string | null;
          title:           string;
          message:         string;
          link?:           string | null;
          is_read?:        boolean | null;
          created_at?:     string | null;
        };
        Update: {
          is_read?: boolean | null;
        };
        Relationships: [];
      };
      notification_logs: {
        Row: {
          id:               string;
          subcontractor_id: string;
          organization_id:  string | null;
          type:             NotificationLogType;
          channel:          NotificationChannel;
          recipient:        string;
          status:           NotificationStatus;
          metadata:         Record<string, unknown>;
          sent_at:          string;
        };
        Insert: {
          id?:              string;
          subcontractor_id: string;
          organization_id?: string | null;
          type:             NotificationLogType;
          channel:          NotificationChannel;
          recipient:        string;
          status:           NotificationStatus;
          metadata?:        Record<string, unknown>;
          sent_at?:         string;
        };
        Update: never;
        Relationships: [
          {
            foreignKeyName: 'notification_logs_subcontractor_id_fkey';
            columns: ['subcontractor_id'];
            referencedRelation: 'subcontractors';
            referencedColumns: ['id'];
          },
        ];
      };
      push_subscriptions: {
        Row: {
          id:                string;
          user_id:           string | null;
          organization_id:   string | null;
          subscription_json: Record<string, unknown>;
          created_at:        string | null;
        };
        Insert: {
          id?:               string;
          user_id?:          string | null;
          organization_id?:  string | null;
          subscription_json: Record<string, unknown>;
          created_at?:       string | null;
        };
        Update: {
          subscription_json?: Record<string, unknown>;
        };
        Relationships: [];
      };
      project_risk_history: {
        Row: {
          id: string;
          project_id: string;
          organization_id: string | null;
          snapshot_date: string;
          avg_risk_score: number;
          total_subs: number;
          site_ready_pct: number;
          payment_blocked_pct: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          organization_id?: string | null;
          snapshot_date?: string;
          avg_risk_score: number;
          total_subs: number;
          site_ready_pct: number;
          payment_blocked_pct: number;
          created_at?: string;
        };
        Update: {
          avg_risk_score?: number;
          total_subs?: number;
          site_ready_pct?: number;
          payment_blocked_pct?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'project_risk_history_project_id_fkey';
            columns: ['project_id'];
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          },
        ];
      };
      payment_certificates: {
        Row: {
          id:                        string;
          organization_id:           string | null;
          subcontractor_id:          string | null;
          amount:                    number;
          period_start:              string;
          period_end:                string;
          compliance_snapshot_score: number | null;
          status:                    'pending' | 'escrowed' | 'approved' | 'released' | null;
          rejection_reasons:         Record<string, unknown>[] | null;
          created_at:                string | null;
        };
        Insert: {
          id?:                        string;
          organization_id?:           string | null;
          subcontractor_id?:          string | null;
          amount:                     number;
          period_start:               string;
          period_end:                 string;
          compliance_snapshot_score?: number | null;
          status?:                    'pending' | 'escrowed' | 'approved' | 'released' | null;
          rejection_reasons?:         Record<string, unknown>[] | null;
          created_at?:                string | null;
        };
        Update: {
          status?:                    'pending' | 'escrowed' | 'approved' | 'released' | null;
          compliance_snapshot_score?: number | null;
          rejection_reasons?:         Record<string, unknown>[] | null;
        };
        Relationships: [
          {
            foreignKeyName: 'payment_certificates_subcontractor_id_fkey';
            columns: ['subcontractor_id'];
            referencedRelation: 'subcontractors';
            referencedColumns: ['id'];
          },
        ];
      };
      site_journals: {
        Row: {
          id:               string;
          organization_id:  string | null;
          photo_url:        string | null;
          ai_summary:       string | null;
          ai_caveats:       unknown[] | null;
          ai_quality_rating: string | null;
          created_at:       string | null;
        };
        Insert: {
          id?:               string;
          organization_id?:  string | null;
          photo_url?:        string | null;
          ai_summary?:       string | null;
          ai_caveats?:       unknown[] | null;
          ai_quality_rating?: string | null;
          created_at?:       string | null;
        };
        Update: {
          photo_url?:        string | null;
          ai_summary?:       string | null;
          ai_caveats?:       unknown[] | null;
          ai_quality_rating?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'site_journals_organization_id_fkey';
            columns: ['organization_id'];
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      subcontractor_leaderboard: {
        Row: {
          id:               string;
          company_name:     string;
          compliance_status: string;
          risk_score:       number;
          organization_id:  string | null;
          project_name:     string;
          rank:             number;
        };
        Relationships: [];
      };
      project_risk_analytics: {
        Row: {
          project_id: string;
          project_name: string;
          organization_id: string | null;
          total_subs: number;
          avg_risk_score: number;
          site_ready_pct: number;
          payment_blocked_pct: number;
          critical_count: number;
          elevated_count: number;
        };
        Relationships: [];
      };
      attendance_daily_summary: {
        Row: {
          organization_id:  string | null;
          subcontractor_id: string;
          scan_date:        string;
          granted_count:    number;
          denied_count:     number;
          first_entry:      string | null;
          last_entry:       string | null;
        };
        Relationships: [];
      };
      last_seen_workers: {
        Row: {
          log_id:            string;
          subcontractor_id:  string;
          organization_id:   string | null;
          last_seen_at:      string;
          company_name:      string;
          profile_photo_url: string | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      create_hard_stop_escalation: {
        Args: {
          p_subcontractor_id: string;
          p_organization_id: string;
          p_company_name: string;
        };
        Returns: void;
      };
      fn_take_risk_snapshot: {
        Args: Record<string, never>;
        Returns: void;
      };
      fn_log_access_denied: {
        Args: { p_attempted_path: string; p_user_role: string };
        Returns: void;
      };
      get_my_app_role: {
        Args: Record<string, never>;
        Returns: AppRole;
      };
      fn_log_audit_event: {
        Args: {
          p_subcontractor_id?: string | null;
          p_organization_id?: string | null;
          p_event_type?: string;
          p_description?: string;
          p_actor?: string;
          p_metadata?: Record<string, unknown>;
        };
        Returns: void;
      };
      fn_review_prequal: {
        Args: {
          p_prequal_id: string;
          p_verdict: string;
          p_notes?: string | null;
        };
        Returns: void;
      };
    };
    Enums: {
      user_role: UserRole;
      project_status: ProjectStatus;
      compliance_status: ComplianceStatus;
      document_type: DocumentType;
      document_status: DocumentStatus;
      audit_status: AuditStatus;
      access_result: AccessResult;
      compliance_doc_type: ComplianceDocType;
    };
  };
}

// ── Convenience row types ──────────────────────────────────────

export type Organization   = Database['public']['Tables']['organizations']['Row'];
export type Profile        = Database['public']['Tables']['profiles']['Row'];
export type Project        = Database['public']['Tables']['projects']['Row'];
export type Subcontractor  = Database['public']['Tables']['subcontractors']['Row'];
export type Document       = Database['public']['Tables']['documents']['Row'];
export type DocumentEvent  = Database['public']['Tables']['document_events']['Row'];
export type SystemLog      = Database['public']['Tables']['system_logs']['Row'];
export type ComplianceDoc      = Database['public']['Tables']['compliance_docs']['Row'];
export type SiteAccessLog      = Database['public']['Tables']['site_access_logs']['Row'];
export type PrequalStatus      = 'pending' | 'approved' | 'rejected';
export type PrequalSubmission  = Database['public']['Tables']['prequal_submissions']['Row'];
export type GcNotification     = Database['public']['Tables']['gc_notifications']['Row'];
export type AuditEvent         = Database['public']['Tables']['audit_events']['Row'];
export type NudgeLog           = Database['public']['Tables']['nudge_logs']['Row'];
export type SafetyDocument     = Database['public']['Tables']['safety_documents']['Row'];
export type ProjectRiskHistory = Database['public']['Tables']['project_risk_history']['Row'];
export type ProjectRiskAnalytics = Database['public']['Views']['project_risk_analytics']['Row'];
export type PushSubscription     = Database['public']['Tables']['push_subscriptions']['Row'];
export type NotificationLog      = Database['public']['Tables']['notification_logs']['Row'];
export type InAppNotification      = Database['public']['Tables']['in_app_notifications']['Row'];
export type LeaderboardEntry       = Database['public']['Views']['subcontractor_leaderboard']['Row'];
export type AttendanceDailySummary = Database['public']['Views']['attendance_daily_summary']['Row'];
export type LastSeenWorker         = Database['public']['Views']['last_seen_workers']['Row'];
export type SiteJournal            = Database['public']['Tables']['site_journals']['Row'];
export type PaymentCertificate     = Database['public']['Tables']['payment_certificates']['Row'];
export type CertStatus             = PaymentCertificate['status'];

