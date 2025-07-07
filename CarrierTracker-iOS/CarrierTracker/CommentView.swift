import SwiftUI

struct CommentView: View {
    let comment: Comment
    let onReply: ((String) -> Void)?
    let onVote: ((String, Int) -> Void)?
    let showReplyButton: Bool
    let isReply: Bool
    
    @StateObject private var commentsService = CommentsService.shared
    @State private var isVoting = false
    @State private var localVote: Int
    @State private var localUpvotes: Int
    @State private var localDownvotes: Int
    
    init(comment: Comment, onReply: ((String) -> Void)? = nil, onVote: ((String, Int) -> Void)? = nil, showReplyButton: Bool = true, isReply: Bool = false) {
        self.comment = comment
        self.onReply = onReply
        self.onVote = onVote
        self.showReplyButton = showReplyButton
        self.isReply = isReply
        
        // Initialize local state
        _localVote = State(initialValue: comment.userVote)
        _localUpvotes = State(initialValue: comment.upvotes)
        _localDownvotes = State(initialValue: comment.downvotes)
    }
    
    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Pinned indicator
            if comment.isPinned {
                HStack {
                    Image(systemName: "pin.fill")
                        .foregroundColor(.blue)
                        .font(.caption)
                    
                    Text("Pinned Comment")
                        .font(.caption)
                        .fontWeight(.medium)
                        .foregroundColor(.blue)
                }
                .padding(.bottom, 8)
            }
            
            HStack(alignment: .top, spacing: 12) {
                // Avatar
                avatarView
                
                // Comment Content
                VStack(alignment: .leading, spacing: 8) {
                    // User info and metadata
                    userInfoView
                    
                    // Comment text
                    Text(comment.commentText)
                        .font(.body)
                        .foregroundColor(.primary)
                        .multilineTextAlignment(.leading)
                        .fixedSize(horizontal: false, vertical: true)
                    
                    // Actions
                    actionsView
                }
            }
        }
        .padding()
        .background(Color(UIColor.systemBackground))
        .cornerRadius(12)
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(isReply ? Color.gray.opacity(0.3) : Color.clear, lineWidth: 1)
        )
        .padding(.leading, isReply ? 32 : 0)
        .onAppear {
            // Sync local state when comment appears
            localVote = comment.userVote
            localUpvotes = comment.upvotes
            localDownvotes = comment.downvotes
        }
    }
    
    // MARK: - Avatar View
    private var avatarView: some View {
        Circle()
            .fill(badgeBackgroundColor.opacity(0.8))
            .frame(width: 36, height: 36)
            .overlay(
                Text(commentsService.formatUserName(comment.userEmail, comment.userType).prefix(1).uppercased())
                    .font(.subheadline)
                    .fontWeight(.bold)
                    .foregroundColor(.white)
            )
    }
    
    // MARK: - User Info View
    private var userInfoView: some View {
        HStack(spacing: 8) {
            // Username
            Text(commentsService.formatUserName(comment.userEmail, comment.userType))
                .font(.subheadline)
                .fontWeight(.medium)
                .foregroundColor(.primary)
            
            // Single user type indicator (emoji only)
            Text(comment.userType.emoji)
                .font(.caption)
            
            // Author badge (only if user is author)
            if comment.isAuthor {
                Text("You")
                    .font(.caption)
                    .fontWeight(.medium)
                    .foregroundColor(.blue)
                    .padding(.horizontal, 6)
                    .padding(.vertical, 2)
                    .background(Color.blue.opacity(0.1))
                    .cornerRadius(4)
            }
            
            Spacer()
            
            // Timestamp
            Text(commentsService.formatDate(comment.createdAt))
                .font(.caption)
                .foregroundColor(.secondary)
            
            // Edited indicator
            if comment.createdAt != comment.updatedAt {
                Text("• edited")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
        }
        .padding(.bottom, 4)
    }
    
    // MARK: - User Type Badge
    private var userTypeBadge: some View {
        HStack(spacing: 4) {
            Text(comment.userType.emoji)
                .font(.caption)
            
            Text(comment.userType.displayName)
                .font(.caption)
                .fontWeight(.medium)
        }
        .padding(.horizontal, 6)
        .padding(.vertical, 2)
        .background(badgeBackgroundColor)
        .foregroundColor(.white)
        .cornerRadius(4)
    }
    
    // MARK: - Reputation Badge
    private var reputationBadge: some View {
        let badge = ReputationHelper.getBadge(score: comment.userReputation)
        
        return Text(badge.text)
            .font(.caption)
            .fontWeight(.medium)
            .foregroundColor(.white)
            .padding(.horizontal, 6)
            .padding(.vertical, 2)
            .background(reputationBackgroundColor(badge.color))
            .cornerRadius(4)
    }
    
    // MARK: - Actions View
    private var actionsView: some View {
        HStack(spacing: 16) {
            // Voting
            votingView
            
            // Reply button
            if showReplyButton && !isReply && onReply != nil {
                Button(action: {
                    onReply?(comment.id)
                }) {
                    Text("Reply")
                        .font(.caption)
                        .foregroundColor(.blue)
                }
            }
            
            // Reply count for top-level comments
            if !isReply && comment.replyCount > 0 {
                Text("\(comment.replyCount) \(comment.replyCount == 1 ? "reply" : "replies")")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            
            Spacer()
        }
        .padding(.top, 4)
    }
    
    // MARK: - Voting View
    private var votingView: some View {
        HStack(spacing: 8) {
            // Upvote button
            Button(action: {
                Task {
                    await handleVote(1)
                }
            }) {
                Image(systemName: localVote == 1 ? "arrow.up.circle.fill" : "arrow.up.circle")
                    .foregroundColor(localVote == 1 ? .green : .secondary)
                    .font(.system(size: 16))
            }
            .disabled(isVoting)
            
            // Vote score
            Text("\(localUpvotes - localDownvotes)")
                .font(.caption)
                .fontWeight(.medium)
                .foregroundColor(netScoreColor)
            
            // Downvote button
            Button(action: {
                Task {
                    await handleVote(-1)
                }
            }) {
                Image(systemName: localVote == -1 ? "arrow.down.circle.fill" : "arrow.down.circle")
                    .foregroundColor(localVote == -1 ? .red : .secondary)
                    .font(.system(size: 16))
            }
            .disabled(isVoting)
        }
    }
    
    // MARK: - Computed Properties
    private var netScoreColor: Color {
        let netScore = localUpvotes - localDownvotes
        if netScore > 0 {
            return .green
        } else if netScore < 0 {
            return .red
        } else {
            return .secondary
        }
    }
    
    private var badgeBackgroundColor: Color {
        let colors = comment.userType.badgeColor
        switch colors.background {
        case "blue": return .blue
        case "green": return .green
        case "purple": return .purple
        case "orange": return .orange
        default: return .gray
        }
    }
    
    private func reputationBackgroundColor(_ color: String) -> Color {
        switch color {
        case "green": return .green
        case "blue": return .blue
        case "yellow": return .yellow
        default: return .gray
        }
    }
    
    // MARK: - Functions
    private func handleVote(_ voteType: Int) async {
        guard !isVoting else { return }
        
        isVoting = true
        
        // Calculate new vote (toggle if same, otherwise set new vote)
        let previousVote = localVote
        let newVote = localVote == voteType ? 0 : voteType
        
        // Calculate new vote counts optimistically
        var newUpvotes = localUpvotes
        var newDownvotes = localDownvotes
        
        // Remove previous vote if it existed
        if previousVote == 1 {
            newUpvotes = max(0, newUpvotes - 1)
        } else if previousVote == -1 {
            newDownvotes = max(0, newDownvotes - 1)
        }
        
        // Add new vote if not removing
        if newVote == 1 {
            newUpvotes += 1
        } else if newVote == -1 {
            newDownvotes += 1
        }
        
        // Apply optimistic updates
        localVote = newVote
        localUpvotes = newUpvotes
        localDownvotes = newDownvotes
        
        do {
            try await commentsService.voteOnComment(commentId: comment.id, voteValue: newVote)
            onVote?(comment.id, newVote)
        } catch {
            // Revert optimistic update on error
            localVote = previousVote
            localUpvotes = comment.upvotes
            localDownvotes = comment.downvotes
            print("Error voting on comment: \(error)")
        }
        
        isVoting = false
    }
}

#Preview("Comment View") {
    let sampleComment = Comment(
        id: "1",
        commentText: "This carrier has excellent service and always delivers on time. I've been working with them for over 2 years now.",
        userId: "user-123",
        userEmail: "driver@example.com",
        userReputation: 85,
        userType: .driver,
        parentCommentId: nil,
        replyCount: 3,
        upvotes: 12,
        downvotes: 2,
        isPinned: false,
        createdAt: Date(),
        updatedAt: Date(),
        isAuthor: false,
        userVote: 0
    )
    
    CommentView(
        comment: sampleComment,
        onReply: { commentId in
            print("Reply to \(commentId)")
        },
        onVote: { commentId, vote in
            print("Vote \(vote) on \(commentId)")
        }
    )
    .padding()
}

