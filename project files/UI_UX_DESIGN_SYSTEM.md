# UI/UX Design System
## Cyber Investigation & Digital Forensics Platform

**Version:** 1.0  
**Status:** Proposed Design Specification  
**Design Direction:** Premium Digital Forensics Workstation  
**Primary Goal:** Professional, functional, evidence-focused interface

---

## 1. Design Philosophy

The platform must look like a serious digital investigation product used for examining evidence, analyzing relationships, and reconstructing incidents.

The interface must prioritize information clarity, investigative workflows, evidence traceability, and professional presentation.

The visual identity must not resemble a generic AI-generated cybersecurity dashboard.

### Core Design Principles

1. Professional rather than futuristic for decoration.
2. Information-dense without becoming visually cluttered.
3. Functional before decorative.
4. Restrained colors instead of excessive neon effects.
5. Meaningful data visualization instead of decorative charts.
6. Consistent typography, spacing, and component behavior.
7. Selective 3D visualization only where it improves investigation.
8. Clear distinction between source evidence, analytical findings, and AI-generated suggestions.
9. Responsive layouts and accessible interactions.
10. Consistent design across all ten investigation modules.

---

## 2. Visual Direction

### Chosen Aesthetic

The platform should follow a premium digital forensic workstation aesthetic with a graphite-based interface, neutral surfaces, restrained amber accents, and precise typography.

The design should communicate:

- Trustworthiness.
- Technical precision.
- Investigative seriousness.
- Evidence integrity.
- Professional analytical capability.
- Clarity and control.

### Avoid Generic Cybersecurity Styling

Do not use the following as the default design language:

- Bright neon-blue backgrounds.
- Blue-purple gradients across every panel.
- Glowing borders around all cards.
- Glassmorphism on every component.
- Excessive background grids and particle effects.
- Decorative 3D objects unrelated to the investigation.
- Random animated numbers or fake live activity.
- Oversized headings that waste dashboard space.
- Identical cards repeated across every page.
- Excessive rounded corners and floating elements.

The interface must feel deliberately designed for forensic investigation, not generated from a generic dashboard template.

---

## 3. Color System

Use a restrained neutral palette. Color should communicate hierarchy, state, or meaning rather than provide decoration.

### Core Colors

| Token | Suggested Value | Purpose |
|---|---|---|
| `--app-bg` | `#171816` | Main application background |
| `--surface-primary` | `#20211E` | Primary panels |
| `--surface-secondary` | `#292A26` | Secondary panels and raised surfaces |
| `--surface-hover` | `#33342F` | Hover states |
| `--border-default` | `#41423C` | Standard separators |
| `--text-primary` | `#F0EFE9` | Primary text |
| `--text-secondary` | `#B3B2A8` | Secondary text |
| `--text-muted` | `#85867D` | Muted metadata |
| `--accent-primary` | `#C5A36A` | Primary accent and selected controls |
| `--accent-hover` | `#D6B77F` | Accent hover state |
| `--focus-ring` | `#E1C18B` | Keyboard focus indicator |

### Semantic Colors

| Token | Suggested Value | Purpose |
|---|---|---|
| `--status-success` | `#80A68A` | Successful verification or completion |
| `--status-warning` | `#D2A45D` | Warnings and pending review |
| `--status-danger` | `#CB7772` | Errors and critical conditions |
| `--status-info` | `#A3B0B9` | Neutral informational state |

Semantic colors must be accompanied by text or icons where needed. Do not rely on color alone to communicate status.

### Color Rules

- Use neutral colors for most of the interface.
- Reserve amber for meaningful emphasis, selected controls, and primary actions.
- Use semantic colors consistently for statuses.
- Avoid applying accent colors to every icon, border, and heading.
- Do not use gradients as a substitute for visual hierarchy.
- Maintain readable text contrast.

These values are initial design tokens and should be checked for accessibility in actual components.

---

## 4. Typography

Typography should be compact, readable, and suitable for analytical work.

### Font Direction

Preferred choices:

- Inter.
- Geist Sans.
- A compatible system sans-serif fallback.

Use a monospaced font for code, file hashes, technical identifiers, and raw metadata.

Suggested choices:

- Geist Mono.
- JetBrains Mono.
- A compatible system monospace fallback.

### Typography Scale

| Element | Suggested Size | Weight |
|---|---|---|
| Main page heading | 24–30 px | Semibold |
| Section heading | 17–20 px | Semibold |
| Panel heading | 14–16 px | Medium |
| Body text | 14 px | Regular |
| Table text | 13–14 px | Regular |
| Metadata | 12 px | Regular |
| Technical identifiers | 12–13 px | Monospace |

### Rules

