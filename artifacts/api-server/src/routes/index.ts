import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import authRouter from "./auth.js";
import adminUsersRouter from "./admin-users.js";
import departmentsRouter from "./departments.js";
import employeesRouter from "./employees.js";
import kpiRouter from "./kpi.js";
import evaluationsRouter from "./evaluations.js";
import dashboardRouter from "./dashboard.js";
import workPlansRouter from "./work-plans.js";
import workPlanProgressRouter from "./work-plan-progress.js";
import approveRouter from "./approve.js";
import mfylarRouter from "./mfylar.js";
import appSettingsRouter from "./app-settings.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(adminUsersRouter);
router.use(departmentsRouter);
router.use(employeesRouter);
router.use(kpiRouter);
router.use(evaluationsRouter);
router.use(dashboardRouter);
router.use(workPlansRouter);
router.use(workPlanProgressRouter);
router.use(approveRouter);
router.use(mfylarRouter);
router.use(appSettingsRouter);

export default router;
