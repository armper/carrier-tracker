import SwiftUI

struct CarrierReviewsView: View {
    let carrierId: String
    
    @StateObject private var reviewsService = ReviewsService.shared
    @EnvironmentObject var authManager: AuthManager
    
    @State private var ratings: [CarrierRating] = []
    @State private var averageRating: Double = 0.0
    @State private var totalReviews: Int = 0
    @State private var isLoading = false
    @State private var showingReviewForm = false
    @State private var errorMessage: String?
    
    var body: some View {
        ScrollView {
            LazyVStack(spacing: 16) {
                // Rating Summary Header
                ratingSummarySection
                
                // Write Review Button
                if authManager.isAuthenticated {
                    writeReviewButton
                }
                
                // Reviews List
                reviewsListSection
            }
            .padding()
        }
        .refreshable {
            await loadReviews()
        }
        .task {
            await loadReviews()
        }
        .sheet(isPresented: $showingReviewForm) {
            ReviewSubmissionView(carrierId: carrierId) {
                await loadReviews()
            }
        }
        .alert("Error", isPresented: .constant(errorMessage != nil)) {
            Button("OK") {
                errorMessage = nil
            }
        } message: {
            if let errorMessage = errorMessage {
                Text(errorMessage)
            }
        }
    }
    
    // MARK: - Rating Summary Section
    private var ratingSummarySection: some View {
        VStack(spacing: 16) {
            if totalReviews > 0 {
                RatingSummaryView(
                    averageRating: averageRating,
                    totalReviews: totalReviews
                )
            } else {
                emptyRatingsView
            }
            
            if !ratings.isEmpty {
                ratingBreakdownView
            }
        }
        .padding()
        .background(Color(UIColor.secondarySystemBackground))
        .cornerRadius(12)
    }
    
    private var emptyRatingsView: some View {
        VStack(spacing: 12) {
            Image(systemName: "star.circle")
                .font(.system(size: 40))
                .foregroundColor(.gray)
            
            Text("No Reviews Yet")
                .font(.headline)
                .foregroundColor(.primary)
            
            Text("Be the first to review this carrier")
                .font(.subheadline)
                .foregroundColor(.secondary)
        }
        .padding()
    }
    
    private var ratingBreakdownView: some View {
        let ratingsWithDetails = ratings.filter { $0.hasDetailedRatings }
        
        guard !ratingsWithDetails.isEmpty else {
            return AnyView(EmptyView())
        }
        
        return AnyView(
            VStack(alignment: .leading, spacing: 8) {
                Text("Rating Breakdown")
                    .font(.subheadline)
                    .fontWeight(.semibold)
                    .padding(.bottom, 4)
                
                RatingCategoryView(
                    title: "Payment",
                    rating: averageRatingFor(\.paymentRating)
                )
                
                RatingCategoryView(
                    title: "Communication",
                    rating: averageRatingFor(\.communicationRating)
                )
                
                RatingCategoryView(
                    title: "Reliability",
                    rating: averageRatingFor(\.reliabilityRating)
                )
                
                RatingCategoryView(
                    title: "Equipment",
                    rating: averageRatingFor(\.equipmentRating)
                )
            }
            .padding(.top)
        )
    }
    
    // MARK: - Write Review Button
    private var writeReviewButton: some View {
        Button(action: {
            showingReviewForm = true
        }) {
            HStack {
                Image(systemName: "star.fill")
                Text("Write a Review")
                    .fontWeight(.semibold)
            }
            .frame(maxWidth: .infinity)
            .padding()
            .background(Color.blue)
            .foregroundColor(.white)
            .cornerRadius(12)
        }
    }
    
    // MARK: - Reviews List Section
    private var reviewsListSection: some View {
        LazyVStack(spacing: 12) {
            if isLoading {
                ProgressView("Loading reviews...")
                    .frame(maxWidth: .infinity)
                    .padding()
            } else if ratings.isEmpty && totalReviews == 0 {
                EmptyView()
            } else {
                ForEach(ratings) { rating in
                    CarrierReviewRowView(rating: rating)
                        .padding()
                        .background(Color(UIColor.secondarySystemBackground))
                        .cornerRadius(12)
                }
            }
        }
    }
    
    // MARK: - Helper Functions
    private func loadReviews() async {
        isLoading = true
        errorMessage = nil
        
        do {
            ratings = try await reviewsService.getCarrierRatings(carrierId: carrierId)
            let summary = try await reviewsService.getCarrierRatingSummary(carrierId: carrierId)
            averageRating = summary.averageRating
            totalReviews = summary.totalReviews
        } catch {
            errorMessage = "Failed to load reviews: \(error.localizedDescription)"
        }
        
        isLoading = false
    }
    
    private func averageRatingFor(_ keyPath: KeyPath<CarrierRating, Int?>) -> Double {
        let validRatings = ratings.compactMap { $0[keyPath: keyPath] }
        guard !validRatings.isEmpty else { return 0.0 }
        
        let sum = validRatings.reduce(0, +)
        return Double(sum) / Double(validRatings.count)
    }
}

struct CarrierReviewRowView: View {
    let rating: CarrierRating
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Header with user info and overall rating
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    HStack {
                        Text(rating.displayUserName)
                            .font(.subheadline)
                            .fontWeight(.semibold)
                        
                        if let userType = rating.userType {
                            Text(userType.emoji)
                                .font(.caption)
                        }
                    }
                    
                    StarRatingView(rating: Double(rating.overallRating), starSize: 14)
                }
                
                Spacer()
                
                Text(rating.createdAt, style: .relative)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            
            // Review text
            if let reviewText = rating.reviewText, !reviewText.isEmpty {
                Text(reviewText)
                    .font(.body)
                    .lineLimit(nil)
            }
            
            // Detailed ratings
            if rating.hasDetailedRatings {
                VStack(spacing: 6) {
                    if let paymentRating = rating.paymentRating {
                        RatingCategoryView(title: "Payment", rating: Double(paymentRating), showNumeric: false)
                    }
                    if let communicationRating = rating.communicationRating {
                        RatingCategoryView(title: "Communication", rating: Double(communicationRating), showNumeric: false)
                    }
                    if let reliabilityRating = rating.reliabilityRating {
                        RatingCategoryView(title: "Reliability", rating: Double(reliabilityRating), showNumeric: false)
                    }
                    if let equipmentRating = rating.equipmentRating {
                        RatingCategoryView(title: "Equipment", rating: Double(equipmentRating), showNumeric: false)
                    }
                }
                .padding(.top, 4)
            }
            
            // Work details
            if let workType = rating.workType, !workType.isEmpty {
                HStack {
                    Text("Work Type:")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    Text(workType)
                        .font(.caption)
                        .fontWeight(.medium)
                }
            }
            
            if let routeDetails = rating.routeDetails, !routeDetails.isEmpty {
                HStack {
                    Text("Route:")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    Text(routeDetails)
                        .font(.caption)
                        .fontWeight(.medium)
                }
            }
        }
    }
}

#Preview {
    CarrierReviewsView(carrierId: "test-carrier-id")
        .environmentObject(AuthManager())
} 