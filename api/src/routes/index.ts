import { Hono } from 'hono';
import healthRoutes from './health.routes';
import authRoutes from './auth.routes';
import dealRoutes from './deals.routes';
import monitorRoutes from './monitors.routes';
import jobRoutes from './jobs.routes';
import analyticsRoutes from './analytics.routes';
import userRoutes from './users.routes';
import stripeRoutes from './stripe.routes';
import adminRoutes from './admin.routes';
import telemetryRoutes from './telemetry.routes';
import versionRoutes from './version.routes';

const app = new Hono();

app.route('/health', healthRoutes);
app.route('/auth', authRoutes);
app.route('/deals', dealRoutes);
app.route('/monitors', monitorRoutes);
app.route('/jobs', jobRoutes);
app.route('/analytics', analyticsRoutes);
app.route('/users', userRoutes);
app.route('/stripe', stripeRoutes);
app.route('/admin', adminRoutes);
app.route('/telemetry', telemetryRoutes);
app.route('/version', versionRoutes);

export default app;
