export interface Admin {
  id: number;
  username: string;
  email: string;
}

export interface StudyYear {
  id: number;
  name: string;
  startDate: string;
  endDate: string;
  quarters?: Quarter[];
}

export interface Subject {
  id: number;
  name: string;
}

export interface GradeCount {
  students: number;
}

export interface Grade {
  id: number;
  name: string;
  _count?: GradeCount;
}

export interface Student {
  id: string;
  fullName: string;
  grade?: Grade | null;
  studyYearId: number;
  createdAt: string;
}

export interface StudentWithRelations extends Student {
  marks: SimpleMark[];
  monitorings: SimpleMonitoring[];
}

export interface SimpleMark {
  subject: Subject;
  quarter: Quarter;
  score: number;
}

export interface SimpleMonitoring {
  subject: Subject;
  month: string;
  score: number;
}

export interface Quarter {
  id: number;
  name: string;
  studyYearId: number;
  startDate?: string | null;
  endDate?: string | null;
  studyYear?: StudyYear;
}

export interface Mark {
  id: number;
  score: number;
  student: {
    id: string;
    fullName: string;
    grade?: Grade | null;
  };
  subject: Subject;
  quarter: Quarter;
  createdAt: string;
}

export interface Monitoring {
  id: number;
  month: string;
  score: number;
  student: {
    id: string;
    fullName: string;
    grade?: Grade | null;
  };
  subject: Subject;
  studyYear: StudyYear;
}

export interface StudentMarksResponse {
  id: string;
  name: string;
  grade?: string;
  marks: Array<{
    subject: string;
    quarter: string;
    score: number;
  }>;
  monitoring: Array<{
    subject: string;
    month: string;
    score: number;
  }>;
}
