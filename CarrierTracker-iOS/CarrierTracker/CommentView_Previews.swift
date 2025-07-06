import SwiftUI

struct CommentView_Previews: PreviewProvider {
    static var previews: some View {
        let mockComment = Comment(
            id: "1",
            targetType: .carrier,
            targetId: "123",
            commentText: "This is a test comment for preview",
            createdAt: Date(),
            updatedAt: Date(),
            voteScore: 5,
            userVote: nil,
            parentCommentId: nil,
            userEmail: "test@example.com",
            userType: .carrier,
            replyCount: 2
        )
        
        CommentView(comment: mockComment)
            .previewLayout(.sizeThatFits)
            .padding()
    }
} 