import { prisma } from "../../db/prisma";

export interface SubjectMark {
  subjectName: string;
  score: number;
}

export interface QuarterMarks {
  quarterId: number;
  quarterName: string;
  subjects: SubjectMark[];
}

export interface MonitoringEntry {
  month: string;
  score: number;
}

export interface SubjectMonitoring {
  subjectId: number;
  subjectName: string;
  entries: MonitoringEntry[];
}

export interface StudentInfo {
  id: string;
  fullName: string;
  gradeName: string | null;
  studyYearName: string;
  quarters: QuarterMarks[];
  monitorings: SubjectMonitoring[];
}

export const fetchStudentInfo = async (studentId: string): Promise<StudentInfo | null> => {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: {
      grade: true,
      studyYear: true,
      marks: {
        include: { subject: true, quarter: true },
        orderBy: [{ quarterId: "asc" }, { subject: { name: "asc" } }],
      },
      monitorings: {
        include: { subject: true },
        orderBy: [{ subject: { name: "asc" } }, { month: "asc" }, { createdAt: "asc" }],
      },
    },
  });

  if (!student) {
    return null;
  }

  type QuarterAccumulator = QuarterMarks & { orderIndex: number };
  const quarterMap = new Map<number, QuarterAccumulator>();

  student.marks.forEach((mark) => {
    const existingQuarter = quarterMap.get(mark.quarterId);
    if (existingQuarter) {
      existingQuarter.subjects.push({
        subjectName: mark.subject.name,
        score: mark.score,
      });
      return;
    }

    quarterMap.set(mark.quarterId, {
      quarterId: mark.quarterId,
      quarterName: mark.quarter.name,
      subjects: [
        {
          subjectName: mark.subject.name,
          score: mark.score,
        },
      ],
      orderIndex: mark.quarter.startDate ? mark.quarter.startDate.getTime() : mark.quarterId,
    });
  });

  const quarters = Array.from(quarterMap.values())
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .map(({ orderIndex, ...rest }) => rest);

  const monitoringMap = new Map<number, SubjectMonitoring>();

  student.monitorings.forEach((monitoring) => {
    const existing = monitoringMap.get(monitoring.subjectId);
    if (existing) {
      existing.entries.push({ month: monitoring.month, score: monitoring.score });
      return;
    }

    monitoringMap.set(monitoring.subjectId, {
      subjectId: monitoring.subjectId,
      subjectName: monitoring.subject.name,
      entries: [{ month: monitoring.month, score: monitoring.score }],
    });
  });

  const monitorings = Array.from(monitoringMap.values()).sort((a, b) =>
    a.subjectName.localeCompare(b.subjectName, "uz"),
  );

  return {
    id: student.id,
    fullName: student.fullName,
    gradeName: student.grade?.name ?? null,
    studyYearName: student.studyYear.name,
    quarters,
    monitorings,
  };
};

