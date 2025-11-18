import { StudentInfo } from "../services/studentInfo";

const escapeHtml = (value: string): string =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export const formatStudentInfoMessage = (info: StudentInfo): string => {
  const lines: string[] = [];

  lines.push(`👤 <b>${escapeHtml(info.fullName)}</b>`);
  lines.push(`🆔 ID: <code>${escapeHtml(info.id)}</code>`);

  if (info.gradeName) {
    lines.push(`🏫 Sinf: ${escapeHtml(info.gradeName)}`);
  }

  lines.push(`📅 O'quv yili: ${escapeHtml(info.studyYearName)}`);
  lines.push("");

  lines.push("🏅 Chorak baholari:");
  if (!info.quarters.length) {
    lines.push("— Hali chorak baholari kiritilmagan.");
  } else {
    info.quarters.forEach((quarter) => {
      lines.push(` <b>${escapeHtml(quarter.quarterName)}</b>`);
      if (!quarter.subjects.length) {
        lines.push("  • Ma'lumot kiritilmagan.");
      } else {
        quarter.subjects.forEach((subject) => {
          lines.push(`  • ${escapeHtml(subject.subjectName)} — <b>${subject.score}</b>`);
        });
      }
      lines.push("");
    });
  }

  lines.push("📊 Monitoring natijalari:");
  if (!info.monitorings.length) {
    lines.push("— Monitoring natijalari hali yo'q.");
  } else {
    info.monitorings.forEach((subject) => {
      const entries = subject.entries
        .map((entry) => `${escapeHtml(entry.month)} <b>${entry.score}</b>`)
        .join(", ");
      lines.push(`  • ${escapeHtml(subject.subjectName)}: ${entries}`);
    });
  }

  return lines.join("\n").trim();
};

