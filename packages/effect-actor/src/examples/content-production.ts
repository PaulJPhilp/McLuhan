import { Schema } from "effect";
import { createActorSpec } from "../spec/builder.js";

/**
 * Content Production Workflow
 *
 * States: draft → review → published → archived
 *
 * Features:
 * - Guards (canPublish, canArchive)
 * - Actions (setReviewer, publishContent, archiveContent)
 * - Schema validation (title, body, reviewer)
 */

// Context schema
const ContentSchema = Schema.Struct({
	title: Schema.String,
	body: Schema.String,
	author: Schema.String,
	reviewer: Schema.optional(Schema.String),
	publishedAt: Schema.optional(Schema.DateFromSelf),
	archivedAt: Schema.optional(Schema.DateFromSelf),
});

type ContentContext = typeof ContentSchema.Type;

// Spec definition
export const ContentProductionSpec = createActorSpec<ContentContext>({
	id: "content-production",
	schema: ContentSchema,
	initial: "draft",

	states: {
		draft: {
			on: {
				CREATE: {
					target: "draft",
				},
				SUBMIT_FOR_REVIEW: {
					target: "review",
					action: "assignReviewer",
				},
			},
		},
		review: {
			on: {
				APPROVE: {
					target: "published",
					guard: "canPublish",
					action: "publishContent",
				},
				REJECT: {
					target: "draft",
				},
			},
		},
		published: {
			on: {
				ARCHIVE: {
					target: "archived",
					guard: "canArchive",
					action: "archiveContent",
				},
			},
		},
		archived: {},
	},

	guards: {
		canPublish: (ctx: ContentContext) => {
			// Must have reviewer and minimum content
			return !!ctx.reviewer && ctx.body.length >= 100;
		},
		canArchive: (ctx: ContentContext) => {
			// Must be published for at least 30 days
			if (!ctx.publishedAt) return false;
			const daysSincePublish =
				(Date.now() - ctx.publishedAt.getTime()) / (1000 * 60 * 60 * 24);
			return daysSincePublish >= 30;
		},
	},

	actions: {
		assignReviewer: (ctx: ContentContext): ContentContext => ({
			...ctx,
			reviewer: "default-reviewer@example.com",
		}),
		publishContent: (ctx: ContentContext): ContentContext => ({
			...ctx,
			publishedAt: new Date(),
		}),
		archiveContent: (ctx: ContentContext): ContentContext => ({
			...ctx,
			archivedAt: new Date(),
		}),
	},
});
