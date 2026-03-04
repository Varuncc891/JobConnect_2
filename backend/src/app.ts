import express from 'express';
import { config } from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import fileUpload from "express-fileupload";
import dbConnection from "./database/dbConnection";
import jobRouter from "./routes/jobRoutes";
import userRouter from "./routes/userRoutes";
import applicationRouter from "./routes/applicationRoutes";
import { errorMiddleware } from "./middlewares/error";
import resumeRouter from "./routes/resumeRoutes";
import sseRoutes from './routes/sseRoutes';

const app = express();
config({ path: "./config/config.env" });

app.use(
  cors({
    origin: [process.env.FRONTEND_URL!],
    methods: ["GET", "POST", "DELETE", "PUT"],
    credentials: true,
  })
);

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  fileUpload({
    useTempFiles: true,
    tempFileDir: "/tmp/",
    limits: { fileSize: 5 * 1024 * 1024 },
    abortOnLimit: true,
    createParentPath: true,
    preserveExtension: true,
    safeFileNames: true,
    parseNested: true,
  })
);

app.use("/api/v1/user", userRouter);
app.use("/api/v1/job", jobRouter);
app.use("/api/v1/application", applicationRouter);
app.use("/api/v1/resume", resumeRouter);
app.use('/api/v1', sseRoutes);

dbConnection();

app.use(errorMiddleware);

export default app;