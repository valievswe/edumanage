"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatStudentInfoMessage = exports.formatMonitoringDetails = exports.formatQuarterDetails = exports.formatStudentSummary = void 0;
const escapeHtml = (value) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const formatStudentSummary = (info) => {
    const gradeLine = info.gradeName
        ? `🏫 Sinf: ${escapeHtml(info.gradeName)}`
        : "🏫 Sinf: Ma'lumot mavjud emas";
    return [
        `👤 <b>${escapeHtml(info.fullName)}</b>`,
        `🆔 ID: <code>${escapeHtml(info.id)}</code>`,
        gradeLine,
        `📅 O'quv yili: ${escapeHtml(info.studyYearName)}`,
        "",
        "Kerakli bo'limni tanlang:",
    ]
        .join("\n")
        .trim();
};
exports.formatStudentSummary = formatStudentSummary;
const formatQuarterDetails = (info, quarterName) => {
    const quarter = info.quarters.find((q) => q.quarterName === quarterName);
    if (!quarter) {
        return `❗️ <b>${escapeHtml(quarterName)}</b> choragi bo'yicha ma'lumot topilmadi.`;
    }
    const lines = [
        `🏅 <b>${escapeHtml(quarter.quarterName)}</b> choragi`,
        "",
    ];
    if (!quarter.subjects.length) {
        lines.push("Bu chorak uchun fanlar kiritilmagan.");
    }
    else {
        quarter.subjects.forEach((subject) => {
            lines.push(`• ${escapeHtml(subject.subjectName)} — <b>${subject.score}</b>`);
        });
    }
    return lines.join("\n").trim();
};
exports.formatQuarterDetails = formatQuarterDetails;
const formatMonitoringDetails = (info, monthName) => {
    const entries = [];
    info.monitorings.forEach((subject) => {
        subject.entries.forEach((entry) => {
            if (entry.month === monthName) {
                entries.push({ subject: subject.subjectName, score: entry.score });
            }
        });
    });
    if (!entries.length) {
        return `❗️ <b>${escapeHtml(monthName)}</b> oyiga monitoring natijalari topilmadi.`;
    }
    const lines = [`📊 <b>${escapeHtml(monthName)}</b> monitoring natijalari`, ""];
    entries.forEach((entry) => {
        lines.push(`• ${escapeHtml(entry.subject)} — <b>${entry.score}</b>`);
    });
    return lines.join("\n").trim();
};
exports.formatMonitoringDetails = formatMonitoringDetails;
/**
 * Legacy formatter used by the admin panel endpoints.
 * Kept for backwards compatibility until UI migrates to the new flow.
 */
const formatStudentInfoMessage = (info) => {
    const lines = [];
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
    }
    else {
        info.quarters.forEach((quarter) => {
            lines.push(` <b>${escapeHtml(quarter.quarterName)}</b>`);
            if (!quarter.subjects.length) {
                lines.push("  • Ma'lumot kiritilmagan.");
            }
            else {
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
    }
    else {
        info.monitorings.forEach((subject) => {
            const entries = subject.entries
                .map((entry) => `${escapeHtml(entry.month)} <b>${entry.score}</b>`)
                .join(", ");
            lines.push(`  • ${escapeHtml(subject.subjectName)}: ${entries}`);
        });
    }
    return lines.join("\n").trim();
};
exports.formatStudentInfoMessage = formatStudentInfoMessage;
