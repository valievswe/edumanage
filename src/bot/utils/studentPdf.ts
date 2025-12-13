import PDFDocument from "pdfkit";
import type { StudentInfo } from "../services/studentInfo";

const formatTitle = (info: StudentInfo) =>
  `EduManage — Student Report (${info.studyYearName})`;

const safe = (value: string) => value.replace(/\s+/g, " ").trim();

const writeKeyValue = (doc: PDFDocument, key: string, value: string) => {
  doc.font("Helvetica-Bold").text(`${key}: `, { continued: true });
  doc.font("Helvetica").text(value);
};

export const buildStudentPdf = (info: StudentInfo): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 48 });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.font("Helvetica-Bold").fontSize(18).text(formatTitle(info));
    doc.moveDown(0.75);

    doc.fontSize(11);
    writeKeyValue(doc, "Student", safe(info.fullName));
    writeKeyValue(doc, "ID", safe(info.id));
    writeKeyValue(doc, "Grade", info.gradeName ? safe(info.gradeName) : "—");
    writeKeyValue(doc, "Study year", safe(info.studyYearName));

    doc.moveDown(1.0);
    doc.font("Helvetica-Bold").fontSize(13).text("Quarter marks");
    doc.moveDown(0.4);
    doc.fontSize(11);

    if (!info.quarters.length) {
      doc.font("Helvetica").text("No quarter marks available.");
    } else {
      info.quarters.forEach((quarter) => {
        doc.font("Helvetica-Bold").text(quarter.quarterName);
        doc.moveDown(0.2);
        if (!quarter.subjects.length) {
          doc.font("Helvetica").text("  • No marks.");
        } else {
          quarter.subjects.forEach((subject) => {
            doc.font("Helvetica").text(`  • ${safe(subject.subjectName)}: ${subject.score}`);
          });
        }
        doc.moveDown(0.5);
      });
    }

    doc.moveDown(0.5);
    doc.font("Helvetica-Bold").fontSize(13).text("Monitoring (month-by-month)");
    doc.moveDown(0.4);
    doc.fontSize(11);

    if (!info.monitorings.length) {
      doc.font("Helvetica").text("No monitoring results available.");
    } else {
      info.monitorings.forEach((subject) => {
        doc.font("Helvetica-Bold").text(subject.subjectName);
        doc.moveDown(0.2);
        if (!subject.entries.length) {
          doc.font("Helvetica").text("  • No entries.");
        } else {
          subject.entries.forEach((entry) => {
            doc.font("Helvetica").text(`  • ${safe(entry.month)}: ${entry.score}`);
          });
        }
        doc.moveDown(0.5);
      });
    }

    doc.end();
  });
