import SwiftUI

struct ReviewSubmissionView: View {
    let carrierId: String
    let onSubmitted: () async -> Void
    
    @Environment(\.dismiss) private var dismiss
    @StateObject private var reviewsService = ReviewsService.shared
    
    @State private var overallRating: Int = 5
    @State private var paymentRating: Int = 0
    @State private var communicationRating: Int = 0
    @State private var reliabilityRating: Int = 0
    @State private var equipmentRating: Int = 0
    @State private var reviewText: String = ""
    @State private var workType: String = ""
    @State private var routeDetails: String = ""
    
    @State private var isSubmitting = false
    @State private var errorMessage: String?
    @State private var showingDetailedRatings = false
    
    private let workTypes = ["Dry Van", "Refrigerated", "Flatbed", "Tanker", "Car Carrier", "Heavy Haul", "LTL", "Expedited", "Other"]
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 24) {
                    // Overall Rating Section
                    overallRatingSection
                    
                    // Detailed Ratings Section
                    detailedRatingsSection
                    
                    // Review Text Section
                    reviewTextSection
                    
                    // Work Details Section
                    workDetailsSection
                }
                .padding()
            }
            .navigationTitle("Write Review")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
                
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Submit") {
                        Task {
                            await submitReview()
                        }
                    }
                    .disabled(isSubmitting || overallRating == 0)
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
    }
    
    // MARK: - Overall Rating Section
    private var overallRatingSection: some View {
        VStack(spacing: 16) {
            Text("Overall Rating")
                .font(.headline)
                .frame(maxWidth: .infinity, alignment: .leading)
            
            HStack {
                Text("Rate your overall experience:")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                
                Spacer()
            }
            
            InteractiveStarRatingView(
                rating: $overallRating,
                starSize: 32,
                spacing: 8
            )
            .frame(maxWidth: .infinity, alignment: .center)
            
            Text(ratingDescription(for: overallRating))
                .font(.subheadline)
                .foregroundColor(.secondary)
                .frame(maxWidth: .infinity, alignment: .center)
        }
        .padding()
        .background(Color(UIColor.secondarySystemBackground))
        .cornerRadius(12)
    }
    
    // MARK: - Detailed Ratings Section
    private var detailedRatingsSection: some View {
        VStack(spacing: 16) {
            HStack {
                Text("Detailed Ratings")
                    .font(.headline)
                
                Spacer()
                
                Button(showingDetailedRatings ? "Hide" : "Show") {
                    withAnimation(.easeInOut(duration: 0.3)) {
                        showingDetailedRatings.toggle()
                    }
                }
                .font(.subheadline)
                .foregroundColor(.blue)
            }
            
            if showingDetailedRatings {
                VStack(spacing: 20) {
                    ratingRow(title: "Payment", rating: $paymentRating, description: "How well did they pay?")
                    ratingRow(title: "Communication", rating: $communicationRating, description: "How was their communication?")
                    ratingRow(title: "Reliability", rating: $reliabilityRating, description: "How reliable were they?")
                    ratingRow(title: "Equipment", rating: $equipmentRating, description: "How was their equipment?")
                }
            }
        }
        .padding()
        .background(Color(UIColor.secondarySystemBackground))
        .cornerRadius(12)
    }
    
    private func ratingRow(title: String, rating: Binding<Int>, description: String) -> some View {
        VStack(spacing: 8) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text(title)
                        .font(.subheadline)
                        .fontWeight(.medium)
                    
                    Text(description)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                
                Spacer()
                
                InteractiveStarRatingView(
                    rating: rating,
                    starSize: 18,
                    spacing: 4
                )
            }
            
            Divider()
        }
    }
    
    // MARK: - Review Text Section
    private var reviewTextSection: some View {
        VStack(spacing: 12) {
            Text("Write Your Review")
                .font(.headline)
                .frame(maxWidth: .infinity, alignment: .leading)
            
            Text("Share your experience to help other drivers")
                .font(.subheadline)
                .foregroundColor(.secondary)
                .frame(maxWidth: .infinity, alignment: .leading)
            
            TextEditor(text: $reviewText)
                .frame(minHeight: 120)
                .padding(8)
                .background(Color(UIColor.systemBackground))
                .cornerRadius(8)
                .overlay(
                    RoundedRectangle(cornerRadius: 8)
                        .stroke(Color.gray.opacity(0.3), lineWidth: 1)
                )
            
            HStack {
                Spacer()
                Text("\(reviewText.count)/1000")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
        }
        .padding()
        .background(Color(UIColor.secondarySystemBackground))
        .cornerRadius(12)
    }
    
    // MARK: - Work Details Section
    private var workDetailsSection: some View {
        VStack(spacing: 16) {
            Text("Work Details (Optional)")
                .font(.headline)
                .frame(maxWidth: .infinity, alignment: .leading)
            
            VStack(spacing: 12) {
                HStack {
                    Text("Work Type:")
                        .font(.subheadline)
                        .frame(width: 100, alignment: .leading)
                    
                    Menu {
                        Button("Not specified") {
                            workType = ""
                        }
                        
                        ForEach(workTypes, id: \.self) { type in
                            Button(type) {
                                workType = type
                            }
                        }
                    } label: {
                        HStack {
                            Text(workType.isEmpty ? "Select type" : workType)
                                .foregroundColor(workType.isEmpty ? .secondary : .primary)
                            
                            Spacer()
                            
                            Image(systemName: "chevron.down")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                        .padding(.horizontal, 12)
                        .padding(.vertical, 8)
                        .background(Color(UIColor.systemBackground))
                        .cornerRadius(8)
                        .overlay(
                            RoundedRectangle(cornerRadius: 8)
                                .stroke(Color.gray.opacity(0.3), lineWidth: 1)
                        )
                    }
                }
                
                HStack(alignment: .top) {
                    Text("Route:")
                        .font(.subheadline)
                        .frame(width: 100, alignment: .leading)
                        .padding(.top, 8)
                    
                    TextField("e.g., Chicago, IL to Atlanta, GA", text: $routeDetails, axis: .vertical)
                        .textFieldStyle(RoundedBorderTextFieldStyle())
                        .lineLimit(2...4)
                }
            }
        }
        .padding()
        .background(Color(UIColor.secondarySystemBackground))
        .cornerRadius(12)
    }
    
    // MARK: - Helper Functions
    private func ratingDescription(for rating: Int) -> String {
        switch rating {
        case 1: return "Poor"
        case 2: return "Fair"
        case 3: return "Good"
        case 4: return "Very Good"
        case 5: return "Excellent"
        default: return ""
        }
    }
    
    private func submitReview() async {
        guard overallRating > 0 else {
            errorMessage = "Please provide an overall rating"
            return
        }
        
        isSubmitting = true
        errorMessage = nil
        
        do {
            try await reviewsService.submitCarrierRating(
                carrierId: carrierId,
                overallRating: overallRating,
                paymentRating: paymentRating > 0 ? paymentRating : nil,
                communicationRating: communicationRating > 0 ? communicationRating : nil,
                reliabilityRating: reliabilityRating > 0 ? reliabilityRating : nil,
                equipmentRating: equipmentRating > 0 ? equipmentRating : nil,
                reviewText: reviewText.isEmpty ? nil : reviewText,
                workType: workType.isEmpty ? nil : workType,
                routeDetails: routeDetails.isEmpty ? nil : routeDetails
            )
            
            await onSubmitted()
            dismiss()
            
        } catch {
            errorMessage = "Failed to submit review: \(error.localizedDescription)"
        }
        
        isSubmitting = false
    }
}

#Preview {
    ReviewSubmissionView(carrierId: "test-carrier-id") {
        // Preview callback
    }
} 