- Maintain a clear heading hierarchy.
- Avoid excessively large dashboard titles.
- Use readable line heights.
- Keep labels concise.
- Use tabular numerals for aligned numeric data.
- Do not use uppercase text for every heading.
- Avoid decorative typography that reduces readability.

---

## 5. Spacing, Layout, and Shape

### Spacing System

Use a consistent spacing scale based on multiples of four pixels.

Suggested values:

- 4 px: tight icon spacing.
- 8 px: compact component spacing.
- 12 px: internal control spacing.
- 16 px: standard panel spacing.
- 24 px: section spacing.
- 32 px: major layout separation.

### Layout Rules

- Use a consistent application shell.
- Keep related information grouped together.
- Use alignment and whitespace to establish hierarchy.
- Avoid unnecessary empty space in analytical workspaces.
- Make important evidence information easy to scan.
- Support horizontal scrolling only where justified, such as wide technical tables.

### Border Radius

- Small controls: 4–6 px.
- Inputs and buttons: 5–7 px.
- Panels: 6–10 px.
- Dialogs: 8–12 px.

Avoid excessive pill-shaped controls and large rounded cards throughout the application.

### Borders and Shadows

- Prefer thin, neutral borders.
- Use shadows only when they clarify layering.
- Avoid glowing borders and heavy shadows.
- Use subtle elevation for dialogs, menus, and overlays.

---

## 6. Application Shell

The application should use a persistent navigation structure suitable for an investigation workstation.

### Sidebar

The sidebar should contain:

- Product identity.
- Dashboard.
- Cases.
- Evidence.
- CDR Analysis.
- OSINT Analysis.
- Digital Forensics.
- Email Forensics.
- IP & Network Analysis.
- Entity & Link Analysis.
- Incident Timeline.
- Threat Intelligence.
- AI Assistant & Reports.
- Settings, where implemented.

The sidebar should support a compact mode when useful.

### Top Bar

The top bar should contain:

- Current page or case context.
- Breadcrumb navigation.
- Global search, if implemented.
- Relevant processing or notification indicators.
- User menu and session controls.

Do not display decorative status indicators that do not reflect actual system state.

### Main Content Area

The content area should prioritize the active investigation task.

It may include:

- Page heading and contextual actions.
- Filters and search.
- Evidence tables or analytical visualizations.
- Processing status and error messages.
- Supporting metadata.
- Details panels and contextual actions.

---

## 7. Dashboard Design

The dashboard should provide a useful overview of the investigator's authorized work.

### Suggested Sections

1. Active and recently accessed cases.
2. Evidence processing status.
3. Recent investigation activity.
4. Analysis jobs and failures.
5. Pending report reviews, if supported.
6. Recent findings linked to their cases.

### Dashboard Rules

- Display real values retrieved from the backend.
- Clearly distinguish zero values from unavailable data.
- Use charts only when the underlying data supports them.
- Include empty states for new users.
- Avoid fake statistics and fabricated recent activity.
- Do not present arbitrary risk scores without a documented calculation.
- Provide direct navigation to the records behind each summary.

The dashboard should help users decide what to inspect next rather than simply display impressive-looking numbers.

---

## 8. Case Workspace

The case workspace is the primary environment for investigation.

### Header

Display:

- Case number.
- Case title.
- Case status.
- Authorized case actions.
- Relevant creation or update information.

### Main Sections

- Overview.
- Evidence.
- Analysis results.
- Entities and relationships.
- Timeline.
- Threat intelligence.
- Reports.
- Audit and custody history, according to permissions.

### Behavior

- Keep the active case context visible.
- Preserve navigation context when moving between related modules.
- Show clear loading, success, empty, and error states.
- Ensure every displayed finding can be traced to its source when applicable.
- Do not allow the UI to imply access to evidence that the user cannot actually retrieve.

---

## 9. Evidence Management Interface

Evidence management must prioritize traceability and integrity.

### Evidence Table

Suggested columns:

- Evidence ID.
- Original filename.
- File type.
- File size.
- SHA-256 hash or abbreviated hash.
- Upload or receipt timestamp.
- Processing status.
- Actions.

### Evidence Details

Display:

- Evidence identifier.
- Source description.
- File metadata.
- Recorded hash.
- Latest verification result.
- Related analysis jobs.
- Extracted findings.
- Chain-of-custody history.

### Interaction Rules

- Show full hashes in a copyable technical view.
- Indicate whether verification passed, failed, or has not been performed.
- Display processing failures clearly.
- Require confirmation for destructive operations.
- Do not imply that a successful hash comparison proves the source is authentic.
- Restrict actions according to the user's permissions.

---

## 10. Tables, Forms, and Filters

### Tables

