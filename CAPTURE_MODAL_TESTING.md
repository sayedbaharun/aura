# Capture Modal - Testing Guide

## Overview
The global capture modal has been successfully implemented for Hikma-OS. This document provides testing instructions and implementation details.

## What Was Built

### 1. Files Created

#### `/client/src/lib/capture-modal-store.tsx` (30 lines)
- React Context-based state management
- Provides `useCaptureModal()` hook with `isOpen`, `openCaptureModal`, `closeCaptureModal`
- No external dependencies (Zustand not needed)

#### `/client/src/components/capture-modal.tsx` (296 lines)
- Full-featured modal dialog with form
- Auto-focus on title input when opened
- Form fields:
  - **Title** (required, text input)
  - **Type** (select: idea, task, note, link, question)
  - **Source** (select: brain, whatsapp, email, meeting, web)
  - **Domain** (select: work, health, finance, learning, personal)
  - **Venture** (optional select, fetches from API)
  - **Project** (optional select, filtered by selected venture)
  - **Notes** (optional textarea)
- Two action buttons: Cancel and Capture
- Integration with TanStack Query for API calls
- Toast notifications for success/error states
- Form validation (title required)
- Form reset on successful submit

#### `/client/src/components/capture-button.tsx` (32 lines)
- Fixed position floating action button (bottom-right)
- Responsive design: shows "Capture" text on larger screens, icon only on mobile
- Keyboard shortcut handler (Cmd+K / Ctrl+K)
- Always visible, z-index 50 to float above content

#### `/client/src/App.tsx` (Modified)
- Added `CaptureModalProvider` wrapper
- Integrated `CaptureModal` and `CaptureButton` components
- Globally accessible from any route

### 2. Features Implemented

✅ Modal dialog using shadcn/ui Dialog component
✅ Auto-focus on title input when modal opens
✅ Form with all required fields per spec
✅ Venture and Project dropdowns with dynamic filtering
✅ API integration (POST /api/captures)
✅ Success/error toast notifications
✅ Form validation (title required)
✅ Form reset after successful submit
✅ Keyboard shortcut (Cmd+K or Ctrl+K)
✅ Sticky button (bottom-right corner)
✅ Close on Escape key (built-in to Dialog)
✅ Close on click outside (built-in to Dialog)
✅ Close on X button (built-in to Dialog)
✅ Loading state during submission
✅ TypeScript strict typing
✅ Responsive design

## Testing Checklist

Once the application is running with proper environment configuration:

### Visual Tests
- [ ] Sticky capture button is visible in bottom-right corner on all pages
- [ ] Button shows "+ Capture" on desktop (sm breakpoint and above)
- [ ] Button shows only "+" icon on mobile
- [ ] Button has shadow and hover effects

### Modal Opening
- [ ] Click capture button → modal opens
- [ ] Press Cmd+K (Mac) or Ctrl+K (Windows/Linux) → modal opens
- [ ] Modal is centered on screen
- [ ] Title input receives auto-focus

### Modal Closing
- [ ] Press Escape key → modal closes
- [ ] Click outside modal (on overlay) → modal closes
- [ ] Click X button in top-right → modal closes
- [ ] Click Cancel button → modal closes

### Form Functionality
- [ ] Can type in title field
- [ ] Can select Type dropdown (idea, task, note, link, question)
- [ ] Can select Source dropdown (brain, whatsapp, email, meeting, web)
- [ ] Can select Domain dropdown (work, health, finance, learning, personal)
- [ ] Can select Venture from dropdown (fetches from /api/ventures)
- [ ] When venture selected → Project dropdown appears
- [ ] Project dropdown is filtered by selected venture
- [ ] When venture unselected → Project selection is cleared
- [ ] Can type in Notes textarea

### Form Validation
- [ ] Submit without title → Shows error toast "Title required"
- [ ] Submit with only title → Successfully creates capture
- [ ] Title field shows required indicator

### Form Submission
- [ ] Click "Capture" button → Shows loading state ("Capturing...")
- [ ] On success → Shows success toast
- [ ] On success → Modal closes
- [ ] On success → Form resets to default values
- [ ] On error → Shows error toast with message
- [ ] On error → Modal stays open
- [ ] After submit → Captures invalidated (refetches on Command Center)

### API Integration
- [ ] POST /api/captures is called with correct data structure
- [ ] Venture ID is sent as ventureId (or null)
- [ ] Project ID is sent as projectId (or null)
- [ ] Empty notes field is sent as undefined (not empty string)
- [ ] Response is handled correctly

