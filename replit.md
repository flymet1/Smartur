# Smartur - WhatsApp Reservation & Operations System

## Overview
Smartur is a modern reservation and operations management system developed with Node.js/TypeScript. It leverages Replit's built-in PostgreSQL database for reliability and scalability, and integrates Google Gemini AI for an intelligent response system.

**Key Capabilities:**
- **Activity Management**: Define tours/activities, set pricing and duration.
- **Capacity/Calendar Management**: Track availability and quotas based on date and time.
- **Reservation Management**: Handle reservations from web and WhatsApp.
- **WhatsApp Integration**: Messaging and AI responses via Twilio Webhook (mock).
- **Reporting**: Basic statistics.
- **Finance & Agency Management**: Manage activity costs, VAT calculation, agency payments, and reconciliation.
- **Partner Agency System**: Cross-tenant sharing workflow enabling data flow between agencies using invite codes. Supports partner invitation, connection requests, approval/rejection, "Smartur User" tagging in supplier forms, activity-level sharing control (`sharedWithPartners` toggle), and Partner Availability dashboard for viewing connected agencies' shared activities with date-range navigation.

## User Preferences
I want the agent to prioritize information in this exact order: Overview, User Preferences, System Architecture, External Dependencies.
Do not include any changelogs, update logs, or date-wise entries.
Focus on high-level features only, avoiding granular implementation details.
Consolidate redundant information, merging similar concepts and eliminating repetition.
Prioritize architectural decisions over implementation specifics.
External dependencies should focus on what's actually integrated.
**CRITICAL: Always notify user immediately when making database schema changes** - User deploys to Coolify separately and needs SQL commands to update their production database.

## System Architecture

**UI/UX Decisions:**
-   **Design System**: Shadcn/UI for components, Tailwind CSS for styling.
-   **Charting**: Recharts for data visualization.
-   **Calendar**: Advanced calendar features including drag-and-drop for reservations, holiday highlighting, capacity progress bars (color-coded), and right-click context menus for quick actions.
-   **Dynamic Views**: Monthly calendar view with package tour grouping and overflow dialogue, mini-calendar view with color-coded reservation cards.
-   **Theming**: Package tours are visually grouped with purple borders and a 'Package' icon.
-   **Responsiveness**: Mobile-friendly tracking page.

**Technical Implementations:**
-   **Frontend**: React.
-   **Backend**: Node.js, Express, Drizzle ORM, PostgreSQL.
-   **AI**: Google Gemini 1.5 Flash for natural language processing and intelligent responses.
-   **Database**: PostgreSQL for robust and scalable data storage.
-   **Encryption**: AES-256-GCM for secure storage of sensitive credentials (e.g., Gmail).
-   **Internationalization**: Two-way automatic responses with separate Turkish and English keywords and replies, supporting Turkish character normalization.
-   **Licensing & Subscription**: 4-tier licensing system (trial/basic/professional/enterprise) with activity, reservation, and daily message limits. Super Admin panel for dynamic plan management (pricing, features, limits). Subscription page for agencies to view and select plans. Database tables: `subscription_plans`, `subscriptions`, `subscription_payments`, `daily_message_usage` for tracking billing and usage. PayTR integration prepared (pending configuration). Daily message limits: Trial (50), Basic (200), Professional (1000), Enterprise (10000).
-   **Security**: Password change confirmation, token-based reservation tracking.
-   **Error Handling**: Retry mechanism with exponential backoff for AI calls, intelligent fallback responses, system logging, and debug snapshot generation.

**Feature Specifications:**
-   **AI Bot**:
    -   Accesses calendar/capacity information.
    -   Understands dynamic Turkish date expressions ("yarın", "5 şubat", "hafta sonu", "15.01").
    -   Recognizes holidays/festivals (e.g., "bayramda müsait misiniz?").
    -   Delivers predefined confirmation messages for activities/package tours.
    -   Provides reservation tracking links and guidance for changes/cancellations.
    -   Escalation system for complex issues, creating support requests for staff.
    -   Answers FAQs defined for activities and package tours.
    -   Automatic retry (3 attempts with exponential backoff) for AI failures.
    -   Intelligent fallback responses for price, availability, reservation, and cancellation queries if AI is unreachable.
    -   Supports automatic responses based on keyword matching to reduce AI calls and improve response times.
-   **Reservation System**:
    -   Integrated calendar for daily/weekly/monthly views, navigation, and new reservation creation.
    -   Activity occupancy rates with detailed tooltips and color-coding.
    -   Quick status change dropdowns for reservations.
    -   Dynamic time selection for customer requests based on activity default times.
    -   Order numbering for reservations, including WooCommerce integration and search functionality.
-   **Customer Interaction**:
    -   Customer tracking system with unique, token-based links for reservation status.
    -   Admin panel for managing customer requests (time changes, cancellations) with notification capabilities.
    -   WhatsApp notification feature for manual reservations and customer requests.
    -   Agent notification feature for customer requests.
-   **System Management**:
    -   User guide with detailed explanations of all functions.
    -   Sales presentation page with PDF export.
    -   Admin dashboard with key metrics, notifications, and quick links.
    -   System logs for AI errors, webhook issues, and system events, with PII masking.
    -   "Updates" panel showing system version, Git commit, uptime, and Node.js version, with update check functionality.

## External Dependencies
-   **Database**: PostgreSQL (Replit's built-in).
-   **AI**: Google Gemini 1.5 Flash.
-   **Messaging**: Twilio (for WhatsApp integration).
-   **Frontend Libraries**: React, Shadcn/UI, Tailwind CSS, Recharts.
-   **Backend Libraries**: Node.js, Express, Drizzle ORM.
-   **E-commerce**: WooCommerce (for order number integration).
-   **Email**: Gmail (for configuration and sending support emails).
-   **Version Control**: GitHub (for update checking).