- Use clear column headers.
- Support sorting where useful.
- Provide pagination for large datasets.
- Use consistent date and numeric formatting.
- Support row selection where relevant.
- Provide contextual actions without overcrowding each row.
- Keep technical values readable and copyable.

### Forms

- Use explicit labels.
- Validate inputs before submission and on the server.
- Show field-specific errors.
- Disable duplicate submission while an operation is in progress.
- Clearly communicate required fields.
- Confirm destructive or irreversible actions.

### Filters

Provide module-specific filters such as:

- Date range.
- Entity type.
- Evidence source.
- Processing status.
- Event type.
- Indicator type.

Filters must correspond to actual supported backend queries.

---

## 11. Data Visualization

Visualizations must help investigators understand the available evidence.

### Chart Guidelines

- Use the simplest chart that explains the data.
- Label axes and units.
- Provide legends where necessary.
- Avoid unnecessary 3D charts for ordinary numerical data.
- Make charts responsive.
- Provide meaningful empty states.
- Ensure charts do not conceal uncertainty or missing values.

### CDR Visualizations

Suitable options include:

- Call frequency over time.
- Incoming and outgoing call distribution.
- Communication frequency by contact.
- Communication relationship graph.

### Network Visualizations

Suitable options include:

- Network activity over time.
- Distribution of observed indicator types.
- Relevant traffic statistics.
- Evidence-supported relationships between indicators.

Charts must be based on real processed records or explicitly labelled synthetic demonstration data.

---

## 12. Entity Relationship Graph

The entity graph is the main candidate for advanced interactive visualization.

### Purpose

Help investigators explore connections between people, phone numbers, email addresses, IP addresses, domains, usernames, devices, and evidence items.

### Primary Requirements

- Support node selection.
- Support zooming and panning.
- Display entity labels.
- Differentiate node types without relying on color alone.
- Highlight selected relationships.
- Provide details for selected nodes and edges.
- Link relationships to supporting evidence.
- Allow filtering by entity type and relationship type.
- Handle large graphs without excessive rendering costs.

### Graph Details Panel

When a node or relationship is selected, show:

- Entity or relationship identifier.
- Entity type or relationship type.
- Relevant metadata.
- Supporting evidence references.
- Provenance and derivation information.
- Related timeline events, when available.

Do not display an inferred relationship as an observed fact.

---

## 13. Selective 3D Visualization

### Design Principle

3D is an optional visualization technique, not the application's overall visual style.

The default application must remain a professional workstation with predominantly flat surfaces and conventional controls.

### Recommended Use

Use Three.js and React Three Fiber for the entity relationship explorer only when 3D provides a meaningful benefit.

Potential capabilities include:

- Rotating the relationship graph.
- Zooming and panning through the scene.
- Selecting entities.
- Highlighting paths between selected entities.
- Displaying related evidence in a details panel.
- Filtering visible nodes and relationships.

### Interaction Requirements

- Provide intuitive camera controls.
- Keep labels legible.
- Prevent excessive overlapping nodes where possible.
- Avoid unnecessary particles, explosions, or constant animations.
- Provide a conventional 2D graph fallback.
- Respect reduced-motion preferences.
- Avoid making essential actions dependent on 3D interaction.

### Performance Requirements

- Render only the necessary scene elements.
- Avoid unnecessarily complex geometry and lighting.
- Support reasonable frame rates on typical student laptops.
- Clean up event listeners and rendering resources.
- Handle empty or large datasets gracefully.

---

## 14. Timeline Interface

The timeline should display investigation events in chronological order.

### Required Features

- Chronological event list or timeline visualization.
- Date-range filters.
- Source-module filters.
- Entity filters.
- Event-type filters.
- Event details panel.
- Direct links to supporting evidence.

### Display Rules

- Distinguish event time from collection time.
- Preserve timezone context where relevant.
- Identify missing or ambiguous timestamps.
- Avoid implying certainty where the source record does not provide it.
- Support dense event lists without making the interface difficult to scan.

---

## 15. AI Assistant and Report Interface

The AI assistant should appear as a focused investigation tool, not as a decorative chatbot.

### Suggested Layout

- Conversation area.
- Case context indicator.
- Question input.
- Relevant evidence references.
- Loading and processing state.
- Response details.
- Copy and export actions, where supported.

### Response Presentation

Distinguish:

- Documented observations.
- Analytical interpretations.
- AI-generated suggestions.
- Missing or uncertain information.

Evidence references should be inspectable and should open only records the current user is authorized to access.

### Report Editor

The report interface should support:

- Report title and case details.
- Structured findings.
- Evidence references.
- Review and approval status.
- Editing and saving.
- Export only in supported formats.

Never make an AI-generated draft look like a formally approved report before review.

---

## 16. Component Design Rules

