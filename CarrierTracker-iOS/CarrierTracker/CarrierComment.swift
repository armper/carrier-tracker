import Foundation

// MARK: - Comment Types
enum CommentType: String, Codable, CaseIterable {
    case rateSubmission = "rate_submission"
    case insuranceInfo = "insurance_info"
    case carrierGeneral = "carrier_general"
    case safetyConcern = "safety_concern"
    case carrierRating = "carrier_rating"
}

// MARK: - Comment Model
struct Comment: Codable, Identifiable {
    let id: String
    let commentText: String
    let userId: String
    let userEmail: String
    let userReputation: Int
    let userType: UserType
    let parentCommentId: String?
    let replyCount: Int
    let upvotes: Int
    let downvotes: Int
    let isPinned: Bool
    let createdAt: Date
    let updatedAt: Date
    let isAuthor: Bool
    let userVote: Int // -1, 0, or 1
    
    enum CodingKeys: String, CodingKey {
        case id
        case commentText = "comment_text"
        case userId = "user_id"
        case userEmail = "user_email"
        case userReputation = "user_reputation"
        case userType = "user_type"
        case parentCommentId = "parent_comment_id"
        case replyCount = "reply_count"
        case upvotes
        case downvotes
        case isPinned = "is_pinned"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
        case isAuthor = "is_author"
        case userVote = "user_vote"
    }
}

// MARK: - User Type Extension
extension UserType {
    var displayName: String {
        switch self {
        case .driver:
            return "Driver"
        case .carrier:
            return "Carrier"
        case .broker:
            return "Broker"
        case .other:
            return "Member"
        }
    }
    
    var emoji: String {
        switch self {
        case .driver:
            return "🚛"
        case .carrier:
            return "🏢"
        case .broker:
            return "🤝"
        case .other:
            return "👤"
        }
    }
    
    var badgeColor: (background: String, text: String) {
        switch self {
        case .driver:
            return ("blue", "white")
        case .carrier:
            return ("green", "white")
        case .broker:
            return ("orange", "white")
        case .other:
            return ("gray", "white")
        }
    }
}

// MARK: - Reputation Helper
struct ReputationHelper {
    static func getBadge(score: Int) -> (text: String, color: String) {
        switch score {
        case 90...:
            return ("Expert", "green")
        case 75..<90:
            return ("Trusted", "blue")
        case 60..<75:
            return ("Active", "yellow")
        default:
            return ("New", "gray")
        }
    }
}

// MARK: - Comment Thread Model
struct CommentThread: Identifiable {
    let id: String
    let parentComment: Comment
    var replies: [Comment]
}

// MARK: - Vote Result Model
struct VoteResult: Codable {
    let success: Bool
    let userVote: Int?
    let upvotes: Int
    let downvotes: Int
    let message: String?
}

// MARK: - Legacy Support (keeping for backwards compatibility)
struct CarrierComment: Codable, Identifiable {
    let id: String
    let carrierId: String
    let userId: String
    let content: String
    let userType: UserType?
    let createdAt: Date
    let updatedAt: Date
    
    enum CodingKeys: String, CodingKey {
        case id
        case carrierId = "carrier_id"
        case userId = "user_id"
        case content
        case userType = "user_type"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
}

struct CarrierCommentWithProfile: Codable, Identifiable {
    let id: String
    let carrierId: String
    let userId: String
    let content: String
    let userType: UserType?
    let createdAt: Date
    let updatedAt: Date
    let profile: Profile?
    
    enum CodingKeys: String, CodingKey {
        case id
        case carrierId = "carrier_id"
        case userId = "user_id"
        case content
        case userType = "user_type"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
        case profile
    }
}