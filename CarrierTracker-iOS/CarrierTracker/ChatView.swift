import SwiftUI

struct ChatView: View {
    @State private var globalComments: [Comment] = []
    @State private var isLoading = false
    @State private var selectedFilter: CommentFilter = .all
    @State private var searchText = ""
    @EnvironmentObject var authManager: AuthManager
    @StateObject private var commentsService = CommentsService.shared
    
    enum CommentFilter: String, CaseIterable {
        case all = "All"
        case rateSubmissions = "Rate Info"
        case insurance = "Insurance"
        case safety = "Safety"
        case general = "General"
        
        var commentType: CommentType? {
            switch self {
            case .all: return nil
            case .rateSubmissions: return .rateSubmission
            case .insurance: return .insuranceInfo
            case .safety: return .safetyConcern
            case .general: return .carrierGeneral
            }
        }
    }
    
    var filteredComments: [Comment] {
        var filtered = globalComments
        
        // Apply search filter
        if !searchText.isEmpty {
            filtered = filtered.filter { comment in
                comment.commentText.localizedCaseInsensitiveContains(searchText) ||
                comment.userEmail.localizedCaseInsensitiveContains(searchText)
            }
        }
        
        // Apply type filter
        if selectedFilter != .all {
            // This would need to be implemented based on your comment type system
            // For now, we'll show all comments
        }
        
        return filtered
    }
    
    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                // Filter Bar
                filterBar
                
                // Search Bar
                searchBar
                
                // Content
                if isLoading {
                    ProgressView("Loading global feed...")
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if filteredComments.isEmpty {
                    emptyStateView
                } else {
                    commentsList
                }
            }
            .navigationTitle("Global Feed")
            .task {
                await loadGlobalComments()
            }
            .refreshable {
                await loadGlobalComments()
            }
        }
    }
    
    // MARK: - Filter Bar
    private var filterBar: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 12) {
                ForEach(CommentFilter.allCases, id: \.self) { filter in
                    Button(action: {
                        selectedFilter = filter
                    }) {
                        Text(filter.rawValue)
                            .font(.subheadline)
                            .fontWeight(.medium)
                            .foregroundColor(selectedFilter == filter ? .white : .blue)
                            .padding(.horizontal, 16)
                            .padding(.vertical, 8)
                            .background(
                                RoundedRectangle(cornerRadius: 20)
                                    .fill(selectedFilter == filter ? Color.blue : Color.blue.opacity(0.1))
                            )
                    }
                }
            }
            .padding(.horizontal)
        }
        .padding(.vertical, 8)
    }
    
    // MARK: - Search Bar
    private var searchBar: some View {
        HStack {
            Image(systemName: "magnifyingglass")
                .foregroundColor(.secondary)
            
            TextField("Search comments...", text: $searchText)
                .textFieldStyle(RoundedBorderTextFieldStyle())
        }
        .padding(.horizontal)
        .padding(.bottom, 8)
    }
    
    // MARK: - Comments List
    private var commentsList: some View {
        List {
            ForEach(filteredComments) { comment in
                NavigationLink(destination: CarrierDetailView(carrierId: extractCarrierId(from: comment))) {
                    CommentView(
                        comment: comment,
                        onReply: { commentId in
                            // Handle reply action
                        },
                        onVote: { commentId, voteValue in
                            // Handle vote action
                        },
                        showReplyButton: false,
                        isReply: false
                    )
                }
                .listRowInsets(EdgeInsets(top: 8, leading: 16, bottom: 8, trailing: 16))
                .listRowSeparator(.hidden)
            }
        }
        .listStyle(PlainListStyle())
    }
    
    // MARK: - Empty State
    private var emptyStateView: some View {
        VStack(spacing: 20) {
            Image(systemName: "bubble.left.and.bubble.right")
                .font(.system(size: 60))
                .foregroundColor(.gray)
            
            Text("No Comments Yet")
                .font(.title2)
                .fontWeight(.semibold)
                .foregroundColor(.primary)
            
            Text("Be the first to start a conversation!\nComments from all carriers will appear here.")
                .font(.subheadline)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
                .lineLimit(nil)
            
            Button("Explore Carriers") {
                // Switch to carriers tab
            }
            .foregroundColor(.blue)
            .padding(.top, 8)
        }
        .padding()
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
    
    // MARK: - Functions
    private func loadGlobalComments() async {
        isLoading = true
        
        do {
            // Load recent comments from all carriers
            // This would use a global comments feed function
            globalComments = try await commentsService.getGlobalCommentsFeed(limit: 50)
        } catch {
            print("Error loading global comments: \(error)")
            globalComments = []
        }
        
        isLoading = false
    }
    
    private func extractCarrierId(from comment: Comment) -> String {
        // This would extract carrier ID from comment context
        // For now, return a placeholder
        return "carrier-id-placeholder"
    }
}

struct RecentCommentRowView: View {
    let comment: CarrierCommentWithProfile
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(comment.profile?.email ?? "Unknown User")
                    .font(.subheadline)
                    .fontWeight(.semibold)
                
                if let userType = comment.userType {
                    Text(userType.rawValue.capitalized)
                        .font(.caption)
                        .padding(4)
                        .background(Color.blue.opacity(0.2))
                        .cornerRadius(4)
                }
                
                Spacer()
                
                Text(comment.createdAt, style: .relative)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            
            Text(comment.content)
                .font(.body)
                .lineLimit(3)
            
            Text("on carrier: \(comment.carrierId)")
                .font(.caption)
                .foregroundColor(.blue)
        }
        .padding(.vertical, 4)
    }
}

#Preview("Chat View") {
    ChatView()
        .environmentObject(AuthManager())
}

#Preview("Dark Mode") {
    ChatView()
        .environmentObject(AuthManager())
        .preferredColorScheme(.dark)
}

#Preview("iPad") {
    ChatView()
        .environmentObject(AuthManager())
        .previewDevice("iPad Pro (12.9-inch) (6th generation)")
}