# Forum Frontend Architecture

## Component Hierarchy

```
App.tsx
│
├── /forum (ForumIndex)
│   ├── ForumSearch
│   ├── ForumFilters
│   ├── SortSelector
│   └── ThreadList
│       └── ThreadCard (multiple)
│
├── /forum/threads/:id (ThreadDetail)
│   ├── ThreadHeader
│   │   └── ReactMarkdown (thread content)
│   ├── ReplyComposer (root level)
│   └── ReplyTree
│       └── ReplyItem (recursive)
│           ├── Avatar
│           ├── ReactMarkdown (reply content)
│           ├── ConfirmDialog (delete confirmation)
│           └── ReplyTree (nested replies)
│
└── /forum/new (CreateThread)
    └── CreateThreadForm

## Data Flow

```
┌─────────────────┐
│   AuthContext   │  (User authentication state)
└────────┬────────┘
         │
         v
┌─────────────────┐
│  React Router   │  (Navigation & routing)
└────────┬────────┘
         │
         v
┌─────────────────┐
│  Forum Pages    │
└────────┬────────┘
         │
         v
┌─────────────────┐
│  React Query    │  (Data fetching & caching)
└────────┬────────┘
         │
         v
┌─────────────────┐
│   forum-api.ts  │  (API client)
└────────┬────────┘
         │
         v
┌─────────────────┐
│  Backend API    │  (/api/v1/forum/*)
└─────────────────┘
```

## State Management

### Page-Level State
- **ForumIndex**: filters, sort, search query
- **ThreadDetail**: replyingTo, showMobileComposer
- **CreateThread**: title, content, tags

### Server State (React Query)
- Thread lists (cached, invalidated on create)
- Thread detail with replies (cached, invalidated on reply/edit/delete)
- Optimistic updates for better UX

### Context State
- **AuthContext**: Current user, authentication status
- **ToastContext**: Success/error notifications

## Mobile Responsiveness

### Breakpoints (Tailwind)
- Mobile: < 768px
- Tablet: 768px - 1024px
- Desktop: > 1024px

### Mobile-Specific Features
- Reply composer drawer (modal overlay)
- Compact thread cards
- Stacked layouts
- Touch-optimized buttons

## Key User Flows

### View Threads
1. Navigate to `/forum`
2. See list of threads
3. Apply filters/sort (optional)
4. Search threads (optional)
5. Click thread to view details

### Create Thread
1. Click "Start Discussion" (authenticated)
2. Navigate to `/forum/new`
3. Enter title, content, tags
4. Submit form
5. Redirect to thread detail

### Reply to Thread
1. View thread detail
2. Click "Reply to Thread"
3. Enter reply content (markdown)
4. Submit reply
5. See new reply in tree

### Reply to Reply
1. View thread detail
2. Click "Reply" on specific reply
3. Enter nested reply content
4. Submit reply
5. See new nested reply

### Edit Reply
1. View own reply
2. Click "Edit"
3. Modify content
4. Save changes
5. See updated reply

### Delete Reply
1. View own reply
2. Click "Delete"
3. Confirm deletion
4. Reply marked as [deleted]

## API Integration

### Endpoints Used
```
GET    /api/v1/forum/threads              (list threads)
GET    /api/v1/forum/threads/:id          (get thread + replies)
POST   /api/v1/forum/threads              (create thread)
POST   /api/v1/forum/threads/:id/replies  (create reply)
PATCH  /api/v1/forum/replies/:id          (update reply)
DELETE /api/v1/forum/replies/:id          (delete reply)
GET    /api/v1/forum/search?q=query       (search)
```

### Request/Response Types
All defined in `frontend/src/types/forum.ts`

## Styling Approach

### Tailwind Classes
- Consistent color scheme: gray-900/800/700 for dark theme
- Blue accent colors for primary actions
- Red for destructive actions
- Rounded corners: rounded-lg
- Transitions for smooth interactions

### Responsive Utilities
- `sm:`, `md:`, `lg:` breakpoints
- Flex and grid layouts
- Conditional rendering based on viewport

## Performance Optimizations

1. **Lazy Loading**: Pages loaded on-demand
2. **React Query Caching**: Avoid redundant API calls
3. **Optimistic Updates**: Instant UI feedback
4. **Skeleton Loaders**: Show loading states
5. **Efficient Re-renders**: Proper React keys
6. **Code Splitting**: Route-based splitting

## Accessibility Features

1. **Semantic HTML**: Proper heading hierarchy
2. **Keyboard Navigation**: All interactive elements
3. **Focus Management**: Modal focus trapping
4. **ARIA Labels**: Screen reader support
5. **Color Contrast**: WCAG AA compliant
6. **Alt Text**: Images and avatars

## Testing Strategy

### Component Tests
- Rendering with different props
- User interactions (clicks, typing)
- State changes
- Conditional rendering
- Edge cases

### Integration Points
- API mocking with MSW
- React Router navigation
- Context providers
- React Query caching

## Security Considerations

1. **XSS Prevention**: react-markdown sanitizes content
2. **CSRF Protection**: Tokens handled by API client
3. **Authentication**: Protected routes & API endpoints
4. **Authorization**: Backend enforces permissions
5. **Input Validation**: Client & server-side
6. **Content Security**: Markdown parsing is safe

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
- Mobile browsers (iOS Safari 14+, Chrome Mobile)

## Dependencies

### Core
- react: ^19.2.0
- react-dom: ^19.2.0
- react-router-dom: ^7.9.5

### State Management
- @tanstack/react-query: ^5.90.6
- zustand: ^5.0.8

### UI
- tailwindcss: ^4.1.16
- lucide-react: ^0.556.0
- react-markdown: ^10.1.0
- remark-gfm: ^4.0.1

### Utils
- axios: ^1.13.2
- date-fns: ^4.1.0
- clsx: ^2.1.1

## Development Workflow

1. Create component in `components/forum/`
2. Add types to `types/forum.ts`
3. Write component tests
4. Run tests: `npm run test`
5. Check types: `npx tsc --noEmit`
6. Run linter: `npm run lint`
7. Build: `npm run build`

## Deployment Notes

### Environment Variables
- `VITE_API_BASE_URL`: Backend API URL

### Build Output
- Static files in `dist/`
- Lazy-loaded chunks for routes
- Source maps for debugging

### CDN Requirements
- Serve static assets
- Set proper cache headers
- Enable compression

## Monitoring & Analytics

### Metrics to Track
- Page load times (< 1s target)
- Search response times (< 500ms target)
- Thread engagement rates
- Mobile vs desktop usage
- Error rates

### Error Tracking
- Sentry integration (already in project)
- Error boundaries
- API error logging
- User feedback via toasts

## Maintenance Guidelines

### Adding New Features
1. Update types in `types/forum.ts`
2. Update API client in `lib/forum-api.ts`
3. Create/update components
4. Add tests
5. Update documentation

### Updating Styles
- Use existing Tailwind utilities
- Follow dark theme color scheme
- Test mobile responsiveness
- Verify accessibility

### Debugging Issues
1. Check browser console for errors
2. Verify API responses in Network tab
3. Check React Query devtools
4. Review Sentry error logs
5. Test with different viewport sizes