Build reusable components for repeated interface patterns.

Suggested components include:

- Application sidebar.
- Top navigation bar.
- Page header.
- Case selector.
- Status label.
- Evidence table.
- Metadata panel.
- Search and filter toolbar.
- Confirmation dialog.
- File upload area.
- Empty state.
- Error state.
- Loading indicator.
- Graph details panel.
- Timeline event item.
- Evidence reference.
- Report status indicator.

Components must use consistent tokens, spacing, accessibility behavior, and error handling.

Avoid creating separate versions of the same component for every module without a clear reason.

---

## 17. Interaction and Motion

Motion should provide feedback or explain changes in the interface.

### Allowed Uses

- Subtle hover and focus transitions.
- Menu opening and closing.
- Table selection feedback.
- Graph selection and path highlighting.
- Loading indicators.
- Timeline navigation.
- Small transitions between workspace states.

### Avoid

- Continuous background animations.
- Randomly moving nodes without investigative meaning.
- Unnecessary parallax effects.
- Animated counters that imply live data when none exists.
- Long transitions that slow down repeated analytical tasks.

Use reduced-motion preferences and ensure all important functionality remains available without animation.

---

## 18. Accessibility and Responsive Design

The interface should support:

- Keyboard navigation.
- Visible focus states.
- Accessible labels.
- Sufficient text contrast.
- Readable typography.
- Clear error messages.
- Responsive layouts.
- Reduced-motion preferences.

The primary desktop layout should be optimized for investigation workflows, while smaller screens should preserve essential functionality.

Complex graphs and wide evidence tables may use dedicated responsive layouts or controlled scrolling.

---

## 19. Loading, Empty, Error, and Success States

Every data-driven component must define its operational states.

### Loading

Show an appropriate progress indicator while data is retrieved or processed.

### Empty

Explain why no records are displayed and provide an appropriate next action.

### Error

Display a useful error message and a retry option where appropriate.

### Success

Confirm completed operations without unnecessary celebration or animation.

### Partial Results

Clearly identify incomplete processing or unavailable sources rather than presenting partial results as complete.

---

## 20. Frontend Engineering Standards

- Use the existing Next.js architecture and conventions.
- Use TypeScript for typed component properties and API responses.
- Use Tailwind CSS and shared design tokens consistently.
- Reuse components and avoid duplicated UI logic.
- Keep backend analysis logic out of presentation components.
- Fetch real data through documented API contracts.
- Do not hardcode dashboard statistics or investigation findings as production data.
- Use clearly labelled fixtures for development and screenshots.
- Handle API errors and loading states.
- Avoid unnecessary dependencies.
- Test important user workflows.
- Keep accessibility and performance in scope throughout development.

Before introducing new libraries, inspect the existing dependency list and verify whether equivalent functionality is already available.

---

## 21. UI Acceptance Checklist

The design system is correctly implemented when:

- [ ] The application uses a consistent neutral, professional color palette.
- [ ] The interface avoids generic neon-blue cybersecurity styling.
- [ ] Typography and spacing are consistent.
- [ ] Navigation is coherent across all implemented modules.
- [ ] Evidence metadata and hash information are readable.
- [ ] Case-level permissions are reflected correctly in the UI.
- [ ] Entity relationships link to supporting evidence.
- [ ] Timeline events retain source references.
- [ ] AI responses distinguish observations from interpretations.
- [ ] Loading, empty, error, and success states exist.
- [ ] Interactive 3D features serve a clear investigative purpose.
- [ ] Core workflows remain usable without 3D rendering.
- [ ] The interface works at supported screen sizes.
- [ ] The application displays actual backend results rather than fabricated production data.

---

## 22. Instructions for AI Coding Agents

When implementing the interface:

1. Read this document before designing or modifying major UI components.
2. Inspect the existing frontend before replacing pages or changing dependencies.
3. Preserve the selected design direction.
4. Do not introduce bright blue gradients, excessive glow, ubiquitous glassmorphism, or decorative cyber animations.
5. Use shared components and design tokens.
6. Connect components to real API data when the backend supports the functionality.
7. Label mock data clearly and never present it as actual investigation data.
8. Preserve evidence provenance in graphs, tables, timelines, and reports.
9. Enforce permissions through backend APIs rather than frontend visibility alone.
10. Keep 3D effects selective and provide a usable fallback.
11. Test the interface with representative data volumes.
12. Report incomplete functionality accurately.

---

**Related documents:**

- `PROJECT_OVERVIEW.md`
- `SYSTEM_ARCHITECTURE.md`
- `MODULE_SPECIFICATION.md`
- `DATABASE_SCHEMA.md`
- `IMPLEMENTATION_ROADMAP.md`