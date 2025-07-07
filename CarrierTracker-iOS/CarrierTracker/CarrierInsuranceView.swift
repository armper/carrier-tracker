import SwiftUI

struct CarrierInsuranceView: View {
    let carrierId: String
    
    @StateObject private var reviewsService = ReviewsService.shared
    @EnvironmentObject var authManager: AuthManager
    
    @State private var insuranceInfos: [InsuranceInfo] = []
    @State private var isLoading = false
    @State private var showingInsuranceForm = false
    @State private var errorMessage: String?
    
    var body: some View {
        ScrollView {
            LazyVStack(spacing: 16) {
                // Header with submit button
                headerSection
                
                // Insurance information list
                insuranceInfoSection
            }
            .padding()
        }
        .refreshable {
            await loadInsuranceInfo()
        }
        .task {
            await loadInsuranceInfo()
        }
        .sheet(isPresented: $showingInsuranceForm) {
            InsuranceSubmissionFormView(carrierId: carrierId) {
                await loadInsuranceInfo()
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
                    Text("Insurance Information")
                        .font(.title2)
                        .fontWeight(.bold)
                    
                    Text("Crowdsourced insurance data")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
                
                Spacer()
            }
            
            // Warning about accuracy
            HStack {
                Image(systemName: "info.circle.fill")
                    .foregroundColor(.orange)
                
                Text("This information is user-submitted and may not be current or accurate. Always verify with the carrier.")
                    .font(.caption)
                    .foregroundColor(.secondary)
                
                Spacer()
            }
            .padding()
            .background(Color.orange.opacity(0.1))
            .cornerRadius(8)
            
            if authManager.isAuthenticated {
                Button(action: {
                    showingInsuranceForm = true
                }) {
                    HStack {
                        Image(systemName: "plus.circle.fill")
                        Text("Submit Insurance Info")
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
    
    // MARK: - Insurance Information Section
    private var insuranceInfoSection: some View {
        LazyVStack(spacing: 12) {
            if isLoading {
                ProgressView("Loading insurance information...")
                    .frame(maxWidth: .infinity)
                    .padding()
            } else if insuranceInfos.isEmpty {
                emptyStateView
            } else {
                ForEach(insuranceInfos) { info in
                    InsuranceInfoRowView(insuranceInfo: info)
                        .padding()
                        .background(Color(UIColor.secondarySystemBackground))
                        .cornerRadius(12)
                }
            }
        }
    }
    
    private var emptyStateView: some View {
        VStack(spacing: 16) {
            Image(systemName: "shield.lefthalf.filled")
                .font(.system(size: 50))
                .foregroundColor(.gray)
            
            Text("No Insurance Information")
                .font(.headline)
                .foregroundColor(.primary)
            
            Text("Be the first to share insurance information for this carrier")
                .font(.subheadline)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
        }
        .padding()
        .frame(maxWidth: .infinity)
    }
    
    // MARK: - Helper Functions
    private func loadInsuranceInfo() async {
        isLoading = true
        errorMessage = nil
        
        do {
            insuranceInfos = try await reviewsService.getCarrierInsurance(carrierId: carrierId)
        } catch {
            errorMessage = "Failed to load insurance information: \(error.localizedDescription)"
        }
        
        isLoading = false
    }
}

struct InsuranceInfoRowView: View {
    let insuranceInfo: InsuranceInfo
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Header with submitter and confidence
            HStack {
                HStack {
                    Text(insuranceInfo.displaySubmitterName)
                        .font(.subheadline)
                        .fontWeight(.semibold)
                    
                    if let submitterType = insuranceInfo.submitterType {
                        Text(submitterType.emoji)
                            .font(.caption)
                    }
                }
                
                Spacer()
                
                // Confidence indicator
                HStack(spacing: 4) {
                    Image(systemName: confidenceIcon)
                        .font(.caption)
                        .foregroundColor(confidenceColor)
                    
                    Text("\(insuranceInfo.confidenceScore)%")
                        .font(.caption)
                        .foregroundColor(confidenceColor)
                }
                
                Text(insuranceInfo.createdAt, style: .relative)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            
            // Status indicator
            HStack {
                Text("Status:")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                
                Text(insuranceInfo.statusText)
                    .font(.subheadline)
                    .fontWeight(.semibold)
                    .foregroundColor(statusColor)
                
                Spacer()
            }
            
            // Insurance provider
            if let provider = insuranceInfo.insuranceProvider {
                InfoRow(label: "Provider", value: provider)
            }
            
            // Coverage amounts
            VStack(alignment: .leading, spacing: 8) {
                if let coverageAmount = insuranceInfo.coverageAmount {
                    InfoRow(label: "General Liability", value: formatCurrency(coverageAmount))
                }
                
                if let cargoAmount = insuranceInfo.cargoCoverageAmount {
                    InfoRow(label: "Cargo Coverage", value: formatCurrency(cargoAmount))
                }
                
                if let liabilityAmount = insuranceInfo.liabilityCoverageAmount {
                    InfoRow(label: "Liability Coverage", value: formatCurrency(liabilityAmount))
                }
            }
            
            // Dates
            HStack {
                if let effectiveDate = insuranceInfo.effectiveDate {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Effective Date")
                            .font(.caption)
                            .foregroundColor(.secondary)
                        
                        Text(effectiveDate, style: .date)
                            .font(.caption)
                            .fontWeight(.medium)
                    }
                }
                
                Spacer()
                
                if let expirationDate = insuranceInfo.expirationDate {
                    VStack(alignment: .trailing, spacing: 2) {
                        Text("Expiration Date")
                            .font(.caption)
                            .foregroundColor(.secondary)
                        
                        Text(expirationDate, style: .date)
                            .font(.caption)
                            .fontWeight(.medium)
                            .foregroundColor(insuranceInfo.isExpired ? .red : .primary)
                    }
                }
            }
            
            // Source type indicator
            HStack {
                Text("Source:")
                    .font(.caption)
                    .foregroundColor(.secondary)
                
                Text(insuranceInfo.sourceType.capitalized)
                    .font(.caption)
                    .fontWeight(.medium)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 2)
                    .background(sourceTypeColor.opacity(0.2))
                    .foregroundColor(sourceTypeColor)
                    .cornerRadius(4)
                
                Spacer()
            }
        }
    }
    
    // MARK: - Computed Properties
    private var confidenceIcon: String {
        switch insuranceInfo.confidenceScore {
        case 80...: return "checkmark.circle.fill"
        case 60..<80: return "checkmark.circle"
        case 40..<60: return "questionmark.circle"
        default: return "exclamationmark.circle"
        }
    }
    
    private var confidenceColor: Color {
        switch insuranceInfo.confidenceScore {
        case 80...: return .green
        case 60..<80: return .blue
        case 40..<60: return .orange
        default: return .red
        }
    }
    
    private var statusColor: Color {
        switch insuranceInfo.statusText {
        case "Active": return .green
        case "Expired": return .red
        case "Inactive": return .gray
        default: return .gray
        }
    }
    
    private var sourceTypeColor: Color {
        switch insuranceInfo.sourceType.lowercased() {
        case "verified": return .green
        case "fmcsa": return .blue
        case "user": return .orange
        default: return .gray
        }
    }
    
    // MARK: - Helper Functions
    private func formatCurrency(_ amount: Int) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencyCode = "USD"
        formatter.maximumFractionDigits = 0
        
        return formatter.string(from: NSNumber(value: amount)) ?? "$\(amount)"
    }
}

struct InfoRow: View {
    let label: String
    let value: String
    
