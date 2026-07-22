-- Extensiones requeridas antes de crear columnas CITEXT y restricciones GiST.
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "SubjectType" AS ENUM ('COMPETITOR', 'COMPETITION', 'ORGANIZATION');

-- CreateEnum
CREATE TYPE "RecordStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED', 'MERGED');

-- CreateEnum
CREATE TYPE "SubjectNameKind" AS ENUM ('PRIMARY', 'ALIAS', 'PREVIOUS_NAME', 'ABBREVIATION');

-- CreateEnum
CREATE TYPE "RegionType" AS ENUM ('COUNTRY', 'PROVINCE', 'CITY', 'NEIGHBORHOOD');

-- CreateEnum
CREATE TYPE "CompetitiveScope" AS ENUM ('LOCAL', 'REGIONAL', 'PROVINCIAL', 'NATIONAL', 'INTERNATIONAL', 'OTHER');

-- CreateEnum
CREATE TYPE "DatePrecision" AS ENUM ('DAY', 'MONTH', 'YEAR', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "OrganizationType" AS ENUM ('ORGANIZER', 'MEDIA', 'LEAGUE', 'COLLECTIVE', 'OTHER');

-- CreateEnum
CREATE TYPE "ProfileFieldVisibility" AS ENUM ('PUBLIC', 'HIDDEN');

-- CreateEnum
CREATE TYPE "SeasonStatus" AS ENUM ('DRAFT', 'ACTIVE', 'CLOSED');

-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'CORRECTED', 'ANNULLED');

-- CreateEnum
CREATE TYPE "EventResolution" AS ENUM ('DECIDED', 'SHARED_CHAMPIONSHIP', 'UNDECIDED');

-- CreateEnum
CREATE TYPE "EventFormat" AS ENUM ('SOLO', 'DUO', 'TRIO', 'OTHER');

-- CreateEnum
CREATE TYPE "PlacementType" AS ENUM ('CHAMPION', 'RUNNER_UP', 'FINALIST', 'OTHER');

-- CreateEnum
CREATE TYPE "PlacementStatus" AS ENUM ('ACTIVE', 'ANNULLED');

-- CreateEnum
CREATE TYPE "SourceType" AS ENUM ('OFFICIAL', 'SOCIAL', 'VIDEO', 'DOCUMENT', 'OTHER');

-- CreateEnum
CREATE TYPE "SourcePurpose" AS ENUM ('RESULT', 'DATE', 'PARTICIPANTS', 'SCOPE', 'GENERAL');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('INVITED', 'ACTIVE', 'SUSPENDED', 'DELETED');

-- CreateEnum
CREATE TYPE "ClaimStatus" AS ENUM ('SUBMITTED', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'REVOKED');

-- CreateEnum
CREATE TYPE "SubjectAccessLevel" AS ENUM ('OWNER', 'EDITOR', 'VIEWER');

-- CreateEnum
CREATE TYPE "BadgeKind" AS ENUM ('UNIQUE', 'ACHIEVEMENT', 'TIERED');

-- CreateEnum
CREATE TYPE "BadgeAssignmentMode" AS ENUM ('AUTOMATIC', 'EDITORIAL');

-- CreateEnum
CREATE TYPE "PermanenceMode" AS ENUM ('PERMANENT', 'TEMPORARY');

-- CreateEnum
CREATE TYPE "UniqueTiePolicy" AS ENUM ('FIRST_REACHED_NO_INITIAL_HOLDER');

-- CreateEnum
CREATE TYPE "BadgeDefinitionStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "MetricValueType" AS ENUM ('INTEGER', 'DECIMAL', 'BOOLEAN', 'DATE');

-- CreateEnum
CREATE TYPE "RuleAggregation" AS ENUM ('COUNT', 'SUM', 'MAX', 'BOOLEAN');

-- CreateEnum
CREATE TYPE "RuleOperator" AS ENUM ('GTE', 'EQ', 'TOP_ONE', 'FIRST');

-- CreateEnum
CREATE TYPE "RuleStatus" AS ENUM ('DRAFT', 'ACTIVE', 'RETIRED');

-- CreateEnum
CREATE TYPE "BadgeInstanceStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "BadgeScopeType" AS ENUM ('GLOBAL', 'COMPETITION', 'ORGANIZATION', 'SEASON', 'REGION');

-- CreateEnum
CREATE TYPE "BadgePeriodType" AS ENUM ('NONE', 'MONTH', 'YEAR');

-- CreateEnum
CREATE TYPE "BadgeAwardStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'REVOKED');

-- CreateEnum
CREATE TYPE "TierAchievementStatus" AS ENUM ('ACTIVE', 'REVOKED');

-- CreateEnum
CREATE TYPE "RecalculationTrigger" AS ENUM ('EVENT_PUBLISHED', 'EVENT_CORRECTED', 'EVENT_ANNULLED', 'RULE_ACTIVATED', 'HISTORICAL_DATA_ADDED', 'FULL_REBUILD');

-- CreateEnum
CREATE TYPE "RecalculationStatus" AS ENUM ('QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED', 'PARTIAL');

-- CreateEnum
CREATE TYPE "RecalculationMode" AS ENUM ('APPLY', 'DRY_RUN');

-- CreateEnum
CREATE TYPE "RecalculationChangeType" AS ENUM ('AWARD', 'REVOKE', 'TRANSFER', 'LEVEL_UP', 'LEVEL_DOWN', 'RANK_CHANGE', 'NO_HOLDER');

-- CreateEnum
CREATE TYPE "ActorType" AS ENUM ('USER', 'SYSTEM');

-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SubmissionOperation" AS ENUM ('CREATE', 'UPDATE', 'ANNUL');

-- CreateEnum
CREATE TYPE "MigrationRecordStatus" AS ENUM ('MAPPED', 'SKIPPED', 'ERROR');

-- CreateEnum
CREATE TYPE "MigrationIssueStatus" AS ENUM ('OPEN', 'RESOLVED', 'IGNORED');

-- CreateEnum
CREATE TYPE "MediaKind" AS ENUM ('AVATAR', 'LOGO', 'BADGE', 'SHARE', 'OTHER');

-- CreateEnum
CREATE TYPE "ShareFormat" AS ENUM ('POST', 'STORY');

-- CreateEnum
CREATE TYPE "ShareStatus" AS ENUM ('PENDING', 'READY', 'FAILED', 'DELETED');

-- CreateEnum
CREATE TYPE "SocialProvider" AS ENUM ('INSTAGRAM');

-- CreateEnum
CREATE TYPE "SocialConnectionStatus" AS ENUM ('ACTIVE', 'REVOKED', 'EXPIRED');

