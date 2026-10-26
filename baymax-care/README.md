# Baymax Care — Family Healthcare Platform

Baymax Care is a calm, caring, and trustworthy family healthcare platform inspired by Baymax from *Big Hero 6*. It helps families manage their health, understand medical reports, follow treatment plans, remember medications, access qualified healthcare professionals, and respond to emergencies.

**This is an original, independent product.** Baymax Care is not affiliated with, endorsed by, or connected to Disney or the Big Hero 6 franchise.

## Table of Contents

- [Product Overview](#product-overview)
- [Feature List](#feature-list)
- [Architecture](#architecture)
- [Technology Stack](#technology-stack)
- [Prerequisites](#prerequisites)
- [Local Development Setup](#local-development-setup)
- [Database Setup](#database-setup)
- [Migration Instructions](#migration-instructions)
- [Seed Data Instructions](#seed-data-instructions)
- [Test Commands](#test-commands)
- [Production Build Commands](#production-build-commands)
- [Environment Variable Reference](#environment-variable-reference)
- [NVIDIA NIM Configuration](#nvidia-nim-configuration)
- [External Integration Setup](#external-integration-setup)
- [Deployment Instructions](#deployment-instructions)
- [Custom Domain Setup](#custom-domain-setup)
- [Security Considerations](#security-considerations)
- [Privacy and Legal Review Requirements](#privacy-and-legal-review-requirements)
- [Known Limitations](#known-limitations)

---

## Product Overview

Baymax Care is a family-oriented digital health platform built on Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS, and PostgreSQL with Prisma/Drizzle ORM.

The platform supports multiple family members under one account, with strict separation of each member's medical information and explicit authorization for caregivers.

**Core modules:**

1. **AI Family Doctor** — Conversational health assistant via server-side NVIDIA NIM integration
2. **Personal Medical History** — Searchable medical records, conditions, allergies, surgeries, immunizations
3. **Medical Report Analyzer** — PDF/image upload, text extraction (unpdf + optional OCR.space), AI explanation with validated reference ranges
4. **Medication Reminders** — Prescription-linked schedules, dose tracking (taken/skipped/missed), time-zone aware
5. **Prescription Management** — Upload prescriptions, track verification status, link to family members
6. **Medicine Ordering** — Pharmacy adapter; unavailable without a configured provider (honest unavailable state)
7. **Women's Health & Period Tracking** — Private cycle logging, encrypted notes, estimates labeled as not medical certainty
8. **24/7 Doctor Consultation** — Consultation adapter; unavailable without a configured provider
9. **Personal SOS Alerts** — Emergency contacts, SMS/email delivery through configured providers, delivery status tracking
10. **Ambulance Emergency Assistance** — Ambulance adapter; direct emergency-call fallback when unconfigured
11. **Diet & Nutrition Care** — Preferences, meal logging, water tracking, AI-generated meal plans
12. **Family Member Management** — Granular caregiver permissions, invite/accept/revoke workflow
13. **Notifications & Health Insights** — In-app notifications, per-category preferences, quiet hours
14. **Privacy, Consent & Account Management** — Consent revocation, session revocation, account deletion

---

## Feature List

### Public Pages
- `/` — Landing page with hero, feature sections, trust section, dashboard preview
- `/features` — Product features
- `/how-it-works` — How the platform works
- `/for-families` — Family healthcare management
- `/safety` — Medical AI safety and emergency limitations
- `/privacy` — Privacy policy
- `/terms` — Terms and conditions
- `/contact` — Contact and support
- `/login`, `/register`, `/forgot-password`, `/reset-password`, `/verify-email` — Authentication
- `/emergency` — Direct emergency information page (always available)

### Authenticated Application
- `/app` — Personalized health dashboard
- `/app/family` — Family member management
- `/app/family/[memberId]` — Individual health profile
- `/app/medical-history` — Medical history
- `/app/reports` — Report library
- `/app/reports/[reportId]` — Report details and AI explanation
- `/app/ai-doctor` — AI health assistant
- `/app/medications` — Medication schedule
- `/app/prescriptions` — Prescriptions
- `/app/orders` — Medicine orders
- `/app/consultations` — Doctor consultations
- `/app/consultations/[consultationId]` — Consultation details
- `/app/womens-health` — Period tracking
- `/app/nutrition` — Diet and nutrition
- `/app/alerts` — Personal alerts and emergency contacts
- `/app/notifications` — Notification center
- `/app/settings` — Account settings
- `/app/settings/privacy` — Consent and privacy controls
- `/app/settings/security` — Security settings

### API Routes
- `/api/webhooks/pharmacy` — Pharmacy webhook handler
- `/api/webhooks/consultation` — Consultation webhook handler
- `/api/webhooks/ambulance` — Ambulance webhook handler
- `/api/cron/reminders` — Medication reminder cron job

---

## Architecture

The application uses a coherent, maintainable, production-oriented architecture:

### Frontend
- Next.js App Router with React 19 and TypeScript (strict mode)
- Tailwind CSS with centralized design-token system (turquoise primary `#16B8B0`)
- shadcn/ui-inspired accessible component library (`@/components/ui/`)
- Lucide icons (no emoji icons)
- React Hook Form + Zod validation via server actions
- TanStack Query patterns where appropriate
- Recharts for genuine health data visualization

### Backend
- Next.js server-side routes and server actions for application operations
- Clear service boundaries in `@/lib/`
- Authentication middleware with session management
- Role-based authorization with family data isolation
- Request validation with Zod
- Business logic services separated from data access

### Database
- PostgreSQL with Drizzle ORM
- Local PGlite (embedded PostgreSQL WASM) for development
- Migrations under `drizzle/`
- UUIDs as primary keys
- Foreign keys with deliberate deletion policies
- Tenant isolation via `family_id` + `family_access` authorization checks
- Row-level security recommended for production

### File Storage
- Private object storage (S3-compatible or local under `.data/uploads`)
- Signed URLs with 10-minute expiration for downloads

### Background Jobs
- Persistent job queue via `background_jobs` table
- Cron endpoint at `/api/cron/reminders` for medication reminders
- NOT reliant on browser timers for critical tasks

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16.4.3 (App Router, Turbopack) |
| Language | TypeScript 5 (strict) |
| UI | React 19, Tailwind CSS 4 |
| Icons | Lucide React |
| Database | PostgreSQL via Drizzle ORM 0.45 |
| Local DB | PGlite (@electric-sql/pglite) |
| Auth | Custom session-based auth with bcryptjs |
| Forms | React Hook Form + Zod 4 |
| AI | NVIDIA NIM (OpenAI-compatible) via server-side fetch |
| OCR | OCR.space (optional), unpdf for PDF text |
| Email | Nodemailer (SMTP) |
| SMS | Twilio REST API |
| File Storage | AWS S3 SDK v3 or local filesystem |
| Charts | Recharts |
| Testing | Vitest + Playwright |
| Lint | ESLint with Next.js config |

---

## Prerequisites

- Node.js 18 or later
- npm, yarn, or pnpm
- PostgreSQL 14+ (optional — PGlite embedded DB is used for local development)
- OpenSSL (for generating secrets)

---

## Local Development Setup

### 1. Clone and install dependencies

```bash
cd D:\GCC\baymax-care
npm install
```

### 2. Copy environment variables

```bash
copy .env.example .env.local
```

Edit `.env.local` with your local values. The defaults work for local development:
- `DATABASE_URL` is omitted → uses embedded PGlite under `.data/`
- `AI_PROVIDER=unconfigured` → AI features show honest unavailable state
- `DEV_EXPOSE_AUTH_LINKS=true` → shows development-only auth links when email is not configured

### 3. Generate secrets

```bash
# Session secret (32+ random characters)
openssl rand -base64 48

# Encryption key (32-byte base64)
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### 4. Set up the database

```bash
npm run db:migrate
```

### 5. Start the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Database Setup

The database is configured in `src/db/index.ts`. Two modes are supported:

### Local Development (PGlite)
When `DATABASE_URL` is not set, the app uses PGlite — an embedded PostgreSQL engine compiled to WebAssembly — persisted under `.data/pglite`. Migrations run automatically on first connection.

### Production (Managed PostgreSQL)
Set `DATABASE_URL` to your managed PostgreSQL connection string. Set `DATABASE_SSL="true"` for TLS. Migrations can run automatically with `AUTO_MIGRATE="true"`, or manually via `drizzle-kit`.

---

## Migration Instructions

```bash
# Generate migrations from schema changes
npm run db:generate

# Apply migrations (local PGlite)
npm run db:migrate

# Production: set AUTO_MIGRATE=true and deploy, or run drizzle-kit migrate manually
```

Migration SQL is stored in `drizzle/0000_init.sql`.

---

## Seed Data Instructions

No production seed data is included. Synthetic demo data may be added to a local development workspace only. The `resetDemoWorkspaceAction` clears demo data from a local demo account. Never seed fake patients into a production database.

---

## Test Commands

```bash
# Unit tests (Vitest)
npm run test

# Watch mode
npm run test:watch

# E2E tests (Playwright)
npm run test:e2e

# Type checking
npm run typecheck

# Linting
npm run lint

# Production build
npm run build
```

**Note:** No application test files currently exist in the repository. Test infrastructure (Vitest, Playwright) is installed but no test files have been written. This is a known limitation — see [Known Limitations](#known-limitations).

---

## Production Build Commands

```bash
npm run build
npm run start
```

The production build performs:
- TypeScript checking
- ESLint
- Turbopack compilation
- Static page generation for public routes
- Dynamic server rendering for authenticated routes

---

## Environment Variable Reference

All variables are documented in `.env.example`. Here is the reference:

### Core Application (Required)
| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment (`development`/`production`) | `development` |
| `APP_URL` | Production application URL | `http://localhost:3000` |
| `NEXT_PUBLIC_APP_URL` | Public app URL (browser-accessible) | `http://localhost:3000` |
| `APP_NAME` | Brand name | `Baymax Care` |
| `BRAND_TAGLINE` | Brand tagline | `Your family's health, in one caring place.` |
| `CONTACT_EMAIL` | Support email | `care@example.com` |
| `DEFAULT_TIME_ZONE` | Default time zone | `Asia/Kolkata` |
| `EMERGENCY_NUMBER` | Local emergency number | `112` |

### Session and Token Security (Required in Production)
| Variable | Description |
|----------|-------------|
| `SESSION_SECRET` | Secret for session signing. Generate: `openssl rand -base64 48` |
| `APP_ENCRYPTION_KEY` | Base64-encoded 32-byte key for sensitive field encryption |

### Database
| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string (omitted → PGlite local) |
| `DATABASE_SSL` | Enable TLS for database (`true`/`false`) |

### File Storage
| Variable | Description |
|----------|-------------|
| `UPLOAD_MAX_MB` | Max upload size in MB | `15` |
| `STORAGE_DRIVER` | `local` or `s3` | `local` |
| `S3_REGION`, `S3_BUCKET`, `S3_ENDPOINT`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` | S3 credentials (only if `STORAGE_DRIVER=s3`) |

### AI Assistant + Report Explanations
| Variable | Description |
|----------|-------------|
| `AI_PROVIDER` | `nvidia`, `openai-compatible`, or `unconfigured` | `unconfigured` |
| `NVIDIA_NIM_BASE_URL` | NVIDIA NIM base URL | `https://integrate.api.nvidia.com/v1` |
| `NVIDIA_NIM_API_KEY` | NVIDIA NIM API key (server-side only) | |
| `NVIDIA_NIM_MODEL` | Model name | `meta/llama-3.1-70b-instruct` |
| `AI_REQUEST_TIMEOUT_MS` | Request timeout | `45000` |
| `AI_REPORT_MODEL` | Override model for report analysis | |
| `OCR_SPACE_API_KEY` | OCR.space API key (optional) | |
| `OCR_SPACE_ENDPOINT` | OCR.space endpoint | |

### Email Notifications
| Variable | Description |
|----------|-------------|
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD` | SMTP credentials |
| `EMAIL_FROM` | From address | `Baymax Care <no-reply@example.com>` |
| `DEV_EXPOSE_AUTH_LINKS` | Show dev-only auth links when email unconfigured | `true` (dev only) |

### SMS / Emergency Alerts
| Variable | Description |
|----------|-------------|
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER` | Twilio SMS credentials |

### Pharmacy / Medicine Ordering
| Variable | Description |
|----------|-------------|
| `PHARMACY_PROVIDER`, `PHARMACY_API_BASE_URL`, `PHARMACY_API_KEY`, `PHARMACY_WEBHOOK_SECRET` | Pharmacy partner credentials |

### Doctor Scheduling and Consultations
| Variable | Description |
|----------|-------------|
| `CONSULTATION_PROVIDER`, `CONSULTATION_API_BASE_URL`, `CONSULTATION_API_KEY`, `CONSULTATION_WEBHOOK_SECRET` | Consultation partner credentials |

### Ambulance
| Variable | Description |
|----------|-------------|
| `AMBULANCE_PROVIDER`, `AMBULANCE_API_BASE_URL`, `AMBULANCE_API_KEY` | Ambulance partner credentials |

### Background Reminders
| Variable | Description |
|----------|-------------|
| `CRON_SECRET` | Bearer token for cron endpoint |
| `REMINDER_LOOKAHEAD_DAYS` | Days to look ahead for reminders | `2` |

### Operations
| Variable | Description |
|----------|-------------|
| `ADMIN_EMAILS` | Comma-separated admin emails |
| `LOG_LEVEL` | `debug`/`info`/`warn`/`error` | `info` |
| `RATE_LIMIT_ENABLED` | Enable rate limiting | `true` |

**Validation:** Required environment variables are validated at application startup. The app fails clearly when required production configuration is missing.

---

## NVIDIA NIM Configuration

The AI Family Doctor and report analysis use NVIDIA NIM as the preferred model integration:

1. Set `AI_PROVIDER=nvidia`
2. Set `NVIDIA_NIM_API_KEY` to your NVIDIA NIM API key (server-side only — never in browser code)
3. Optionally override `NVIDIA_NIM_BASE_URL` and `NVIDIA_NIM_MODEL`
4. Set `AI_REQUEST_TIMEOUT_MS` for the request timeout

If no AI provider is configured, AI features display an honest unavailable state. No fake AI responses are ever generated.

---

## External Integration Setup

Each integration has a documented adapter in `src/lib/`:

| Integration | Adapter | Env Vars | Unavailable State |
|-------------|---------|----------|-------------------|
| AI | `src/lib/ai.ts` | `AI_PROVIDER=...`, `NVIDIA_NIM_*` | Shows "AI not configured" |
| Email | `src/lib/email.ts` | `SMTP_*` | Shows "Email not configured" |
| SMS | `src/lib/sms.ts` | `TWILIO_*` | Shows "SMS not configured" |
| OCR | `src/lib/ocr.ts` | `OCR_SPACE_API_KEY` | Image reports stored, not extracted |
| Storage | `src/lib/storage.ts` | `S3_*` (if S3 driver) | Local private storage |
| Pharmacy | `src/lib/pharmacy.ts` | `PHARMACY_*` | Ordering disabled, honest message |
| Consultation | `src/lib/consultations.ts` | `CONSULTATION_*` | Booking disabled, honest message |
| Ambulance | `src/lib/ambulance.ts` | `AMBULANCE_*` | Direct emergency-call fallback |

Webhook endpoints are provided at `/api/webhooks/{pharmacy,consultation,ambulance}` for provider status synchronization. Webhook signatures are verified before accepting updates.

---

## Deployment Instructions

### Platform
Deploy to any hosting provider that supports Next.js (Vercel, AWS, Docker, etc.).

### Docker
A `Dockerfile` can be added for containerized deployment. The app reads all configuration from environment variables.

### Environment Variables
Set all production variables from `.env.example` on your deployment platform. Do not commit `.env` files.

### Database
Run migrations before starting the app:
```bash
npx drizzle-kit migrate
```

### Build
```bash
npm run build
npm run start
```

### Health Check
The app is a standard Next.js application. Add a health check at `/api/health` if needed (not currently implemented — see Known Limitations).

---

## Custom Domain Setup

Baymax Care is prepared for a custom domain:

1. **Configurable domain:** `APP_URL` and `NEXT_PUBLIC_APP_URL` environment variables set the canonical URL
2. **Canonical URLs:** Metadata uses `metadataBase` from `brand.url`
3. **HTTPS:** Configure TLS on your hosting provider; `Strict-Transport-Security` header is set in production
4. **Redirect policy:** Configure your hosting provider to redirect non-canonical hostnames to the canonical domain
5. **Production metadata:** Open Graph, Twitter cards, robots.txt, and sitemap are configured
6. **Robots.txt:** Public pages are indexable; `/app/` and `/api/` are disallowed
7. **Sitemap:** Add a `/sitemap.xml` route for public pages only (not yet implemented — see Known Limitations)
8. **Favicon:** `public/icon.svg`, `public/icon.png` (512x512), `public/apple-icon.png` (180x180), `public/favicon.ico`
9. **Custom favicon:** Generated from the original Baymax-inspired brand mark (turquoise rounded square with care symbol)

**Important:** A custom domain cannot be registered or connected without access to the domain registrar and DNS settings. Configure DNS to point to your deployment, then verify the live domain.

---

## Security Considerations

- TLS for all deployed environments (HSTS header in production)
- Secure session handling with HttpOnly, SameSite cookies
- Password hashing via bcryptjs (cost 12)
- Authorization checks on every protected operation
- Strict input validation with Zod schemas
- Output sanitization via `rehype-sanitize` for AI markdown
- Protection against SQL injection (parameterized queries via Drizzle)
- XSS protections via React auto-escaping + Content-Security-Policy
- CSRF protection via SameSite cookies and server action validation
- Rate limiting on authentication endpoints (persistent in database)
- Secure HTTP headers (CSP, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy, COOP)
- Safe file uploads with MIME type detection and size limits
- Private file storage with signed, expiring download links (10-minute TTL)
- Webhook signature verification (HMAC-SHA256, constant-time comparison)
- Secret management through environment variables only
- Data minimization — AI prompts include only explicitly authorized context
- Consent management with revocable consent records
- Audit trails in `audit_events` table (identifiers and categories only — no health content)
- Session revocation (individual and all sessions)
- Account deletion workflow with file cleanup
- Encryption at rest via infrastructure; application-level encryption for sensitive free-text fields
- No patient data in logs, error responses, URLs, or client-side debug output

---

## Privacy and Legal Review Requirements

The `/privacy` and `/terms` pages are real application pages that describe implemented practices. However:

1. **These documents must be reviewed by a qualified legal professional before public launch.**
2. Existence of these pages does not constitute legal compliance.
3. Assess applicability of India's Digital Personal Data Protection Act and associated rules, relevant healthcare requirements, and any other applicable jurisdictions.
4. Pending practices (e.g., integrations not yet configured) are marked as deployment requirements, not completed guarantees.
5. Do not claim certifications, regulatory approvals, partnerships, clinical outcomes, or security guarantees that have not been obtained.

---

## Known Limitations

1. **No application test files exist.** Test infrastructure (Vitest, Playwright) is installed but no test files have been written for application code. This is a gap against the project's testing requirements.
2. **No health-check endpoint** is implemented (`/api/health`).
3. **No sitemap.xml route** exists (robots.txt references one but it is not generated).
4. **No Dockerfile** exists for containerized deployment.
5. **No monitoring/alerting** is configured beyond structured console logging.
6. **No background worker process** is configured; the cron endpoint at `/api/cron/reminders` must be triggered externally (e.g., Vercel Cron).
7. **PGlite local database** is suitable for development but production requires a managed PostgreSQL.
8. **AI features are unavailable** unless `AI_PROVIDER=nvidia` and `NVIDIA_NIM_API_KEY` are configured.
9. **Medicine ordering, doctor consultations, and ambulance dispatch** are unavailable unless their respective provider credentials are configured.
10. **Email and SMS delivery** are unavailable unless SMTP/Twilio credentials are configured.

---

## License

Baymax Care is an independent, original healthcare product. It is not affiliated with, endorsed by, or connected to Disney or the Big Hero 6 franchise. The Baymax-inspired character illustration is an original creation.
