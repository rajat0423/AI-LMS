# MCQ Workspace Implementation Plan

## Goal
Add a scalable MCQ learning and assessment workspace inside `My Modules` while preserving:

- year-wise access restrictions
- current rounded-card UI language
- responsive layout patterns
- existing module and quiz APIs

## Phase 1: Foundation Slice

Files in this phase:

- `src/components/mcq/MCQWorkspace.jsx`
- `src/components/mcq/UnitAccordion.jsx`
- `src/components/mcq/QuestionCard.jsx`
- `src/components/mcq/AnalyticsSidebar.jsx`
- `src/pages/ReadComprehension.jsx`

Deliverables:

- module-level MCQ workspace inside `My Modules`
- unit accordion with nested topic sections
- question-by-question learning mode
- local answer submission, bookmarking, explanation reveal
- analytics sidebar using live workspace state
- topic-level CTA to launch the dedicated quiz route

## Phase 2: Structured Metadata

Backend contract enhancements:

- `blooms_level`
- `course_outcome`
- `concepts_tested`
- `question_code`

Deliverables:

- richer metadata chips in `QuestionCard`
- searchable concepts and taxonomy tags
- cleaner curriculum analytics

## Phase 3: Persistence

New persistence scope:

- per-question attempts
- bookmark persistence
- time spent
- topic-level completion

Current status:

- question attempts persisted through `/api/v1/quiz/question/{question_id}/attempt`
- bookmarks persisted through `/api/v1/quiz/question/{question_id}/bookmark`
- study-bank payload now hydrates attempt state and bookmark state back into `My Modules`

Suggested backend additions:

- `POST /api/v1/quiz/question/{question_id}/attempt`
- `POST /api/v1/quiz/question/{question_id}/bookmark`
- `GET /api/v1/quiz/module/{module_id}/analytics`

## Phase 4: Filters and Search

Frontend additions:

- difficulty filter
- Bloom filter
- course outcome filter
- attempted and bookmarked filters
- keyword and concept search

Implementation note:

- keep filter state in URL params for sharable module views

## Phase 5: Assessment Modes

Modes:

- learning mode
- exam mode
- revision mode

Rules:

- learning mode can reveal explanations per question
- exam mode hides explanations until submission flow ends
- revision mode filters incorrect and bookmarked questions

## Phase 6: Advanced Analytics

Add:

- weak area detection
- topic mastery score
- difficulty breakdown
- unit completion trend
- leaderboard-ready summary shape

## Phase 7: Future Extensions

Reserved architecture for:

- timed quizzes
- adaptive question ordering
- AI-generated questions
- gamification
- certification logic
- cohort analytics

## Current Repo Mapping

Entry points:

- `src/pages/ReadComprehension.jsx`
- `src/pages/QuizViewer.jsx`
- `src/pages/CourseDetail.jsx`

Current backend dependencies:

- `GET /api/v1/modules`
- `GET /api/v1/modules/{id}`
- `GET /api/v1/quiz/module/{id}/study-bank`
- `GET /api/v1/quiz/lesson/{id}`
- `POST /api/v1/quiz/{id}/submit`
- `GET /api/v1/my/progress`

## State Strategy

Use local component state for:

- open unit
- open topic
- current question index per topic
- draft answer
- bookmark state
- explanation visibility

Use backend state for:

- module access
- topic progress
- real quiz attempts
- student year restrictions

## UI Guardrails

- do not replace dashboard layout
- keep light theme and purple accents
- keep cards rounded and spacious
- use sticky analytics sidebar only on large screens
- keep mobile interactions stacked and thumb-friendly
