# Design Guidelines: WhatsApp AI Receptionist Booking System

## Design Approach

**Hybrid Strategy**: Professional healthcare SaaS aesthetic combining Linear's clarity with healthcare-appropriate trust signals.

**Rationale**: This utility-focused application requires functional excellence for the dashboard while the landing page needs to establish credibility and professionalism. Healthcare context demands trustworthy, clean design over flashy elements.

---

## Core Design Elements

### A. Color Palette

**Light Mode:**
- Primary: `217 91% 60%` (Professional blue - trust and healthcare)
- Secondary: `217 20% 95%` (Soft blue-gray for backgrounds)
- Accent: `142 76% 36%` (Confirmed status green)
- Destructive: `0 84% 60%` (Cancelled appointments)
- Warning: `38 92% 50%` (Pending status)
- Background: `0 0% 100%`
- Foreground: `222 47% 11%`
- Muted: `217 20% 96%`
- Border: `217 20% 89%`

**Dark Mode:**
- Primary: `217 91% 70%`
- Secondary: `217 20% 15%`
- Background: `222 47% 11%`
- Foreground: `210 40% 98%`
- Muted: `217 20% 20%`
- Border: `217 20% 25%`

### B. Typography

**Font Stack:**
- Primary: 'Inter' from Google Fonts (400, 500, 600 weights)
- Fallback: system-ui, -apple-system, sans-serif

**Hierarchy:**
- Hero Headlines: `text-5xl font-semibold tracking-tight` (60px)
- Page Titles: `text-3xl font-semibold` (30px)
- Section Headers: `text-2xl font-semibold` (24px)
- Card Titles: `text-lg font-medium` (18px)
- Body Text: `text-base` (16px)
- Captions/Metadata: `text-sm text-muted-foreground` (14px)
- Timestamps: `text-xs text-muted-foreground` (12px)

### C. Layout System

**Spacing Primitives**: Tailwind units of 2, 4, 6, 8, 12, 16, 20, 24

**Container Strategy:**
- Dashboard: `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8`
- Landing page content: `max-w-6xl mx-auto`
- Message thread: `max-w-4xl`
- Forms: `max-w-2xl`

**Vertical Rhythm:**
- Section spacing: `py-12 md:py-20`
- Card padding: `p-6`
- Component gaps: `gap-4 md:gap-6`

### D. Component Library

**Navigation:**
- Clean header with logo left, nav center/right, subtle border-b
- Dashboard tabs: Full-width Tabs component with underline indicator
- Tab padding: `px-6 py-3`

**Cards:**
- Background: `bg-card` with `shadow-card`
- Border radius: `rounded-lg`
- Padding: `p-6`
- Hover state for interactive cards: `hover:shadow-lg transition-shadow`

**Message Bubbles:**
- User messages: Right-aligned, `bg-primary text-primary-foreground rounded-2xl rounded-tr-sm max-w-[80%] p-4`
- AI messages: Left-aligned, `bg-secondary text-secondary-foreground rounded-2xl rounded-tl-sm max-w-[80%] p-4`
- Phone number badge: Small chip above message with Phone icon
- Timestamp: Below message, `text-xs opacity-70`
- Message spacing: `space-y-4`

**Appointment Cards:**
- Status badges: Small rounded pills with appropriate colors
  - Confirmed: `bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400`
  - Pending: `bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400`
  - Cancelled: `bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400`
- Layout: Grid with icon + label pairs, clear visual hierarchy

**Calendar:**
- Highlighted appointment dates: `bg-primary/20 font-semibold`
- Selected date: `bg-primary text-primary-foreground`
- Side panel: `border-l` with appointment list for selected day
- Use shadcn Calendar component styling

**Forms:**
- Label above input: `text-sm font-medium mb-2`
- Input fields: `h-10 rounded-md border` with focus ring
- Textareas: Minimum 3 rows for working hours, 4 rows for about
- Services input: Placeholder "Dental cleaning, Root canal, Whitening..."
- Submit button: Full-width on mobile, auto-width on desktop

**Buttons:**
- Primary CTA: `bg-primary text-primary-foreground h-11 px-8 rounded-md font-medium`
- Secondary: `variant="outline" h-10 px-6`
- Icon buttons: `h-9 w-9` with lucide-react icons size 18
- Copy button: Ghost variant with clipboard icon