    var body: some View {
        HStack {
            Text("\(label):")
                .font(.subheadline)
                .foregroundColor(.secondary)
            
            Text(value)
                .font(.subheadline)
                .fontWeight(.medium)
                .foregroundColor(.primary)
            
            Spacer()
        }
    }
}

// MARK: - Form Views (Placeholders)
struct InsuranceSubmissionFormView: View {
    let carrierId: String
    let onSubmitted: () async -> Void
    
    @Environment(\.dismiss) private var dismiss
    
    var body: some View {
        NavigationView {
            VStack {
                Text("Insurance Submission Form")
                    .font(.title)
                    .padding()
                
                Text("Form for submitting insurance information")
                    .foregroundColor(.secondary)
                    .multilineTextAlignment(.center)
                    .padding()
                
                Spacer()
            }
            .navigationTitle("Submit Insurance Info")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
                
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Submit") {
                        dismiss()
                    }
                }
            }
        }
    }
}

struct RateSubmissionFormView: View {
    let carrierId: String
    let onSubmitted: () async -> Void
    
    @Environment(\.dismiss) private var dismiss
    
    var body: some View {
        NavigationView {
            VStack {
                Text("Rate Submission Form")
                    .font(.title)
                    .padding()
                
                Text("Form for submitting rate information")
                    .foregroundColor(.secondary)
                    .multilineTextAlignment(.center)
                    .padding()
                
                Spacer()
            }
            .navigationTitle("Submit Rate")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
                
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Submit") {
                        dismiss()
                    }
                }
            }
        }
    }
}

#Preview {
    CarrierInsuranceView(carrierId: "test-carrier-id")
        .environmentObject(AuthManager())
} 