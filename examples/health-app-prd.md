# PRD: HealthPulse — Personal Health Tracking App

## Overview
A mobile-first health tracking application that helps users monitor daily health metrics, set goals, and receive AI-powered insights about their health trends.

## Tech Stack
- **Frontend**: React Native (Expo)
- **Backend**: Node.js + Express
- **Database**: PostgreSQL with Prisma ORM
- **Auth**: Clerk
- **AI/ML**: OpenAI API for health insights
- **Deployment**: Vercel (API) + EAS (mobile builds)

## Key Entities
- User, HealthMetric, Goal, Insight, Streak, Notification

## Core Features
1. Daily metric logging (weight, sleep, water, exercise, mood)
2. Goal setting with progress tracking
3. AI-generated weekly health insights
4. Streak tracking for habit consistency
5. Push notifications for reminders

## Architecture
- Monorepo with `/apps/mobile` and `/apps/api`
- REST API with versioned endpoints
- Background jobs for insight generation (Bull queue)

## Key Risk Areas
- React Native version compatibility issues
- Expo SDK version-specific APIs
- Prisma migration safety
- OpenAI API rate limiting and error handling
