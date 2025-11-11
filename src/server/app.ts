import express from "express";
import cors from "cors";
import adminRoutes from "./routes/admin.routes";
import studentRoutes from "./routes/student.routes";
import subjectRoutes from "./routes/subject.routes";
import yearRoutes from "./routes/year.routes";
import markRoutes from "./routes/mark.routes";
import monitoringRoutes from "./routes/monitoring.routes";
import quarterRoutes from "./routes/quarter.routes";
import gradeRoutes from "./routes/grade.routes";




const app = express();
app.use(cors());
app.use(express.json());

// ===================================================================

app.use("/api/admin", adminRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/subjects", subjectRoutes);
app.use("/api/years", yearRoutes);
app.use("/api/marks", markRoutes);
app.use("/api/monitoring", monitoringRoutes);
app.use("/api/quarters", quarterRoutes);
app.use("/api/grades", gradeRoutes);


export default app;