-- CreateTable
CREATE TABLE "app_user" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "auth_subject" TEXT NOT NULL,
    "email" CITEXT,
    "email_verified_at" TIMESTAMPTZ(3),
    "status" "UserStatus" NOT NULL DEFAULT 'INVITED',
    "last_login_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "app_user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media_asset" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "storage_key" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" BIGINT NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "kind" "MediaKind" NOT NULL,
    "created_by_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "media_asset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subject" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "type" "SubjectType" NOT NULL,
    "slug" CITEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "status" "RecordStatus" NOT NULL DEFAULT 'DRAFT',
    "bio" TEXT,
    "avatar_asset_id" UUID,
    "merged_into_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "subject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subject_name" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "subject_id" UUID NOT NULL,
    "value" TEXT NOT NULL,
    "normalized_value" CITEXT NOT NULL,
    "kind" "SubjectNameKind" NOT NULL,
    "valid_from" DATE,
    "valid_to" DATE,
    "is_searchable" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subject_name_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "region" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "parent_id" UUID,
    "type" "RegionType" NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "slug" CITEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "region_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "competitor" (
    "subject_id" UUID NOT NULL,
    "home_region_id" UUID,
    "birth_date" DATE,
    "birth_date_visibility" "ProfileFieldVisibility" NOT NULL DEFAULT 'HIDDEN',
    "location_visibility" "ProfileFieldVisibility" NOT NULL DEFAULT 'PUBLIC',

    CONSTRAINT "competitor_pkey" PRIMARY KEY ("subject_id")
);

-- CreateTable
CREATE TABLE "organization" (
    "subject_id" UUID NOT NULL,
    "organization_type" "OrganizationType" NOT NULL DEFAULT 'ORGANIZER',
    "founded_on" DATE,
    "website_url" TEXT,

    CONSTRAINT "organization_pkey" PRIMARY KEY ("subject_id")
);

-- CreateTable
CREATE TABLE "competition" (
    "subject_id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "short_name" TEXT,
    "default_scope" "CompetitiveScope" NOT NULL DEFAULT 'LOCAL',
    "default_region_id" UUID,
    "founded_on" DATE,

    CONSTRAINT "competition_pkey" PRIMARY KEY ("subject_id")
);

-- CreateTable
CREATE TABLE "venue" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "region_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "latitude" DECIMAL(9,6),
    "longitude" DECIMAL(9,6),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "venue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "season" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "competition_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "starts_on" DATE,
    "ends_on" DATE,
    "status" "SeasonStatus" NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "season_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "competition_id" UUID NOT NULL,
    "season_id" UUID,
    "venue_id" UUID,
    "location_region_id" UUID,
    "scope_region_id" UUID,
    "slug" CITEXT NOT NULL,
    "title" TEXT NOT NULL,
    "edition_number" INTEGER,
    "event_year" INTEGER,
    "event_month" INTEGER,
    "event_day" INTEGER,
    "occurred_on" DATE,
    "date_precision" "DatePrecision" NOT NULL DEFAULT 'UNKNOWN',
    "official_scope" "CompetitiveScope" NOT NULL DEFAULT 'LOCAL',
    "scope_declared_by_id" UUID,
    "scope_source_url" TEXT,
    "scope_notes" TEXT,
    "format" "EventFormat" NOT NULL DEFAULT 'SOLO',
    "resolution" "EventResolution" NOT NULL DEFAULT 'DECIDED',
    "status" "EventStatus" NOT NULL DEFAULT 'DRAFT',
    "published_at" TIMESTAMPTZ(3),
    "published_by_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "placement" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "event_id" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "slot" INTEGER NOT NULL DEFAULT 1,
    "type" "PlacementType" NOT NULL,
    "group_label" TEXT,
    "status" "PlacementStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "placement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "placement_member" (
    "placement_id" UUID NOT NULL,
    "competitor_id" UUID NOT NULL,
    "member_order" INTEGER NOT NULL DEFAULT 1,
    "display_name_at_event" TEXT,

    CONSTRAINT "placement_member_pkey" PRIMARY KEY ("placement_id","competitor_id")
);

-- CreateTable
CREATE TABLE "source" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "url" TEXT NOT NULL,
    "title" TEXT,
    "publisher" TEXT,
    "type" "SourceType" NOT NULL,
    "is_archived" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "source_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_source" (
    "event_id" UUID NOT NULL,
    "source_id" UUID NOT NULL,
    "purpose" "SourcePurpose" NOT NULL DEFAULT 'GENERAL',

    CONSTRAINT "event_source_pkey" PRIMARY KEY ("event_id","source_id","purpose")
);

-- CreateTable
CREATE TABLE "role" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permission" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_role" (
    "user_id" UUID NOT NULL,
    "role_id" UUID NOT NULL,
    "granted_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "granted_by" UUID,

    CONSTRAINT "user_role_pkey" PRIMARY KEY ("user_id","role_id")
);

-- CreateTable
CREATE TABLE "role_permission" (
    "role_id" UUID NOT NULL,
    "permission_id" UUID NOT NULL,

    CONSTRAINT "role_permission_pkey" PRIMARY KEY ("role_id","permission_id")
);

-- CreateTable
CREATE TABLE "profile_claim" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "subject_id" UUID NOT NULL,
    "status" "ClaimStatus" NOT NULL DEFAULT 'SUBMITTED',
    "evidence" JSONB,
    "private_notes" TEXT,
    "reviewed_by_id" UUID,
    "reviewed_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "profile_claim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subject_manager" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "subject_id" UUID NOT NULL,
    "access_level" "SubjectAccessLevel" NOT NULL,
    "valid_from" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "valid_to" TIMESTAMPTZ(3),
    "granted_by_id" UUID,

    CONSTRAINT "subject_manager_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "badge_definition" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" TEXT NOT NULL,
    "kind" "BadgeKind" NOT NULL,
    "assignment_mode" "BadgeAssignmentMode" NOT NULL,
    "name_template" TEXT NOT NULL,
    "description_template" TEXT NOT NULL,
    "recipient_type" "SubjectType" NOT NULL,
    "permanence_mode" "PermanenceMode" NOT NULL DEFAULT 'PERMANENT',
    "tie_policy" "UniqueTiePolicy",
    "status" "BadgeDefinitionStatus" NOT NULL DEFAULT 'DRAFT',
    "created_by_id" UUID NOT NULL,
    "archived_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "badge_definition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "metric_definition" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "value_type" "MetricValueType" NOT NULL,
    "implementation_key" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "metric_definition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "metric_recipient_type" (
    "metric_id" UUID NOT NULL,
    "recipient_type" "SubjectType" NOT NULL,

    CONSTRAINT "metric_recipient_type_pkey" PRIMARY KEY ("metric_id","recipient_type")
);

