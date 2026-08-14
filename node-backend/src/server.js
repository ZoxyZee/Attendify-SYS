import cors from "cors";
import express from "express";

import { config, isAllowedDevOrigin } from "./config.js";
import { checkDatabase, connectDatabase } from "./db.js";
import { attendanceRouter } from "./routes/attendance.js";
import { authRouter } from "./routes/auth.js";
import { companyRouter } from "./routes/company.js";
import { devicesRouter } from "./routes/devices.js";
import { employeesRouter } from "./routes/employees.js";
import { recognitionRouter } from "./routes/recognition.js";

const app = express();

app.use(cors({
  credentials: true,
  origin(origin, callback) {
    if (!origin || config.clientUrls.includes(origin) || (config.nodeEnv === "development" && isAllowedDevOrigin(origin))) {
      callback(null, true);
      return;
    }
    callback(new Error("Disallowed CORS origin"));
  }
}));
app.use(express.json({ limit: "15mb" }));

app.get("/health", async (_req, res) => {
  const database = await checkDatabase();
  res.json({ success: true, message: "Attendify backend is running", data: { database } });
});

app.use("/auth", authRouter);
app.use("/employees", employeesRouter);
app.use("/devices", devicesRouter);
app.use("/attendance", attendanceRouter);
app.use("/company", companyRouter);
app.use("/recognition", recognitionRouter);

app.use((error, _req, res, _next) => {
  const status = error.status || 500;
  res.status(status).json({ success: false, message: error.message || "Internal server error." });
});

await connectDatabase();
app.listen(config.port, "0.0.0.0", () => {
  console.log(`Attendify JS backend running on http://0.0.0.0:${config.port}`);
});
