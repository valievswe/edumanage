"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const admin_routes_1 = __importDefault(require("./routes/admin.routes"));
const student_routes_1 = __importDefault(require("./routes/student.routes"));
const subject_routes_1 = __importDefault(require("./routes/subject.routes"));
const year_routes_1 = __importDefault(require("./routes/year.routes"));
const mark_routes_1 = __importDefault(require("./routes/mark.routes"));
const monitoring_routes_1 = __importDefault(require("./routes/monitoring.routes"));
const quarter_routes_1 = __importDefault(require("./routes/quarter.routes"));
const grade_routes_1 = __importDefault(require("./routes/grade.routes"));
const express_jsdoc_swagger_1 = __importDefault(require("express-jsdoc-swagger"));
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
const options = {
    info: {
        version: "1.0.0",
        title: "Edu Manage",
        description: "Auto-generated API documentation for Admin, Student, Marks, and Monitoring system",
    },
    baseDir: path_1.default.join(__dirname),
    filesPattern: "./routes/**/*.ts",
    swaggerUIPath: "/docs",
    exposeSwaggerUI: true,
    exposeApiDocs: false,
};
(0, express_jsdoc_swagger_1.default)(app)(options);
// ===================================================================
app.use("/api/admin", admin_routes_1.default);
app.use("/api/students", student_routes_1.default);
app.use("/api/subjects", subject_routes_1.default);
app.use("/api/years", year_routes_1.default);
app.use("/api/marks", mark_routes_1.default);
app.use("/api/monitoring", monitoring_routes_1.default);
app.use("/api/quarters", quarter_routes_1.default);
app.use("/api/grades", grade_routes_1.default);
exports.default = app;