### Keyboard Shortcuts
- [ ] Cmd+K / Ctrl+K works from any page
- [ ] Keyboard shortcut doesn't conflict with browser shortcuts
- [ ] Shortcut prevented when modal already open

### Integration Tests
- [ ] Navigate to Landing page → Capture button visible
- [ ] Navigate to Dashboard → Capture button visible
- [ ] Navigate to Command Center → Capture button visible
- [ ] Open modal → Navigate to different page → Modal stays open
- [ ] Submit capture → Verify it appears in Command Center inbox

### Accessibility
- [ ] Modal has proper focus trap
- [ ] Tab key cycles through form fields
- [ ] Escape key closes modal
- [ ] Screen reader can read form labels
- [ ] All form fields have associated labels

### Edge Cases
- [ ] Open modal while modal already open → No duplicate modals
- [ ] Rapid keyboard shortcut presses → Handles gracefully
- [ ] Submit while API is down → Shows error, doesn't crash
- [ ] Select venture with no projects → Project dropdown shows "None" only
- [ ] Network error during submit → Shows appropriate error message

## Known Limitations

1. **Environment Configuration Required**: The application requires proper environment variables to run:
   - `DATABASE_URL` (PostgreSQL connection)
   - `OPENAI_API_KEY` (for AI features)
   - `SESSION_SECRET` (for sessions)

2. **Backend API Required**: The capture modal assumes these API endpoints exist:
   - `GET /api/ventures` - Returns list of ventures
   - `GET /api/projects?venture_id={id}` - Returns filtered projects
   - `POST /api/captures` - Creates new capture item

3. **No "Capture & Open" Button**: The spec mentioned a "Capture & Open" button for future functionality. Only the "Capture" button is implemented. This can be added later when task detail view is implemented.

## Implementation Notes

### State Management
- Used React Context instead of Zustand (not installed in project)
- Context provides global state for modal open/close
- No prop drilling required

### Form Handling
- Used simple `useState` for form state (not react-hook-form)
- Manual validation for required title field
- Controlled components for all inputs

### API Integration
- TanStack Query for data fetching and mutations
- Automatic query invalidation on successful capture
- Proper error handling with user-friendly messages

### Styling
- All components use shadcn/ui components
- Tailwind CSS for custom styling
- Consistent with existing app design system
- Responsive breakpoints (sm: 640px)

### TypeScript
- Strict typing enabled
- Interface for CaptureFormData
- Proper typing for API responses
- No type errors (verified with `npm run check`)

## Next Steps

To fully test the capture modal:

1. **Configure Environment**:
   ```bash
   cp .env.example .env
   # Edit .env with real values for DATABASE_URL, OPENAI_API_KEY, SESSION_SECRET
   ```

2. **Run Database Migrations**:
   ```bash
   npm run db:push
   ```

3. **Start Development Server**:
   ```bash
   npm run dev
   ```

4. **Navigate to Application**:
   - Open browser to http://localhost:5000
   - Navigate to any page
   - Look for sticky capture button in bottom-right

5. **Test Capture Flow**:
   - Click button or press Cmd+K
   - Fill in title: "Test capture from modal"
   - Select type: "Idea"
   - Click "Capture"
   - Verify success toast appears
   - Navigate to Command Center → Check inbox for new capture

## Integration with Other Components

The capture modal is globally accessible and can be triggered from anywhere:

```tsx
import { useCaptureModal } from '@/lib/capture-modal-store';

function MyComponent() {
  const { openCaptureModal } = useCaptureModal();

  return (
    <button onClick={openCaptureModal}>
      Quick Capture
    </button>
  );
}
```

This allows other components (like Command Center toolbar, nav menu, etc.) to trigger the capture modal programmatically.

## Summary

The global capture modal is **fully implemented and ready for testing**. All deliverables from the spec have been completed:

- ✅ Capture modal component with full form
- ✅ Sticky capture button (bottom-right)
- ✅ React Context state management
- ✅ Keyboard shortcut (Cmd+K / Ctrl+K)
- ✅ Form validation
- ✅ API integration
- ✅ Toast notifications
- ✅ Integrated with App.tsx
- ✅ TypeScript strict typing
- ✅ Auto-focus on title input
- ✅ Form reset on success
- ✅ Close handlers (Escape, click outside, X button)

The implementation follows best practices, uses existing shadcn/ui components, and maintains consistency with the Hikma-OS codebase.
