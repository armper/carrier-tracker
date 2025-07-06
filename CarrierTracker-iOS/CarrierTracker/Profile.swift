import Foundation

struct Profile: Codable {
    let id: String
    let email: String
    let fullName: String?
    let avatarUrl: String?
    let userType: UserType?
    let createdAt: Date
    let updatedAt: Date
    
    enum CodingKeys: String, CodingKey {
        case id
        case email
        case fullName = "full_name"
        case avatarUrl = "avatar_url"
        case userType = "user_type"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
}

enum UserType: String, Codable, CaseIterable {
    case driver = "driver"
    case carrier = "carrier"
    case broker = "broker"
    case other = "other"
}