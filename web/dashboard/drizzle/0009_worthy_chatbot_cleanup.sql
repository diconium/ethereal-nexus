ALTER TABLE "project_ai_chatbot" RENAME COLUMN "responses_api_endpoint" TO "project_endpoint";--> statement-breakpoint
ALTER TABLE "project_ai_chatbot" DROP COLUMN "agent_principal_id";--> statement-breakpoint
ALTER TABLE "project_ai_chatbot" DROP COLUMN "tenant_id";--> statement-breakpoint
ALTER TABLE "project_ai_chatbot" DROP COLUMN "activity_protocol_endpoint";
