import Foundation

// MARK: - Carrier Rating Model
struct CarrierRating: Codable, Identifiable {
    let id: String
    let carrierId: String
    let userId: String
    let overallRating: Int
    let paymentRating: Int?
    let communicationRating: Int?
    let reliabilityRating: Int?
    let equipmentRating: Int?
    let reviewText: String?
    let workType: String?
    let routeDetails: String?
    let createdAt: Date
    
    // User profile information (joined)
    let userEmail: String?
    let userType: UserType?
    
    enum CodingKeys: String, CodingKey {
        case id
        case carrierId = "carrier_id"
        case userId = "user_id"
        case overallRating = "overall_rating"
        case paymentRating = "payment_rating"
        case communicationRating = "communication_rating"
        case reliabilityRating = "reliability_rating"
        case equipmentRating = "equipment_rating"
        case reviewText = "review_text"
        case workType = "work_type"
        case routeDetails = "route_details"
        case createdAt = "created_at"
        case userEmail = "user_email"
        case userType = "user_type"
    }
    
    // Helper computed properties
    var averageRating: Double {
        let ratings = [paymentRating, communicationRating, reliabilityRating, equipmentRating].compactMap { $0 }
        guard !ratings.isEmpty else { return Double(overallRating) }
        
        let sum = ratings.reduce(overallRating, +)
        return Double(sum) / Double(ratings.count + 1)
    }
    
    var hasDetailedRatings: Bool {
        return paymentRating != nil || communicationRating != nil || 
               reliabilityRating != nil || equipmentRating != nil
    }
    
    var displayUserName: String {
        guard let email = userEmail else { return "Anonymous" }
        let username = email.components(separatedBy: "@").first ?? email
        return username
    }
}

// MARK: - Rate Submission Model
struct RateSubmission: Codable, Identifiable {
    let id: String
    let carrierId: String
    let submittedBy: String
    let ratePerMile: Double?
    let totalRate: Double?
    let currency: String
    let routeFrom: String?
    let routeTo: String?
    let distanceMiles: Int?
    let loadType: String?
    let equipmentType: String?
    let weightLbs: Int?
    let submissionDate: Date
    let isVerified: Bool
    let verificationCount: Int
    let createdAt: Date
    
    // User profile information (joined)
    let userEmail: String?
    let userType: UserType?
    
    enum CodingKeys: String, CodingKey {
        case id
        case carrierId = "carrier_id"
        case submittedBy = "submitted_by"
        case ratePerMile = "rate_per_mile"
        case totalRate = "total_rate"
        case currency
        case routeFrom = "route_from"
        case routeTo = "route_to"
        case distanceMiles = "distance_miles"
        case loadType = "load_type"
        case equipmentType = "equipment_type"
        case weightLbs = "weight_lbs"
        case submissionDate = "submission_date"
        case isVerified = "is_verified"
        case verificationCount = "verification_count"
        case createdAt = "created_at"
        case userEmail = "user_email"
        case userType = "user_type"
    }
    
    var displayUserName: String {
        guard let email = userEmail else { return "Anonymous" }
        let username = email.components(separatedBy: "@").first ?? email
        return username
    }
    
    var routeDescription: String {
        if let from = routeFrom, let to = routeTo {
            return "\(from) → \(to)"
        } else if let from = routeFrom {
            return "From \(from)"
        } else if let to = routeTo {
            return "To \(to)"
        }
        return "Route not specified"
    }
    
    var formattedRate: String {
        if let ratePerMile = ratePerMile {
            return String(format: "$%.2f/mile", ratePerMile)
        } else if let totalRate = totalRate {
            return String(format: "$%.2f total", totalRate)
        }
        return "Rate not specified"
    }
}

// MARK: - Insurance Information Model
struct InsuranceInfo: Codable, Identifiable {
    let id: String
    let carrierId: String
    let insuranceProvider: String?
    let policyNumber: String?
    let effectiveDate: Date?
    let expirationDate: Date?
    let coverageAmount: Int?
    let cargoCoverageAmount: Int?
    let liabilityCoverageAmount: Int?
    let isActive: Bool
    let confidenceScore: Int
    let sourceType: String
    let submittedBy: String?
    let verifiedBy: String?
    let createdAt: Date
    
    // User profile information (joined)
    let submitterEmail: String?
    let submitterType: UserType?
    
    enum CodingKeys: String, CodingKey {
        case id
        case carrierId = "carrier_id"
        case insuranceProvider = "insurance_provider"
        case policyNumber = "policy_number"
        case effectiveDate = "effective_date"
        case expirationDate = "expiration_date"
        case coverageAmount = "coverage_amount"
        case cargoCoverageAmount = "cargo_coverage_amount"
        case liabilityCoverageAmount = "liability_coverage_amount"
        case isActive = "is_active"
        case confidenceScore = "confidence_score"
        case sourceType = "source_type"
        case submittedBy = "submitted_by"
        case verifiedBy = "verified_by"
        case createdAt = "created_at"
        case submitterEmail = "submitter_email"
        case submitterType = "submitter_type"
    }
    
    var displaySubmitterName: String {
        guard let email = submitterEmail else { return "System" }
        let username = email.components(separatedBy: "@").first ?? email
        return username
    }
    
    var isExpired: Bool {
        guard let expirationDate = expirationDate else { return false }
        return expirationDate < Date()
    }
    
    var statusText: String {
        if !isActive {
            return "Inactive"
        } else if isExpired {
            return "Expired"
        } else {
            return "Active"
        }
    }
    
    var statusColor: String {
        switch statusText {
        case "Active": return "green"
        case "Expired": return "red"
        case "Inactive": return "gray"
        default: return "gray"
        }
    }
} 