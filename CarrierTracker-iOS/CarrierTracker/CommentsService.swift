import Foundation
import Supabase

class CommentsService: ObservableObject {
    static let shared = CommentsService()
    private let supabase = SupabaseService.shared.client
    
    private init() {}
    
    // MARK: - Fetch Comments
    func fetchComments(targetType: CommentType, targetId: String, limit: Int = 50) async throws -> [Comment] {
        do {
            print("Fetching comments for targetType: \(targetType.rawValue), targetId: \(targetId)")
            
            let response = try await supabase
                .rpc("get_comments_for_target", params: [
                    "p_target_type": targetType.rawValue,
                    "p_target_id": targetId,
                    "p_limit": String(limit)
                ])
                .execute()
            
            print("Raw response data: \(String(data: response.data, encoding: .utf8) ?? "nil")")
            
            let decoder = JSONDecoder()
            
            // Set up date decoding strategy
            decoder.dateDecodingStrategy = .custom { decoder in
                let container = try decoder.singleValueContainer()
                let dateString = try container.decode(String.self)
                
                // Try PostgreSQL timestamp with timezone format
                let dateFormatter = DateFormatter()
                dateFormatter.dateFormat = "yyyy-MM-dd'T'HH:mm:ss.SSSSSSXXXXX"
                if let date = dateFormatter.date(from: dateString) {
                    return date
                }
                
                // Try ISO8601 format with fractional seconds
                let iso8601Formatter = ISO8601DateFormatter()
                iso8601Formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
                if let date = iso8601Formatter.date(from: dateString) {
                    return date
                }
                
                // Fallback to basic ISO8601
                iso8601Formatter.formatOptions = [.withInternetDateTime]
                if let date = iso8601Formatter.date(from: dateString) {
                    return date
                }
                
                throw DecodingError.dataCorruptedError(in: container, debugDescription: "Cannot decode date string \(dateString)")
            }
            
            let comments = try decoder.decode([Comment].self, from: response.data)
            print("Successfully decoded \(comments.count) comments")
            return comments
            
        } catch let decodingError as DecodingError {
            print("Decoding error: \(decodingError)")
            switch decodingError {
            case .dataCorrupted(let context):
                print("Data corrupted: \(context)")
            case .keyNotFound(let key, let context):
                print("Key '\(key)' not found: \(context)")
            case .typeMismatch(let type, let context):
                print("Type '\(type)' mismatch: \(context)")
            case .valueNotFound(let value, let context):
                print("Value '\(value)' not found: \(context)")
            @unknown default:
                print("Unknown decoding error")
            }
            throw CommentError.invalidResponse
        } catch {
            print("General error fetching comments: \(error)")
            throw CommentError.invalidResponse
        }
    }
    
    // MARK: - Group Comments into Threads
    func groupIntoThreads(comments: [Comment]) -> [CommentThread] {
        var threads: [CommentThread] = []
        var commentMap: [String: Comment] = [:]
        
        // Create a map for quick lookup
        for comment in comments {
            commentMap[comment.id] = comment
        }
        
        // Process top-level comments first
        let topLevelComments = comments.filter { $0.parentCommentId == nil || $0.parentCommentId?.isEmpty == true }
        
        for parentComment in topLevelComments {
            let replies = comments.filter { $0.parentCommentId == parentComment.id }
            let thread = CommentThread(id: parentComment.id, parentComment: parentComment, replies: replies)
            threads.append(thread)
        }
        
        return threads.sorted { $0.parentComment.createdAt > $1.parentComment.createdAt }
    }
    
    // MARK: - Create Comment
    func createComment(
        targetType: CommentType,
        targetId: String,
        commentText: String,
        parentCommentId: String? = nil
    ) async throws -> String {
        do {
            print("Creating comment for targetType: \(targetType.rawValue), targetId: \(targetId)")
            
            var params: [String: String] = [
                "p_target_type": targetType.rawValue,
                "p_target_id": targetId,
                "p_comment_text": commentText.trimmingCharacters(in: .whitespacesAndNewlines)
            ]
            
            if let parentCommentId = parentCommentId, !parentCommentId.isEmpty {
                params["p_parent_comment_id"] = parentCommentId
            }
            
            print("Create comment params: \(params)")
            
            let response = try await supabase
                .rpc("create_comment", params: params)
                .execute()
            
            print("Create comment response: \(String(data: response.data, encoding: .utf8) ?? "nil")")
            
            // The function returns a UUID string
            if let responseString = String(data: response.data, encoding: .utf8) {
                // Remove quotes if present
                let commentId = responseString.trimmingCharacters(in: CharacterSet(charactersIn: "\""))
                print("Successfully created comment with ID: \(commentId)")
                return commentId
            } else {
                throw CommentError.invalidResponse
            }
            
        } catch {
            print("Error creating comment: \(error)")
            throw CommentError.invalidResponse
        }
    }
    
    // MARK: - Vote on Comment
    func voteOnComment(commentId: String, voteValue: Int) async throws {
        do {
            print("Voting on comment: \(commentId) with value: \(voteValue)")
            
            let response = try await supabase
                .rpc("vote_on_comment", params: [
                    "p_comment_id": commentId,
                    "p_vote_type": String(voteValue)
                ])
                .execute()
            
            print("Vote response: \(String(data: response.data, encoding: .utf8) ?? "nil")")
            
        } catch {
            print("Error voting on comment: \(error)")
            throw CommentError.invalidResponse
        }
    }
    
    // MARK: - Global Comments Feed (Fallback to regular comments)
    func getGlobalCommentsFeed(limit: Int = 50) async throws -> [Comment] {
        // Since global comments feed doesn't exist, return empty array
        // The web app doesn't use this feature
        print("Global comments feed not implemented - returning empty array")
        return []
    }
    
    // MARK: - Format User Name
    func formatUserName(_ email: String, _ userType: UserType?) -> String {
        // Return clean username without emoji (emoji will be shown in badge)
        return email.components(separatedBy: "@").first ?? email
    }
    
    // MARK: - Format Date
    func formatDate(_ date: Date) -> String {
        let now = Date()
        let diffComponents = Calendar.current.dateComponents([.minute, .hour, .day], from: date, to: now)
        
        if let days = diffComponents.day, days > 0 {
            if days < 7 {
                return "\(days)d ago"
            } else {
                let formatter = DateFormatter()
                formatter.dateStyle = .medium
                return formatter.string(from: date)
            }
        } else if let hours = diffComponents.hour, hours > 0 {
            return "\(hours)h ago"
        } else if let minutes = diffComponents.minute, minutes > 0 {
            return "\(minutes)m ago"
        } else {
            return "Just now"
        }
    }
}

// MARK: - Comment Errors
enum CommentError: LocalizedError {
    case invalidResponse
    case authenticationRequired
    case commentTooShort
    case commentTooLong
    case parentCommentNotFound
    
    var errorDescription: String? {
        switch self {
        case .invalidResponse:
            return "Invalid response from server"
        case .authenticationRequired:
            return "You must be logged in to comment"
        case .commentTooShort:
            return "Comment must be at least 3 characters long"
        case .commentTooLong:
            return "Comment must be less than 2000 characters"
        case .parentCommentNotFound:
            return "Parent comment not found"
        }
    }
} 