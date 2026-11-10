export type QuestionType = 'single_choice' | 'multiple_choice' | 'text';

export interface Question {
  id: string; // e.g. "q_1", "q_2"
  type: QuestionType;
  text: string;
  points: number;
  options?: string[]; // 2 to 6 options
  correctAnswer?: number | number[]; // index for single, number[] for multiple
  sampleAnswer?: string; // model answer for text/essay grading
}

export interface Teacher {
  id: string; // e.g. "tch_001"
  fullName: string;
  subject: string;
  department: string;
  password: string;
  createdAt: string;
}

export interface Exam {
  id: string; // e.g. "exm_001"
  title: string;
  subject: string;
  teacherId: string;
  teacherName: string;
  teacherDepartment: string;
  createdDate: string;
  durationMinutes: number;
  description: string;
  questions: Question[];
}

export interface StudentInfo {
  fullName: string;
  age: string;
  gender: 'ຊາຍ' | 'ຍິງ';
  village: string;
  district: string;
  province: string;
  organization?: string;
  examDate: string;
}

export interface StudentAnswerItem {
  questionId: string;
  type: QuestionType;
  chosenAnswer: number | number[] | string;
  isCorrect?: boolean; // for auto-graded questions
  awardedScore: number;
  maxScore: number;
  teacherFeedback?: string;
}

export interface Submission {
  id: string; // e.g. "sub_001"
  examId: string;
  examTitle: string;
  subject: string;
  teacherName: string;
  studentInfo: StudentInfo;
  answers: Record<string, StudentAnswerItem>; // questionId -> answer details
  objectiveScore: number;
  maxObjectiveScore: number;
  essayScore: number;
  maxEssayScore: number;
  totalScore: number;
  maxTotalScore: number;
  percentage: number;
  passed: boolean;
  isFullyGraded: boolean;
  submittedAt: string;
}

export interface Setting {
  key: string;
  value: string;
}

export interface SystemSecuritySettings {
  adminPassword: string;
  studentPassword: string;
  passPercentage: number;
  examAccessCode: string;
  enableExamCode: boolean;
  antiCheatingCopy: boolean;
  detectTabSwitch: boolean;
  limitOneAttempt: boolean;
  showAnswerKeys: boolean;
  requireFullscreen: boolean;
}

export interface StudentProfile {
  fullName: string;
  age: string;
  gender: 'ຊາຍ' | 'ຍິງ';
  phone?: string;
  village: string;
  district: string;
  province: string;
  organization?: string;
  securityPin?: string;
  isPinEnabled?: boolean;
}

export type AuthRole = 'student' | 'teacher' | 'admin' | null;

export interface AuthSession {
  role: AuthRole;
  teacher?: Teacher;
  student?: StudentProfile;
}
