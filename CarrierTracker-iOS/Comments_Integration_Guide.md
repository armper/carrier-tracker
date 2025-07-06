# Comments System Integration Guide for iOS

## Overview

The iOS app now includes a comprehensive comments system that matches the web version's functionality. This includes threaded comments, voting, user badges, and multiple comment types.

## Features

### 🧵 **Threaded Comments**
- Top-level comments with nested replies
- Maximum 2 levels of nesting (comment → reply)
- Reply counts displayed for parent comments

### 🗳️ **Voting System**
- Upvote/downvote functionality
- Real-time vote count updates
- Optimistic UI updates with error handling
- Vote toggling (click same vote to remove)

### 👥 **User Badges**
- **User Type Badges**: Driver 🚛, Carrier 🏢, Broker 🤝, Member 👤
- **Reputation Badges**: Expert (90+), Trusted (75+), Active (60+), New (<60)
- **Author Badge**: "You" indicator for own comments

### 📝 **Comment Types**
- `carrierGeneral` - General carrier discussions
- `rateSubmission` - Rate-related comments
- `insuranceInfo` - Insurance information comments
- `safetyConcern` - Safety-related discussions
- `carrierRating` - Carrier rating comments

## Implementation

### 1. Basic Usage

```swift
CommentThreadView(
    targetType: .carrierGeneral,
    targetId: carrier.id,
    title: "General Discussion",
    showCommentCount: true,
    allowComments: true
)
```

### 2. Required Dependencies

Ensure your view has access to:
- `AuthManager` (via `@EnvironmentObject`)
- Supabase client (configured in `SupabaseService`)

### 3. Database Functions

The system uses these Supabase functions:
- `get_comments_for_target()` - Fetch comments with user info
- `create_comment()` - Create new comments/replies
- `vote_on_comment()` - Handle voting

### 4. Authentication

- **Authenticated users**: Can post comments, replies, and vote
- **Unauthenticated users**: Can view comments, see login prompt

## Components

### CommentThreadView
Main container for comment discussions.

**Parameters:**
- `targetType`: Comment type enum
- `targetId`: UUID of the target entity
- `title`: Discussion title
- `showCommentCount`: Show comment count in header
- `allowComments`: Enable/disable commenting

### CommentView
Individual comment display with voting and user info.

**Features:**
- User avatar with initials
- User type and reputation badges
- Voting buttons with live counts
- Reply functionality
- Timestamp and edit indicators

### CommentsService
Handles all API interactions.

**Methods:**
- `fetchComments()` - Get comments for target
- `createComment()` - Post new comment/reply
- `voteOnComment()` - Submit vote
- `groupIntoThreads()` - Organize comments into threads

## Usage Examples

### Carrier Detail Page
```swift
CommentThreadView(
    targetType: .carrierGeneral,
    targetId: carrier.id,
    title: "General Discussion",
    showCommentCount: true,
    allowComments: true
)
```

### Rate Submission Comments
```swift
CommentThreadView(
    targetType: .rateSubmission,
    targetId: submission.id,
    title: "Rate Discussion",
    showCommentCount: true,
    allowComments: true
)
```

### Read-Only Comments
```swift
CommentThreadView(
    targetType: .insuranceInfo,
    targetId: insurance.id,
    title: "Insurance Information",
    showCommentCount: true,
    allowComments: false
)
```

## Error Handling

The system includes comprehensive error handling:
- Network errors
- Authentication failures
- Validation errors (comment length, etc.)
- Database constraint violations

Errors are displayed to users with appropriate messaging.

## Security

- Row Level Security (RLS) enforced at database level
- User authentication verified server-side
- Comment ownership validated for updates/deletes
- Vote manipulation prevented

## Performance

- Optimistic UI updates for better UX
- Efficient comment threading
- Lazy loading of comment lists
- Proper state management

## Testing

Use `CommentsTestView` to test different comment types and scenarios:
- Multiple comment types
- Authentication states
- Read-only vs editable comments
- Error scenarios

## Migration from Simple Comments

If you have existing simple comment implementations:

1. Replace `CommentRowView` with `CommentThreadView`
2. Update API calls to use `CommentsService`
3. Update data models to use new `Comment` struct
4. Add authentication checks

## Future Enhancements

Potential improvements:
- Real-time updates via WebSocket
- Comment editing functionality
- Moderation tools
- Notification system
- Comment search/filtering

---

This system provides a robust, scalable commenting solution that matches the web version's functionality while maintaining native iOS UX patterns. 