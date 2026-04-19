# VINDCollab MVP - Context untuk Next Feature

**Project**: VINDCollab - Campus Event Collaboration Platform (React Native + Expo + Convex)  
**Current Date**: 2026-04-19  
**Status**: Invitation System COMPLETE ✓ (Ready for next feature)

---

## 📋 Project Summary

**Tech Stack:**
- Frontend: React Native + Expo Router (file-based routing)
- Backend: Convex (database + serverless functions)
- Authentication: Convex Auth
- UI: Custom component library with dark theme (Colors constants)

**Project Structure:**
```
app/
  ├── (auth)/          - Login/onboarding flows
  ├── (tabs)/          - Main app tabs (home, tasks, chat, report, more, profile, stats)
  ├── events/          - Event management screens
  └── invitations/     - ✅ COMPLETED: Invitation system screens
components/
  ├── ui/              - Reusable components (Button, Badge, Card, Input)
  ├── events/          - Event-specific components
  ├── partners/        - Partner recommendation components
  └── invitations/     - ✅ COMPLETED: Invitation components
convex/
  ├── schema.ts        - Database schema with tables
  ├── events.ts        - Event backend functions
  ├── organizations.ts - Org backend functions
  ├── invitations.ts   - ✅ COMPLETED: Invitation functions
  ├── ai/              - AI-related backend
  │   ├── partnerRecommender.ts - Partner AI recommendations
  │   └── ... (other AI functions)
  └── auth.ts, users.ts, etc.
```

---

## ✅ WHAT'S COMPLETED: Invitation System

### Backend (Convex)
**Tables Added:**
- `invitations` - Proposal data with status tracking
- `negotiationHistory` - Audit trail of all rounds (1-5 max)

**Functions Created (7 total):**
- `sendInvitation()` - Send proposal to partner
- `respondToInvitation()` - Accept/Decline
- `counterPropose()` - Make counter-proposal (5 rounds max, auto-expire)
- `updateInvitationDeadline()` - Change deadline
- `getMyInvitations()` - List all invitations (paginated)
- `getInvitationDetail()` - Get full details
- `getNegotiationHistory()` - Get all rounds timeline

**Features:**
- Role assignment (5 roles: Co-host, Sponsor, Media Partner, Logistik, Volunteer Coordinator)
- Resource contributions (free text)
- Revenue sharing (percentage + payment method)
- Configurable deadlines (24/48/72 hours)
- Personal messages (300 char max)
- Auto-chat-room creation on acceptance
- Auto-partnership creation on acceptance
- Auto-expiry after 5 negotiation rounds
- Decline reasons for AI learning

### Frontend (React Native Screens)
- `SendInvitationScreen` - Form to send invitation
- `InvitationDetailScreen` - View details + actions (Accept/Decline/Counter)
- `CounterProposeScreen` - Counter-proposal form
- `InvitationInboxScreen` - List all invitations (Received/Sent tabs)
- `NegotiationHistoryView` - Timeline component

### Navigation & Integration
- ✅ Routes added to `app/_layout.tsx`
- ✅ "Invitations" menu added to More tab
- ✅ "Invite" button in partners screen hooks to SendInvitationScreen
- ✅ Chat room auto-created on acceptance

---

## 🎯 NEXT FEATURE: AI Task Breakdown

### What to Build

**Feature Description:**
When a partnership is ACCEPTED, automatically generate and assign tasks for the event using AI. This is the "Auto Task Breakdown" mentioned in the original spec.

**Trigger Point:**
- Happens automatically after `respondToInvitation()` when status = ACCEPTED
- Should be a background job or scheduled task

**Required Components:**

### 1. Backend (Convex)

**New Function: `generateTaskBreakdown(eventId, partnerOrgIds)`**
- Takes accepted event + list of partner org IDs
- Calls Gemini AI to generate task list based on:
  - Event details (title, description, type, requirements)
  - Each partner's accepted role
  - Each partner's resource contribution
  - Each partner's capabilities
- Returns: Array of tasks with title, description, assigned org, estimated hours, phase

**Schema Updates Needed:**
- `tasks` table already exists with these fields:
  ```typescript
  eventId: v.id("events"),
  title: v.string(),
  description: v.optional(v.string()),
  status: v.union("TODO", "IN_PROGRESS", "DONE"),
  assignedOrgId: v.optional(v.id("organizations")),
  estimatedHours: v.optional(v.number()),
  dueDate: v.optional(v.number()),
  isAiGenerated: v.boolean(),
  phase: v.optional(v.string()),
  ```
- May need to add: `parentEventId` index, or ensure `by_event` index works efficiently

**Integration Points:**
- Call from `respondToInvitation()` mutation when status becomes ACCEPTED
- OR create separate action that's called after acceptance
- Cache results similar to partner recommendations (24h TTL)
- Store in `ai_cache` table with type: "TASK_BREAKDOWN"

### 2. Frontend (React Native)

**UI Components Needed:**
- **TaskListScreen** (`app/(tabs)/tasks.tsx` - already exists, stub)
  - Display tasks in Kanban board format (TODO, IN_PROGRESS, DONE columns)
  - Show task details on tap
  - Filter by event or status

- **TaskDetailScreen** (`app/tasks/[id].tsx` - new)
  - Full task details
  - Show assigned org
  - Status toggle
  - Comments section? (optional)

- **TaskBreakdownModal** or **TaskPreviewScreen** (optional)
  - Show when tasks are generated post-acceptance
  - "AI Generated X tasks for this partnership"
  - Preview of tasks before confirming

