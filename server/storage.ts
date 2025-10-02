import { 
  users, vacancies, candidates, interviewStages, interviews, 
  notifications, auditLogs, systemSettings, messages, departments, documentationAttachments,
  type User, type InsertUser, type Vacancy, type InsertVacancy,
  type Candidate, type InsertCandidate, type InterviewStage, 
  type InsertInterviewStage, type Interview, type InsertInterview,
  type Notification, type InsertNotification, type AuditLog, 
  type InsertAuditLog, type SystemSetting, type InsertSystemSetting,
  type Message, type InsertMessage, type Department, type InsertDepartment,
  type DocumentationAttachment, type InsertDocumentationAttachment
} from "@shared/schema";
import { db } from "./db";
import { eq, and, or, desc, asc, gte, lte, count, sql } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUsers(): Promise<User[]>;
  getUserWithPassword(id: number): Promise<User | undefined>; // For admin access to see passwords
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User>;
  deleteUser(id: number): Promise<void>;
  updateUserOnlineStatus(userId: number, isOnline: boolean): Promise<void>;
  getUsersWithOnlineStatus(): Promise<User[]>;
  
  // Vacancies
  getVacancies(): Promise<Vacancy[]>;
  getVacancy(id: number): Promise<Vacancy | undefined>;
  createVacancy(vacancy: InsertVacancy): Promise<Vacancy>;
  updateVacancy(id: number, vacancy: Partial<InsertVacancy>): Promise<Vacancy>;
  deleteVacancy(id: number): Promise<void>;
  getActiveVacancies(): Promise<Vacancy[]>;
  
  // Candidates
  getCandidates(): Promise<Candidate[]>;
  getActiveCandidates(): Promise<Candidate[]>; // Only candidates with 'active' status
  getCandidate(id: number): Promise<Candidate | undefined>;

  getCandidatesByVacancy(vacancyId: number): Promise<Candidate[]>;
  getCandidatesByInterviewer(interviewerId: number): Promise<Candidate[]>;
  getCandidatesByStatus(status: string): Promise<Candidate[]>;
  createCandidate(candidate: InsertCandidate): Promise<Candidate>;
  updateCandidate(id: number, candidate: Partial<InsertCandidate>): Promise<Candidate>;
  deleteCandidate(id: number): Promise<void>;
  dismissCandidate(id: number, dismissalReason: string, dismissalDate: Date): Promise<Candidate>;
  
  // Interview Stages
  getInterviewStagesByCandidate(candidateId: number): Promise<any[]>;
  getInterviewStage(id: number): Promise<InterviewStage | undefined>;
  deleteInterviewStagesByCandidate(candidateId: number): Promise<void>;
  getAllInterviewStages(): Promise<InterviewStage[]>;
  createInterviewStage(stage: InsertInterviewStage): Promise<InterviewStage>;
  updateInterviewStage(id: number, stage: Partial<InsertInterviewStage>): Promise<InterviewStage>;
  
  // Interviews
  getInterviews(): Promise<Interview[]>;
  getInterviewsByInterviewer(interviewerId: number): Promise<Interview[]>;
  getInterviewsByDateRange(start: Date, end: Date): Promise<Interview[]>;
  getInterviewsByStage(stageId: number): Promise<Interview[]>;
  createInterview(interview: InsertInterview): Promise<Interview>;
  updateInterview(id: number, interview: Partial<InsertInterview>): Promise<Interview>;
  updateInterviewOutcome(id: number, outcome: string, notes: string): Promise<Interview>;
  rescheduleInterview(id: number, newDateTime: Date): Promise<Interview>;
  scheduleInterview(stageId: number, interviewerId: number, scheduledAt: Date, duration: number): Promise<Interview>;
  
  // Notifications
  getNotificationsByUser(userId: number): Promise<Notification[]>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationAsRead(id: number): Promise<void>;
  getNotification(id: number): Promise<Notification | undefined>;
  deleteNotification(id: number): Promise<void>;
  
  // Archive
  getArchivedCandidates(): Promise<Candidate[]>;
  getArchivedCandidatesWithAttachments(): Promise<any[]>;
  
  // Audit Logs
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;
  
  // System Settings
  getSystemSetting(key: string): Promise<SystemSetting | undefined>;
  setSystemSetting(setting: InsertSystemSetting): Promise<SystemSetting>;
  
  // Messages
  getMessagesBetweenUsers(user1Id: number, user2Id: number): Promise<Message[]>;
  getConversationsByUser(userId: number): Promise<User[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  
  // Analytics (typed)
  getDashboardStats(): Promise<{
    activeVacancies: number;
    activeCandidates: number;
    todayInterviews: number;
    hiredThisMonth: number;
    documentationCandidates: number;
  }>;
  getConversionFunnel(): Promise<{
    applications: number;
    phoneScreen: number;
    technical: number;
    final: number;
    hired: number;
  }>;
  getHiringTrends(): Promise<any[]>;
  getDepartmentStats(): Promise<any[]>;
  getTimeToHireStats(): Promise<{
    averageDays: number;
    fastest: number;
    median: number;
    slowest: number;
  }>;
  getRejectionsByStage(): Promise<{ stage: number; rejections: number; stageName: string }[]>;
  getDashboardStatsByMonth(month: string, year: string): Promise<{
    activeVacancies: number;
    activeCandidates: number;
    monthlyInterviews: number;
    hiredThisMonth: number;
    documentationCandidates: number;
  }>;
  getConversionFunnelByMonth(month: string, year: string): Promise<{
    applications: number;
    phoneScreen: number;
    technical: number;
    final: number;
    hired: number;
  }>;
  getRejectionsByStageByMonth(month: string, year: string): Promise<{ stage: number; rejections: number; stageName: string }[]>;
  getAvailableDataPeriods(): Promise<{ year: string; month: string; monthName: string }[]>;
  
  // Hired and dismissed analytics
  getHiredAndDismissedStats(): Promise<{
    totalHired: number;
    totalDismissed: number;
    currentlyEmployed: number;
  }>;
  getHiredAndDismissedStatsByMonth(): Promise<{
    month: string;
    monthName: string;
    year: string;
    hired: number;
    dismissed: number;
    netChange: number;
  }[]>;
  getHiredAndDismissedStatsByYear(): Promise<{
    year: string;
    hired: number;
    dismissed: number;
    netChange: number;
  }[]>;
  
  // Departments
  getDepartments(): Promise<Department[]>;
  getDepartment(id: number): Promise<Department | undefined>;
  createDepartment(department: InsertDepartment): Promise<Department>;
  updateDepartment(id: number, department: Partial<InsertDepartment>): Promise<Department>;
  deleteDepartment(id: number): Promise<void>;
  markMessageAsRead(messageId: number, userId: number): Promise<Message>;
  
  // Documentation Attachments
  getDocumentationAttachments(candidateId: number): Promise<DocumentationAttachment[]>;
  getDocumentationAttachment(id: number): Promise<DocumentationAttachment | undefined>;
  createDocumentationAttachment(attachment: InsertDocumentationAttachment): Promise<DocumentationAttachment>;
  deleteDocumentationAttachment(id: number): Promise<void>;
  
}