#Preview("Pinned Comment") {
    let pinnedComment = Comment(
        id: "2",
        commentText: "Important notice: This carrier has updated their insurance policy effective immediately.",
        userId: "user-456",
        userEmail: "admin@carriertracker.com",
        userReputation: 95,
        userType: .carrier,
        parentCommentId: nil,
        replyCount: 0,
        upvotes: 25,
        downvotes: 0,
        isPinned: true,
        createdAt: Date(),
        updatedAt: Date(),
        isAuthor: true,
        userVote: 1
    )
    
    CommentView(
        comment: pinnedComment,
        onReply: { commentId in
            print("Reply to \(commentId)")
        },
        onVote: { commentId, vote in
            print("Vote \(vote) on \(commentId)")
        }
    )
    .padding()
}

#Preview("Reply Comment") {
    let replyComment = Comment(
        id: "3",
        commentText: "Thanks for the update! Really helpful information.",
        userId: "user-789",
        userEmail: "broker@logistics.com",
        userReputation: 72,
        userType: .broker,
        parentCommentId: "2",
        replyCount: 0,
        upvotes: 5,
        downvotes: 0,
        isPinned: false,
        createdAt: Date(),
        updatedAt: Date(),
        isAuthor: false,
        userVote: 0
    )
    
    CommentView(
        comment: replyComment,
        showReplyButton: false,
        isReply: true
    )
    .padding()
}

#Preview("Dark Mode") {
    let sampleComment = Comment(
        id: "4",
        commentText: "Great rates and professional service. Highly recommend!",
        userId: "user-321",
        userEmail: "shipper@company.com",
        userReputation: 68,
        userType: .other,
        parentCommentId: nil,
        replyCount: 1,
        upvotes: 8,
        downvotes: 1,
        isPinned: false,
        createdAt: Date(),
        updatedAt: Date(),
        isAuthor: false,
        userVote: -1
    )
    
    CommentView(
        comment: sampleComment,
        onReply: { commentId in
            print("Reply to \(commentId)")
        },
        onVote: { commentId, vote in
            print("Vote \(vote) on \(commentId)")
        }
    )
    .padding()
    .preferredColorScheme(.dark)
} 