### 3. AI Prompt Template

**System Prompt:**
```
You are VINDCollab AI Task Breakdown Generator.
Generate specific, actionable tasks for an event partnership.
Return ONLY valid JSON - no markdown, no extra text.
```

**User Prompt Template:**
```
Event: "{eventTitle}"
Description: "{eventDescription}"
Type: {eventType}
Requirements: [{requirements}]

Accepted Partners:
1. Organization: "{partnerName}" 
   Role: "{role}"
   Capabilities: [{capabilities}]
   Can provide: "{resourceContribution}"

Generate 5-10 specific tasks that need to be completed for this event:
- Assign each task to the most suitable partner based on their role and capabilities
- Include estimated hours for each task
- Organize into phases: Planning, Preparation, Execution, Post-Event
- Include concrete deliverables

Return JSON format:
{
  "tasks": [
    {
      "title": "...",
      "description": "...",
      "assignedOrgId": "...",  (reference to partner ID)
      "estimatedHours": 8,
      "phase": "Planning|Preparation|Execution|Post-Event"
    }
  ]
}
```

### 4. Database & Caching

- Store generated tasks in `tasks` table with `isAiGenerated: true`
- Cache prompt + response in `ai_cache` table (type: "TASK_BREAKDOWN")
- Link to event via `eventId`
- Set 24-hour TTL for regeneration

---

## 📁 Files That Already Exist (Reference)

**For Understanding Patterns:**
- `convex/ai/partnerRecommender.ts` - Full AI action example with Gemini API
- `app/(tabs)/tasks.tsx` - Tasks list screen (stub - needs implementation)
- `convex/schema.ts` - Schema with tasks table already defined
- `components/ui/` - UI components to reuse

**Key Design Patterns to Follow:**
1. **AI Integration Pattern:** See `partnerRecommender.ts`
   - Use Gemini 2.0 Flash API
   - Fallback heuristic if quota exceeded
   - Cache with 24h TTL
   - Error handling with meaningful messages

2. **Convex Auth Pattern:** Use `getAuthUserId()` + check org membership
3. **UI Pattern:** Dark theme, use Colors constants, StyleSheet
4. **Navigation:** Expo Router with typed params

---

## 🔗 Integration Points

### When to Trigger AI Task Breakdown:

**Option A (Recommended for Flow):**
In `respondToInvitation()` mutation:
```typescript
if (args.response === "ACCEPTED") {
  // Create partnership
  // Create chat room
  // Trigger AI task breakdown
  await ctx.runAction(internal.ai.taskBreakdown.generateTaskBreakdown, {
    eventId: invitation.eventId,
    partnerOrgIds: [invitation.recipientOrgId, invitation.senderOrgId]
  });
}
```

**Option B (Separate Manual Trigger):**
- Button in event detail screen: "Generate Tasks"
- User manually reviews + confirms before creating

---

## 📊 Expected Behavior

1. **After Partnership Accepted:**
   - AI generates 5-10 tasks automatically
   - Tasks are assigned to appropriate partners
   - Tasks appear in Kanban board

2. **Task Management:**
   - Partners can see their assigned tasks
   - Update task status (TODO → IN_PROGRESS → DONE)
   - View estimated hours and phase

3. **Caching:**
   - If same event's tasks generated before, use cache (24h)
   - User can force regenerate with "Re-generate Tasks" button

---

## 🛠️ Technical Requirements

**Environment Variables Needed:**
- `GEMINI_API_KEY` - Already set up from partner recommender

**Dependencies:**
- No new packages needed (use existing Convex + Gemini setup)

**Error Handling:**
- Gemini quota exceeded → Fallback to heuristic task generation
- Invalid event → Throw error
- No partners → Return empty array or message

---

## 📝 Files to Create/Modify

**NEW Files:**
- `convex/ai/taskBreakdown.ts` - Main AI task generation action
- `app/tasks/[id].tsx` - Task detail view (optional)
- `components/tasks/TaskKanban.tsx` - Kanban board component (optional)

**MODIFY Files:**
- `convex/invitations.ts` - Add trigger call to task breakdown
- `app/(tabs)/tasks.tsx` - Implement Kanban UI (currently stub)
- `app/_layout.tsx` - Add new task detail route (if needed)

---

## 💡 Helpful Context

**Current State:**
- Invitation system fully working ✓
- Database ready to accept new tasks
- AI infrastructure (Gemini API) already integrated
- UI patterns established

**What's NOT Included:**
- Real-time updates for task changes (would need subscriptions)
- Task comments/collaboration (can add later)
- Complex task dependencies (can add later)
- Task templates (can add later)

---

## 🎯 Acceptance Criteria

When complete, should have:
- ✓ AI generates tasks after partnership accepted
- ✓ Tasks displayed in Kanban board (TODO/IN_PROGRESS/DONE)
- ✓ Tasks assigned to correct organizations
- ✓ Estimated hours visible
- ✓ Phase categorization (Planning/Prep/Execution/Post)
- ✓ Cache working (24h TTL)
- ✓ Error handling for quota exceeded
- ✓ No TypeScript errors

---

## 🔗 Key Files Reference

```
convex/schema.ts            - tasks table definition
convex/ai/partnerRecommender.ts - Example of AI action
app/(tabs)/tasks.tsx        - Task list screen (stub)
components/ui/*             - Reusable UI components
constants/Colors.ts         - Color theme
```

---

**Status**: Ready for Claude Web to implement AI Task Breakdown feature!
