# Task Dashboard

A real-time task tracking dashboard with audit logs, built with Next.js, Supabase, and Tailwind CSS.

## Features

- ✅ **Real-time updates** - Tasks sync across all browser tabs instantly
- 📝 **Full CRUD operations** - Create, read, update, and delete tasks
- 📊 **Status tracking** - Pending, In Progress, Completed, Cancelled
- 🚨 **Priority levels** - Low, Medium, High, Urgent
- 📋 **Audit logging** - Complete history of all task changes
- 🎨 **Modern UI** - Clean, responsive design with dark/light mode support
- ⚡ **Performance optimized** - Fast loading with minimal JavaScript

## Tech Stack

- **Frontend**: Next.js 16 with TypeScript and Tailwind CSS
- **Backend**: Supabase (PostgreSQL with real-time subscriptions)
- **Deployment**: Vercel (frontend) + Supabase (database)
- **Real-time**: WebSocket subscriptions for live updates

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/sonny-smith-ai/task-dashboard.git
   cd task-dashboard
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Supabase**
   - Create a new Supabase project at [supabase.com](https://supabase.com)
   - Run the SQL schema in `sql/schema.sql` in your Supabase SQL editor
   - Copy your project URL and anon key

4. **Configure environment variables**
   ```bash
   cp .env.local.example .env.local
   # Edit .env.local with your Supabase credentials
   ```

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. **Open [http://localhost:3000](http://localhost:3000)**

## Database Schema

### Tasks Table
- `id` - UUID primary key
- `title` - Task title (required)
- `description` - Optional task description  
- `status` - pending | in_progress | completed | cancelled
- `priority` - low | medium | high | urgent
- `assigned_to` - Optional assignee
- `created_at`, `updated_at`, `completed_at` - Timestamps

### Audit Logs Table
- `id` - UUID primary key
- `task_id` - Foreign key to tasks
- `action` - created | updated | status_changed | deleted
- `old_values` - Previous values (JSONB)
- `new_values` - New values (JSONB)
- `user_id` - User who made the change
- `created_at` - Timestamp

## Features Demo

### Real-time Updates
- Open multiple browser tabs
- Create/update tasks in one tab
- Watch changes appear instantly in other tabs

### Audit Trail
- Every task change is logged
- View complete history in the audit log sidebar
- See what changed and when

### Responsive Design
- Works perfectly on desktop and mobile
- Touch-friendly interface
- Dark/light mode support

## Deployment

### Deploy to Vercel

1. **Connect to Vercel**
   ```bash
   # Install Vercel CLI
   npm i -g vercel
   
   # Deploy
   vercel
   ```

2. **Set environment variables in Vercel dashboard**
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

3. **Done!** Your app is live at your Vercel URL

### Database Setup

The SQL schema includes:
- Proper indexing for performance
- Row Level Security (RLS) policies
- Real-time subscriptions enabled
- Automatic timestamp triggers
- Foreign key constraints

## Development Notes

This project demonstrates:
- **Modern React patterns** - Hooks, TypeScript, functional components
- **Real-time architecture** - WebSocket subscriptions with Supabase
- **Database design** - Normalized schema with audit logging
- **Performance optimization** - Minimal re-renders, efficient queries
- **User experience** - Instant feedback, optimistic updates
- **Code organization** - Clean separation of concerns

## Live Demo

- **GitHub Repository**: https://github.com/sonny-smith-ai/task-dashboard
- **Live Demo**: https://task-dashboard-[vercel-url].vercel.app

## License

MIT License - see LICENSE file for details.

---

Built with ❤️ by [Sonny Smith AI](https://github.com/sonny-smith-ai)
## Quick Deployment Guide

### For Paul - Live Demo Setup:

**Repository:** https://github.com/sonny-smith-ai/task-dashboard-demo

**Supabase Setup:**
1. Use existing PayloadCMS project: `xxyaixuujdzabkocdvue.supabase.co`
2. Execute schema in SQL Editor (copy from `/sql/schema.sql`)
3. Get anon key from Project Settings > API

**Vercel Deployment:**
1. Import GitHub repository: `sonny-smith-ai/task-dashboard-demo`
2. Set environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL=https://xxyaixuujdzabkocdvue.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY=[from-supabase-dashboard]`
3. Deploy

**Test Features:**
- Create tasks with different priorities
- Change status to see real-time updates
- Open multiple tabs to see sync
- Check audit log sidebar for changes

