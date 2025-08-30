# TaskMaster Pro — Product Requirements Document (MVP)

## 4.1 Background & Problem
Solopreneurs juggle scattered tools (task apps, habit trackers, calendars). Context fragments and planning takes longer than doing. We need a **single surface** that captures ideas quickly, converts them into plans, and keeps focus through execution.

## 4.2 Goals
1. Create a unified, low-friction workspace for tasks, notes, habits, calendar, and focus.  
2. Provide **agent-assisted planning** that reduces manual triage by ≥50%.  
3. Deliver clear **analytics** that explain progress and suggest concrete next actions.  
4. Ship with **BYOK AI** and **MCP extensibility**.

**Non-Goals (MVP)**  
- Realtime multi-cursor doc collaboration (single-user focus first).  
- Complex Gantt/portfolio management.  
- Native mobile; PWA will cover first six months.

## 4.3 Personas
- **Sean, Sole Proprietor (primary).** Needs fast capture → plan → focus.  
- **Collaborator/VA (secondary).** Light project visibility, can add tasks/notes.  
- **Coach/Mentor (tertiary).** Reviews analytics and habits, suggests tweaks.

## 4.4 Key Use Cases
- Paste meeting notes → *Task Extractor* creates a checklist with priorities & dates.  
- Hit **Focus Mode** on a task → log time + mark progress; recap saved to note thread.  
- Weekly review → *Analyst* summarizes progress + next week’s plan.  
- Habits aligned to a project (e.g., “Write 30m/day” under “Course Launch”) roll into project progress.

## 4.5 Functional Requirements
(Contains FR-1 to FR-10 as detailed in the full doc)

## 4.6 Data Model (simplified)
(Entities: User, Project, Task, Note, Habit, HabitCheck, FocusSession, IntegrationAccount, Event)

## 4.7 Success Metrics
- TTV: < 60s to first task, < 5m to first focus session  
- Agent adoption: ≥ 40% of tasks via AI actions by week 2  
- Retention: D7 ≥ 35%  
- Outcome: +20% weekly completion rate after 4 weeks

## 4.8 Accessibility, Performance, Reliability
- WCAG 2.1 AA, full keyboard nav, screen-reader labels  
- LCP < 2.5s, optimistic UI  
- Timer accuracy with Web Workers, offline queue with resolution

## 4.9 Risks & Mitigations
- Agent hallucination → approval modals + undo  
- Calendar desync → 2-way sync tests + conflict banners  
- Privacy → data residency + export; local-first notes

## 4.10 Release Plan
- **Milestone A (Weeks 1–4):** Auth, Tasks/Projects CRUD, Dashboard, light/dark, basic analytics.  
- **Milestone B (Weeks 5–8):** Notes editor + Task Extractor, Focus Mode, Calendar read.  
- **Milestone C (Weeks 9–12):** Habits, Calendar write/drag, Analytics v2, BYOK LLM.  
- **Milestone D (Weeks 13–16):** MCP servers, Weekly Insights, PWA offline.  
- **Beta Criteria:** <1% error rate, ≥90 Lighthouse PWA, 50 pilot users.
