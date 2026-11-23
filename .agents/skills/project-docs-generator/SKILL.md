---
name: project-docs-generator
description: Generates structured project proposals (client pitches, technical RFCs, academic/grant proposals) and project reports (status updates, milestone reviews, final technical/completion reports) grounded in workspace files and git history, and exports them as professionally designed executive PDF documents. Use when the user asks to write, draft, structure, update, or export a project proposal, statement of work, progress report, or final project report as Markdown or PDF. Do not use for API reference docs, code comments, or standard README files.
---

# Project Reports & Proposals Generator

## Goal
Produce executive-ready, factually grounded **Project Proposals** and **Project Reports** in Markdown and export them as publication-ready, well-designed **PDF files** (featuring modern executive typography, status badges, page counters, and vector Mermaid diagrams) by combining user requirements with real evidence from the active workspace.

## Decision Tree
Before writing, classify the request and load **only** the matching template from `resources/`:

1. **User wants to pitch, scope, justify, or get approval for upcoming work** (keywords: *proposal, pitch, SOW, RFP response, project plan, funding, grant*)
   - Load `resources/proposal-template.md`.
   - Identify the audience variant: **Client/Commercial**, **Internal/Technical**, or **Academic/Research**.
2. **User wants to summarize completed or in-progress work** (keywords: *report, status update, sprint review, milestone summary, final report, post-mortem, handover*)
   - Load `resources/report-template.md`.
   - Identify the report cadence: **Status/Progress Report** (ongoing) or **Final/Completion Report** (concluded).
3. **Request is ambiguous**
   - Ask up to 3 targeted clarifying questions (document type, target audience, and any hard constraints like budget/deadline) before generating the full document.

## Step-by-Step Workflow

### Step 1: Gather Grounding Context
Inspect the current workspace before drafting so technical details and progress reflect reality:
- Check `README.md`, architecture docs, `docs/`, and dependency manifests (`package.json`, `pyproject.toml`, `Cargo.toml`, etc.) for stack, modules, and architecture.
- For **Reports**, inspect recent `git log --oneline -n 30` (if a Git repo exists), changelogs, test results, or issue/task files to capture actual milestones and deliverables.
- Note any gaps between what exists in the repository and what the document requires.

### Step 2: Select & Adapt the Template
- Read the appropriate template from `resources/` (`proposal-template.md` or `report-template.md`).
- Keep sections proportional to project size. Omit irrelevant subsections rather than padding with filler.
- Adapt tone to the audience:
  - **Executives / Clients:** Lead with business value, ROI, risk mitigation, timeline, and budget.
  - **Engineering / Technical:** Emphasize architecture, trade-offs, acceptance criteria, and dependencies.
  - **Academic / Institutional:** Emphasize problem statement, methodology, evaluation metrics, and references.

### Step 3: Draft the Markdown Document
- Write clear, concrete prose backed by tables for schedules, budgets, risks, KPIs, and deliverables.
- Use Mermaid diagrams (`mermaid` fenced blocks) for system architecture, Gantt timelines, or workflows when visual structure adds clarity.
- Save the output to `docs/proposals/YYYY-MM-DD-<project-slug>-proposal.md` or `docs/reports/YYYY-MM-DD-<project-slug>-report.md` (create the directory if needed, or ask if the user prefers another path).

### Step 4: Quality & Grounding Check
Before exporting to PDF, verify:
- [ ] Executive Summary stands alone in 150 words or fewer and states the core ask or outcome upfront.
- [ ] Every milestone has an owner (or role), deliverable, and target/actual date.
- [ ] Every risk has both a severity/likelihood rating and a concrete mitigation plan.
- [ ] Zero fabricated numbers—unknown budgets, dates, or KPIs are explicitly marked `[TBD: <what is needed>]`.

### Step 5: Render & Export Well-Designed PDF
After verifying the Markdown file, export it as a polished executive PDF document using the bundled PDF exporter:

1. Run the generator script:
   ```bash
   python <path-to-skill>/scripts/generate_pdf.py docs/proposals/YYYY-MM-DD-<project-slug>-proposal.md
   ```
   *(Or for reports: `python <path-to-skill>/scripts/generate_pdf.py docs/reports/YYYY-MM-DD-<project-slug>-report.md`)*

2. What the exporter handles automatically:
   - **Executive Styling:** Injects `resources/pdf-style.css` (Inter typography, crisp headers, 20mm margins, page counters).
   - **Status Badges:** Converts table cells containing `Completed`, `On Track`, `In Progress`, `Proposed`, `At Risk`, `Delayed`, `High`, etc. into colored pill badges.
   - **Vector Diagrams:** Renders embedded Mermaid diagrams directly into vector SVGs via headless browser.
   - **Print Formatting:** Enforces `break-inside: avoid` on tables, cards, and diagrams to eliminate orphan headings and awkward page cuts.

3. Confirm that the PDF exists and provide clickable file links to both the `.md` source and the `.pdf` file in the response.

## Constraints
- **Never invent metrics, financial figures, client names, or test results.** Use `[TBD: <detail needed>]` placeholders and summarize all placeholders in an **Open Questions / Missing Inputs** block at the end of your chat response (not inside the final client-facing document unless requested).
- **Do not overwrite existing documents** without confirming with the user first; increment version suffixes (e.g., `-v2.md`) if a file already exists.
- Keep formatting portable (standard GitHub-Flavored Markdown) so the file converts cleanly to PDF, Google Docs, or DOCX.
- Always generate both the Markdown file and the exported PDF file when asked to produce or download proposals/reports.
