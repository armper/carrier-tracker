import SwiftUI

struct CommentThreadView: View {
    let targetType: CommentType
    let targetId: String
    let title: String
    let showCommentCount: Bool
    let allowComments: Bool
    
    @StateObject private var commentsService = CommentsService.shared
    @EnvironmentObject var authManager: AuthManager
    
    @State private var comments: [Comment] = []
    @State private var commentThreads: [CommentThread] = []
    @State private var isLoading = false
    @State private var error: String?
    @State private var newComment = ""
    @State private var replyingTo: String?
    @State private var replyText = ""
    @State private var isSubmitting = false
    @State private var refreshTrigger = 0
    
    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            // Header
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text(title)
                        .font(.headline)
                        .fontWeight(.semibold)
                    
                    if showCommentCount {
                        Text("\(comments.count) comment\(comments.count == 1 ? "" : "s")")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
                
                Spacer()
                
                Button(action: refreshComments) {
                    Image(systemName: "arrow.clockwise")
                        .foregroundColor(.blue)
                }
                .disabled(isLoading)
            }
            .padding(.horizontal)
            
            if isLoading {
                ProgressView("Loading comments...")
                    .frame(maxWidth: .infinity)
                    .padding()
            } else if let error = error {
                VStack(spacing: 8) {
                    Text("Error loading comments")
                        .font(.headline)
                        .foregroundColor(.red)
                    Text(error)
                        .font(.caption)
                        .foregroundColor(.secondary)
                    Button("Retry") {
                        refreshComments()
                    }
                    .foregroundColor(.blue)
                }
                .padding()
            } else if comments.isEmpty {
                VStack(spacing: 8) {
                    Image(systemName: "bubble.left")
                        .font(.title2)
                        .foregroundColor(.gray)
                    Text("No comments yet")
                        .font(.headline)
                        .foregroundColor(.gray)
                    if allowComments {
                        Text("Be the first to share your thoughts!")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
                .frame(maxWidth: .infinity)
                .padding()
            } else {
                // Comments List
                LazyVStack(alignment: .leading, spacing: 12) {
                    ForEach(commentThreads) { thread in
                        VStack(alignment: .leading, spacing: 8) {
                            // Parent Comment
                            CommentView(
                                comment: thread.parentComment,
                                onReply: { commentId in
                                    replyingTo = commentId
                                },
                                onVote: { commentId, voteValue in
                                    handleVote(commentId: commentId, voteValue: voteValue)
                                },
                                showReplyButton: allowComments && (thread.parentComment.parentCommentId == nil),
                                isReply: false
                            )
                            
                            // Replies
                            if !thread.replies.isEmpty {
                                VStack(alignment: .leading, spacing: 6) {
                                    ForEach(thread.replies) { reply in
                                        CommentView(
                                            comment: reply,
                                            onReply: nil, // No nested replies
                                            onVote: { commentId, vote in
                                                Task {
                                                    await voteOnComment(commentId: commentId, vote: vote)
                                                }
                                            },
                                            showReplyButton: false,
                                            isReply: true
                                        )
                                    }
                                }
                                .padding(.leading, 20)
                            }
                            
                            // Reply Form
                            if replyingTo == thread.parentComment.id {
                                VStack(alignment: .leading, spacing: 8) {
                                    Text("Reply to \(commentsService.formatUserName(thread.parentComment.userEmail, thread.parentComment.userType))")
                                        .font(.caption)
                                        .foregroundColor(.secondary)
                                    
                                    HStack {
                                        TextField("Write a reply...", text: $replyText)
                                            .textFieldStyle(RoundedBorderTextFieldStyle())
                                        
                                        Button("Post") {
                                            Task {
                                                await submitReply(to: thread.parentComment.id)
                                            }
                                        }
                                        .disabled(replyText.trimmingCharacters(in: .whitespacesAndNewlines).count < 3 || isSubmitting)
                                        
                                        Button("Cancel") {
                                            replyingTo = nil
                                            replyText = ""
                                        }
                                        .foregroundColor(.red)
                                    }
                                }
                                .padding(.leading, 20)
                                .padding(.vertical, 8)
                            }
                        }
                        .padding(.vertical, 4)
                    }
                }
                .padding(.horizontal)
            }
            
            // New Comment Form
            if allowComments && authManager.user != nil {
                VStack(alignment: .leading, spacing: 8) {
                    Text("Add a comment")
                        .font(.headline)
                    
                    VStack(spacing: 8) {
                        TextField("Share your thoughts...", text: $newComment, axis: .vertical)
                            .textFieldStyle(RoundedBorderTextFieldStyle())
                            .lineLimit(3...6)
                        
                        HStack {
                            Spacer()
                            Button("Post Comment") {
                                Task {
                                    await submitComment()
                                }
                            }
                            .disabled(newComment.trimmingCharacters(in: .whitespacesAndNewlines).count < 3 || isSubmitting)
                        }
                    }
                }
                .padding()
                .background(Color.gray.opacity(0.1))
                .cornerRadius(8)
                .padding(.horizontal)
            } else if allowComments && authManager.user == nil {
                VStack(spacing: 8) {
                    Text("Sign in to join the conversation")
                        .font(.headline)
                        .foregroundColor(.secondary)
                    // Add sign in button if needed
                }
                .frame(maxWidth: .infinity)
                .padding()
                .background(Color.gray.opacity(0.1))
                .cornerRadius(8)
                .padding(.horizontal)
            }
        }
        .task {
            await loadComments()
        }
        .onChange(of: refreshTrigger) { _ in
            Task {
                await loadComments()
            }
        }
    }
    
