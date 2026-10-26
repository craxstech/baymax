CREATE TYPE "public"."access_role" AS ENUM('OWNER', 'CAREGIVER');--> statement-breakpoint
CREATE TYPE "public"."alert_status" AS ENUM('SENDING', 'COMPLETED', 'PARTIAL', 'FAILED', 'NO_CHANNEL');--> statement-breakpoint
CREATE TYPE "public"."consent_kind" AS ENUM('TERMS', 'PRIVACY', 'HEALTH_PROCESSING', 'AI_PROCESSING', 'MARKETING', 'WOMENS_HEALTH');--> statement-breakpoint
CREATE TYPE "public"."consultation_status" AS ENUM('REQUESTED', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'RESCHEDULED', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."contact_message_status" AS ENUM('NEW', 'READ', 'CLOSED');--> statement-breakpoint
CREATE TYPE "public"."cycle_flow" AS ENUM('SPOTTING', 'LIGHT', 'MEDIUM', 'HEAVY');--> statement-breakpoint
CREATE TYPE "public"."delivery_channel" AS ENUM('SMS', 'EMAIL', 'IN_APP');--> statement-breakpoint
CREATE TYPE "public"."delivery_status" AS ENUM('PENDING', 'SENT', 'FAILED', 'UNAVAILABLE');--> statement-breakpoint
CREATE TYPE "public"."dose_status" AS ENUM('PENDING', 'TAKEN', 'SKIPPED', 'MISSED');--> statement-breakpoint
CREATE TYPE "public"."finding_flag" AS ENUM('NORMAL', 'HIGH', 'LOW', 'ABNORMAL', 'UNKNOWN');--> statement-breakpoint
CREATE TYPE "public"."history_category" AS ENUM('CONDITION', 'ALLERGY', 'SURGERY', 'HOSPITALIZATION', 'FAMILY_HISTORY', 'IMMUNIZATION', 'PROVIDER', 'MEASUREMENT', 'VISIT', 'NOTE');--> statement-breakpoint
CREATE TYPE "public"."history_source" AS ENUM('PATIENT', 'CAREGIVER', 'CLINICIAN', 'IMPORT');--> statement-breakpoint
CREATE TYPE "public"."integration_type" AS ENUM('AI', 'EMAIL', 'SMS', 'STORAGE', 'PHARMACY', 'CONSULTATION', 'OCR');--> statement-breakpoint
CREATE TYPE "public"."job_status" AS ENUM('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."notification_category" AS ENUM('MEDICATION', 'CONSULTATION', 'PRESCRIPTION', 'ORDER', 'REPORT', 'HEALTH_REMINDER', 'FAMILY', 'EMERGENCY', 'SYSTEM');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('DRAFT', 'AWAITING_PROVIDER', 'CONFIRMED', 'PROCESSING', 'DISPATCHED', 'DELIVERED', 'CANCELLED', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."prescription_status" AS ENUM('UNVERIFIED', 'VERIFIED', 'REJECTED', 'EXPIRED');--> statement-breakpoint
CREATE TYPE "public"."report_status" AS ENUM('UPLOADED', 'EXTRACTING', 'READY', 'AI_ANALYSIS_READY', 'OCR_UNAVAILABLE', 'AI_UNAVAILABLE', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."token_type" AS ENUM('EMAIL_VERIFY', 'PASSWORD_RESET', 'CAREGIVER_INVITE');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('USER', 'ADMIN');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('ACTIVE', 'SUSPENDED', 'DELETED');--> statement-breakpoint
CREATE TYPE "public"."verification_event_type" AS ENUM('UPLOADED', 'DETAILS_RECORDED', 'PROVIDER_CHECK', 'FAILED', 'SUPERSEDED');--> statement-breakpoint
CREATE TYPE "public"."webhook_status" AS ENUM('RECEIVED', 'PROCESSED', 'FAILED', 'IGNORED');--> statement-breakpoint
CREATE TABLE "account_deletion_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email_hash" text NOT NULL,
	"requested_by_user_id" uuid NOT NULL,
	"reason" text,
	"deleted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"member_id" uuid,
	"title" text NOT NULL,
	"include_health_context" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"safety_level" text DEFAULT 'STANDARD' NOT NULL,
	"feedback" text,
	"provider" text,
	"model" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "alert_deliveries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"alert_id" uuid NOT NULL,
	"contact_id" uuid,
	"channel" "delivery_channel" NOT NULL,
	"status" "delivery_status" DEFAULT 'PENDING' NOT NULL,
	"provider_reference" text,
	"error_message" text,
	"attempted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ambulance_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"alert_id" uuid,
	"user_id" uuid NOT NULL,
	"provider" text DEFAULT 'unconfigured' NOT NULL,
	"status" text DEFAULT 'UNAVAILABLE' NOT NULL,
	"provider_request_id" text,
	"detail" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "appointments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"provider_appointment_id" text,
	"doctor_profile_id" uuid,
	"scheduled_at" timestamp with time zone NOT NULL,
	"timezone" text NOT NULL,
	"kind" text DEFAULT 'VIDEO' NOT NULL,
	"status" "consultation_status" DEFAULT 'REQUESTED' NOT NULL,
	"join_url" text,
	"notes" text,
	"follow_up" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_user_id" uuid,
	"member_id" uuid,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"ip_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"type" "token_type" NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "background_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" text NOT NULL,
	"dedupe_key" text NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" "job_status" DEFAULT 'PENDING' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"run_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "caregiver_invites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"email" text NOT NULL,
	"permissions" jsonb NOT NULL,
	"token_hash" text NOT NULL,
	"invited_by_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"accepted_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "consents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"member_id" uuid,
	"kind" "consent_kind" NOT NULL,
	"version" text NOT NULL,
	"granted" boolean NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "contact_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"topic" text NOT NULL,
	"message" text NOT NULL,
	"status" "contact_message_status" DEFAULT 'NEW' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cycle_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date,
	"flow" "cycle_flow",
	"symptoms" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"mood" text,
	"energy" text,
	"notes_encrypted" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "doctor_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" text NOT NULL,
	"provider_clinician_id" text NOT NULL,
	"display_name" text NOT NULL,
	"specialties" jsonb NOT NULL,
	"languages" jsonb NOT NULL,
	"credentials" text,
	"credential_verified_at" timestamp with time zone,
	"availability_summary" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "emergency_contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"name" text NOT NULL,
	"relationship" text NOT NULL,
	"phone" text NOT NULL,
	"email" text,
	"is_primary" boolean DEFAULT false NOT NULL,
	"consent_to_contact" boolean DEFAULT true NOT NULL,
	"consent_to_share_health" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "families" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"owner_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "family_access" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "access_role" DEFAULT 'CAREGIVER' NOT NULL,
	"can_view" boolean DEFAULT true NOT NULL,
	"can_manage" boolean DEFAULT false NOT NULL,
	"can_manage_medications" boolean DEFAULT false NOT NULL,
	"can_receive_alerts" boolean DEFAULT false NOT NULL,
	"granted_by_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "family_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"family_id" uuid NOT NULL,
	"name" text NOT NULL,
	"date_of_birth" date,
	"relationship" text NOT NULL,
	"sex" text,
	"preferred_language" text DEFAULT 'English' NOT NULL,
	"phone" text,
	"email" text,
	"blood_group" text,
	"is_self" boolean DEFAULT false NOT NULL,
	"avatar_tone" integer DEFAULT 0 NOT NULL,
	"created_by_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_user_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	"storage_key" text NOT NULL,
	"original_name" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"checksum" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "integration_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" "integration_type" NOT NULL,
	"status" text NOT NULL,
	"summary" text NOT NULL,
	"detail" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meal_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"logged_on" date NOT NULL,
	"meal_type" text NOT NULL,
	"description" text NOT NULL,
	"water_ml" integer DEFAULT 0 NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meal_plan_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan_id" uuid NOT NULL,
	"day_index" integer NOT NULL,
	"meal_type" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"ingredients" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meal_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"title" text NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"generated_from_preferences" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "medical_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"category" "history_category" NOT NULL,
	"title" text NOT NULL,
	"details" text,
	"status" text,
	"severity" text,
	"recorded_at" date NOT NULL,
	"source" "history_source" DEFAULT 'PATIENT' NOT NULL,
	"recorded_by_id" uuid NOT NULL,
	"clinician_name" text,
	"attachment_file_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "medical_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"file_id" uuid,
	"title" text NOT NULL,
	"category" text NOT NULL,
	"report_date" date NOT NULL,
	"status" "report_status" DEFAULT 'UPLOADED' NOT NULL,
	"extracted_text" text,
	"ai_summary" text,
	"limitations" text,
	"analysis_model" text,
	"analyzed_at" timestamp with time zone,
	"error_message" text,
	"created_by_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "medication_doses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"medication_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	"scheduled_at" timestamp with time zone NOT NULL,
	"scheduled_date" date NOT NULL,
	"scheduled_time" text NOT NULL,
	"timezone" text NOT NULL,
	"status" "dose_status" DEFAULT 'PENDING' NOT NULL,
	"acted_at" timestamp with time zone,
	"acted_by_id" uuid,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "medications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"prescription_id" uuid NOT NULL,
	"name" text NOT NULL,
	"strength" text NOT NULL,
	"dosage_form" text NOT NULL,
	"prescribed_dose" text NOT NULL,
	"route" text NOT NULL,
	"frequency" text NOT NULL,
	"scheduled_times" jsonb NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date,
	"prescriber" text NOT NULL,
	"instructions" text,
	"food_instructions" text,
	"refill_note" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_by_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "medicine_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"prescription_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"provider_order_id" text,
	"status" "order_status" DEFAULT 'AWAITING_PROVIDER' NOT NULL,
	"total_amount" numeric(10, 2),
	"currency" text DEFAULT 'INR' NOT NULL,
	"delivery_estimate" text,
	"delivery_address_encrypted" text,
	"confirmed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_preferences" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"email_enabled" boolean DEFAULT false NOT NULL,
	"sms_enabled" boolean DEFAULT false NOT NULL,
	"quiet_hours_start" text,
	"quiet_hours_end" text,
	"categories" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"member_id" uuid,
	"category" "notification_category" NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"href" text,
	"dedupe_key" text NOT NULL,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "nutrition_preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"dietary_pattern" text DEFAULT 'vegetarian' NOT NULL,
	"goals" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"allergies" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"dislikes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"cuisines" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"clinician_diet_notes" text,
	"water_goal_ml" integer DEFAULT 2000 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"name" text NOT NULL,
	"strength" text NOT NULL,
	"quantity" integer NOT NULL,
	"unit_price" numeric(10, 2),
	"provider_product_id" text
);
--> statement-breakpoint
CREATE TABLE "prescription_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"prescription_id" uuid NOT NULL,
	"type" "verification_event_type" NOT NULL,
	"note" text NOT NULL,
	"actor_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "prescriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"file_id" uuid,
	"prescriber_name" text NOT NULL,
	"clinic_name" text,
	"issued_at" date NOT NULL,
	"valid_until" date,
	"status" "prescription_status" DEFAULT 'UNVERIFIED' NOT NULL,
	"verification_note" text,
	"created_by_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rate_limits" (
	"key" text PRIMARY KEY NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	"window_start" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "report_findings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"report_id" uuid NOT NULL,
	"name" text NOT NULL,
	"value" text NOT NULL,
	"unit" text,
	"reference_range" text,
	"flag" "finding_flag" DEFAULT 'UNKNOWN' NOT NULL,
	"explanation" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"user_agent" text,
	"ip_hash" text,
	"expires_at" timestamp with time zone NOT NULL,
	"last_used_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sos_alerts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	"status" "alert_status" DEFAULT 'SENDING' NOT NULL,
	"latitude" numeric(9, 6),
	"longitude" numeric(9, 6),
	"location_accuracy_m" integer,
	"message" text,
	"share_health_summary" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"email_verified_at" timestamp with time zone,
	"timezone" text DEFAULT 'Asia/Kolkata' NOT NULL,
	"locale" text DEFAULT 'en-IN' NOT NULL,
	"role" "user_role" DEFAULT 'USER' NOT NULL,
	"status" "user_status" DEFAULT 'ACTIVE' NOT NULL,
	"is_demo" boolean DEFAULT false NOT NULL,
	"failed_login_count" integer DEFAULT 0 NOT NULL,
	"locked_until" timestamp with time zone,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "webhook_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" text NOT NULL,
	"event_id" text NOT NULL,
	"payload_hash" text NOT NULL,
	"status" "webhook_status" DEFAULT 'RECEIVED' NOT NULL,
	"error_message" text,
	"processed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "women_health_preferences" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"predictions_enabled" boolean DEFAULT true NOT NULL,
	"reminders_enabled" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ai_conversations" ADD CONSTRAINT "ai_conversations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_conversations" ADD CONSTRAINT "ai_conversations_member_id_family_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."family_members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_messages" ADD CONSTRAINT "ai_messages_conversation_id_ai_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."ai_conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alert_deliveries" ADD CONSTRAINT "alert_deliveries_alert_id_sos_alerts_id_fk" FOREIGN KEY ("alert_id") REFERENCES "public"."sos_alerts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alert_deliveries" ADD CONSTRAINT "alert_deliveries_contact_id_emergency_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."emergency_contacts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ambulance_requests" ADD CONSTRAINT "ambulance_requests_alert_id_sos_alerts_id_fk" FOREIGN KEY ("alert_id") REFERENCES "public"."sos_alerts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ambulance_requests" ADD CONSTRAINT "ambulance_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_member_id_family_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."family_members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_doctor_profile_id_doctor_profiles_id_fk" FOREIGN KEY ("doctor_profile_id") REFERENCES "public"."doctor_profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_member_id_family_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."family_members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_tokens" ADD CONSTRAINT "auth_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "caregiver_invites" ADD CONSTRAINT "caregiver_invites_member_id_family_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."family_members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "caregiver_invites" ADD CONSTRAINT "caregiver_invites_invited_by_id_users_id_fk" FOREIGN KEY ("invited_by_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consents" ADD CONSTRAINT "consents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consents" ADD CONSTRAINT "consents_member_id_family_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."family_members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cycle_entries" ADD CONSTRAINT "cycle_entries_member_id_family_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."family_members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cycle_entries" ADD CONSTRAINT "cycle_entries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "emergency_contacts" ADD CONSTRAINT "emergency_contacts_member_id_family_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."family_members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "families" ADD CONSTRAINT "families_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "family_access" ADD CONSTRAINT "family_access_member_id_family_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."family_members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "family_access" ADD CONSTRAINT "family_access_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "family_access" ADD CONSTRAINT "family_access_granted_by_id_users_id_fk" FOREIGN KEY ("granted_by_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "family_members" ADD CONSTRAINT "family_members_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "family_members" ADD CONSTRAINT "family_members_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_member_id_family_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."family_members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_logs" ADD CONSTRAINT "meal_logs_member_id_family_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."family_members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_logs" ADD CONSTRAINT "meal_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_plan_items" ADD CONSTRAINT "meal_plan_items_plan_id_meal_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."meal_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_plans" ADD CONSTRAINT "meal_plans_member_id_family_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."family_members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medical_history" ADD CONSTRAINT "medical_history_member_id_family_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."family_members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medical_history" ADD CONSTRAINT "medical_history_recorded_by_id_users_id_fk" FOREIGN KEY ("recorded_by_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medical_history" ADD CONSTRAINT "medical_history_attachment_file_id_files_id_fk" FOREIGN KEY ("attachment_file_id") REFERENCES "public"."files"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medical_reports" ADD CONSTRAINT "medical_reports_member_id_family_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."family_members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medical_reports" ADD CONSTRAINT "medical_reports_file_id_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."files"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medical_reports" ADD CONSTRAINT "medical_reports_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medication_doses" ADD CONSTRAINT "medication_doses_medication_id_medications_id_fk" FOREIGN KEY ("medication_id") REFERENCES "public"."medications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medication_doses" ADD CONSTRAINT "medication_doses_member_id_family_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."family_members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medication_doses" ADD CONSTRAINT "medication_doses_acted_by_id_users_id_fk" FOREIGN KEY ("acted_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medications" ADD CONSTRAINT "medications_member_id_family_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."family_members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medications" ADD CONSTRAINT "medications_prescription_id_prescriptions_id_fk" FOREIGN KEY ("prescription_id") REFERENCES "public"."prescriptions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medications" ADD CONSTRAINT "medications_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medicine_orders" ADD CONSTRAINT "medicine_orders_member_id_family_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."family_members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medicine_orders" ADD CONSTRAINT "medicine_orders_prescription_id_prescriptions_id_fk" FOREIGN KEY ("prescription_id") REFERENCES "public"."prescriptions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medicine_orders" ADD CONSTRAINT "medicine_orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_member_id_family_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."family_members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nutrition_preferences" ADD CONSTRAINT "nutrition_preferences_member_id_family_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."family_members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_medicine_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."medicine_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prescription_events" ADD CONSTRAINT "prescription_events_prescription_id_prescriptions_id_fk" FOREIGN KEY ("prescription_id") REFERENCES "public"."prescriptions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prescription_events" ADD CONSTRAINT "prescription_events_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_member_id_family_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."family_members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_file_id_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."files"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_findings" ADD CONSTRAINT "report_findings_report_id_medical_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."medical_reports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sos_alerts" ADD CONSTRAINT "sos_alerts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sos_alerts" ADD CONSTRAINT "sos_alerts_member_id_family_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."family_members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "women_health_preferences" ADD CONSTRAINT "women_health_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_deletion_records_deleted_idx" ON "account_deletion_records" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "ai_conversations_user_idx" ON "ai_conversations" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ai_messages_conversation_idx" ON "ai_messages" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "alert_deliveries_alert_idx" ON "alert_deliveries" USING btree ("alert_id");--> statement-breakpoint
CREATE INDEX "ambulance_requests_user_idx" ON "ambulance_requests" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "appointments_member_idx" ON "appointments" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "audit_actor_idx" ON "audit_events" USING btree ("actor_user_id");--> statement-breakpoint
CREATE INDEX "audit_created_idx" ON "audit_events" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "auth_tokens_hash_unique" ON "auth_tokens" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "auth_tokens_user_type_idx" ON "auth_tokens" USING btree ("user_id","type");--> statement-breakpoint
CREATE UNIQUE INDEX "background_jobs_dedupe_unique" ON "background_jobs" USING btree ("dedupe_key");--> statement-breakpoint
CREATE INDEX "background_jobs_run_idx" ON "background_jobs" USING btree ("status","run_at");--> statement-breakpoint
CREATE UNIQUE INDEX "caregiver_invites_token_unique" ON "caregiver_invites" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "caregiver_invites_member_idx" ON "caregiver_invites" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "consents_user_idx" ON "consents" USING btree ("user_id","kind");--> statement-breakpoint
CREATE INDEX "cycle_entries_member_idx" ON "cycle_entries" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "cycle_entries_start_idx" ON "cycle_entries" USING btree ("start_date");--> statement-breakpoint
CREATE UNIQUE INDEX "doctor_provider_ref_unique" ON "doctor_profiles" USING btree ("provider","provider_clinician_id");--> statement-breakpoint
CREATE INDEX "emergency_contacts_member_idx" ON "emergency_contacts" USING btree ("member_id");--> statement-breakpoint
CREATE UNIQUE INDEX "family_access_member_user_unique" ON "family_access" USING btree ("member_id","user_id");--> statement-breakpoint
CREATE INDEX "family_access_user_idx" ON "family_access" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "family_members_family_idx" ON "family_members" USING btree ("family_id");--> statement-breakpoint
CREATE INDEX "files_member_idx" ON "files" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "integration_events_created_idx" ON "integration_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "meal_logs_member_day_idx" ON "meal_logs" USING btree ("member_id","logged_on");--> statement-breakpoint
CREATE INDEX "meal_plan_items_plan_idx" ON "meal_plan_items" USING btree ("plan_id");--> statement-breakpoint
CREATE INDEX "meal_plans_member_idx" ON "meal_plans" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "history_member_idx" ON "medical_history" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "history_category_idx" ON "medical_history" USING btree ("category");--> statement-breakpoint
CREATE INDEX "reports_member_idx" ON "medical_reports" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "reports_date_idx" ON "medical_reports" USING btree ("report_date");--> statement-breakpoint
CREATE UNIQUE INDEX "medication_dose_unique" ON "medication_doses" USING btree ("medication_id","scheduled_at");--> statement-breakpoint
CREATE INDEX "medication_doses_day_idx" ON "medication_doses" USING btree ("member_id","scheduled_date");--> statement-breakpoint
CREATE INDEX "medications_member_idx" ON "medications" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "medicine_orders_user_idx" ON "medicine_orders" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "notifications_dedupe_unique" ON "notifications" USING btree ("user_id","dedupe_key");--> statement-breakpoint
CREATE INDEX "notifications_user_created_idx" ON "notifications" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "nutrition_preferences_member_unique" ON "nutrition_preferences" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "prescription_events_prescription_idx" ON "prescription_events" USING btree ("prescription_id");--> statement-breakpoint
CREATE INDEX "prescriptions_member_idx" ON "prescriptions" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "report_findings_report_idx" ON "report_findings" USING btree ("report_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sessions_token_hash_unique" ON "sessions" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sos_alerts_user_idx" ON "sos_alerts" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_unique" ON "users" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "webhook_provider_event_unique" ON "webhook_events" USING btree ("provider","event_id");