import { pgTable, text, serial, integer, boolean, timestamp, varchar, jsonb, time, bigint } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  password: text("password").notNull(),
  plainPassword: text("plain_password"), // Store plain text password for admin viewing
  fullName: varchar("full_name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 50 }),
  dateOfBirth: timestamp("date_of_birth"),
  position: varchar("position", { length: 255 }),
  role: varchar("role", { length: 50 }).notNull().default("employee"), // employee, hr_manager, admin
  hasReportAccess: boolean("has_report_access").default(false),
  isActive: boolean("is_active").default(true),
  isOnline: boolean("is_online").default(false),
  lastSeenAt: timestamp("last_seen_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const vacancies = pgTable("vacancies", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  department: varchar("department", { length: 255 }).notNull(), // Keeping for backward compatibility
  departmentId: integer("department_id"),
  location: varchar("location", { length: 255 }),
  description: text("description"),
  requirements: text("requirements"),
  status: varchar("status", { length: 50 }).notNull().default("active"), // active, closed
  createdBy: integer("created_by"),
  hiredCandidateId: integer("hired_candidate_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const candidates = pgTable("candidates", {
  id: serial("id").primaryKey(),
  fullName: varchar("full_name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 50 }),
  city: varchar("city", { length: 255 }),
  vacancyId: integer("vacancy_id"),
  resumeUrl: text("resume_url"),
  resumeFilename: varchar("resume_filename", { length: 255 }),
  photoUrl: text("photo_url"), // Optional photo file path
  source: varchar("source", { length: 100 }),
  interviewStageChain: jsonb("interview_stage_chain"), // New field for stage chain
  currentStageIndex: integer("current_stage_index").default(0),
  status: varchar("status", { length: 50 }).default("active"), // active, documentation, hired, rejected, archived, dismissed
  rejectionReason: text("rejection_reason"),
  rejectionStage: integer("rejection_stage"),
  dismissalReason: text("dismissal_reason"),
  dismissalDate: timestamp("dismissal_date"),
  parsedResumeData: jsonb("parsed_resume_data"),
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const interviewStages = pgTable("interview_stages", {
  id: serial("id").primaryKey(),
  candidateId: integer("candidate_id").references(() => candidates.id),
  stageIndex: integer("stage_index").notNull(),
  stageName: varchar("stage_name", { length: 255 }).notNull(),
  interviewerId: integer("interviewer_id").references(() => users.id),
  status: varchar("status", { length: 50 }).default("pending"), // pending, in_progress, passed, failed
  scheduledAt: timestamp("scheduled_at"),
  completedAt: timestamp("completed_at"),
  comments: text("comments"),
  rating: integer("rating"), // 1-5 scale
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const interviews = pgTable("interviews", {
  id: serial("id").primaryKey(),
  stageId: integer("stage_id").references(() => interviewStages.id),
  candidateId: integer("candidate_id").references(() => candidates.id),
  interviewerId: integer("interviewer_id").references(() => users.id),
  scheduledAt: timestamp("scheduled_at").notNull(),
  duration: integer("duration").default(30), // minutes
  status: varchar("status", { length: 50 }).default("scheduled"), // scheduled, completed, cancelled, rescheduled
  meetingLink: text("meeting_link"),
  notes: text("notes"),
  outcome: varchar("outcome", { length: 50 }), // passed, failed, pending
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  type: varchar("type", { length: 50 }).notNull(), // interview_assigned, reminder, status_update
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message"),
  isRead: boolean("is_read").default(false),
  relatedEntityType: varchar("related_entity_type", { length: 50 }), // candidate, interview, vacancy
  relatedEntityId: integer("related_entity_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  action: varchar("action", { length: 255 }).notNull(),
  entityType: varchar("entity_type", { length: 50 }).notNull(),
  entityId: integer("entity_id"),
  oldValues: jsonb("old_values"),
  newValues: jsonb("new_values"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const departments = pgTable("departments", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull().unique(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const systemSettings = pgTable("system_settings", {
  id: serial("id").primaryKey(),
  key: varchar("key", { length: 255 }).notNull().unique(),
  value: text("value"),
  description: text("description"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Messages table for employee chat
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  senderId: integer("sender_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  receiverId: integer("receiver_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Documentation attachments table for candidates in documentation status
export const documentationAttachments = pgTable("documentation_attachments", {
  id: serial("id").primaryKey(),
  candidateId: integer("candidate_id").notNull().references(() => candidates.id, { onDelete: "cascade" }),
  filename: varchar("filename", { length: 255 }).notNull(),
  originalName: varchar("original_name", { length: 255 }).notNull(),
  fileType: varchar("file_type", { length: 100 }),
  fileSize: integer("file_size"),
  uploadedBy: integer("uploaded_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  createdVacancies: many(vacancies),
  interviewStages: many(interviewStages),
  interviews: many(interviews),
  notifications: many(notifications),
  auditLogs: many(auditLogs),
  sentMessages: many(messages, { relationName: "sender" }),
  receivedMessages: many(messages, { relationName: "receiver" }),
}));

export const departmentsRelations = relations(departments, ({ many }) => ({
  vacancies: many(vacancies),
}));

export const vacanciesRelations = relations(vacancies, ({ one, many }) => ({
  createdBy: one(users, {
    fields: [vacancies.createdBy],
    references: [users.id],
  }),
  hiredCandidate: one(candidates, {
    fields: [vacancies.hiredCandidateId],
    references: [candidates.id],
  }),
  department: one(departments, {
    fields: [vacancies.departmentId],
    references: [departments.id],
  }),
  candidates: many(candidates),
}));

export const candidatesRelations = relations(candidates, ({ one, many }) => ({
  vacancy: one(vacancies, {
    fields: [candidates.vacancyId],
    references: [vacancies.id],
  }),
  createdBy: one(users, {
    fields: [candidates.createdBy],
    references: [users.id],
  }),
  interviewStages: many(interviewStages),
  interviews: many(interviews),
  documentationAttachments: many(documentationAttachments),
}));

export const interviewStagesRelations = relations(interviewStages, ({ one, many }) => ({
  candidate: one(candidates, {
    fields: [interviewStages.candidateId],
    references: [candidates.id],
  }),
  interviewer: one(users, {
    fields: [interviewStages.interviewerId],
    references: [users.id],
  }),
  interviews: many(interviews),
}));

export const interviewsRelations = relations(interviews, ({ one }) => ({
  stage: one(interviewStages, {
    fields: [interviews.stageId],
    references: [interviewStages.id],
  }),
  candidate: one(candidates, {
    fields: [interviews.candidateId],
    references: [candidates.id],
  }),
  interviewer: one(users, {
    fields: [interviews.interviewerId],
    references: [users.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id],
    relationName: "sender",
  }),
  receiver: one(users, {
    fields: [messages.receiverId],
    references: [users.id],
    relationName: "receiver",
  }),
}));

export const documentationAttachmentsRelations = relations(documentationAttachments, ({ one }) => ({
  candidate: one(candidates, {
    fields: [documentationAttachments.candidateId],
    references: [candidates.id],
  }),
  uploadedBy: one(users, {
    fields: [documentationAttachments.uploadedBy],
    references: [users.id],
  }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id],
  }),
}));

// Insert schemas
export const insertUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  fullName: z.string().min(1),
  phone: z.string().optional(),
  dateOfBirth: z.union([z.string(), z.date()]).optional().nullable(),
  position: z.string().optional(),
  role: z.enum(['admin', 'hr_manager', 'employee']).default('employee'),
  hasReportAccess: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

export const insertUserSchemaForAPI = insertUserSchema.omit({ password: true });

export const insertVacancySchema = createInsertSchema(vacancies).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCandidateSchema = createInsertSchema(candidates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).partial({
  email: true, // Email is optional for Telegram candidates
  resumeUrl: true,
  resumeFilename: true,
  photoUrl: true, // Optional photo URL
  parsedResumeData: true,
  currentStageIndex: true,
  status: true,
  rejectionReason: true,
  rejectionStage: true,
  phone: true,
  city: true,
  source: true,
  interviewStageChain: true,
  createdBy: true, // Optional for bot-created candidates
});

export const insertInterviewStageSchema = createInsertSchema(interviewStages).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).partial({
  status: true,
  scheduledAt: true,
  completedAt: true,
  comments: true,
  rating: true,
});

export const insertInterviewSchema = createInsertSchema(interviews).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).partial({
  outcome: true,
  notes: true,
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({
  id: true,
  createdAt: true,
});

export const insertSystemSettingSchema = createInsertSchema(systemSettings).omit({
  id: true,
  updatedAt: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).partial({
  isRead: true,
});

export const insertDepartmentSchema = createInsertSchema(departments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDocumentationAttachmentSchema = createInsertSchema(documentationAttachments).omit({
  id: true,
  createdAt: true,
}).partial({
  uploadedBy: true,
  fileType: true,
  fileSize: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Vacancy = typeof vacancies.$inferSelect;
export type InsertVacancy = z.infer<typeof insertVacancySchema>;
export type Candidate = typeof candidates.$inferSelect;
export type InsertCandidate = z.infer<typeof insertCandidateSchema>;
export type InterviewStage = typeof interviewStages.$inferSelect;
export type InsertInterviewStage = z.infer<typeof insertInterviewStageSchema>;
export type Interview = typeof interviews.$inferSelect;
export type InsertInterview = z.infer<typeof insertInterviewSchema>;
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type SystemSetting = typeof systemSettings.$inferSelect;
export type InsertSystemSetting = z.infer<typeof insertSystemSettingSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Department = typeof departments.$inferSelect;
export type InsertDepartment = z.infer<typeof insertDepartmentSchema>;
export type DocumentationAttachment = typeof documentationAttachments.$inferSelect;
export type InsertDocumentationAttachment = z.infer<typeof insertDocumentationAttachmentSchema>;
