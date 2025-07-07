import SwiftUI

struct CarrierRatesView: View {
    let carrierId: String
    
    @StateObject private var reviewsService = ReviewsService.shared
    @EnvironmentObject var authManager: AuthManager
    
    @State private var rateSubmissions: [RateSubmission] = []
    @State private var isLoading = false
    @State private var showingRateForm = false
    @State private var errorMessage: String?
    
    var body: some View {
        ScrollView {
            LazyVStack(spacing: 16) {
                // Header with submit button
                headerSection
                
                // Rate statistics
                if !rateSubmissions.isEmpty {
                    rateStatisticsSection
                }
                
                // Rate submissions list
                rateSubmissionsSection
            }
            .padding()
        }
        .refreshable {
            await loadRates()
        }
        .task {
            await loadRates()
        }
        .sheet(isPresented: $showingRateForm) {
            RateSubmissionFormView(carrierId: carrierId) {
                await loadRates()
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
    
    // MARK: - Header Section
    private var headerSection: some View {
        VStack(spacing: 12) {
            HStack {
                VStack(alignment: .leading) {
                    Text("Rate Information")
                        .font(.title2)
                        .fontWeight(.bold)
                    
                    Text("Shared by the community")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
                
                Spacer()
            }
            
            if authManager.isAuthenticated {
                Button(action: {
                    showingRateForm = true
                }) {
                    HStack {
                        Image(systemName: "plus.circle.fill")
                        Text("Submit Rate")
                            .fontWeight(.semibold)
                    }
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color.blue)
                    .foregroundColor(.white)
                    .cornerRadius(12)
                }
            }
        }
    }
    
    // MARK: - Rate Statistics Section
    private var rateStatisticsSection: some View {
        VStack(spacing: 12) {
            Text("Rate Summary")
                .font(.headline)
                .frame(maxWidth: .infinity, alignment: .leading)
            
            LazyVGrid(columns: [
                GridItem(.flexible()),
                GridItem(.flexible()),
                GridItem(.flexible())
            ], spacing: 12) {
                StatCard(
                    title: "Submissions",
                    value: "\(rateSubmissions.count)",
                    icon: "doc.text.fill",
                    color: .blue
                )
                
                StatCard(
                    title: "Avg Rate/Mile",
                    value: averageRatePerMile,
                    icon: "dollarsign.circle.fill",
                    color: .green
                )
                
                StatCard(
                    title: "Verified",
                    value: "\(verifiedSubmissions)",
                    icon: "checkmark.shield.fill",
                    color: .orange
                )
            }
        }
        .padding()
        .background(Color(UIColor.secondarySystemBackground))
        .cornerRadius(12)
    }
    
    // MARK: - Rate Submissions Section
    private var rateSubmissionsSection: some View {
        LazyVStack(spacing: 12) {
            if isLoading {
                ProgressView("Loading rates...")
                    .frame(maxWidth: .infinity)
                    .padding()
            } else if rateSubmissions.isEmpty {
                emptyStateView
            } else {
                ForEach(rateSubmissions) { submission in
                    RateSubmissionRowView(submission: submission)
                        .padding()
                        .background(Color(UIColor.secondarySystemBackground))
                        .cornerRadius(12)
                }
            }
        }
    }
    
    private var emptyStateView: some View {
        VStack(spacing: 16) {
            Image(systemName: "dollarsign.circle")
                .font(.system(size: 50))
                .foregroundColor(.gray)
            
            Text("No Rate Submissions")
                .font(.headline)
                .foregroundColor(.primary)
            
            Text("Be the first to share rate information for this carrier")
                .font(.subheadline)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
        }
        .padding()
        .frame(maxWidth: .infinity)
    }
    
    // MARK: - Computed Properties
    private var averageRatePerMile: String {
        let ratesPerMile = rateSubmissions.compactMap { $0.ratePerMile }
        guard !ratesPerMile.isEmpty else { return "N/A" }
        
        let average = ratesPerMile.reduce(0, +) / Double(ratesPerMile.count)
        return String(format: "$%.2f", average)
    }
    
    private var verifiedSubmissions: Int {
        rateSubmissions.filter { $0.isVerified }.count
    }
    
    // MARK: - Helper Functions
    private func loadRates() async {
        isLoading = true
        errorMessage = nil
        
        do {
            rateSubmissions = try await reviewsService.getCarrierRates(carrierId: carrierId)
        } catch {
            errorMessage = "Failed to load rates: \(error.localizedDescription)"
        }
        
        isLoading = false
    }
}

struct RateSubmissionRowView: View {
    let submission: RateSubmission
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Header with user and verification status
            HStack {
                HStack {
                    Text(submission.displayUserName)
                        .font(.subheadline)
                        .fontWeight(.semibold)
                    
                    if let userType = submission.userType {
                        Text(userType.emoji)
                            .font(.caption)
                    }
                }
                
                Spacer()
                
                if submission.isVerified {
                    HStack(spacing: 4) {
                        Image(systemName: "checkmark.shield.fill")
                            .font(.caption)
                            .foregroundColor(.green)
                        Text("Verified")
                            .font(.caption)
                            .foregroundColor(.green)
                    }
                }
                
                Text(submission.createdAt, style: .relative)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            
            // Rate information
            VStack(alignment: .leading, spacing: 8) {
                HStack {
                    Text("Rate:")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                    
                    Text(submission.formattedRate)
                        .font(.subheadline)
                        .fontWeight(.semibold)
                        .foregroundColor(.primary)
                    
                    Spacer()
                }
                
                if !submission.routeDescription.contains("not specified") {
                    HStack {
                        Text("Route:")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                        
                        Text(submission.routeDescription)
                            .font(.subheadline)
                            .foregroundColor(.primary)
                        
                        Spacer()
                    }
                }
            }
            
            // Additional details
            LazyVGrid(columns: [
                GridItem(.flexible()),
                GridItem(.flexible())
            ], spacing: 8) {
                if let loadType = submission.loadType {
                    DetailItem(label: "Load Type", value: loadType)
                }
                
                if let equipmentType = submission.equipmentType {
                    DetailItem(label: "Equipment", value: equipmentType)
                }
                
                if let distance = submission.distanceMiles {
                    DetailItem(label: "Distance", value: "\(distance) miles")
                }
                
                if let weight = submission.weightLbs {
                    DetailItem(label: "Weight", value: "\(weight) lbs")
                }
            }
        }
    }
}

struct StatCard: View {
    let title: String
    let value: String
    let icon: String
    let color: Color
    
    var body: some View {
        VStack(spacing: 8) {
            Image(systemName: icon)
                .font(.title2)
                .foregroundColor(color)
            
            Text(value)
                .font(.headline)
                .fontWeight(.bold)
                .foregroundColor(.primary)
            
            Text(title)
                .font(.caption)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
        }
        .padding()
        .background(Color(UIColor.systemBackground))
        .cornerRadius(8)
    }
}

struct DetailItem: View {
    let label: String
    let value: String
    
    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(label)
                .font(.caption)
                .foregroundColor(.secondary)
            
            Text(value)
                .font(.caption)
                .fontWeight(.medium)
                .foregroundColor(.primary)
        }
    }
}

#Preview {
    CarrierRatesView(carrierId: "test-carrier-id")
        .environmentObject(AuthManager())
} 