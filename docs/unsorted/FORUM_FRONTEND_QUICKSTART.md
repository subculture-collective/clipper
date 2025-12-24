# Forum Frontend - Quick Start Guide

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ installed
- Backend API running on `http://localhost:8080`
- Frontend dependencies installed (`npm install`)

### Running the Forum
```bash
cd frontend
npm install
npm run dev
```

Visit `http://localhost:5173/forum` to see the forum.

## 📁 File Structure

```
frontend/src/
├── components/forum/        # Forum UI components
│   ├── ThreadCard.tsx       # Individual thread card
│   ├── ThreadList.tsx       # List of threads
│   ├── ForumSearch.tsx      # Search input
│   ├── ForumFilters.tsx     # Filter controls
│   ├── SortSelector.tsx     # Sort dropdown
│   ├── ReplyItem.tsx        # Single reply
│   ├── ReplyTree.tsx        # Nested replies
│   ├── ReplyComposer.tsx    # Reply form
│   └── ConfirmDialog.tsx    # Confirmation modal
├── pages/forum/             # Forum pages
│   ├── ForumIndex.tsx       # Main forum page
│   ├── ThreadDetail.tsx     # Thread view
│   └── CreateThread.tsx     # New thread form
├── lib/
│   └── forum-api.ts         # API client
├── types/
│   └── forum.ts             # TypeScript types
└── hooks/
    └── useIsMobile.ts       # Responsive hook
```

## 🔗 Routes

| Route | Component | Access |
|-------|-----------|--------|
| `/forum` | ForumIndex | Public |
| `/forum/threads/:id` | ThreadDetail | Public |
| `/forum/new` | CreateThread | Protected |

## 🎨 Key Components

### ThreadCard
Displays thread summary with title, preview, stats, and tags.
```tsx
<ThreadCard thread={threadData} />
```

### ThreadList
Manages list of threads with loading and empty states.
```tsx
<ThreadList threads={threads} loading={isLoading} />
```

### ReplyTree
Renders nested replies recursively up to 10 levels.
```tsx
<ReplyTree
  replies={replies}
  threadId={threadId}
  currentUserId={user?.id}
  onReply={handleReply}
  onEdit={handleEdit}
  onDelete={handleDelete}
/>
```

### ReplyComposer
Form for creating/editing replies with markdown support.
```tsx
<ReplyComposer
  onSubmit={handleSubmit}
  onCancel={handleCancel}
  placeholder="Write your reply..."
  submitLabel="Post Reply"
/>
```

## 🔧 API Usage

### List Threads
```typescript
import { forumApi } from '@/lib/forum-api';

const threads = await forumApi.listThreads({
  page: 1,
  limit: 20,
  sort: 'newest',
  game_id: 'optional-game-id',
  tags: ['help', 'discussion']
});
```

### Get Thread Detail
```typescript
const { thread, replies } = await forumApi.getThread(threadId);
```

### Create Thread
```typescript
const newThread = await forumApi.createThread({
  title: 'My Thread',
  content: 'Thread content here',
  tags: ['help', 'discussion']
});
```

### Create Reply
```typescript
const newReply = await forumApi.createReply(threadId, {
  content: 'My reply',
  parent_reply_id: 'optional-parent-id'
});
```

### Update Reply
```typescript
await forumApi.updateReply(replyId, {
  content: 'Updated content'
});
```

### Delete Reply
```typescript
await forumApi.deleteReply(replyId);
```

### Search
```typescript
const results = await forumApi.search({
  q: 'search query',
  page: 1,
  limit: 20
});
```

## 📱 React Query Usage

All API calls are wrapped with React Query for caching and state management:

```typescript
// In components
const { data, isLoading, error } = useQuery({
  queryKey: ['forum-threads', filters],
  queryFn: () => forumApi.listThreads(filters)
});

const mutation = useMutation({
  mutationFn: forumApi.createThread,
  onSuccess: (thread) => {
    // Invalidate and refetch
    queryClient.invalidateQueries({ queryKey: ['forum-threads'] });
    navigate(`/forum/threads/${thread.id}`);
  }
});
```

## 🎯 Common Tasks

### Add a New Filter
1. Update `ForumFilters.tsx` component
2. Add filter to `ForumFiltersType` in `types/forum.ts`
3. Update `forumApi.listThreads()` to handle new filter
4. Update URL parameter handling in `ForumIndex.tsx`

### Add a Sort Option
1. Update `ForumSort` type in `types/forum.ts`
2. Add option to `sortOptions` in `SortSelector.tsx`
3. Ensure backend supports the sort type