-- CreateTable
CREATE TABLE "badge_rule_version" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "badge_definition_id" UUID NOT NULL,
    "metric_id" UUID NOT NULL,
    "version_number" INTEGER NOT NULL,
    "aggregation" "RuleAggregation" NOT NULL,
    "operator" "RuleOperator" NOT NULL,
    "base_threshold" DECIMAL(18,4),
    "config" JSONB NOT NULL DEFAULT '{}',
    "effective_from" DATE,
    "effective_to" DATE,
    "status" "RuleStatus" NOT NULL DEFAULT 'DRAFT',
    "created_by_id" UUID NOT NULL,
    "reason" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "badge_rule_version_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "badge_tier" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "rule_version_id" UUID NOT NULL,
    "rank" INTEGER NOT NULL,
    "code" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "threshold" DECIMAL(18,4) NOT NULL,
    "asset_id" UUID,
    "color" TEXT,

    CONSTRAINT "badge_tier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "badge_instance" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "badge_definition_id" UUID NOT NULL,
    "slug" CITEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "BadgeInstanceStatus" NOT NULL DEFAULT 'DRAFT',
    "published_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "badge_instance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "badge_scope" (
    "badge_instance_id" UUID NOT NULL,
    "scope_type" "BadgeScopeType" NOT NULL,
    "competition_id" UUID,
    "organization_id" UUID,
    "season_id" UUID,
    "region_id" UUID,
    "competitive_scope" "CompetitiveScope",
    "period_type" "BadgePeriodType" NOT NULL DEFAULT 'NONE',
    "period_year" INTEGER,
    "period_month" INTEGER,

    CONSTRAINT "badge_scope_pkey" PRIMARY KEY ("badge_instance_id")
);

-- CreateTable
CREATE TABLE "badge_award" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "badge_instance_id" UUID NOT NULL,
    "recipient_subject_id" UUID NOT NULL,
    "rule_version_id" UUID,
    "source_event_id" UUID,
    "awarded_on" DATE NOT NULL,
    "expires_at" TIMESTAMPTZ(3),
    "status" "BadgeAwardStatus" NOT NULL DEFAULT 'ACTIVE',
    "assigned_by_id" UUID,
    "public_justification" TEXT,
    "private_notes" TEXT,
    "evidence" JSONB NOT NULL DEFAULT '{}',
    "revoked_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "badge_award_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "badge_holding_period" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "badge_instance_id" UUID NOT NULL,
    "holder_subject_id" UUID NOT NULL,
    "rule_version_id" UUID NOT NULL,
    "starts_on" DATE NOT NULL,
    "ends_on" DATE,
    "acquired_event_id" UUID,
    "ended_event_id" UUID,
    "metric_value" DECIMAL(18,4) NOT NULL,
    "reached_value_on" DATE NOT NULL,
    "evidence" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "badge_holding_period_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "badge_progress" (
    "badge_instance_id" UUID NOT NULL,
    "recipient_subject_id" UUID NOT NULL,
    "rule_version_id" UUID NOT NULL,
    "current_tier_id" UUID,
    "metric_value" DECIMAL(18,4) NOT NULL,
    "reached_value_on" DATE,
    "calculated_at" TIMESTAMPTZ(3) NOT NULL,
    "run_id" UUID NOT NULL,

    CONSTRAINT "badge_progress_pkey" PRIMARY KEY ("badge_instance_id","recipient_subject_id")
);

-- CreateTable
CREATE TABLE "tier_achievement" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "badge_instance_id" UUID NOT NULL,
    "recipient_subject_id" UUID NOT NULL,
    "tier_id" UUID NOT NULL,
    "rule_version_id" UUID NOT NULL,
    "source_event_id" UUID,
    "achieved_on" DATE NOT NULL,
    "status" "TierAchievementStatus" NOT NULL DEFAULT 'ACTIVE',
    "revoked_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tier_achievement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profile_badge_preference" (
    "subject_id" UUID NOT NULL,
    "badge_instance_id" UUID NOT NULL,
    "is_visible" BOOLEAN NOT NULL DEFAULT true,
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER,
    "updated_by_id" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "profile_badge_preference_pkey" PRIMARY KEY ("subject_id","badge_instance_id")
);

-- CreateTable
CREATE TABLE "recalculation_run" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "correlation_id" UUID NOT NULL,
    "trigger_type" "RecalculationTrigger" NOT NULL,
    "trigger_entity_id" UUID,
    "mode" "RecalculationMode" NOT NULL DEFAULT 'APPLY',
    "status" "RecalculationStatus" NOT NULL DEFAULT 'QUEUED',
    "initiated_by_id" UUID,
    "queued_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "started_at" TIMESTAMPTZ(3),
    "finished_at" TIMESTAMPTZ(3),
    "summary" JSONB,
    "error" JSONB,

    CONSTRAINT "recalculation_run_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recalculation_change" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "run_id" UUID NOT NULL,
    "badge_instance_id" UUID,
    "subject_id" UUID,
    "change_type" "RecalculationChangeType" NOT NULL,
    "before_state" JSONB,
    "after_state" JSONB,
    "applied_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recalculation_change_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "data_submission" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "submitted_by_id" UUID NOT NULL,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'DRAFT',
    "summary" TEXT NOT NULL,
    "reviewed_by_id" UUID,
    "reviewed_at" TIMESTAMPTZ(3),
    "review_notes" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "data_submission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "submission_item" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "submission_id" UUID NOT NULL,
    "operation" "SubmissionOperation" NOT NULL,
    "entity_kind" TEXT NOT NULL,
    "entity_id" UUID,
    "before_payload" JSONB,
    "proposed_payload" JSONB NOT NULL,
    "validation_errors" JSONB,
    "item_order" INTEGER NOT NULL,

    CONSTRAINT "submission_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "occurred_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actor_type" "ActorType" NOT NULL,
    "actor_user_id" UUID,
    "action" TEXT NOT NULL,
    "entity_kind" TEXT NOT NULL,
    "entity_id" UUID NOT NULL,
    "before_data" JSONB,
    "after_data" JSONB,
    "reason" TEXT,
    "correlation_id" UUID,
    "ip_hash" TEXT,
    "user_agent" TEXT,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "legacy_record_map" (
    "source_system" TEXT NOT NULL,
    "entity_kind" TEXT NOT NULL,
    "legacy_id" TEXT NOT NULL,
    "target_id" UUID,
    "payload_hash" TEXT NOT NULL,
    "batch_id" UUID NOT NULL,
    "status" "MigrationRecordStatus" NOT NULL,
    "migrated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "legacy_record_map_pkey" PRIMARY KEY ("source_system","entity_kind","legacy_id")
);

