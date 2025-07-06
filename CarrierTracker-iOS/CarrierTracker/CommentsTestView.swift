import SwiftUI

struct CommentsTestView: View {
    @EnvironmentObject var authManager: AuthManager
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 20) {
                    // Test different comment types
                    
                    // Carrier General Comments
                    CommentThreadView(
                        targetType: .carrierGeneral,
                        targetId: "test-carrier-id",
                        title: "Test Carrier Discussion",
                        showCommentCount: true,
                        allowComments: true
                    )
                    
                    // Rate Submission Comments
                    CommentThreadView(
                        targetType: .rateSubmission,
                        targetId: "test-rate-id",
                        title: "Rate Discussion",
                        showCommentCount: true,
                        allowComments: true
                    )
                    
                    // Safety Concern Comments
                    CommentThreadView(
                        targetType: .safetyConcern,
                        targetId: "test-safety-id",
                        title: "Safety Concerns",
                        showCommentCount: true,
                        allowComments: true
                    )
                    
                    // Read-only comments (for testing)
                    CommentThreadView(
                        targetType: .insuranceInfo,
                        targetId: "test-insurance-id",
                        title: "Insurance Info (Read-only)",
                        showCommentCount: true,
                        allowComments: false
                    )
                }
                .padding()
            }
            .navigationTitle("Comments Test")
            .navigationBarTitleDisplayMode(.inline)
        }
    }
}

struct CommentsTestView_Previews: PreviewProvider {
    static var previews: some View {
        CommentsTestView()
            .environmentObject(AuthManager())
    }
} 