    // MARK: - Methods
    
    private func refreshComments() {
        refreshTrigger += 1
    }
    
    private func loadComments() async {
        isLoading = true
        error = nil
        
        do {
            let fetchedComments = try await commentsService.fetchComments(
                targetType: targetType,
                targetId: targetId
            )
            
            await MainActor.run {
                comments = fetchedComments
                commentThreads = commentsService.groupIntoThreads(comments: fetchedComments)
                isLoading = false
            }
        } catch {
            await MainActor.run {
                self.error = error.localizedDescription
                isLoading = false
            }
        }
    }
    
    private func submitComment() async {
        let trimmedComment = newComment.trimmingCharacters(in: .whitespacesAndNewlines)
        
        // Validation
        if trimmedComment.isEmpty {
            await MainActor.run {
                self.error = "Comment cannot be empty"
                isSubmitting = false
            }
            return
        }
        
        if trimmedComment.count < 3 {
            await MainActor.run {
                self.error = "Comment must be at least 3 characters long"
                isSubmitting = false
            }
            return
        }
        
        if trimmedComment.count > 2000 {
            await MainActor.run {
                self.error = "Comment must be less than 2000 characters"
                isSubmitting = false
            }
            return
        }
        
        // Check authentication
        guard authManager.user != nil else {
            await MainActor.run {
                self.error = "You must be logged in to comment"
                isSubmitting = false
            }
            return
        }
        
        isSubmitting = true
        
        do {
            let commentId = try await commentsService.createComment(
                targetType: targetType,
                targetId: targetId,
                commentText: trimmedComment
            )
            
            print("Created comment with ID: \(commentId)")
            
            await MainActor.run {
                newComment = ""
                isSubmitting = false
                error = nil
            }
            
            await loadComments() // Refresh comments
        } catch {
            await MainActor.run {
                self.error = "Failed to post comment: \(error.localizedDescription)"
                isSubmitting = false
            }
        }
    }
    
    private func submitReply(to parentCommentId: String) async {
        let trimmedReply = replyText.trimmingCharacters(in: .whitespacesAndNewlines)
        
        // Validation
        if trimmedReply.isEmpty {
            await MainActor.run {
                self.error = "Reply cannot be empty"
                isSubmitting = false
            }
            return
        }
        
        if trimmedReply.count < 3 {
            await MainActor.run {
                self.error = "Reply must be at least 3 characters long"
                isSubmitting = false
            }
            return
        }
        
        if trimmedReply.count > 2000 {
            await MainActor.run {
                self.error = "Reply must be less than 2000 characters"
                isSubmitting = false
            }
            return
        }
        
        // Check authentication
        guard authManager.user != nil else {
            await MainActor.run {
                self.error = "You must be logged in to reply"
                isSubmitting = false
            }
            return
        }
        
        isSubmitting = true
        
        do {
            let replyId = try await commentsService.createComment(
                targetType: targetType,
                targetId: targetId,
                commentText: trimmedReply,
                parentCommentId: parentCommentId
            )
            
            print("Created reply with ID: \(replyId)")
            
            await MainActor.run {
                replyText = ""
                replyingTo = nil
                isSubmitting = false
                error = nil
            }
            
            await loadComments() // Refresh comments
        } catch {
            await MainActor.run {
                self.error = "Failed to post reply: \(error.localizedDescription)"
                isSubmitting = false
            }
        }
    }
    
    private func voteOnComment(commentId: String, vote: Int) async {
        do {
            _ = try await commentsService.voteOnComment(commentId: commentId, voteValue: vote)
            await loadComments() // Refresh to show updated votes
        } catch {
            await MainActor.run {
                self.error = error.localizedDescription
            }
        }
    }
    
    private func handleVote(commentId: String, voteValue: Int) {
        // Implementation of handleVote method
    }
} 