### Customize Thread Card
Edit `ThreadCard.tsx` to change layout or add fields.

### Add Custom Tag
Tags are user-defined. Pre-defined tags in filters can be modified in `ForumFilters.tsx`.

## 🧪 Testing

### Run All Tests
```bash
npm run test
```

### Run Forum Tests Only
```bash
npm run test -- src/components/forum
```

### Run Tests in Watch Mode
```bash
npm run test -- --watch
```

### Test Coverage
```bash
npm run test:coverage
```

## 🐛 Debugging

### Enable React Query Devtools
Already included in development mode. Check bottom-right corner of browser.

### Check API Calls
Open browser DevTools → Network tab → Filter by "forum"

### Debug State
Use React DevTools to inspect component state and props.

### Common Issues

**Issue**: "No threads found" on forum page
- Check if backend API is running
- Verify API_BASE_URL in `.env`
- Check browser console for API errors

**Issue**: Reply composer not appearing
- Verify user is authenticated
- Check if thread is locked
- Inspect component state in React DevTools

**Issue**: Markdown not rendering
- Ensure react-markdown and remark-gfm are installed
- Check browser console for errors
- Verify content is valid markdown

## 🔐 Authentication

Forum uses existing auth context:

```typescript
import { useAuth } from '@/context/AuthContext';

function MyComponent() {
  const { user, isAuthenticated } = useAuth();
  
  if (!isAuthenticated) {
    return <div>Please log in</div>;
  }
  
  return <div>Hello {user.username}</div>;
}
```

## 📝 Markdown Support

Supported markdown features:
- **Bold**, *italic*, ~~strikethrough~~
- Headers (h1-h6)
- Lists (ordered and unordered)
- Links
- Code blocks with syntax highlighting
- Blockquotes
- Tables (via remark-gfm)
- Task lists (via remark-gfm)

Example:
```markdown
# Heading
**Bold text**
- List item
[Link](https://example.com)
`code`
```

## 🎨 Styling

Uses Tailwind CSS. Common patterns:

```typescript
// Dark theme background
className="bg-gray-900"

// Borders
className="border border-gray-700"

// Text colors
className="text-white"        // Primary text
className="text-gray-400"     // Secondary text
className="text-gray-500"     // Tertiary text

// Buttons
className="bg-blue-600 hover:bg-blue-700"  // Primary
className="bg-gray-700 hover:bg-gray-600"  // Secondary
className="bg-red-600 hover:bg-red-700"    // Danger

// Responsive
className="hidden md:block"    // Hide on mobile
className="grid sm:grid-cols-2" // Responsive grid
```

## 📱 Mobile Optimization

Mobile features:
- Responsive layouts with Tailwind breakpoints
- Touch-friendly button sizes
- Drawer overlay for reply composer
- Stacked layouts on small screens
- `useIsMobile()` hook for conditional rendering

```typescript
import { useIsMobile } from '@/hooks/useIsMobile';

function MyComponent() {
  const isMobile = useIsMobile();
  
  return (
    <div>
      {isMobile ? <MobileView /> : <DesktopView />}
    </div>
  );
}
```

## 🚢 Deployment

### Build for Production
```bash
npm run build
```

Output in `dist/` directory.

### Environment Variables
Create `.env.production`:
```
VITE_API_BASE_URL=https://api.yoursite.com/api/v1
```

### Deploy to CDN
Upload `dist/` contents to CDN or static hosting.

## 📚 Additional Resources

- [React Query Docs](https://tanstack.com/query/latest)
- [React Router Docs](https://reactrouter.com)
- [Tailwind CSS Docs](https://tailwindcss.com)
- [React Markdown Docs](https://github.com/remarkjs/react-markdown)

## 💡 Tips & Best Practices

1. **Always invalidate queries** after mutations
2. **Use optimistic updates** for better UX
3. **Handle loading and error states** in UI
4. **Test mobile responsiveness** during development
5. **Add TypeScript types** for all props
6. **Write tests** for new components
7. **Follow existing component patterns**
8. **Use semantic HTML** for accessibility
9. **Add ARIA labels** where needed
10. **Keep components small and focused**

## 🤝 Contributing

When adding features:
1. Create feature branch
2. Write component with TypeScript
3. Add tests
4. Update documentation
5. Run tests and linting
6. Submit pull request

## 📞 Support

For issues or questions:
- Check documentation: `FORUM_FRONTEND_IMPLEMENTATION.md`
- Review architecture: `FORUM_FRONTEND_ARCHITECTURE.md`
- Search existing issues on GitHub
- Ask in team chat
