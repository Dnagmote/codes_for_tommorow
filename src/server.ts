import app from './app';
import { env } from './config/env.config';
import { prisma } from './config/prisma';

const server = app.listen(env.PORT, async () => {
  console.log(`🚀 Chat Backend server running on port ${env.PORT} in ${env.NODE_ENV} mode`);

  // Non-blocking database readiness check on startup
  try {
    const userCount = await prisma.user.count();
    if (userCount === 0) {
      console.log('ℹ️  [DB Notice] Database connected, but 0 users found. Run "npm run db:seed" to seed test users.');
    } else {
      console.log(`✔ [DB Ready] PostgreSQL connected (${userCount} users found).`);
    }
  } catch (error: any) {
    if (error?.code === 'P2021') {
      console.warn('\n================================================================');
      console.warn('⚠️  DATABASE NOTICE: PostgreSQL tables do not exist yet.');
      console.warn('👉 Please run: npm run db:setup');
      console.warn('   This will push the schema and create test users automatically.');
      console.warn('================================================================\n');
    } else {
      console.warn('⚠️  [DB Notice] Database readiness check:', error?.message || error);
    }
  }
});

const gracefulShutdown = (signal: string) => {
  console.log(`Received ${signal}. Shutting down gracefully...`);
  server.close(() => {
    console.log('HTTP server closed.');
    process.exit(0);
  });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
