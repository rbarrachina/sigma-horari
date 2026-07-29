import { z } from 'zod';

// Maximum file size for import (5MB)
export const MAX_IMPORT_FILE_SIZE = 5 * 1024 * 1024;

// Schema for DayType
const DayTypeSchema = z.enum(['presencial', 'teletreball']);

// Schema for DayStatus
const DayStatusSchema = z.enum(['laboral', 'festiu', 'vacances', 'assumpte_propi', 'flexibilitat', 'altres']);

// Schema for RequestStatus
const RequestStatusSchema = z.enum(['pendent', 'aprovat']).nullable().optional();
const AbsenceTypeSchema = z.enum(['vacances', 'assumpte_propi', 'flexibilitat', 'altres']);
const DayAbsenceSchema = z.object({
  type: AbsenceTypeSchema,
  hours: z.number().min(0).max(24).optional(),
  comment: z.string().max(50).optional(),
  requestStatus: RequestStatusSchema,
});

// Schema for ScheduleType
const ScheduleTypeSchema = z.enum(['hivern', 'estiu']);

// Schema for DayData
const DayDataSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  theoreticalHours: z.number().min(0).max(24).optional(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
  endTime: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
  startTime2: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
  endTime2: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
  dayType: DayTypeSchema.optional(),
  dayStatus: DayStatusSchema,
  requestStatus: RequestStatusSchema,
  apHours: z.number().min(0).max(24).optional(),
  flexHours: z.number().min(0).max(24).optional(),
  otherHours: z.number().min(0).max(24).optional(),
  otherComment: z.string().max(50).optional(),
  absences: z.array(DayAbsenceSchema).max(2).optional(),
  notes: z.string().max(1000).optional(),
});

// Schema for WeeklyConfig
const WeeklyConfigSchema = z.object({
  monday: z.object({ dayType: DayTypeSchema }),
  tuesday: z.object({ dayType: DayTypeSchema }),
  wednesday: z.object({ dayType: DayTypeSchema }),
  thursday: z.object({ dayType: DayTypeSchema }),
  friday: z.object({ dayType: DayTypeSchema }),
});

// Schema for SchedulePeriod
const SchedulePeriodSchema = z.object({
  id: z.string().max(100),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  scheduleType: ScheduleTypeSchema,
});

// Schema for UserConfig
const UserConfigSchema = z.object({
  calendarYear: z.number().min(1900).max(2200),
  firstName: z.string().max(100).default(''),
  defaultStartTime: z.string().regex(/^\d{2}:\d{2}$/).default('08:00'),
  defaultEndTime: z.string().regex(/^\d{2}:\d{2}$/).default('15:30'),
  weeklyConfig: WeeklyConfigSchema,
  schedulePeriods: z.array(SchedulePeriodSchema).max(100),
  totalVacationDays: z.number().min(0).max(365),
  usedVacationDays: z.number().min(0).max(365),
  totalAPHours: z.number().min(0).max(500),
  usedAPHours: z.number().min(0).max(500),
  flexibilityHours: z.number().min(0).max(25),
  usedFlexHours: z.number().min(0).max(25),
  otherNotes: z.string().max(1000).default(''),
  holidays: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).max(100),
});

// Schema for DaysData record
const DaysDataSchema = z.record(
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  DayDataSchema
);

// Main ExportData schema
export const ExportDataSchema = z.object({
  config: UserConfigSchema,
  daysData: DaysDataSchema,
  exportDate: z.string(),
  version: z.string().max(20),
});

export type ValidatedExportData = z.infer<typeof ExportDataSchema>;

/**
 * Validates imported data against the ExportData schema
 * @param data - Raw parsed JSON data
 * @returns Validated data or throws ZodError
 */
export function validateExportData(data: unknown): ValidatedExportData {
  return ExportDataSchema.parse(data);
}

/**
 * Safely validates imported data and returns result with error handling
 * @param data - Raw parsed JSON data  
 * @returns Object with success status and either validated data or error message
 */
export function safeValidateExportData(data: unknown): 
  | { success: true; data: ValidatedExportData }
  | { success: false; error: string } {
  try {
    const validated = ExportDataSchema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues.slice(0, 3).map(i => `${i.path.join('.')}: ${i.message}`);
      return { 
        success: false, 
        error: `Dades invàlides: ${issues.join('; ')}` 
      };
    }
    return { success: false, error: 'Format de dades no reconegut' };
  }
}