-- CreateTable
CREATE TABLE "migration_issue" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "batch_id" UUID NOT NULL,
    "entity_kind" TEXT NOT NULL,
    "legacy_key" TEXT NOT NULL,
    "issue_type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "MigrationIssueStatus" NOT NULL DEFAULT 'OPEN',
    "resolved_by_id" UUID,
    "resolved_at" TIMESTAMPTZ(3),
    "resolution_notes" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "migration_issue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "share_asset" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "badge_instance_id" UUID NOT NULL,
    "recipient_subject_id" UUID NOT NULL,
    "media_asset_id" UUID,
    "format" "ShareFormat" NOT NULL,
    "status" "ShareStatus" NOT NULL DEFAULT 'PENDING',
    "payload_hash" TEXT NOT NULL,
    "generated_at" TIMESTAMPTZ(3),
    "expires_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "share_asset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social_connection" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "provider" "SocialProvider" NOT NULL,
    "provider_account_id" TEXT NOT NULL,
    "encrypted_token_ref" TEXT NOT NULL,
    "scopes" TEXT[],
    "status" "SocialConnectionStatus" NOT NULL DEFAULT 'ACTIVE',
    "connected_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMPTZ(3),

    CONSTRAINT "social_connection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "app_user_auth_subject_key" ON "app_user"("auth_subject");

-- CreateIndex
CREATE UNIQUE INDEX "app_user_email_key" ON "app_user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "media_asset_storage_key_key" ON "media_asset"("storage_key");

-- CreateIndex
CREATE UNIQUE INDEX "subject_slug_key" ON "subject"("slug");

-- CreateIndex
CREATE INDEX "subject_type_status_idx" ON "subject"("type", "status");

-- CreateIndex
CREATE INDEX "subject_name_normalized_value_idx" ON "subject_name"("normalized_value");

-- CreateIndex
CREATE INDEX "subject_name_subject_id_kind_idx" ON "subject_name"("subject_id", "kind");

-- CreateIndex
CREATE INDEX "region_type_name_idx" ON "region"("type", "name");

-- CreateIndex
CREATE UNIQUE INDEX "region_parent_id_slug_key" ON "region"("parent_id", "slug");

-- CreateIndex
CREATE INDEX "competition_organization_id_idx" ON "competition"("organization_id");