export class DatabaseStorage implements IStorage {
  private ensureDb() {
    if (!db || typeof (db as any).select !== 'function') {
      const errorMessage = process.env.DATABASE_URL 
        ? '💥 База данных недоступна. Проверьте подключение к PostgreSQL.'
        : '⚠️  База данных не настроена. Установите переменную окружения DATABASE_URL в .env';
      console.error(errorMessage);
      console.log('📖 Пример: DATABASE_URL=postgresql://postgres:sheri2001@localhost:5432/recruit_pro');
      throw new Error(errorMessage);
    }
  }
  async getUser(id: number): Promise<User | undefined> {
    this.ensureDb();
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    this.ensureDb();
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async getUsers(): Promise<User[]> {
    this.ensureDb();
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  async getUserWithPassword(id: number): Promise<User | undefined> {
    this.ensureDb();
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async createUser(user: InsertUser): Promise<User> {
    this.ensureDb();
    const [newUser] = await db.insert(users).values(user).returning();
    return newUser;
  }

  async updateUser(id: number, user: Partial<InsertUser>): Promise<User> {
    this.ensureDb();
    const [updatedUser] = await db
      .update(users)
      .set({ ...user, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }

  async deleteUser(id: number): Promise<void> {
    this.ensureDb();
    await db.delete(users).where(eq(users.id, id));
  }

  async updateUserOnlineStatus(userId: number, isOnline: boolean): Promise<void> {
    this.ensureDb();
    await db
      .update(users)
      .set({ 
        isOnline, 
        lastSeenAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));
  }

  async getUsersWithOnlineStatus(): Promise<User[]> {
    this.ensureDb();
    return await db
      .select()
      .from(users)
      .where(eq(users.isActive, true))
      .orderBy(asc(users.fullName));
  }

  async getVacancies(): Promise<Vacancy[]> {
    this.ensureDb();
    return await db.select().from(vacancies).orderBy(desc(vacancies.createdAt));
  }

  async getVacancy(id: number): Promise<Vacancy | undefined> {
    this.ensureDb();
    const [vacancy] = await db.select().from(vacancies).where(eq(vacancies.id, id));
    return vacancy || undefined;
  }

  async createVacancy(vacancy: InsertVacancy): Promise<Vacancy> {
    this.ensureDb();
    const [newVacancy] = await db.insert(vacancies).values(vacancy).returning();
    return newVacancy;
  }

  async updateVacancy(id: number, vacancy: Partial<InsertVacancy>): Promise<Vacancy> {
    this.ensureDb();
    const [updatedVacancy] = await db
      .update(vacancies)
      .set({ ...vacancy, updatedAt: new Date() })
      .where(eq(vacancies.id, id))
      .returning();
    return updatedVacancy;
  }

  async deleteVacancy(id: number): Promise<void> {
    this.ensureDb();
    // First, get all candidates associated with this vacancy
    const associatedCandidates = await db.select().from(candidates).where(eq(candidates.vacancyId, id));
    
    // Delete all associated candidates (this will also delete their interview stages and interviews)
    for (const candidate of associatedCandidates) {
      await this.deleteCandidate(candidate.id);
    }
    
    // Now delete the vacancy
    await db.delete(vacancies).where(eq(vacancies.id, id));
  }

  async getActiveVacancies(): Promise<Vacancy[]> {
    this.ensureDb();
    return await db
      .select()
      .from(vacancies)
      .where(eq(vacancies.status, "active"))
      .orderBy(desc(vacancies.createdAt));
  }

  async getCandidates(): Promise<Candidate[]> {
    this.ensureDb();
    return await db
      .select({
        id: candidates.id,
        fullName: candidates.fullName,
        email: candidates.email,
        phone: candidates.phone,
        city: candidates.city,
        vacancyId: candidates.vacancyId,
        resumeUrl: candidates.resumeUrl,
        resumeFilename: candidates.resumeFilename,
        photoUrl: candidates.photoUrl,
        source: candidates.source,
        interviewStageChain: candidates.interviewStageChain,
        currentStageIndex: candidates.currentStageIndex,
        status: candidates.status,
        rejectionReason: candidates.rejectionReason,
        rejectionStage: candidates.rejectionStage,
        parsedResumeData: candidates.parsedResumeData,
        createdBy: candidates.createdBy,
        createdAt: candidates.createdAt,
        updatedAt: candidates.updatedAt,
        createdByUser: {
          id: users.id,
          fullName: users.fullName,
          email: users.email,
          position: users.position,
        },
      })
      .from(candidates)
      .leftJoin(users, eq(candidates.createdBy, users.id))
      .orderBy(desc(candidates.createdAt));
  }

  async getCandidate(id: number): Promise<Candidate | undefined> {
    this.ensureDb();
    const [candidate] = await db.select().from(candidates).where(eq(candidates.id, id));
    return candidate || undefined;
  }

  /**
   * Get only active candidates (excluding documentation, hired, rejected, archived, dismissed)
   * This is used in the main Candidates section to show only candidates in active recruitment
   */
  async getActiveCandidates(): Promise<Candidate[]> {
    this.ensureDb();
    return await db
      .select({
        id: candidates.id,
        fullName: candidates.fullName,
        email: candidates.email,
        phone: candidates.phone,
        city: candidates.city,
        vacancyId: candidates.vacancyId,
        resumeUrl: candidates.resumeUrl,
        resumeFilename: candidates.resumeFilename,
        photoUrl: candidates.photoUrl,
        source: candidates.source,
        interviewStageChain: candidates.interviewStageChain,
        currentStageIndex: candidates.currentStageIndex,
        status: candidates.status,
        rejectionReason: candidates.rejectionReason,
        rejectionStage: candidates.rejectionStage,
        parsedResumeData: candidates.parsedResumeData,
        createdBy: candidates.createdBy,
        createdAt: candidates.createdAt,
        updatedAt: candidates.updatedAt,
        createdByUser: {
          id: users.id,
          fullName: users.fullName,
          email: users.email,
          position: users.position,
        },
      })
      .from(candidates)
      .leftJoin(users, eq(candidates.createdBy, users.id))
      .where(eq(candidates.status, 'active'))
      .orderBy(desc(candidates.createdAt));
  }



  async getCandidatesByVacancy(vacancyId: number): Promise<Candidate[]> {
    this.ensureDb();
    return await db
      .select()
      .from(candidates)
      .where(eq(candidates.vacancyId, vacancyId))
      .orderBy(desc(candidates.createdAt));
  }

  async getCandidatesByInterviewer(interviewerId: number): Promise<Candidate[]> {
    this.ensureDb();
    return await db
      .select({
        id: candidates.id,
        fullName: candidates.fullName,
        email: candidates.email,
        phone: candidates.phone,
        city: candidates.city,
        vacancyId: candidates.vacancyId,
        resumeUrl: candidates.resumeUrl,
        resumeFilename: candidates.resumeFilename,
        photoUrl: candidates.photoUrl,
        source: candidates.source,
        interviewStageChain: candidates.interviewStageChain,
        currentStageIndex: candidates.currentStageIndex,
        status: candidates.status,
        rejectionReason: candidates.rejectionReason,
        rejectionStage: candidates.rejectionStage,
        parsedResumeData: candidates.parsedResumeData,
        createdBy: candidates.createdBy,
        createdAt: candidates.createdAt,
        updatedAt: candidates.updatedAt,
        createdByUser: {
          id: users.id,
          fullName: users.fullName,
          email: users.email,
          position: users.position,
        },
      })
      .from(candidates)
      .innerJoin(interviewStages, eq(candidates.id, interviewStages.candidateId))
      .leftJoin(users, eq(candidates.createdBy, users.id))
      .where(
        and(
          eq(interviewStages.interviewerId, interviewerId),
          eq(candidates.status, 'active'), // Only show active candidates
          or(
            eq(interviewStages.status, 'pending'),
            eq(interviewStages.status, 'in_progress')
          )
        )
      )
      .orderBy(desc(candidates.createdAt));
  }

  async getCandidatesByStatus(status: string): Promise<Candidate[]> {
    this.ensureDb();
    return await db
      .select({
        id: candidates.id,
        fullName: candidates.fullName,
        email: candidates.email,
        phone: candidates.phone,
        city: candidates.city,
        vacancyId: candidates.vacancyId,
        resumeUrl: candidates.resumeUrl,
        resumeFilename: candidates.resumeFilename,
        photoUrl: candidates.photoUrl,
        source: candidates.source,
        interviewStageChain: candidates.interviewStageChain,
        currentStageIndex: candidates.currentStageIndex,
        status: candidates.status,
        rejectionReason: candidates.rejectionReason,
        rejectionStage: candidates.rejectionStage,
        parsedResumeData: candidates.parsedResumeData,
        createdBy: candidates.createdBy,
        createdAt: candidates.createdAt,
        updatedAt: candidates.updatedAt,
        createdByUser: {
          id: users.id,
          fullName: users.fullName,
          email: users.email,
          position: users.position,
        },
      })
      .from(candidates)
      .leftJoin(users, eq(candidates.createdBy, users.id))
      .where(eq(candidates.status, status))
      .orderBy(desc(candidates.createdAt));
  }

  async createCandidate(candidate: InsertCandidate): Promise<Candidate> {
    this.ensureDb();
    const [newCandidate] = await db.insert(candidates).values(candidate).returning();
    
    // If interview stage chain is provided, create interview stages
    if (candidate.interviewStageChain) {
      const stageChain = candidate.interviewStageChain as any[];
      for (let i = 0; i < stageChain.length; i++) {
        const stage = stageChain[i];
        await db.insert(interviewStages).values({
          candidateId: newCandidate.id,
          stageIndex: i,
          stageName: stage.stageName,
          interviewerId: stage.interviewerId,
          status: i === 0 ? 'pending' : 'waiting', // First stage is pending, others wait
        });
      }
    }
    
    return newCandidate;
  }

  async updateCandidate(id: number, candidate: Partial<InsertCandidate>): Promise<Candidate> {
    this.ensureDb();
    const [updatedCandidate] = await db
      .update(candidates)
      .set({ ...candidate, updatedAt: new Date() })
      .where(eq(candidates.id, id))
      .returning();
    return updatedCandidate;
  }

  async deleteCandidate(id: number): Promise<void> {
    this.ensureDb();
    try {
      // First, delete interviews that reference interview stages
      await db.delete(interviews).where(eq(interviews.candidateId, id));
      
      // Then delete interview stages
      await db.delete(interviewStages).where(eq(interviewStages.candidateId, id));
      
      // Finally delete the candidate
      await db.delete(candidates).where(eq(candidates.id, id));
    } catch (error) {
      console.error('Error deleting candidate:', error);
      throw error;
    }
  }

  async deleteInterviewStagesByCandidate(candidateId: number): Promise<void> {
    this.ensureDb();
    try {
      // First, delete interviews that reference these stages
      await db.delete(interviews).where(eq(interviews.candidateId, candidateId));
      
      // Then delete interview stages
      await db.delete(interviewStages).where(eq(interviewStages.candidateId, candidateId));
    } catch (error) {
      console.error('Error deleting interview stages for candidate:', error);
      throw error;
    }
  }

  async getInterviewStagesByCandidate(candidateId: number): Promise<any[]> {
    this.ensureDb();
    return await db
      .select({
        id: interviewStages.id,
        candidateId: interviewStages.candidateId,
        stageIndex: interviewStages.stageIndex,
        stageName: interviewStages.stageName,
        interviewerId: interviewStages.interviewerId,
        status: interviewStages.status,
        scheduledAt: interviewStages.scheduledAt,
        completedAt: interviewStages.completedAt,
        comments: interviewStages.comments,
        rating: interviewStages.rating,
        createdAt: interviewStages.createdAt,
        updatedAt: interviewStages.updatedAt,
        interviewer: {
          id: users.id,
          fullName: users.fullName,
          email: users.email,
          position: users.position,
        },
        // Include interview ID for rescheduling
        interviewId: interviews.id,
      })
      .from(interviewStages)
      .leftJoin(users, eq(interviewStages.interviewerId, users.id))
      .leftJoin(interviews, eq(interviews.stageId, interviewStages.id))
      .where(eq(interviewStages.candidateId, candidateId))
      .orderBy(asc(interviewStages.stageIndex));
  }

  async getAllInterviewStages(): Promise<any[]> {
    this.ensureDb();
    return await db
      .select({
        id: interviewStages.id,
        candidateId: interviewStages.candidateId,
        stageIndex: interviewStages.stageIndex,
        stageName: interviewStages.stageName,
        interviewerId: interviewStages.interviewerId,
        status: interviewStages.status,
        scheduledAt: interviewStages.scheduledAt,
        completedAt: interviewStages.completedAt,
        comments: interviewStages.comments,
        rating: interviewStages.rating,
        createdAt: interviewStages.createdAt,
        updatedAt: interviewStages.updatedAt,
      })
      .from(interviewStages)
      .orderBy(asc(interviewStages.candidateId), asc(interviewStages.stageIndex));
  }

  async createInterviewStage(stage: InsertInterviewStage): Promise<InterviewStage> {
    this.ensureDb();
    const [newStage] = await db.insert(interviewStages).values(stage).returning();
    return newStage;
  }

  async getInterviewStage(id: number): Promise<InterviewStage | undefined> {
    this.ensureDb();
    const [stage] = await db
      .select()
      .from(interviewStages)
      .where(eq(interviewStages.id, id))
      .limit(1);
    return stage || undefined;
  }

  async updateInterviewStage(id: number, stage: Partial<InsertInterviewStage>): Promise<InterviewStage> {
    this.ensureDb();
    try {
      console.log('Updating interview stage:', id, stage);
      
      // Convert date strings to Date objects
      const updateData = { ...stage };
      if (updateData.scheduledAt && typeof updateData.scheduledAt === 'string') {
        updateData.scheduledAt = new Date(updateData.scheduledAt);
      }
      if (updateData.completedAt && typeof updateData.completedAt === 'string') {
        updateData.completedAt = new Date(updateData.completedAt);
      }
      
      const [updatedStage] = await db
        .update(interviewStages)
        .set({ ...updateData, updatedAt: new Date() })
        .where(eq(interviewStages.id, id))
        .returning();
      
      if (!updatedStage) {
        throw new Error('Interview stage not found');
      }
      
      console.log('Updated stage:', updatedStage);
      
      // If stage is completed successfully, move to next stage
      if (updatedStage && stage.status === 'passed') {
        const candidate = await db.select().from(candidates).where(eq(candidates.id, updatedStage.candidateId)).limit(1);
        if (candidate[0]) {
          const nextStageIndex = updatedStage.stageIndex + 1;
          
          // Update candidate's current stage index to reflect that this stage is completed
          await db
            .update(candidates)
            .set({ currentStageIndex: nextStageIndex, updatedAt: new Date() })
            .where(eq(candidates.id, updatedStage.candidateId));
          
          const nextStage = await db
            .select()
            .from(interviewStages)
            .where(
              and(
                eq(interviewStages.candidateId, updatedStage.candidateId),
                eq(interviewStages.stageIndex, nextStageIndex)
              )
            )
            .limit(1);

          if (nextStage[0]) {
            // Create notification for next stage interviewer if assigned
            if (nextStage[0].interviewerId) {
              await db.insert(notifications).values({
                userId: nextStage[0].interviewerId,
                type: 'interview_assigned',
                title: 'Новое собеседование',
                message: `Кандидат прошел предыдущий этап. Назначен на этап "${nextStage[0].stageName}"`,
                entityType: 'interview_stage',
                entityId: nextStage[0].id,
                isRead: false,
              });
            }
          } else {
            // No more stages, move to documentation status instead of hired
            await db
              .update(candidates)
              .set({ status: 'documentation', updatedAt: new Date() })
              .where(eq(candidates.id, updatedStage.candidateId));
          }
        }
      } else if (updatedStage && stage.status === 'failed') {
        // Mark candidate as rejected
        await db
          .update(candidates)
          .set({ 
            status: 'rejected', 
            rejectionStage: updatedStage.stageName,
            rejectionReason: stage.comments || 'Failed interview stage',
            updatedAt: new Date() 
          })
          .where(eq(candidates.id, updatedStage.candidateId));
      }
      
      return updatedStage;
    } catch (error) {
      console.error('Error in updateInterviewStage:', error);
      throw error;
    }
  }

  async scheduleInterview(stageId: number, interviewerId: number, scheduledAt: Date, duration: number = 30): Promise<Interview> {
    this.ensureDb();
    try {
      console.log('scheduleInterview called with:', { stageId, interviewerId, scheduledAt, duration });
      
      // Simplified conflict check - check if there's any overlap in scheduled time
      const startTime = new Date(scheduledAt);
      const endTime = new Date(scheduledAt.getTime() + duration * 60000);
      
      // Get all scheduled interviews for this interviewer
      const existingInterviews = await db
        .select()
        .from(interviews)
        .where(
          and(
            eq(interviews.interviewerId, interviewerId),
            eq(interviews.status, 'scheduled')
          )
        );

      console.log('Checking conflicts for:', { startTime, endTime, interviewerId });
      console.log('Existing interviews:', existingInterviews.length);

      // Check for time conflicts manually
      const conflicts = existingInterviews.filter((interview: any) => {
        const existingStart = new Date(interview.scheduledAt);
        const existingEnd = new Date(interview.scheduledAt.getTime() + interview.duration * 60000);
        
        // Check if new interview overlaps with existing one
        const overlaps = (startTime < existingEnd && endTime > existingStart);
        
        if (overlaps) {
          console.log('Conflict found:', {
            existing: { start: existingStart, end: existingEnd },
            new: { start: startTime, end: endTime }
          });
        }
        
        return overlaps;
      });

      if (conflicts.length > 0) {
        const conflictTime = conflicts[0].scheduledAt.toLocaleTimeString('ru-RU', { 
          hour: '2-digit', 
          minute: '2-digit' 
        });
        throw new Error(`Интервьюер занят в это время. Конфликт с собеседованием в ${conflictTime}`);
      }

      // Get stage and candidate info
      const stage = await db
        .select({
          candidateId: interviewStages.candidateId,
          stageName: interviewStages.stageName,
        })
        .from(interviewStages)
        .where(eq(interviewStages.id, stageId))
        .limit(1);

      console.log('Stage found:', stage[0]);

      if (!stage[0]) {
        throw new Error('Stage not found');
      }

      const [interview] = await db
        .insert(interviews)
        .values({
          stageId,
          candidateId: stage[0].candidateId,
          interviewerId,
          scheduledAt,
          duration,
          status: 'scheduled',
        })
        .returning();

      console.log('Interview created:', interview);

      // Update the interview stage status and scheduled time
      await db
        .update(interviewStages)
        .set({ 
          status: 'in_progress',
          scheduledAt: scheduledAt,
          updatedAt: new Date()
        })
        .where(eq(interviewStages.id, stageId));

      // Create notification for interviewer
      await db.insert(notifications).values({
        userId: interviewerId,
        type: 'interview_scheduled',
        title: 'Новое собеседование',
        message: `Назначено собеседование на этапе "${stage[0].stageName}" на ${scheduledAt.toLocaleString('ru-RU')}`,
        entityType: 'interview',
        entityId: interview.id,
        isRead: false,
      });

      return interview;
    } catch (error) {
      console.error('Error in scheduleInterview:', error);
      throw error;
    }
  }

  async getArchivedCandidates(): Promise<Candidate[]> {
    this.ensureDb();
    return await db
      .select({
        id: candidates.id,
        fullName: candidates.fullName,
        email: candidates.email,
        phone: candidates.phone,
        city: candidates.city,
        vacancyId: candidates.vacancyId,
        resumeUrl: candidates.resumeUrl,
        resumeFilename: candidates.resumeFilename,
        photoUrl: candidates.photoUrl,
        source: candidates.source,
        interviewStageChain: candidates.interviewStageChain,
        currentStageIndex: candidates.currentStageIndex,
        status: candidates.status,
        rejectionReason: candidates.rejectionReason,
        rejectionStage: candidates.rejectionStage,
        dismissalReason: candidates.dismissalReason,
        dismissalDate: candidates.dismissalDate,
        parsedResumeData: candidates.parsedResumeData,
        createdBy: candidates.createdBy,
        createdAt: candidates.createdAt,
        updatedAt: candidates.updatedAt,
      })
      .from(candidates)
      .where(
        or(
          eq(candidates.status, 'hired'),
          eq(candidates.status, 'rejected'),
          eq(candidates.status, 'dismissed')
        )
      )
      .orderBy(desc(candidates.updatedAt));
  }

  async getArchivedCandidatesWithAttachments(): Promise<any[]> {
    this.ensureDb();
    const archivedCandidates = await this.getArchivedCandidates();
    
    // Get attachments for each candidate
    const candidatesWithAttachments = await Promise.all(
      archivedCandidates.map(async (candidate) => {
        const attachments = await this.getDocumentationAttachments(candidate.id);
        return {
          ...candidate,
          documentationAttachments: attachments,
        };
      })
    );
    
    return candidatesWithAttachments;
  }

  async dismissCandidate(id: number, dismissalReason: string, dismissalDate: Date): Promise<Candidate> {
    this.ensureDb();
    const [updatedCandidate] = await db
      .update(candidates)
      .set({ 
        status: 'dismissed',
        dismissalReason,
        dismissalDate,
        updatedAt: new Date()
      })
      .where(eq(candidates.id, id))
      .returning();
    return updatedCandidate;
  }

  async getInterview(interviewId: number): Promise<any> {
    this.ensureDb();
    const [interview] = await db
      .select({
        id: interviews.id,
        stageId: interviews.stageId,
        candidateId: interviews.candidateId,
        interviewerId: interviews.interviewerId,
        scheduledAt: interviews.scheduledAt,
        duration: interviews.duration,
        status: interviews.status,
        outcome: interviews.outcome,
        notes: interviews.notes,
        createdAt: interviews.createdAt,
        updatedAt: interviews.updatedAt,
        candidate: {
          id: candidates.id,
          fullName: candidates.fullName,
          email: candidates.email,
          phone: candidates.phone,
        },
        stage: {
          id: interviewStages.id,
          stageName: interviewStages.stageName,
        },
        interviewer: {
          id: users.id,
          fullName: users.fullName,
        },
      })
      .from(interviews)
      .leftJoin(candidates, eq(interviews.candidateId, candidates.id))
      .leftJoin(interviewStages, eq(interviews.stageId, interviewStages.id))
      .leftJoin(users, eq(interviews.interviewerId, users.id))
      .where(eq(interviews.id, interviewId));
    
    return interview;
  }

  async rescheduleInterview(interviewId: number, newDateTime: Date): Promise<Interview> {
    this.ensureDb();
    const [interview] = await db
      .update(interviews)
      .set({ 
        scheduledAt: newDateTime,
        updatedAt: new Date()
      })
      .where(eq(interviews.id, interviewId))
      .returning();

    if (interview) {
      // Create notification
      await db.insert(notifications).values({
        userId: interview.interviewerId,
        type: 'interview_rescheduled',
        title: 'Собеседование перенесено',
        message: `Собеседование перенесено на ${newDateTime.toLocaleString('ru-RU')}`,
        entityType: 'interview',
        entityId: interview.id,
        isRead: false,
      });
    }

    return interview;
  }

  async updateInterviewOutcome(interviewId: number, outcome: 'passed' | 'failed', notes?: string): Promise<Interview> {
    this.ensureDb();
    const [interview] = await db
      .update(interviews)
      .set({ 
        outcome,
        notes: notes || '',
        status: 'completed',
        updatedAt: new Date()
      })
      .where(eq(interviews.id, interviewId))
      .returning();

    return interview;
  }

  async getInterviews(): Promise<any[]> {
    this.ensureDb();
    return await db
      .select({
        id: interviews.id,
        stageId: interviews.stageId,
        candidateId: interviews.candidateId,
        interviewerId: interviews.interviewerId,
        scheduledAt: interviews.scheduledAt,
        duration: interviews.duration,
        status: interviews.status,
        outcome: interviews.outcome,
        notes: interviews.notes,
        createdAt: interviews.createdAt,
        updatedAt: interviews.updatedAt,
        candidate: {
          id: candidates.id,
          fullName: candidates.fullName,
          email: candidates.email,
          phone: candidates.phone,
          city: candidates.city,
          vacancyId: candidates.vacancyId,
        },
        vacancy: {
          id: vacancies.id,
          title: vacancies.title,
          department: vacancies.department,
        },
        stage: {
          id: interviewStages.id,
          stageName: interviewStages.stageName,
          stageIndex: interviewStages.stageIndex,
        },
        interviewer: {
          id: users.id,
          fullName: users.fullName,
          email: users.email,
          position: users.position,
        },
      })
      .from(interviews)
      .leftJoin(candidates, eq(interviews.candidateId, candidates.id))
      .leftJoin(vacancies, eq(candidates.vacancyId, vacancies.id))
      .leftJoin(interviewStages, eq(interviews.stageId, interviewStages.id))
      .leftJoin(users, eq(interviews.interviewerId, users.id))
      .orderBy(interviews.scheduledAt);
  }

  async getInterviewsByInterviewer(interviewerId: number): Promise<any[]> {
    this.ensureDb();
    return await db
      .select({
        id: interviews.id,
        stageId: interviews.stageId,
        candidateId: interviews.candidateId,
        interviewerId: interviews.interviewerId,
        scheduledAt: interviews.scheduledAt,
        duration: interviews.duration,
        status: interviews.status,
        outcome: interviews.outcome,
        notes: interviews.notes,
        createdAt: interviews.createdAt,
        updatedAt: interviews.updatedAt,
        candidate: {
          id: candidates.id,
          fullName: candidates.fullName,
          email: candidates.email,
          phone: candidates.phone,
          city: candidates.city,
          vacancyId: candidates.vacancyId,
        },
        vacancy: {
          id: vacancies.id,
          title: vacancies.title,
          department: vacancies.department,
        },
        stage: {
          id: interviewStages.id,
          stageName: interviewStages.stageName,
          stageIndex: interviewStages.stageIndex,
        },
        interviewer: {
          id: users.id,
          fullName: users.fullName,
          email: users.email,
          position: users.position,
        },
      })
      .from(interviews)
      .leftJoin(candidates, eq(interviews.candidateId, candidates.id))
      .leftJoin(vacancies, eq(candidates.vacancyId, vacancies.id))
      .leftJoin(interviewStages, eq(interviews.stageId, interviewStages.id))
      .leftJoin(users, eq(interviews.interviewerId, users.id))
      .where(eq(interviews.interviewerId, interviewerId))
      .orderBy(asc(interviews.scheduledAt));
  }

  async getInterviewsByDateRange(start: Date, end: Date): Promise<Interview[]> {
    this.ensureDb();
    return await db
      .select()
      .from(interviews)
      .where(
        and(
          gte(interviews.scheduledAt, start),
          lte(interviews.scheduledAt, end)
        )
      )
      .orderBy(asc(interviews.scheduledAt));
  }

  async getInterviewsByStage(stageId: number): Promise<Interview[]> {
    this.ensureDb();
    return await db
      .select()
      .from(interviews)
      .where(eq(interviews.stageId, stageId))
      .orderBy(asc(interviews.scheduledAt));
  }

  async createInterview(interview: InsertInterview): Promise<Interview> {
    this.ensureDb();
    const [newInterview] = await db.insert(interviews).values(interview).returning();
    return newInterview;
  }

  async updateInterview(id: number, interview: Partial<InsertInterview>): Promise<Interview> {
    this.ensureDb();
    // Convert date strings to Date objects
    const updateData = { ...interview };
    if (updateData.scheduledAt && typeof updateData.scheduledAt === 'string') {
      updateData.scheduledAt = new Date(updateData.scheduledAt);
    }
    
    const [updatedInterview] = await db
      .update(interviews)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(interviews.id, id))
      .returning();
    return updatedInterview;
  }

  async getNotificationsByUser(userId: number): Promise<Notification[]> {
    this.ensureDb();
    return await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    this.ensureDb();
    const [newNotification] = await db.insert(notifications).values(notification).returning();
    return newNotification;
  }

  async markNotificationAsRead(id: number): Promise<void> {
    this.ensureDb();
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.id, id));
  }

  async getNotification(id: number): Promise<Notification | undefined> {
    this.ensureDb();
    const [notification] = await db
      .select()
      .from(notifications)
      .where(eq(notifications.id, id));
    return notification || undefined;
  }

  async deleteNotification(id: number): Promise<void> {
    this.ensureDb();
    await db.delete(notifications).where(eq(notifications.id, id));
  }

  async createAuditLog(log: InsertAuditLog): Promise<AuditLog> {
    this.ensureDb();
    const [newLog] = await db.insert(auditLogs).values(log).returning();
    return newLog;
  }

  async getSystemSetting(key: string): Promise<SystemSetting | undefined> {
    this.ensureDb();
    const [setting] = await db
      .select()
      .from(systemSettings)
      .where(eq(systemSettings.key, key));
    return setting || undefined;
  }

  async setSystemSetting(setting: InsertSystemSetting): Promise<SystemSetting> {
    this.ensureDb();
    const [newSetting] = await db
      .insert(systemSettings)
      .values(setting)
      .onConflictDoUpdate({
        target: systemSettings.key,
        set: { value: setting.value, updatedAt: new Date() }
      })
      .returning();
    return newSetting;
  }

  async getDashboardStats(): Promise<{
    activeVacancies: number;
    activeCandidates: number;
    todayInterviews: number;
    hiredThisMonth: number;
    documentationCandidates: number;
  }> {
    this.ensureDb();
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    // Optimize with parallel queries
    const [
      activeVacanciesResult,
      activeCandidatesResult,
      todayInterviewsResult,
      hiredThisMonthResult,
      documentationCandidatesResult
    ] = await Promise.all([
      db.select({ count: count() }).from(vacancies).where(eq(vacancies.status, "active")),
      db.select({ count: count() }).from(candidates).where(eq(candidates.status, "active")),
      db.select({ count: count() }).from(interviews).where(
        and(
          gte(interviews.scheduledAt, startOfToday),
          lte(interviews.scheduledAt, endOfToday),
          eq(interviews.status, "scheduled")
        )
      ),
      db.select({ count: count() }).from(candidates).where(
        and(
          eq(candidates.status, "hired"),
          gte(candidates.updatedAt, startOfMonth),
          lte(candidates.updatedAt, endOfMonth)
        )
      ),
      db.select({ count: count() }).from(candidates).where(eq(candidates.status, "documentation"))
    ]);

    return {
      activeVacancies: activeVacanciesResult[0].count,
      activeCandidates: activeCandidatesResult[0].count,
      todayInterviews: todayInterviewsResult[0].count,
      hiredThisMonth: hiredThisMonthResult[0].count,
      documentationCandidates: documentationCandidatesResult[0].count,
    };
  }

  async getHiringTrends(): Promise<any[]> {
    this.ensureDb();
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const trends = await db
      .select({
        month: sql<string>`TO_CHAR(${candidates.createdAt}, 'YYYY-MM')`,
        hired: sql<number>`COUNT(CASE WHEN ${candidates.status} = 'hired' THEN 1 END)`,
        applications: sql<number>`COUNT(*)`,
      })
      .from(candidates)
      .where(
        and(
          gte(candidates.createdAt, sixMonthsAgo),
          sql`${candidates.source} != 'manual_documentation' OR ${candidates.source} IS NULL`
        )
      )
      .groupBy(sql`TO_CHAR(${candidates.createdAt}, 'YYYY-MM')`)
      .orderBy(sql`TO_CHAR(${candidates.createdAt}, 'YYYY-MM')`);

    return trends;
  }

  async getDepartmentStats(): Promise<any[]> {
    this.ensureDb();
    const stats = await db
      .select({
        department: vacancies.department,
        count: sql<number>`COUNT(${candidates.id})`,
      })
      .from(vacancies)
      .leftJoin(candidates, eq(candidates.vacancyId, vacancies.id))
      .where(eq(candidates.status, 'hired'))
      .groupBy(vacancies.department)
      .orderBy(sql<number>`COUNT(${candidates.id}) DESC`);

    return stats;
  }

  async getTimeToHireStats(): Promise<{
    averageDays: number;
    fastest: number;
    median: number;
    slowest: number;
  }> {
    this.ensureDb();
    const hiredCandidates = await db
      .select({
        createdAt: candidates.createdAt,
        updatedAt: candidates.updatedAt,
      })
      .from(candidates)
      .where(
        and(
          eq(candidates.status, 'hired'),
          sql`${candidates.source} != 'manual_documentation' OR ${candidates.source} IS NULL`
        )
      );

    if (hiredCandidates.length === 0) {
      return { averageDays: 0, fastest: 0, median: 0, slowest: 0 };
    }

    const daysDiff = hiredCandidates.map((candidate: any) => {
      const created = new Date(candidate.createdAt);
      const hired = new Date(candidate.updatedAt);
      return Math.ceil((hired.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
    });

    daysDiff.sort((a: number, b: number) => a - b);

    const averageDays = Math.round(daysDiff.reduce((sum: number, days: number) => sum + days, 0) / daysDiff.length);
    const fastest = daysDiff[0];
    const slowest = daysDiff[daysDiff.length - 1];
    const median = daysDiff[Math.floor(daysDiff.length / 2)];

    return {
      averageDays,
      fastest,
      median,
      slowest,
    };
  }

  async getConversionFunnel(): Promise<{
    applications: number;
    phoneScreen: number;
    technical: number;
    final: number;
    hired: number;
  }> {
    this.ensureDb();
    // Exclude candidates created directly in documentation (manual_documentation)
    // as they haven't gone through the interview process
    const [applicationsResult] = await db
      .select({ count: count() })
      .from(candidates)
      .where(sql`${candidates.source} != 'manual_documentation' OR ${candidates.source} IS NULL`);

    const [phoneScreenResult] = await db
      .select({ count: count() })
      .from(interviewStages)
      .innerJoin(candidates, eq(interviewStages.candidateId, candidates.id))
      .where(
        and(
          sql`LOWER(${interviewStages.stageName}) LIKE '%phone%' OR LOWER(${interviewStages.stageName}) LIKE '%screen%'`,
          eq(interviewStages.status, "passed"),
          sql`${candidates.source} != 'manual_documentation' OR ${candidates.source} IS NULL`
        )
      );

    const [technicalResult] = await db
      .select({ count: count() })
      .from(interviewStages)
      .innerJoin(candidates, eq(interviewStages.candidateId, candidates.id))
      .where(
        and(
          sql`LOWER(${interviewStages.stageName}) LIKE '%technical%'`,
          eq(interviewStages.status, "passed"),
          sql`${candidates.source} != 'manual_documentation' OR ${candidates.source} IS NULL`
        )
      );

    const [finalResult] = await db
      .select({ count: count() })
      .from(interviewStages)
      .innerJoin(candidates, eq(interviewStages.candidateId, candidates.id))
      .where(
        and(
          sql`LOWER(${interviewStages.stageName}) LIKE '%final%'`,
          eq(interviewStages.status, "passed"),
          sql`${candidates.source} != 'manual_documentation' OR ${candidates.source} IS NULL`
        )
      );

    const [hiredResult] = await db
      .select({ count: count() })
      .from(candidates)
      .where(
        and(
          eq(candidates.status, "hired"),
          sql`${candidates.source} != 'manual_documentation' OR ${candidates.source} IS NULL`
        )
      );

    return {
      applications: applicationsResult.count,
      phoneScreen: phoneScreenResult.count,
      technical: technicalResult.count,
      final: finalResult.count,
      hired: hiredResult.count,
    };
  }

  async getMessagesBetweenUsers(user1Id: number, user2Id: number): Promise<Message[]> {
    this.ensureDb();
    const result = await db
      .select({
        id: messages.id,
        senderId: messages.senderId,
        receiverId: messages.receiverId,
        content: messages.content,
        isRead: messages.isRead,
        createdAt: messages.createdAt,
        updatedAt: messages.updatedAt,
        senderId_user: users.id,
        senderFullName: users.fullName,
        senderPosition: users.position,
      })
      .from(messages)
      .leftJoin(users, eq(messages.senderId, users.id))
      .where(
        or(
          and(eq(messages.senderId, user1Id), eq(messages.receiverId, user2Id)),
          and(eq(messages.senderId, user2Id), eq(messages.receiverId, user1Id))
        )
      )
      .orderBy(asc(messages.createdAt));
    
    // Format the result to match Message type
    return result.map((row: any) => ({
      id: row.id,
      senderId: row.senderId,
      receiverId: row.receiverId,
      content: row.content,
      isRead: row.isRead,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      sender: row.senderId_user ? {
        id: row.senderId_user,
        fullName: row.senderFullName || '',
        position: row.senderPosition || '',
      } : undefined
    })) as Message[];
  }

  async createMessage(message: InsertMessage): Promise<any> {
    this.ensureDb();
    const [newMessage] = await db.insert(messages).values(message).returning();
    
    // Get message with sender info
    const [messageWithSender] = await db
      .select({
        id: messages.id,
        senderId: messages.senderId,
        receiverId: messages.receiverId,
        content: messages.content,
        isRead: messages.isRead,
        createdAt: messages.createdAt,
        updatedAt: messages.updatedAt,
        senderId_user: users.id,
        senderFullName: users.fullName,
        senderPosition: users.position,
      })
      .from(messages)
      .leftJoin(users, eq(messages.senderId, users.id))
      .where(eq(messages.id, newMessage.id));

    // Format the result to include sender object
    return {
      id: messageWithSender.id,
      senderId: messageWithSender.senderId,
      receiverId: messageWithSender.receiverId,
      content: messageWithSender.content,
      isRead: messageWithSender.isRead,
      createdAt: messageWithSender.createdAt,
      updatedAt: messageWithSender.updatedAt,
      sender: messageWithSender.senderId_user ? {
        id: messageWithSender.senderId_user,
        fullName: messageWithSender.senderFullName || '',
        position: messageWithSender.senderPosition || '',
      } : undefined
    };
  }

  async getConversationsByUser(userId: number): Promise<User[]> {
    this.ensureDb();
    // Get unique users who have had conversations with the current user
    const senderUsers = await db
      .selectDistinct({
        id: users.id,
        fullName: users.fullName,
        position: users.position,
        email: users.email,
      })
      .from(messages)
      .innerJoin(users, eq(messages.senderId, users.id))
      .where(
        and(
          eq(messages.receiverId, userId),
          sql`${users.id} != ${userId}`
        )
      );

    const receiverUsers = await db
      .selectDistinct({
        id: users.id,
        fullName: users.fullName,
        position: users.position,
        email: users.email,
      })
      .from(messages)
      .innerJoin(users, eq(messages.receiverId, users.id))
      .where(
        and(
          eq(messages.senderId, userId),
          sql`${users.id} != ${userId}`
        )
      );

    // Combine and deduplicate
    const allUsers = [...senderUsers, ...receiverUsers];
    const uniqueUsers = allUsers.filter((user, index, self) => 
      index === self.findIndex(u => u.id === user.id)
    );

    return uniqueUsers as User[];
  }

  async getHiredAndDismissedStats(): Promise<{
    totalHired: number;
    totalDismissed: number;
    currentlyEmployed: number;
  }> {
    this.ensureDb();
    
    const [totalHiredResult] = await db
      .select({ count: count() })
      .from(candidates)
      .where(eq(candidates.status, 'hired'));
    
    const [totalDismissedResult] = await db
      .select({ count: count() })
      .from(candidates)
      .where(eq(candidates.status, 'dismissed'));
    
    // Currently employed = hired but not dismissed
    const currentlyEmployed = totalHiredResult.count;
    
    return {
      totalHired: totalHiredResult.count,
      totalDismissed: totalDismissedResult.count,
      currentlyEmployed: currentlyEmployed,
    };
  }

  async getHiredAndDismissedStatsByMonth(): Promise<{
    month: string;
    monthName: string;
    year: string;
    hired: number;
    dismissed: number;
    netChange: number;
  }[]> {
    this.ensureDb();
    
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    
    // Get hired candidates by month
    const hiredByMonth = await db
      .select({
        month: sql<string>`TO_CHAR(${candidates.updatedAt}, 'YYYY-MM')`,
        count: count(),
      })
      .from(candidates)
      .where(
        and(
          eq(candidates.status, 'hired'),
          gte(candidates.updatedAt, oneYearAgo)
        )
      )
      .groupBy(sql`TO_CHAR(${candidates.updatedAt}, 'YYYY-MM')`);
    
    // Get dismissed candidates by month
    const dismissedByMonth = await db
      .select({
        month: sql<string>`TO_CHAR(${candidates.dismissalDate}, 'YYYY-MM')`,
        count: count(),
      })
      .from(candidates)
      .where(
        and(
          eq(candidates.status, 'dismissed'),
          sql`${candidates.dismissalDate} IS NOT NULL`,
          gte(candidates.dismissalDate, oneYearAgo)
        )
      )
      .groupBy(sql`TO_CHAR(${candidates.dismissalDate}, 'YYYY-MM')`);
    
    // Combine results
    const monthMap = new Map<string, { hired: number; dismissed: number }>();
    
    hiredByMonth.forEach((item: any) => {
      monthMap.set(item.month, { hired: item.count, dismissed: 0 });
    });
    
    dismissedByMonth.forEach((item: any) => {
      const existing = monthMap.get(item.month) || { hired: 0, dismissed: 0 };
      existing.dismissed = item.count;
      monthMap.set(item.month, existing);
    });
    
    // Convert to array and sort
    const result = Array.from(monthMap.entries())
      .map(([month, data]) => {
        const [year, monthNum] = month.split('-');
        const monthNames = [
          'January', 'February', 'March', 'April', 'May', 'June',
          'July', 'August', 'September', 'October', 'November', 'December'
        ];
        return {
          month,
          monthName: monthNames[parseInt(monthNum) - 1],
          year,
          hired: data.hired,
          dismissed: data.dismissed,
          netChange: data.hired - data.dismissed,
        };
      })
      .sort((a, b) => a.month.localeCompare(b.month));
    
    return result;
  }

  async getHiredAndDismissedStatsByYear(): Promise<{
    year: string;
    hired: number;
    dismissed: number;
    netChange: number;
  }[]> {
    this.ensureDb();
    
    const fiveYearsAgo = new Date();
    fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);
    
    // Get hired candidates by year
    const hiredByYear = await db
      .select({
        year: sql<string>`EXTRACT(YEAR FROM ${candidates.updatedAt})::text`,
        count: count(),
      })
      .from(candidates)
      .where(
        and(
          eq(candidates.status, 'hired'),
          gte(candidates.updatedAt, fiveYearsAgo)
        )
      )
      .groupBy(sql`EXTRACT(YEAR FROM ${candidates.updatedAt})`);
    
    // Get dismissed candidates by year
    const dismissedByYear = await db
      .select({
        year: sql<string>`EXTRACT(YEAR FROM ${candidates.dismissalDate})::text`,
        count: count(),
      })
      .from(candidates)
      .where(
        and(
          eq(candidates.status, 'dismissed'),
          sql`${candidates.dismissalDate} IS NOT NULL`,
          gte(candidates.dismissalDate, fiveYearsAgo)
        )
      )
      .groupBy(sql`EXTRACT(YEAR FROM ${candidates.dismissalDate})`);
    
    // Combine results
    const yearMap = new Map<string, { hired: number; dismissed: number }>();
    
    hiredByYear.forEach((item: any) => {
      yearMap.set(item.year, { hired: item.count, dismissed: 0 });
    });
    
    dismissedByYear.forEach((item: any) => {
      const existing = yearMap.get(item.year) || { hired: 0, dismissed: 0 };
      existing.dismissed = item.count;
      yearMap.set(item.year, existing);
    });
    
    // Convert to array and sort
    const result = Array.from(yearMap.entries())
      .map(([year, data]) => ({
        year,
        hired: data.hired,
        dismissed: data.dismissed,
        netChange: data.hired - data.dismissed,
      }))
      .sort((a, b) => a.year.localeCompare(b.year));
    
    return result;
  }

  async markMessageAsRead(messageId: number, userId: number): Promise<Message> {
    this.ensureDb();
    // Only mark as read if the user is the receiver
    const [updatedMessage] = await db
      .update(messages)
      .set({ isRead: true })
      .where(and(eq(messages.id, messageId), eq(messages.receiverId, userId)))
      .returning();

    return updatedMessage;
  }

  async getRejectionsByStage(): Promise<{ stage: number; rejections: number; stageName: string }[]> {
    this.ensureDb();
    // Get all rejected candidates and their current stage
    const rejectedCandidates = await db
      .select({
        currentStage: candidates.currentStageIndex,
      })
      .from(candidates)
      .where(eq(candidates.status, 'rejected'));

    // Count rejections by stage
    const stageRejections = new Map<number, number>();
    rejectedCandidates.forEach((candidate: any) => {
      const stage = candidate.currentStage || 1;
      stageRejections.set(stage, (stageRejections.get(stage) || 0) + 1);
    });

    // Create array with all 5 stages
    const stageNames = [
      'Первичный отбор',
      'Телефонное интервью', 
      'Техническое собеседование',
      'Финальное интервью',
      'Оформление документов'
    ];

    const result = [];
    for (let i = 1; i <= 5; i++) {
      result.push({
        stage: i,
        rejections: stageRejections.get(i) || 0,
        stageName: stageNames[i - 1]
      });
    }

    return result;
  }

  async getDashboardStatsByMonth(month: string, year: string): Promise<{
    activeVacancies: number;
    activeCandidates: number;
    monthlyInterviews: number;
    hiredThisMonth: number;
    documentationCandidates: number;
  }> {
    this.ensureDb();
    const startOfMonth = new Date(`${year}-${month}-01`);
    const endOfMonth = new Date(parseInt(year), parseInt(month), 0);

    const [activeVacanciesResult] = await db
      .select({ count: count() })
      .from(vacancies)
      .where(eq(vacancies.status, "active"));

    const [activeCandidatesResult] = await db
      .select({ count: count() })
      .from(candidates)
      .where(eq(candidates.status, "active"));

    const [monthlyInterviewsResult] = await db
      .select({ count: count() })
      .from(interviews)
      .where(
        and(
          gte(interviews.scheduledAt, startOfMonth),
          lte(interviews.scheduledAt, endOfMonth)
        )
      );

    const [hiredThisMonthResult] = await db
      .select({ count: count() })
      .from(candidates)
      .where(
        and(
          eq(candidates.status, "hired"),
          gte(candidates.updatedAt, startOfMonth),
          lte(candidates.updatedAt, endOfMonth)
        )
      );

    const [documentationCandidatesResult] = await db
      .select({ count: count() })
      .from(candidates)
      .where(eq(candidates.status, "documentation"));

    return {
      activeVacancies: activeVacanciesResult.count,
      activeCandidates: activeCandidatesResult.count,
      monthlyInterviews: monthlyInterviewsResult.count,
      hiredThisMonth: hiredThisMonthResult.count,
      documentationCandidates: documentationCandidatesResult.count,
    };
  }

  async getConversionFunnelByMonth(month: string, year: string): Promise<{
    applications: number;
    phoneScreen: number;
    technical: number;
    final: number;
    hired: number;
  }> {
    this.ensureDb();
    const startOfMonth = new Date(`${year}-${month}-01`);
    const endOfMonth = new Date(parseInt(year), parseInt(month), 0);

    // Exclude candidates created directly in documentation (manual_documentation)
    // as they haven't gone through the interview process
    const [applicationsResult] = await db
      .select({ count: count() })
      .from(candidates)
      .where(
        and(
          gte(candidates.createdAt, startOfMonth),
          lte(candidates.createdAt, endOfMonth),
          sql`${candidates.source} != 'manual_documentation' OR ${candidates.source} IS NULL`
        )
      );

    // Fixed: Use interviewStages with status = 'passed' instead of currentStageIndex
    const [phoneScreenResult] = await db
      .select({ count: count() })
      .from(interviewStages)
      .innerJoin(candidates, eq(interviewStages.candidateId, candidates.id))
      .where(
        and(
          sql`LOWER(${interviewStages.stageName}) LIKE '%phone%' OR LOWER(${interviewStages.stageName}) LIKE '%screen%'`,
          eq(interviewStages.status, "passed"),
          gte(candidates.createdAt, startOfMonth),
          lte(candidates.createdAt, endOfMonth),
          sql`${candidates.source} != 'manual_documentation' OR ${candidates.source} IS NULL`
        )
      );

    const [technicalResult] = await db
      .select({ count: count() })
      .from(interviewStages)
      .innerJoin(candidates, eq(interviewStages.candidateId, candidates.id))
      .where(
        and(
          sql`LOWER(${interviewStages.stageName}) LIKE '%technical%'`,
          eq(interviewStages.status, "passed"),
          gte(candidates.createdAt, startOfMonth),
          lte(candidates.createdAt, endOfMonth),
          sql`${candidates.source} != 'manual_documentation' OR ${candidates.source} IS NULL`
        )
      );

    const [finalResult] = await db
      .select({ count: count() })
      .from(interviewStages)
      .innerJoin(candidates, eq(interviewStages.candidateId, candidates.id))
      .where(
        and(
          sql`LOWER(${interviewStages.stageName}) LIKE '%final%'`,
          eq(interviewStages.status, "passed"),
          gte(candidates.createdAt, startOfMonth),
          lte(candidates.createdAt, endOfMonth),
          sql`${candidates.source} != 'manual_documentation' OR ${candidates.source} IS NULL`
        )
      );

    // For hired candidates, we exclude manual_documentation but allow them to contribute
    // to hired count if they were hired through the normal process
    const [hiredResult] = await db
      .select({ count: count() })
      .from(candidates)
      .where(
        and(
          eq(candidates.status, "hired"),
          gte(candidates.updatedAt, startOfMonth),
          lte(candidates.updatedAt, endOfMonth),
          sql`${candidates.source} != 'manual_documentation' OR ${candidates.source} IS NULL`
        )
      );

    return {
      applications: applicationsResult.count,
      phoneScreen: phoneScreenResult.count,
      technical: technicalResult.count,
      final: finalResult.count,
      hired: hiredResult.count,
    };
  }

  async getRejectionsByStageByMonth(month: string, year: string): Promise<{ stage: number; rejections: number; stageName: string }[]> {
    this.ensureDb();
    const startOfMonth = new Date(`${year}-${month}-01`);
    const endOfMonth = new Date(parseInt(year), parseInt(month), 0);

    const rejectedCandidates = await db
      .select({
        currentStage: candidates.currentStageIndex,
      })
      .from(candidates)
      .where(
        and(
          eq(candidates.status, 'rejected'),
          gte(candidates.updatedAt, startOfMonth),
          lte(candidates.updatedAt, endOfMonth)
        )
      );

    const stageRejections = new Map<number, number>();
    rejectedCandidates.forEach((candidate: any) => {
      const stage = candidate.currentStage || 1;
      stageRejections.set(stage, (stageRejections.get(stage) || 0) + 1);
    });

    const stageNames = [
      'Первичный отбор',
      'Телефонное интервью', 
      'Техническое собеседование',
      'Финальное интервью',
      'Оформление документов'
    ];

    const result = [];
    for (let i = 1; i <= 5; i++) {
      result.push({
        stage: i,
        rejections: stageRejections.get(i) || 0,
        stageName: stageNames[i - 1]
      });
    }

    return result;
  }

  async getAvailableDataPeriods(): Promise<{ year: string; month: string; monthName: string }[]> {
    this.ensureDb();
    // Get unique months/years where we have candidates data
    const candidatePeriods = await db
      .select({
        period: sql<string>`TO_CHAR(${candidates.createdAt}, 'YYYY-MM')`,
      })
      .from(candidates)
      .groupBy(sql`TO_CHAR(${candidates.createdAt}, 'YYYY-MM')`)
      .orderBy(sql`TO_CHAR(${candidates.createdAt}, 'YYYY-MM') DESC`);

    // Get unique months/years where we have interviews data
    const interviewPeriods = await db
      .select({
        period: sql<string>`TO_CHAR(${interviews.scheduledAt}, 'YYYY-MM')`,
      })
      .from(interviews)
      .groupBy(sql`TO_CHAR(${interviews.scheduledAt}, 'YYYY-MM')`)
      .orderBy(sql`TO_CHAR(${interviews.scheduledAt}, 'YYYY-MM') DESC`);

    // Combine and deduplicate periods
    const allPeriods = new Set([
      ...(candidatePeriods as any[]).map((p: any) => p.period),
      ...(interviewPeriods as any[]).map((p: any) => p.period)
    ]);

    const monthNames = [
      'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
      'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
    ];

    const result = Array.from(allPeriods)
      .sort()
      .reverse()
      .map(period => {
        const [year, month] = period.split('-');
        return {
          year,
          month,
          monthName: monthNames[parseInt(month) - 1]
        };
      });

    return result;
  }

  // Department methods
  async getDepartments(): Promise<Department[]> {
    return db.select().from(departments).orderBy(departments.name);
  }

  async getDepartment(id: number): Promise<Department | undefined> {
    const [department] = await db.select().from(departments).where(eq(departments.id, id));
    return department;
  }

  async createDepartment(department: InsertDepartment): Promise<Department> {
    const [created] = await db.insert(departments).values(department).returning();
    return created;
  }

  async updateDepartment(id: number, department: Partial<InsertDepartment>): Promise<Department> {
    const [updated] = await db
      .update(departments)
      .set({ ...department, updatedAt: new Date() })
      .where(eq(departments.id, id))
      .returning();
    return updated;
  }

  async deleteDepartment(id: number): Promise<void> {
    await db.delete(departments).where(eq(departments.id, id));
  }

  // Documentation Attachment methods
  async getDocumentationAttachments(candidateId: number): Promise<DocumentationAttachment[]> {
    this.ensureDb();
    return await db
      .select({
        id: documentationAttachments.id,
        candidateId: documentationAttachments.candidateId,
        filename: documentationAttachments.filename,
        originalName: documentationAttachments.originalName,
        fileType: documentationAttachments.fileType,
        fileSize: documentationAttachments.fileSize,
        uploadedBy: documentationAttachments.uploadedBy,
        createdAt: documentationAttachments.createdAt,
        uploadedByUser: {
          id: users.id,
          fullName: users.fullName,
          email: users.email,
        },
      })
      .from(documentationAttachments)
      .leftJoin(users, eq(documentationAttachments.uploadedBy, users.id))
      .where(eq(documentationAttachments.candidateId, candidateId))
      .orderBy(desc(documentationAttachments.createdAt));
  }

  async getDocumentationAttachment(id: number): Promise<DocumentationAttachment | undefined> {
    this.ensureDb();
    const [attachment] = await db
      .select()
      .from(documentationAttachments)
      .where(eq(documentationAttachments.id, id));
    return attachment || undefined;
  }

  async createDocumentationAttachment(attachment: InsertDocumentationAttachment): Promise<DocumentationAttachment> {
    this.ensureDb();
    const [newAttachment] = await db
      .insert(documentationAttachments)
      .values(attachment)
      .returning();
    return newAttachment;
  }

  async deleteDocumentationAttachment(id: number): Promise<void> {
    this.ensureDb();
    await db
      .delete(documentationAttachments)
      .where(eq(documentationAttachments.id, id));
  }
}

export const storage = new DatabaseStorage();