**Icons:**
- Library: lucide-react exclusively
- Size: `className="h-5 w-5"` for UI icons, `h-4 w-4` for inline
- Message icons: Phone (user), Bot (AI), Calendar, Clock, MessageSquare

---

## Landing Page Structure

**Hero Section (100vh):**
- Two-column layout: 60/40 split
- Left: Headline + subheadline + CTA
- Right: Large hero image showing WhatsApp conversation mockup or AI assistant illustration
- Background: Subtle gradient from `bg-background` to `bg-secondary/30`
- Headline: "24/7 AI Receptionist for Your Clinic"
- Subheadline: "Never miss an appointment. Your intelligent WhatsApp assistant handles bookings while you focus on patients."
- Primary CTA: "View Dashboard" button linking to /dashboard

**Features Section:**
- Three-column grid (stack on mobile)
- Each feature card: Icon (72x72 circle with primary/10 background), title, description
- Features:
  1. 24/7 Availability (Clock icon) - "Always online to serve your patients"
  2. Smart Booking (Calendar icon) - "AI handles scheduling conflicts automatically"
  3. Instant Responses (MessageSquare icon) - "Answer common questions in seconds"
- Card styling: Hover lift effect, subtle shadow

**How It Works Section:**
- Numbered steps (1-3) in horizontal timeline
- Visual connectors between steps
- Icons: Phone → Bot → Calendar
- Background: Alternating bg-secondary/muted

**CTA Section:**
- Centered, gradient background
- Large headline: "Ready to automate your bookings?"
- Button: "Get Started" → /dashboard
- Padding: `py-20`

**Footer:**
- Single row: Logo left, "Powered by AI" center, link to dashboard right
- Minimal, `border-t py-8`

---

## Dashboard Layout

**Header:**
- Clinic name (from settings) as logo text
- Real-time indicator: Green dot + "Live" badge
- Height: `h-16` with `border-b`

**Tabs Navigation:**
- Three tabs: Messages, Appointments, Settings
- Active indicator: `border-b-2 border-primary`
- Icon + label for each tab

**Messages Tab:**
- ScrollArea height: `h-[600px]`
- Auto-scroll to bottom on new messages
- Loading skeleton while fetching
- Empty state: Bot icon + "No messages yet"
- Refresh indicator: Subtle pulse on new message

**Appointments Tab:**
- Toggle: Calendar view / List view (default Calendar)
- Calendar View:
  - Left: Calendar component (60% width)
  - Right: Appointment list for selected date (40% width)
  - Appointment cards: Compact with time, name, type, status
- List View:
  - Full-width scrollable grid
  - Cards with all details visible
  - Filter by status (optional pills at top)

**Settings Tab:**
- Two-column layout on desktop (stack on mobile)
- Left: Webhook info card with copy button
- Right: Clinic settings form
- Setup instructions: Accordion or collapsible section
- Save button: Sticky at bottom on mobile

---

## Interactive States

**Loading:**
- Skeleton screens for initial load
- Shimmer effect: `animate-pulse bg-muted`
- Spinner for actions: Primary color, 20px

**Empty States:**
- Large icon (80x80, opacity 20%)
- Headline + descriptive text
- CTA button if applicable

**Success/Error:**
- Toast notifications: Bottom-right, 5s duration
- Green checkmark for success, red X for errors

**Real-time Updates:**
- Subtle highlight animation on new message/appointment
- Border flash: `animate-pulse border-primary` for 2s

---

## Accessibility & Polish

- Focus rings: `focus-visible:ring-2 ring-primary ring-offset-2`
- Consistent dark mode across all inputs and components
- Minimum touch target: 44x44px
- Color contrast: WCAG AA compliant
- No distracting animations - functional transitions only (200-300ms)

---

## Images

**Hero Image (Landing Page):**
- Large, professional image showing a smartphone with WhatsApp interface displaying an AI conversation
- Alternative: Illustration of a friendly AI assistant character (Sarah) with chat bubbles
- Placement: Right side of hero section, 40% width
- Style: Modern, clean, with subtle shadow/glow effect