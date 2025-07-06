import XCTest
@testable import CarrierTracker

class CommentsServiceTests: XCTestCase {
    var commentsService: CommentsService!
    
    override func setUp() {
        super.setUp()
        commentsService = CommentsService.shared
    }
    
    func testFormatUserName() {
        // Test with user type
        let result1 = commentsService.formatUserName("test@example.com", .carrier)
        XCTAssertEqual(result1, "🚛 test")
        
        // Test without user type
        let result2 = commentsService.formatUserName("test@example.com", nil)
        XCTAssertEqual(result2, "test")
        
        // Test with email without @
        let result3 = commentsService.formatUserName("testuser", .dispatcher)
        XCTAssertEqual(result3, "📋 testuser")
    }
    
    func testGroupIntoThreads() {
        let mockComments = [
            Comment(id: "1", targetType: .carrier, targetId: "123", commentText: "Parent comment", createdAt: Date(), updatedAt: Date(), voteScore: 0, userVote: nil, parentCommentId: nil, userEmail: "test@example.com", userType: .carrier, replyCount: 0),
            Comment(id: "2", targetType: .carrier, targetId: "123", commentText: "Reply", createdAt: Date(), updatedAt: Date(), voteScore: 0, userVote: nil, parentCommentId: "1", userEmail: "test2@example.com", userType: .dispatcher, replyCount: 0)
        ]
        
        let threads = commentsService.groupIntoThreads(comments: mockComments)
        XCTAssertEqual(threads.count, 1)
        XCTAssertEqual(threads[0].parentComment.id, "1")
        XCTAssertEqual(threads[0].replies.count, 1)
        XCTAssertEqual(threads[0].replies[0].id, "2")
    }
    
    func testFormatDate() {
        let now = Date()
        let oneMinuteAgo = now.addingTimeInterval(-60)
        let oneHourAgo = now.addingTimeInterval(-3600)
        let oneDayAgo = now.addingTimeInterval(-86400)
        
        XCTAssertEqual(commentsService.formatDate(oneMinuteAgo), "1m ago")
        XCTAssertEqual(commentsService.formatDate(oneHourAgo), "1h ago")
        XCTAssertEqual(commentsService.formatDate(oneDayAgo), "1d ago")
    }
} 