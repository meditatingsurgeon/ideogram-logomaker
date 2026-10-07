import { pgTable, text, timestamp, integer, uuid } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: text('id').primaryKey(), // Firebase Auth UID
  email: text('email').notNull(),
  tokens: integer('tokens').default(2000).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const generations = pgTable('generations', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').references(() => users.id).notNull(),
  companyName: text('company_name').notNull(),
  tagline: text('tagline'),
  brandVision: text('brand_vision').notNull(),
  enhancedPrompt: text('enhanced_prompt'),
  baseLogoUrl: text('base_logo_url'),
  socialBannerUrl: text('social_banner_url'),
  websiteHeaderUrl: text('website_header_url'),
  verticalStoryUrl: text('vertical_story_url'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
