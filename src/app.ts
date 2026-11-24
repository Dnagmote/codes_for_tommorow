import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import appRouter from './routes';
import healthRoutes from './routes/health.routes';
import chatRoutes from './routes/chat.routes';
import userRoutes from './routes/user.routes';
import { errorMiddleware } from './middleware/error.middleware';
import { notFoundMiddleware } from './middleware/not-found.middleware';
import { apiLimiter } from './middleware/security.middleware';
import { env } from './config/env.config';

const app: Application = express();

// Security and utility middlewares
app.use(helmet());
app.use(cors());
app.use(apiLimiter);
app.use(express.json());

if (env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Direct top-level routes (as specified in assignment)
app.use('/health', healthRoutes);
app.use('/chat', chatRoutes);
app.use('/user', userRoutes);

// Mount under /api prefix for API clients
app.use('/api', appRouter);

// Catch 404
app.use(notFoundMiddleware);

// Centralized error handling
app.use(errorMiddleware);

export default app;
