import Foundation
import Supabase

class ReviewsService: ObservableObject {
    static let shared = ReviewsService()
    private let supabase = SupabaseService.shared.client
    
    private init() {}
    
    // MARK: - Ratings & Reviews
    
    func getCarrierRatings(carrierId: String) async throws -> [CarrierRating] {
        let response: [CarrierRating] = try await supabase
            .from("carrier_ratings")
            .select("""
                *,
                user_email:profiles!user_id(email),
                user_type:profiles!user_id(user_type)
            """)
            .eq("carrier_id", value: carrierId)
            .order("created_at", ascending: false)
            .execute()
            .value
        
        return response
    }
    
    func getCarrierRatingSummary(carrierId: String) async throws -> (averageRating: Double, totalReviews: Int) {
        let ratings = try await getCarrierRatings(carrierId: carrierId)
        
        guard !ratings.isEmpty else {
            return (0.0, 0)
        }
        
        let total = ratings.reduce(0.0) { sum, rating in
            sum + rating.averageRating
        }
        
        let average = total / Double(ratings.count)
        return (average, ratings.count)
    }
    
    func submitCarrierRating(
        carrierId: String,
        overallRating: Int,
        paymentRating: Int? = nil,
        communicationRating: Int? = nil,
        reliabilityRating: Int? = nil,
        equipmentRating: Int? = nil,
        reviewText: String? = nil,
        workType: String? = nil,
        routeDetails: String? = nil
    ) async throws {
        var ratingData: [String: Any] = [
            "carrier_id": carrierId,
            "overall_rating": overallRating
        ]
        
        if let paymentRating = paymentRating { ratingData["payment_rating"] = paymentRating }
        if let communicationRating = communicationRating { ratingData["communication_rating"] = communicationRating }
        if let reliabilityRating = reliabilityRating { ratingData["reliability_rating"] = reliabilityRating }
        if let equipmentRating = equipmentRating { ratingData["equipment_rating"] = equipmentRating }
        if let reviewText = reviewText { ratingData["review_text"] = reviewText }
        if let workType = workType { ratingData["work_type"] = workType }
        if let routeDetails = routeDetails { ratingData["route_details"] = routeDetails }
        
        try await supabase
            .from("carrier_ratings")
            .upsert(ratingData)
            .execute()
    }
    
    // MARK: - Rate Submissions
    
    func getCarrierRates(carrierId: String) async throws -> [RateSubmission] {
        let response: [RateSubmission] = try await supabase
            .from("carrier_rate_submissions")
            .select("""
                *,
                user_email:profiles!submitted_by(email),
                user_type:profiles!submitted_by(user_type)
            """)
            .eq("carrier_id", value: carrierId)
            .order("created_at", ascending: false)
            .execute()
            .value
        
        return response
    }
    
    func submitRate(
        carrierId: String,
        ratePerMile: Double? = nil,
        totalRate: Double? = nil,
        routeFrom: String? = nil,
        routeTo: String? = nil,
        distanceMiles: Int? = nil,
        loadType: String? = nil,
        equipmentType: String? = nil,
        weightLbs: Int? = nil
    ) async throws {
        var rateData: [String: Any] = [
            "carrier_id": carrierId,
            "currency": "USD"
        ]
        
        if let ratePerMile = ratePerMile { rateData["rate_per_mile"] = ratePerMile }
        if let totalRate = totalRate { rateData["total_rate"] = totalRate }
        if let routeFrom = routeFrom { rateData["route_from"] = routeFrom }
        if let routeTo = routeTo { rateData["route_to"] = routeTo }
        if let distanceMiles = distanceMiles { rateData["distance_miles"] = distanceMiles }
        if let loadType = loadType { rateData["load_type"] = loadType }
        if let equipmentType = equipmentType { rateData["equipment_type"] = equipmentType }
        if let weightLbs = weightLbs { rateData["weight_lbs"] = weightLbs }
        
        try await supabase
            .from("carrier_rate_submissions")
            .insert(rateData)
            .execute()
    }
    
    // MARK: - Insurance Information
    
    func getCarrierInsurance(carrierId: String) async throws -> [InsuranceInfo] {
        let response: [InsuranceInfo] = try await supabase
            .from("carrier_insurance_info")
            .select("""
                *,
                submitter_email:profiles!submitted_by(email),
                submitter_type:profiles!submitted_by(user_type)
            """)
            .eq("carrier_id", value: carrierId)
            .eq("is_active", value: true)
            .order("confidence_score", ascending: false)
            .order("created_at", ascending: false)
            .execute()
            .value
        
        return response
    }
    
    func submitInsuranceInfo(
        carrierId: String,
        insuranceProvider: String? = nil,
        policyNumber: String? = nil,
        effectiveDate: Date? = nil,
        expirationDate: Date? = nil,
        coverageAmount: Int? = nil,
        cargoCoverageAmount: Int? = nil,
        liabilityCoverageAmount: Int? = nil
    ) async throws {
        var insuranceData: [String: Any] = [
            "carrier_id": carrierId,
            "source_type": "user",
            "confidence_score": 50
        ]
        
        if let insuranceProvider = insuranceProvider { insuranceData["insurance_provider"] = insuranceProvider }
        if let policyNumber = policyNumber { insuranceData["policy_number"] = policyNumber }
        if let effectiveDate = effectiveDate { insuranceData["effective_date"] = effectiveDate }
        if let expirationDate = expirationDate { insuranceData["expiration_date"] = expirationDate }
        if let coverageAmount = coverageAmount { insuranceData["coverage_amount"] = coverageAmount }
        if let cargoCoverageAmount = cargoCoverageAmount { insuranceData["cargo_coverage_amount"] = cargoCoverageAmount }
        if let liabilityCoverageAmount = liabilityCoverageAmount { insuranceData["liability_coverage_amount"] = liabilityCoverageAmount }
        
        try await supabase
            .from("carrier_insurance_info")
            .insert(insuranceData)
            .execute()
    }
}

// MARK: - Error Types
enum ReviewsError: Error, LocalizedError {
    case invalidRating
    case missingData
    case networkError
    case unauthorized
    
    var errorDescription: String? {
        switch self {
        case .invalidRating:
            return "Rating must be between 1 and 5"
        case .missingData:
            return "Required information is missing"
        case .networkError:
            return "Network connection error"
        case .unauthorized:
            return "You must be signed in to submit reviews"
        }
    }
} 