-- CreateIndex
CREATE INDEX "venue_region_id_name_idx" ON "venue"("region_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "season_competition_id_name_key" ON "season"("competition_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "season_id_competition_id_key" ON "season"("id", "competition_id");

-- CreateIndex
CREATE INDEX "event_competition_id_event_year_event_month_event_day_idx" ON "event"("competition_id", "event_year", "event_month", "event_day");

-- CreateIndex
CREATE INDEX "event_status_official_scope_idx" ON "event"("status", "official_scope");

-- CreateIndex
CREATE UNIQUE INDEX "event_competition_id_slug_key" ON "event"("competition_id", "slug");

-- CreateIndex
CREATE INDEX "placement_event_id_type_status_idx" ON "placement"("event_id", "type", "status");

-- CreateIndex
CREATE UNIQUE INDEX "placement_event_id_position_slot_key" ON "placement"("event_id", "position", "slot");

-- CreateIndex
CREATE INDEX "placement_member_competitor_id_idx" ON "placement_member"("competitor_id");

-- CreateIndex
CREATE INDEX "source_url_idx" ON "source"("url");

-- CreateIndex
CREATE UNIQUE INDEX "role_code_key" ON "role"("code");

-- CreateIndex
CREATE UNIQUE INDEX "permission_code_key" ON "permission"("code");

-- CreateIndex
CREATE INDEX "profile_claim_subject_id_status_idx" ON "profile_claim"("subject_id", "status");

-- CreateIndex
CREATE INDEX "profile_claim_user_id_status_idx" ON "profile_claim"("user_id", "status");

-- CreateIndex
CREATE INDEX "subject_manager_user_id_subject_id_idx" ON "subject_manager"("user_id", "subject_id");

-- CreateIndex
CREATE INDEX "subject_manager_subject_id_valid_to_idx" ON "subject_manager"("subject_id", "valid_to");

-- CreateIndex
CREATE UNIQUE INDEX "badge_definition_code_key" ON "badge_definition"("code");

-- CreateIndex
CREATE INDEX "badge_definition_recipient_type_status_idx" ON "badge_definition"("recipient_type", "status");

-- CreateIndex
CREATE UNIQUE INDEX "metric_definition_code_key" ON "metric_definition"("code");

-- CreateIndex
CREATE INDEX "badge_rule_version_badge_definition_id_status_effective_fro_idx" ON "badge_rule_version"("badge_definition_id", "status", "effective_from");

-- CreateIndex
CREATE UNIQUE INDEX "badge_rule_version_badge_definition_id_version_number_key" ON "badge_rule_version"("badge_definition_id", "version_number");

-- CreateIndex
CREATE UNIQUE INDEX "badge_tier_rule_version_id_rank_key" ON "badge_tier"("rule_version_id", "rank");

-- CreateIndex
CREATE UNIQUE INDEX "badge_tier_rule_version_id_code_key" ON "badge_tier"("rule_version_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "badge_instance_slug_key" ON "badge_instance"("slug");

-- CreateIndex
CREATE INDEX "badge_instance_badge_definition_id_status_idx" ON "badge_instance"("badge_definition_id", "status");

-- CreateIndex
CREATE INDEX "badge_scope_scope_type_competition_id_organization_id_seaso_idx" ON "badge_scope"("scope_type", "competition_id", "organization_id", "season_id", "region_id");

-- CreateIndex
CREATE INDEX "badge_award_badge_instance_id_recipient_subject_id_status_idx" ON "badge_award"("badge_instance_id", "recipient_subject_id", "status");

-- CreateIndex
CREATE INDEX "badge_award_recipient_subject_id_awarded_on_idx" ON "badge_award"("recipient_subject_id", "awarded_on");

-- CreateIndex
CREATE INDEX "badge_holding_period_badge_instance_id_starts_on_idx" ON "badge_holding_period"("badge_instance_id", "starts_on");

-- CreateIndex
CREATE INDEX "badge_holding_period_holder_subject_id_starts_on_idx" ON "badge_holding_period"("holder_subject_id", "starts_on");

-- CreateIndex
CREATE INDEX "badge_progress_badge_instance_id_metric_value_reached_value_idx" ON "badge_progress"("badge_instance_id", "metric_value", "reached_value_on");

-- CreateIndex
CREATE UNIQUE INDEX "tier_achievement_badge_instance_id_recipient_subject_id_tie_key" ON "tier_achievement"("badge_instance_id", "recipient_subject_id", "tier_id", "rule_version_id");

-- CreateIndex
CREATE UNIQUE INDEX "recalculation_run_correlation_id_key" ON "recalculation_run"("correlation_id");

-- CreateIndex
CREATE INDEX "recalculation_run_status_queued_at_idx" ON "recalculation_run"("status", "queued_at");

-- CreateIndex
CREATE INDEX "recalculation_change_run_id_change_type_idx" ON "recalculation_change"("run_id", "change_type");

-- CreateIndex
CREATE INDEX "data_submission_status_created_at_idx" ON "data_submission"("status", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "submission_item_submission_id_item_order_key" ON "submission_item"("submission_id", "item_order");

-- CreateIndex
CREATE INDEX "audit_log_entity_kind_entity_id_occurred_at_idx" ON "audit_log"("entity_kind", "entity_id", "occurred_at");

-- CreateIndex
CREATE INDEX "audit_log_correlation_id_idx" ON "audit_log"("correlation_id");

-- CreateIndex
CREATE INDEX "legacy_record_map_target_id_idx" ON "legacy_record_map"("target_id");

-- CreateIndex
CREATE INDEX "migration_issue_batch_id_status_idx" ON "migration_issue"("batch_id", "status");

-- CreateIndex
CREATE INDEX "share_asset_badge_instance_id_recipient_subject_id_format_s_idx" ON "share_asset"("badge_instance_id", "recipient_subject_id", "format", "status");

-- CreateIndex
CREATE INDEX "social_connection_user_id_status_idx" ON "social_connection"("user_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "social_connection_provider_provider_account_id_key" ON "social_connection"("provider", "provider_account_id");

-- AddForeignKey
ALTER TABLE "media_asset" ADD CONSTRAINT "media_asset_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "app_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subject" ADD CONSTRAINT "subject_avatar_asset_id_fkey" FOREIGN KEY ("avatar_asset_id") REFERENCES "media_asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subject" ADD CONSTRAINT "subject_merged_into_id_fkey" FOREIGN KEY ("merged_into_id") REFERENCES "subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subject_name" ADD CONSTRAINT "subject_name_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "region" ADD CONSTRAINT "region_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "region"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competitor" ADD CONSTRAINT "competitor_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competitor" ADD CONSTRAINT "competitor_home_region_id_fkey" FOREIGN KEY ("home_region_id") REFERENCES "region"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization" ADD CONSTRAINT "organization_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competition" ADD CONSTRAINT "competition_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competition" ADD CONSTRAINT "competition_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("subject_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competition" ADD CONSTRAINT "competition_default_region_id_fkey" FOREIGN KEY ("default_region_id") REFERENCES "region"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "venue" ADD CONSTRAINT "venue_region_id_fkey" FOREIGN KEY ("region_id") REFERENCES "region"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "season" ADD CONSTRAINT "season_competition_id_fkey" FOREIGN KEY ("competition_id") REFERENCES "competition"("subject_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event" ADD CONSTRAINT "event_competition_id_fkey" FOREIGN KEY ("competition_id") REFERENCES "competition"("subject_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event" ADD CONSTRAINT "event_season_id_competition_id_fkey" FOREIGN KEY ("season_id", "competition_id") REFERENCES "season"("id", "competition_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event" ADD CONSTRAINT "event_venue_id_fkey" FOREIGN KEY ("venue_id") REFERENCES "venue"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event" ADD CONSTRAINT "event_location_region_id_fkey" FOREIGN KEY ("location_region_id") REFERENCES "region"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event" ADD CONSTRAINT "event_scope_region_id_fkey" FOREIGN KEY ("scope_region_id") REFERENCES "region"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event" ADD CONSTRAINT "event_scope_declared_by_id_fkey" FOREIGN KEY ("scope_declared_by_id") REFERENCES "subject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "placement" ADD CONSTRAINT "placement_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "placement_member" ADD CONSTRAINT "placement_member_placement_id_fkey" FOREIGN KEY ("placement_id") REFERENCES "placement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "placement_member" ADD CONSTRAINT "placement_member_competitor_id_fkey" FOREIGN KEY ("competitor_id") REFERENCES "competitor"("subject_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_source" ADD CONSTRAINT "event_source_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_source" ADD CONSTRAINT "event_source_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "source"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_role" ADD CONSTRAINT "user_role_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "app_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_role" ADD CONSTRAINT "user_role_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permission" ADD CONSTRAINT "role_permission_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permission" ADD CONSTRAINT "role_permission_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile_claim" ADD CONSTRAINT "profile_claim_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "app_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile_claim" ADD CONSTRAINT "profile_claim_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile_claim" ADD CONSTRAINT "profile_claim_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "app_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subject_manager" ADD CONSTRAINT "subject_manager_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "app_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subject_manager" ADD CONSTRAINT "subject_manager_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subject_manager" ADD CONSTRAINT "subject_manager_granted_by_id_fkey" FOREIGN KEY ("granted_by_id") REFERENCES "app_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "badge_definition" ADD CONSTRAINT "badge_definition_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "app_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "metric_recipient_type" ADD CONSTRAINT "metric_recipient_type_metric_id_fkey" FOREIGN KEY ("metric_id") REFERENCES "metric_definition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "badge_rule_version" ADD CONSTRAINT "badge_rule_version_badge_definition_id_fkey" FOREIGN KEY ("badge_definition_id") REFERENCES "badge_definition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "badge_rule_version" ADD CONSTRAINT "badge_rule_version_metric_id_fkey" FOREIGN KEY ("metric_id") REFERENCES "metric_definition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "badge_rule_version" ADD CONSTRAINT "badge_rule_version_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "app_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "badge_tier" ADD CONSTRAINT "badge_tier_rule_version_id_fkey" FOREIGN KEY ("rule_version_id") REFERENCES "badge_rule_version"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "badge_tier" ADD CONSTRAINT "badge_tier_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "media_asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "badge_instance" ADD CONSTRAINT "badge_instance_badge_definition_id_fkey" FOREIGN KEY ("badge_definition_id") REFERENCES "badge_definition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "badge_scope" ADD CONSTRAINT "badge_scope_badge_instance_id_fkey" FOREIGN KEY ("badge_instance_id") REFERENCES "badge_instance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "badge_scope" ADD CONSTRAINT "badge_scope_competition_id_fkey" FOREIGN KEY ("competition_id") REFERENCES "competition"("subject_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "badge_scope" ADD CONSTRAINT "badge_scope_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("subject_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "badge_scope" ADD CONSTRAINT "badge_scope_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "season"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "badge_scope" ADD CONSTRAINT "badge_scope_region_id_fkey" FOREIGN KEY ("region_id") REFERENCES "region"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "badge_award" ADD CONSTRAINT "badge_award_badge_instance_id_fkey" FOREIGN KEY ("badge_instance_id") REFERENCES "badge_instance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "badge_award" ADD CONSTRAINT "badge_award_recipient_subject_id_fkey" FOREIGN KEY ("recipient_subject_id") REFERENCES "subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "badge_award" ADD CONSTRAINT "badge_award_rule_version_id_fkey" FOREIGN KEY ("rule_version_id") REFERENCES "badge_rule_version"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "badge_award" ADD CONSTRAINT "badge_award_source_event_id_fkey" FOREIGN KEY ("source_event_id") REFERENCES "event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "badge_award" ADD CONSTRAINT "badge_award_assigned_by_id_fkey" FOREIGN KEY ("assigned_by_id") REFERENCES "app_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "badge_holding_period" ADD CONSTRAINT "badge_holding_period_badge_instance_id_fkey" FOREIGN KEY ("badge_instance_id") REFERENCES "badge_instance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "badge_holding_period" ADD CONSTRAINT "badge_holding_period_holder_subject_id_fkey" FOREIGN KEY ("holder_subject_id") REFERENCES "subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "badge_holding_period" ADD CONSTRAINT "badge_holding_period_rule_version_id_fkey" FOREIGN KEY ("rule_version_id") REFERENCES "badge_rule_version"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "badge_holding_period" ADD CONSTRAINT "badge_holding_period_acquired_event_id_fkey" FOREIGN KEY ("acquired_event_id") REFERENCES "event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "badge_holding_period" ADD CONSTRAINT "badge_holding_period_ended_event_id_fkey" FOREIGN KEY ("ended_event_id") REFERENCES "event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "badge_progress" ADD CONSTRAINT "badge_progress_badge_instance_id_fkey" FOREIGN KEY ("badge_instance_id") REFERENCES "badge_instance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "badge_progress" ADD CONSTRAINT "badge_progress_recipient_subject_id_fkey" FOREIGN KEY ("recipient_subject_id") REFERENCES "subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "badge_progress" ADD CONSTRAINT "badge_progress_rule_version_id_fkey" FOREIGN KEY ("rule_version_id") REFERENCES "badge_rule_version"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "badge_progress" ADD CONSTRAINT "badge_progress_current_tier_id_fkey" FOREIGN KEY ("current_tier_id") REFERENCES "badge_tier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "badge_progress" ADD CONSTRAINT "badge_progress_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "recalculation_run"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tier_achievement" ADD CONSTRAINT "tier_achievement_badge_instance_id_fkey" FOREIGN KEY ("badge_instance_id") REFERENCES "badge_instance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tier_achievement" ADD CONSTRAINT "tier_achievement_recipient_subject_id_fkey" FOREIGN KEY ("recipient_subject_id") REFERENCES "subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tier_achievement" ADD CONSTRAINT "tier_achievement_tier_id_fkey" FOREIGN KEY ("tier_id") REFERENCES "badge_tier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tier_achievement" ADD CONSTRAINT "tier_achievement_rule_version_id_fkey" FOREIGN KEY ("rule_version_id") REFERENCES "badge_rule_version"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tier_achievement" ADD CONSTRAINT "tier_achievement_source_event_id_fkey" FOREIGN KEY ("source_event_id") REFERENCES "event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile_badge_preference" ADD CONSTRAINT "profile_badge_preference_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile_badge_preference" ADD CONSTRAINT "profile_badge_preference_badge_instance_id_fkey" FOREIGN KEY ("badge_instance_id") REFERENCES "badge_instance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile_badge_preference" ADD CONSTRAINT "profile_badge_preference_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "app_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recalculation_run" ADD CONSTRAINT "recalculation_run_initiated_by_id_fkey" FOREIGN KEY ("initiated_by_id") REFERENCES "app_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recalculation_change" ADD CONSTRAINT "recalculation_change_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "recalculation_run"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recalculation_change" ADD CONSTRAINT "recalculation_change_badge_instance_id_fkey" FOREIGN KEY ("badge_instance_id") REFERENCES "badge_instance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recalculation_change" ADD CONSTRAINT "recalculation_change_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "data_submission" ADD CONSTRAINT "data_submission_submitted_by_id_fkey" FOREIGN KEY ("submitted_by_id") REFERENCES "app_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "data_submission" ADD CONSTRAINT "data_submission_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "app_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submission_item" ADD CONSTRAINT "submission_item_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "data_submission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "app_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "migration_issue" ADD CONSTRAINT "migration_issue_resolved_by_id_fkey" FOREIGN KEY ("resolved_by_id") REFERENCES "app_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "share_asset" ADD CONSTRAINT "share_asset_badge_instance_id_fkey" FOREIGN KEY ("badge_instance_id") REFERENCES "badge_instance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "share_asset" ADD CONSTRAINT "share_asset_recipient_subject_id_fkey" FOREIGN KEY ("recipient_subject_id") REFERENCES "subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "share_asset" ADD CONSTRAINT "share_asset_media_asset_id_fkey" FOREIGN KEY ("media_asset_id") REFERENCES "media_asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_connection" ADD CONSTRAINT "social_connection_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "app_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Restricciones adicionales no representables por Prisma Schema Language.
-- Identidades y nombres.
-- PostgreSQL permite varios NULL en una clave única compuesta. Sin este índice,
-- dos países (que no tienen parent_id) podrían compartir slug.
CREATE UNIQUE INDEX region_country_slug_uq
  ON region (slug)
  WHERE type = 'COUNTRY';

CREATE UNIQUE INDEX subject_name_one_current_primary_uq
  ON subject_name (subject_id)
  WHERE kind = 'PRIMARY' AND valid_to IS NULL;

ALTER TABLE subject
  ADD CONSTRAINT subject_merge_state_ck CHECK (
    (status = 'MERGED' AND merged_into_id IS NOT NULL)
    OR (status <> 'MERGED' AND merged_into_id IS NULL)
  ),
  ADD CONSTRAINT subject_no_self_merge_ck CHECK (merged_into_id IS NULL OR merged_into_id <> id);

-- Cada subject debe tener exactamente el subtipo indicado por subject.type.
CREATE OR REPLACE FUNCTION check_subject_subtype()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  target_id uuid;
  target_type text;
  competitor_count integer;
  competition_count integer;
  organization_count integer;
BEGIN
  IF TG_TABLE_NAME = 'subject' THEN
    target_id := COALESCE(NEW.id, OLD.id);
  ELSE
    target_id := COALESCE(NEW.subject_id, OLD.subject_id);
  END IF;

  SELECT type::text INTO target_type FROM subject WHERE id = target_id;
  IF target_type IS NULL THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
  END IF;

  SELECT COUNT(*) INTO competitor_count FROM competitor WHERE subject_id = target_id;
  SELECT COUNT(*) INTO competition_count FROM competition WHERE subject_id = target_id;
  SELECT COUNT(*) INTO organization_count FROM organization WHERE subject_id = target_id;

  IF (target_type = 'COMPETITOR' AND competitor_count = 1 AND competition_count = 0 AND organization_count = 0)
     OR (target_type = 'COMPETITION' AND competitor_count = 0 AND competition_count = 1 AND organization_count = 0)
     OR (target_type = 'ORGANIZATION' AND competitor_count = 0 AND competition_count = 0 AND organization_count = 1) THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
  END IF;

  RAISE EXCEPTION 'El subject % no tiene exactamente el subtipo indicado por %', target_id, target_type;
END;
$$;

CREATE CONSTRAINT TRIGGER subject_subtype_from_subject_trg
AFTER INSERT OR UPDATE OF type ON subject
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION check_subject_subtype();

CREATE CONSTRAINT TRIGGER subject_subtype_from_competitor_trg
AFTER INSERT OR UPDATE OR DELETE ON competitor
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION check_subject_subtype();

CREATE CONSTRAINT TRIGGER subject_subtype_from_competition_trg
AFTER INSERT OR UPDATE OR DELETE ON competition
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION check_subject_subtype();

CREATE CONSTRAINT TRIGGER subject_subtype_from_organization_trg
AFTER INSERT OR UPDATE OR DELETE ON organization
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION check_subject_subtype();

-- Jerarquía territorial exacta y sin ciclos por construcción.
CREATE OR REPLACE FUNCTION check_region_hierarchy()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  parent_type text;
BEGIN
  IF NEW.type = 'COUNTRY' THEN
    IF NEW.parent_id IS NOT NULL THEN
      RAISE EXCEPTION 'Un país no puede tener región padre';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.parent_id IS NULL OR NEW.parent_id = NEW.id THEN
    RAISE EXCEPTION 'La región % requiere una región padre válida', NEW.type;
  END IF;

  SELECT type::text INTO parent_type FROM region WHERE id = NEW.parent_id;
  IF (NEW.type = 'PROVINCE' AND parent_type <> 'COUNTRY')
     OR (NEW.type = 'CITY' AND parent_type <> 'PROVINCE')
     OR (NEW.type = 'NEIGHBORHOOD' AND parent_type <> 'CITY') THEN
    RAISE EXCEPTION 'Jerarquía territorial inválida: % no puede depender de %', NEW.type, parent_type;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER region_hierarchy_trg
BEFORE INSERT OR UPDATE OF parent_id, type ON region
FOR EACH ROW EXECUTE FUNCTION check_region_hierarchy();

-- Temporadas y fechas deportivas.
ALTER TABLE season
  ADD CONSTRAINT season_date_range_ck CHECK (
    starts_on IS NULL OR ends_on IS NULL OR starts_on <= ends_on
  );

ALTER TABLE event
  ADD CONSTRAINT event_year_ck CHECK (event_year IS NULL OR event_year BETWEEN 1900 AND 2200),
  ADD CONSTRAINT event_month_ck CHECK (event_month IS NULL OR event_month BETWEEN 1 AND 12),
  ADD CONSTRAINT event_day_ck CHECK (event_day IS NULL OR event_day BETWEEN 1 AND 31),
  ADD CONSTRAINT event_date_precision_ck CHECK (
    (date_precision = 'UNKNOWN' AND event_year IS NULL AND event_month IS NULL AND event_day IS NULL AND occurred_on IS NULL)
    OR (date_precision = 'YEAR' AND event_year IS NOT NULL AND event_month IS NULL AND event_day IS NULL AND occurred_on IS NULL)
    OR (date_precision = 'MONTH' AND event_year IS NOT NULL AND event_month IS NOT NULL AND event_day IS NULL AND occurred_on IS NULL)
    OR (date_precision = 'DAY' AND event_year IS NOT NULL AND event_month IS NOT NULL AND event_day IS NOT NULL AND occurred_on IS NOT NULL)
  ),
  ADD CONSTRAINT event_exact_date_parts_ck CHECK (
    occurred_on IS NULL OR (
      EXTRACT(YEAR FROM occurred_on) = event_year
      AND EXTRACT(MONTH FROM occurred_on) = event_month
      AND EXTRACT(DAY FROM occurred_on) = event_day
    )
  );

ALTER TABLE placement
  ADD CONSTRAINT placement_position_ck CHECK (position > 0),
  ADD CONSTRAINT placement_slot_ck CHECK (slot > 0);

-- Un mismo competidor no puede integrar dos resultados activos del mismo evento.
CREATE OR REPLACE FUNCTION check_competitor_once_per_event()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  target_event uuid;
BEGIN
  SELECT event_id INTO target_event FROM placement WHERE id = NEW.placement_id;

  IF EXISTS (
    SELECT 1
    FROM placement_member pm
    JOIN placement p ON p.id = pm.placement_id
    WHERE pm.competitor_id = NEW.competitor_id
      AND p.event_id = target_event
      AND p.status = 'ACTIVE'
      AND pm.placement_id <> NEW.placement_id
  ) THEN
    RAISE EXCEPTION 'El competidor ya integra otro resultado activo del evento';
  END IF;

  RETURN NEW;
END;
$$;

CREATE CONSTRAINT TRIGGER placement_member_once_per_event_trg
AFTER INSERT OR UPDATE ON placement_member
DEFERRABLE INITIALLY IMMEDIATE
FOR EACH ROW EXECUTE FUNCTION check_competitor_once_per_event();

-- La misma regla debe comprobarse cuando un placement anulado vuelve a ACTIVE
-- o cuando se mueve a otro evento, aunque sus integrantes no cambien.
CREATE OR REPLACE FUNCTION check_placement_competitors_once_per_event()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'ACTIVE' AND EXISTS (
    SELECT 1
    FROM placement_member current_member
    JOIN placement_member other_member
      ON other_member.competitor_id = current_member.competitor_id
    JOIN placement other_placement
      ON other_placement.id = other_member.placement_id
    WHERE current_member.placement_id = NEW.id
      AND other_placement.event_id = NEW.event_id
      AND other_placement.status = 'ACTIVE'
      AND other_placement.id <> NEW.id
  ) THEN
    RAISE EXCEPTION 'Un competidor del resultado ya integra otro resultado activo del evento';
  END IF;

  RETURN NEW;
END;
$$;

CREATE CONSTRAINT TRIGGER placement_once_per_event_on_reactivation_trg
AFTER UPDATE OF event_id, status ON placement
DEFERRABLE INITIALLY IMMEDIATE
FOR EACH ROW EXECUTE FUNCTION check_placement_competitors_once_per_event();

-- Cuando un evento queda publicado/corregido, su resolución debe coincidir con
-- los placements activos. Los borradores pueden permanecer incompletos.
CREATE OR REPLACE FUNCTION check_published_event_resolution()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  target_event uuid;
  event_status text;
  event_resolution text;
  champion_count integer;
  finalist_count integer;
  empty_placement_count integer;
BEGIN
  IF TG_TABLE_NAME = 'event' THEN
    target_event := COALESCE(NEW.id, OLD.id);
  ELSIF TG_TABLE_NAME = 'placement' THEN
    target_event := COALESCE(NEW.event_id, OLD.event_id);
  ELSE
    SELECT event_id INTO target_event
      FROM placement
      WHERE id = COALESCE(NEW.placement_id, OLD.placement_id);
  END IF;

  SELECT status::text, resolution::text
    INTO event_status, event_resolution
    FROM event WHERE id = target_event;

  IF event_status IS NULL OR event_status NOT IN ('PUBLISHED', 'CORRECTED') THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
  END IF;

  SELECT COUNT(*) FILTER (WHERE p.type = 'CHAMPION'),
         COUNT(*) FILTER (WHERE p.type IN ('CHAMPION', 'RUNNER_UP', 'FINALIST')),
         COUNT(*) FILTER (WHERE NOT EXISTS (
           SELECT 1 FROM placement_member pm WHERE pm.placement_id = p.id
         ))
    INTO champion_count, finalist_count, empty_placement_count
    FROM placement p
    WHERE p.event_id = target_event AND p.status = 'ACTIVE';

  IF empty_placement_count > 0 OR finalist_count < 2
     OR (event_resolution = 'DECIDED' AND champion_count <> 1)
     OR (event_resolution = 'SHARED_CHAMPIONSHIP' AND champion_count < 2)
     OR (event_resolution = 'UNDECIDED' AND champion_count <> 0) THEN
    RAISE EXCEPTION 'Los placements no coinciden con la resolución publicada del evento %', target_event;
  END IF;

  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$;

CREATE CONSTRAINT TRIGGER event_resolution_from_event_trg
AFTER INSERT OR UPDATE OF status, resolution ON event
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION check_published_event_resolution();

CREATE CONSTRAINT TRIGGER event_resolution_from_placement_trg
AFTER INSERT OR UPDATE OR DELETE ON placement
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION check_published_event_resolution();

CREATE CONSTRAINT TRIGGER event_resolution_from_member_trg
AFTER INSERT OR UPDATE OR DELETE ON placement_member
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION check_published_event_resolution();

-- Administración de perfiles: conserva historial, pero solo una autorización vigente.
CREATE UNIQUE INDEX subject_manager_one_active_uq
  ON subject_manager (user_id, subject_id)
  WHERE valid_to IS NULL;

ALTER TABLE subject_manager
  ADD CONSTRAINT subject_manager_validity_ck CHECK (valid_to IS NULL OR valid_from <= valid_to);

-- Reglas e instancias de insignias.
ALTER TABLE badge_definition
  ADD CONSTRAINT badge_definition_tie_policy_ck CHECK (
    (kind = 'UNIQUE' AND tie_policy IS NOT NULL)
    OR (kind <> 'UNIQUE' AND tie_policy IS NULL)
  );

ALTER TABLE badge_rule_version
  ADD CONSTRAINT badge_rule_dates_ck CHECK (
    effective_from IS NULL OR effective_to IS NULL OR effective_from <= effective_to
  );

ALTER TABLE badge_rule_version
  ADD CONSTRAINT badge_rule_no_overlapping_active_versions
  EXCLUDE USING gist (
    badge_definition_id WITH =,
    daterange(effective_from, effective_to, '[]') WITH &&
  ) WHERE (status = 'ACTIVE');

ALTER TABLE badge_tier
  ADD CONSTRAINT badge_tier_rank_ck CHECK (rank > 0),
  ADD CONSTRAINT badge_tier_threshold_ck CHECK (threshold >= 0);

ALTER TABLE badge_scope
  ADD CONSTRAINT badge_scope_target_ck CHECK (
    (scope_type = 'GLOBAL' AND competition_id IS NULL AND organization_id IS NULL AND season_id IS NULL AND region_id IS NULL)
    OR (scope_type = 'COMPETITION' AND competition_id IS NOT NULL AND organization_id IS NULL AND season_id IS NULL AND region_id IS NULL)
    OR (scope_type = 'ORGANIZATION' AND competition_id IS NULL AND organization_id IS NOT NULL AND season_id IS NULL AND region_id IS NULL)
    OR (scope_type = 'SEASON' AND competition_id IS NULL AND organization_id IS NULL AND season_id IS NOT NULL AND region_id IS NULL)
    OR (scope_type = 'REGION' AND competition_id IS NULL AND organization_id IS NULL AND season_id IS NULL AND region_id IS NOT NULL)
  ),
  ADD CONSTRAINT badge_scope_period_ck CHECK (
    (period_type = 'NONE' AND period_year IS NULL AND period_month IS NULL)
    OR (period_type = 'YEAR' AND period_year IS NOT NULL AND period_month IS NULL)
    OR (period_type = 'MONTH' AND period_year IS NOT NULL AND period_month BETWEEN 1 AND 12)
  );

-- La ausencia de fila abierta representa una insignia única sin poseedor.
CREATE UNIQUE INDEX badge_holding_one_current_holder_uq
  ON badge_holding_period (badge_instance_id)
  WHERE ends_on IS NULL;

ALTER TABLE badge_holding_period
  ADD CONSTRAINT badge_holding_dates_ck CHECK (ends_on IS NULL OR starts_on < ends_on),
  ADD CONSTRAINT badge_holding_no_overlap
  EXCLUDE USING gist (
    badge_instance_id WITH =,
    daterange(starts_on, ends_on, '[)') WITH &&
  );

-- Idempotencia para obtenciones automáticas. Las editoriales se auditan por separado.
CREATE UNIQUE INDEX badge_award_automatic_idempotency_uq
  ON badge_award (badge_instance_id, recipient_subject_id, source_event_id, rule_version_id)
  WHERE source_event_id IS NOT NULL AND rule_version_id IS NOT NULL;

ALTER TABLE badge_award
  ADD CONSTRAINT badge_award_editorial_justification_ck CHECK (
    assigned_by_id IS NULL
    OR (public_justification IS NOT NULL AND btrim(public_justification) <> '')
  );

-- Recalculo y auditoría.
ALTER TABLE recalculation_run
  ADD CONSTRAINT recalculation_time_order_ck CHECK (
    (started_at IS NULL OR queued_at <= started_at)
    AND (finished_at IS NULL OR started_at IS NOT NULL)
    AND (finished_at IS NULL OR started_at <= finished_at)
  );

-- audit_log debe exponerse a la aplicación con permisos INSERT/SELECT únicamente.
-- No se conceden UPDATE ni DELETE al rol de runtime.
