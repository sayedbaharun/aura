import type { Doc } from "@shared/schema";

// Extract the doc type from the Doc schema
type DocType = NonNullable<Doc['type']>;

export interface DocTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'tracking' | 'planning' | 'reference' | 'process';
  defaultType: DocType;
  body: string;
}

export const DOC_TEMPLATES: DocTemplate[] = [
  // TRACKING TEMPLATES
  {
    id: 'subscriptions-tracker',
    name: 'Subscriptions Tracker',
    description: 'Track all active subscriptions for this venture',
    icon: '💳',
    category: 'tracking',
    defaultType: 'reference',
    body: `# Subscriptions

Track all active subscriptions for this venture.

| Service | Cost/Month | Billing Date | Category | Status | Notes |
|---------|------------|--------------|----------|--------|-------|
| Example | $10 | 1st | Tools | Active | |

## Summary
- **Total Monthly**: $0
- **Total Annual**: $0

## Cancellation Reminders
- [ ] Review subscriptions quarterly
- [ ] Check for unused services monthly
- [ ] Compare alternatives for high-cost items

## Notes
Add any relevant notes about subscription management here.
`,
  },
  {
    id: 'vendor-supplier-list',
    name: 'Vendor/Supplier List',
    description: 'Maintain a list of key vendors and suppliers',
    icon: '🤝',
    category: 'tracking',
    defaultType: 'reference',
    body: `# Vendors & Suppliers

Track all vendors and suppliers for this venture.

| Vendor | Contact | Service | Contract End | Cost | Rating | Notes |
|--------|---------|---------|--------------|------|--------|-------|
| Example Co | john@example.com | Web Hosting | 2024-12-31 | $50/mo | ⭐⭐⭐⭐ | Reliable |

## Categories

### Technology & Infrastructure
| Vendor | Contact | Service | Contract End | Cost | Rating | Notes |
|--------|---------|---------|--------------|------|--------|-------|

### Marketing & Creative
| Vendor | Contact | Service | Contract End | Cost | Rating | Notes |
|--------|---------|---------|--------------|------|--------|-------|

### Operations & Logistics
| Vendor | Contact | Service | Contract End | Cost | Rating | Notes |
|--------|---------|---------|--------------|------|--------|-------|

## Notes
- Rating scale: ⭐ (1) to ⭐⭐⭐⭐⭐ (5)
- Review vendor performance quarterly
`,
  },
  {
    id: 'competitor-analysis',
    name: 'Competitor Analysis',
    description: 'Track and analyze competitors',
    icon: '🎯',
    category: 'tracking',
    defaultType: 'research',
    body: `# Competitor Analysis

Track key competitors and their strategies.

| Competitor | Strengths | Weaknesses | Pricing | Market Position | Notes |
|------------|-----------|------------|---------|-----------------|-------|
| Example Co | Strong brand | Limited features | $99/mo | Market leader | |

## Detailed Analysis

### [Competitor Name]
- **Website**:
- **Target Market**:
- **Value Proposition**:
- **Pricing Model**:
- **Key Features**:
- **Marketing Strategy**:
- **Strengths**:
- **Weaknesses**:
- **Opportunities to differentiate**:

## Market Insights
- **Market Size**:
- **Growth Rate**:
- **Key Trends**:

## Action Items
- [ ] Monitor competitor launches
- [ ] Track pricing changes
- [ ] Analyze marketing campaigns
`,
  },
  {
    id: 'decision-log',
    name: 'Decision Log',
    description: 'Document key decisions and their rationale',
    icon: '⚖️',
    category: 'tracking',
    defaultType: 'reference',
    body: `# Decision Log

Track important decisions, context, and outcomes.

| Date | Decision | Context | Outcome | Owner | Status |
|------|----------|---------|---------|-------|--------|
| 2024-01-01 | Example decision | Why we made it | What happened | Name | ✅ |

## Decision Template

### [Decision Title]
**Date**: YYYY-MM-DD
**Owner**:
**Status**: 🟡 Pending / ✅ Approved / ❌ Rejected

**Context**:
- Why are we making this decision?
- What problem are we solving?

**Options Considered**:
1. Option A - Pros/Cons
2. Option B - Pros/Cons
3. Option C - Pros/Cons

**Decision**:
What we decided to do

**Rationale**:
Why we chose this option

**Expected Outcome**:
What we expect to happen

**Actual Outcome**:
What actually happened (update later)

**Lessons Learned**:
What we learned from this decision
`,
  },

  // PLANNING TEMPLATES
  {
    id: 'project-kickoff',
    name: 'Project Kickoff',
    description: 'Template for starting new projects',
    icon: '🚀',
    category: 'planning',
    defaultType: 'spec',
    body: `# Project Kickoff: [Project Name]

## Project Overview
**Start Date**:
**Target End Date**:
**Owner**:
**Status**: Planning

**Objective**:
What are we trying to achieve?

**Success Metrics**:
- Metric 1: Target value
- Metric 2: Target value
- Metric 3: Target value

## Scope

### In Scope
- [ ] Deliverable 1
- [ ] Deliverable 2
- [ ] Deliverable 3

### Out of Scope
- Item 1
- Item 2
- Item 3

## Timeline & Phases

| Phase | Target Date | Owner | Status |
|-----------|-------------|-------|--------|
| Phase 1 | YYYY-MM-DD | Name | Not Started |
| Phase 2 | YYYY-MM-DD | Name | Not Started |
| Launch | YYYY-MM-DD | Name | Not Started |

## Resources

### Team
| Role | Name | Allocation |
|------|------|------------|
| Lead | | 100% |
| Developer | | 50% |
| Designer | | 25% |

### Budget
| Category | Budget | Spent | Remaining |
|----------|--------|-------|-----------|
| Development | $0 | $0 | $0 |
| Marketing | $0 | $0 | $0 |
| Infrastructure | $0 | $0 | $0 |
| **Total** | **$0** | **$0** | **$0** |

## Risks & Mitigation

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Example risk | High | Medium | How to prevent/handle |

## Dependencies
- [ ] Dependency 1
- [ ] Dependency 2
- [ ] Dependency 3

## Communication Plan
- **Status Updates**: Weekly on Mondays
- **Stakeholder Reviews**: Bi-weekly
- **Launch Announcement**: TBD

## Notes
Add any additional context or notes here.
`,
  },
  {
    id: 'meeting-notes',
    name: 'Meeting Notes',
    description: 'Structured template for meeting notes',
    icon: '📝',
    category: 'planning',
    defaultType: 'meeting_notes',
    body: `# Meeting Notes: [Meeting Title]

**Date**: YYYY-MM-DD
**Time**: HH:MM - HH:MM
**Location**: Virtual / Office / Other

## Attendees
- Name 1 (Role)
- Name 2 (Role)
- Name 3 (Role)

## Agenda
1. Topic 1
2. Topic 2
3. Topic 3

## Discussion Notes

### Topic 1: [Title]
- Key point 1
- Key point 2
- Decision made:

### Topic 2: [Title]
- Key point 1
- Key point 2
- Decision made:

### Topic 3: [Title]
- Key point 1
- Key point 2
- Decision made:

## Action Items

| Action | Owner | Due Date | Status |
|--------|-------|----------|--------|
| Example action | Name | YYYY-MM-DD | ⏳ Todo |

## Decisions Made
1. Decision 1 - Rationale
2. Decision 2 - Rationale

## Next Steps
- [ ] Action 1
- [ ] Action 2
- [ ] Schedule follow-up meeting

## Next Meeting
**Date**: YYYY-MM-DD
**Agenda**:
- Item 1
- Item 2
`,
  },
  {
    id: 'sprint-planning',
    name: 'Sprint Planning',
    description: 'Plan and track sprint goals and tasks',
    icon: '⚡',
    category: 'planning',
    defaultType: 'page',
    body: `# Sprint Planning: [Sprint Name]

**Sprint Duration**: YYYY-MM-DD to YYYY-MM-DD (2 weeks)
**Team Capacity**: X days
**Sprint Goal**: [What we want to achieve this sprint]

## Sprint Goals
1. Goal 1
2. Goal 2
3. Goal 3

## Committed Work

### High Priority (P0)
- [ ] Task 1 (Xh)
- [ ] Task 2 (Xh)

### Medium Priority (P1)
- [ ] Task 3 (Xh)
- [ ] Task 4 (Xh)

### Low Priority (P2)
- [ ] Task 5 (Xh)
- [ ] Task 6 (Xh)

## Capacity Planning

| Team Member | Capacity (days) | Committed (days) | Remaining |
|-------------|-----------------|------------------|-----------|
| Member 1 | 10 | 8 | 2 |
| Member 2 | 10 | 7 | 3 |
| **Total** | **20** | **15** | **5** |

## Definition of Done
- [ ] Code complete
- [ ] Tests written and passing
- [ ] Code reviewed
- [ ] Documentation updated
- [ ] Deployed to staging
- [ ] QA approved

## Risks & Blockers
- Risk 1: Description and mitigation
- Risk 2: Description and mitigation

## Daily Standup Notes

### Day 1 (YYYY-MM-DD)
- Progress:
- Blockers:
- Plan:

### Day 2 (YYYY-MM-DD)
- Progress:
- Blockers:
- Plan:

## Sprint Review Notes
- What we completed:
- What we didn't complete:
- Why:
- Lessons learned:
`,
  },

  // REFERENCE TEMPLATES
  {
    id: 'resource-library',
    name: 'Resource Library',
    description: 'Curated list of tools, articles, and learning resources',
    icon: '📚',
    category: 'reference',
    defaultType: 'reference',
    body: `# Resource Library

Curated resources for this venture.

## Tools & Software

| Name | URL | Category | Cost | Notes |
|------|-----|----------|------|-------|
| Example Tool | https://example.com | Analytics | Free | Great for tracking |

## Articles & Blog Posts

| Title | URL | Author | Topic | Notes |
|-------|-----|--------|-------|-------|
| Example Article | https://example.com | John Doe | Marketing | Must read |

## Courses & Tutorials

| Course Name | URL | Platform | Cost | Completed | Notes |
|-------------|-----|----------|------|-----------|-------|
| Example Course | https://example.com | Udemy | $50 | ✅ | Excellent |

## Books

| Title | Author | Topic | Status | Notes |
|-------|--------|-------|--------|-------|
| Example Book | Jane Smith | Strategy | 📖 Reading | Chapter 5 |

## Podcasts & Videos

| Title | URL | Creator | Topic | Notes |
|-------|-----|---------|-------|-------|
| Example Podcast | https://example.com | Host Name | Business | Episode 42 |

## Research Papers

| Title | URL | Authors | Year | Notes |
|-------|-----|---------|------|-------|
| Example Paper | https://example.com | Smith et al. | 2024 | Key findings |

## Communities & Forums

| Name | URL | Type | Notes |
|------|-----|------|-------|
| Example Forum | https://example.com | Slack | Very active |

## Notes
- Legend: ✅ Completed, 📖 In Progress, 📋 To Do
- Review and update quarterly
`,
  },
  {
    id: 'glossary',
    name: 'Glossary & Terminology',
    description: 'Define key terms and acronyms',
    icon: '📖',
    category: 'reference',
    defaultType: 'reference',
    body: `# Glossary & Terminology

Define key terms, acronyms, and jargon for this venture.

## Acronyms

| Acronym | Full Form | Definition |
|---------|-----------|------------|
| SaaS | Software as a Service | Cloud-based software delivery model |
| MRR | Monthly Recurring Revenue | Predictable monthly revenue |
| CAC | Customer Acquisition Cost | Cost to acquire one customer |

## Key Terms

### [Term Name]
**Definition**: Clear, concise definition

**Usage**: How and when this term is used

**Example**: Example usage in context

**Related Terms**: Links to related concepts

---

### [Another Term]
**Definition**:

**Usage**:

**Example**:

**Related Terms**:

## Industry Jargon

| Term | Definition | Context |
|------|------------|---------|
| Example | What it means | When to use it |

## Internal Terminology

| Term | Definition | Who Uses It |
|------|------------|-------------|
| Example | Our specific meaning | Team/Department |

## Notes
- Keep definitions simple and clear
- Update when new terms are introduced
- Link to related documentation where relevant
`,
  },

  // PROCESS TEMPLATES
  {
    id: 'sop-template',
    name: 'Standard Operating Procedure',
    description: 'Template for creating SOPs',
    icon: '📋',
    category: 'process',
    defaultType: 'sop',
    body: `# SOP: [Process Name]

**Version**: 1.0
**Last Updated**: YYYY-MM-DD
**Owner**:
**Review Frequency**: Monthly/Quarterly/Annually

## Purpose
Why does this process exist? What problem does it solve?

## Scope
- **Applies to**: Who should follow this SOP
- **When to use**: Under what circumstances
- **Frequency**: How often this is performed

## Prerequisites
- [ ] Requirement 1
- [ ] Requirement 2
- [ ] Requirement 3

## Tools & Resources
- Tool 1: Link/Description
- Tool 2: Link/Description
- Access needed: List required permissions

## Process Steps

### Step 1: [Action]
**Who**: Responsible role
**Time**: Estimated duration
**Actions**:
1. Detailed step
2. Detailed step
3. Detailed step

**Expected Outcome**: What should result from this step

**Common Issues**:
- Issue 1: How to resolve
- Issue 2: How to resolve

---

### Step 2: [Action]
**Who**: Responsible role
**Time**: Estimated duration
**Actions**:
1. Detailed step
2. Detailed step
3. Detailed step

**Expected Outcome**:

**Common Issues**:

---

### Step 3: [Action]
**Who**: Responsible role
**Time**: Estimated duration
**Actions**:
1. Detailed step
2. Detailed step
3. Detailed step

**Expected Outcome**:

**Common Issues**:

## Quality Checks
- [ ] Checkpoint 1
- [ ] Checkpoint 2
- [ ] Checkpoint 3

## Troubleshooting

| Problem | Cause | Solution |
|---------|-------|----------|
| Error 1 | Why it happens | How to fix |
| Error 2 | Why it happens | How to fix |

## Related Documents
- Related SOP 1
- Related Template 1
- Reference Guide 1

## Revision History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | YYYY-MM-DD | Initial version | Name |

## Approval

**Reviewed by**:
**Approved by**:
**Date**: YYYY-MM-DD
`,
  },
  {
    id: 'checklist-template',
    name: 'Process Checklist',
    description: 'Reusable checklist for recurring processes',
    icon: '✅',
    category: 'process',
    defaultType: 'template',
    body: `# Checklist: [Process Name]

**Purpose**: Brief description of what this checklist covers
**Frequency**: Daily/Weekly/Monthly/As-needed
**Time Required**: Estimated duration
**Owner**: Responsible person/role

## Pre-Flight
- [ ] Prerequisite 1
- [ ] Prerequisite 2
- [ ] All tools and access ready

## Main Process

### Phase 1: [Name]
- [ ] Step 1
- [ ] Step 2
- [ ] Step 3
  - [ ] Sub-step 3a
  - [ ] Sub-step 3b
- [ ] Step 4

### Phase 2: [Name]
- [ ] Step 5
- [ ] Step 6
- [ ] Step 7
- [ ] Step 8

### Phase 3: [Name]
- [ ] Step 9
- [ ] Step 10
- [ ] Step 11

## Quality Assurance
- [ ] QA check 1
- [ ] QA check 2
- [ ] QA check 3

## Wrap-Up
- [ ] Document results
- [ ] Notify stakeholders
- [ ] Archive/file documents
- [ ] Update tracking systems

## Completion Criteria
All items above must be checked before considering this process complete.

## Notes
- Add any relevant notes or learnings here
- Document variations or edge cases
- Track time spent vs. estimate

**Last Completed**: YYYY-MM-DD
**Completed By**:
**Duration**: Xh Xm
**Issues Encountered**:
`,
  },
  {
    id: 'onboarding-template',
    name: 'Onboarding Checklist',
    description: 'Template for onboarding team members or clients',
    icon: '👋',
    category: 'process',
    defaultType: 'process',
    body: `# Onboarding: [Name/Role]

**Name**:
**Role**:
**Start Date**: YYYY-MM-DD
**Buddy/Mentor**:
**Manager**:

## Week 1: Getting Started

### Day 1: Welcome & Setup
- [ ] Welcome meeting with team
- [ ] Set up email and accounts
- [ ] Set up hardware (laptop, phone, etc.)
- [ ] Tour of office/tools
- [ ] Complete HR paperwork
- [ ] Review company handbook

### Day 2-3: Learning the Basics
- [ ] Introduction to our mission and values
- [ ] Overview of products/services
- [ ] Meet key team members
- [ ] Access to key systems
- [ ] Review org structure
- [ ] First team lunch

### Day 4-5: Deep Dive
- [ ] Department-specific training
- [ ] Review processes and workflows
- [ ] Shadow team members
- [ ] Set up first week goals
- [ ] End of week check-in

## Week 2: Building Knowledge

### Learning & Training
- [ ] Complete required training modules
- [ ] Review key documentation
- [ ] Understand key metrics
- [ ] Learn primary tools
- [ ] Set up regular 1-on-1s

### First Tasks
- [ ] Complete starter project
- [ ] Contribute to team meeting
- [ ] Ask questions freely
- [ ] End of week retrospective

## Week 3-4: Ramping Up

### Getting Hands-On
- [ ] Take on first real projects
- [ ] Begin attending regular meetings
- [ ] Start contributing to discussions
- [ ] Build relationships across teams
- [ ] 30-day check-in meeting

## Month 2-3: Full Speed

### Autonomy & Ownership
- [ ] Own specific projects/areas
- [ ] Mentor newer team members
- [ ] Participate in planning
- [ ] 60-day review
- [ ] 90-day review

## Resources & Links

### Essential Tools
- Tool 1: [Link]
- Tool 2: [Link]
- Tool 3: [Link]

### Key Documents
- Document 1: [Link]
- Document 2: [Link]
- Document 3: [Link]

### Key Contacts
| Name | Role | Contact |
|------|------|---------|
| Person 1 | Role | email@example.com |
| Person 2 | Role | email@example.com |

## Success Metrics

**30 Days**:
- Metric 1
- Metric 2

**60 Days**:
- Metric 1
- Metric 2

**90 Days**:
- Metric 1
- Metric 2

## Notes & Feedback
Use this space to document learnings, questions, and feedback about the onboarding process.
`,
  },
];
