import SwiftUI

struct SavedCarriersView: View {
    @EnvironmentObject var authManager: AuthManager
    @State private var savedCarriers: [Carrier] = []
    @State private var isLoading = false
    @State private var errorMessage: String?
    
    var body: some View {
        NavigationView {
            Group {
                if isLoading {
                    VStack {
                        ProgressView("Loading saved carriers...")
                        Text("Please wait...")
                            .font(.caption)
                            .foregroundColor(.secondary)
                            .padding(.top, 8)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if let errorMessage = errorMessage {
                    VStack(spacing: 16) {
                        Image(systemName: "exclamationmark.triangle")
                            .font(.largeTitle)
                            .foregroundColor(.orange)
                        
                        Text("Error Loading Carriers")
                            .font(.headline)
                        
                        Text(errorMessage)
                            .font(.body)
                            .foregroundColor(.secondary)
                            .multilineTextAlignment(.center)
                            .padding(.horizontal)
                        
                        Button("Retry") {
                            Task {
                                await loadSavedCarriers()
                            }
                        }
                        .buttonStyle(.borderedProminent)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if savedCarriers.isEmpty {
                    VStack(spacing: 16) {
                        Image(systemName: "bookmark")
                            .font(.largeTitle)
                            .foregroundColor(.gray)
                        
                        Text("No Saved Carriers")
                            .font(.headline)
                        
                        Text("Carriers you save will appear here")
                            .font(.body)
                            .foregroundColor(.secondary)
                            .multilineTextAlignment(.center)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else {
                    List(savedCarriers) { carrier in
                        NavigationLink(destination: CarrierDetailView(carrier: carrier)) {
                            SavedCarrierRowView(carrier: carrier)
                        }
                    }
                }
            }
            .navigationTitle("Saved Carriers")
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Refresh") {
                        Task {
                            await loadSavedCarriers()
                        }
                    }
                }
            }
            .task {
                await loadSavedCarriers()
            }
            .refreshable {
                await loadSavedCarriers()
            }
        }
    }
    
    private func loadSavedCarriers() async {
        guard let userId = authManager.user?.id else { 
            print("❌ No user ID available for loading saved carriers")
            errorMessage = "Please sign in to view saved carriers"
            return 
        }
        
        isLoading = true
        errorMessage = nil
        
        print("🔄 Loading saved carriers for user: \(userId)")
        
        do {
            savedCarriers = try await CarrierService.shared.getSavedCarriers(userId: userId.uuidString)
            print("✅ Successfully loaded \(savedCarriers.count) saved carriers")
        } catch {
            print("❌ Error loading saved carriers: \(error)")
            errorMessage = error.localizedDescription
        }
        
        isLoading = false
    }
}

struct SavedCarrierRowView: View {
    let carrier: Carrier
    
    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(carrier.legalName)
                .font(.headline)
                .lineLimit(2)
            
            HStack {
                Text("DOT: \(carrier.dotNumber)")
                    .font(.caption)
                    .foregroundColor(.secondary)
                
                Spacer()
                
                if let rating = carrier.safetyRating {
                    Text(rating)
                        .font(.caption)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 2)
                        .background(ratingColor(rating))
                        .foregroundColor(.white)
                        .cornerRadius(4)
                }
            }
            
            if let address = carrier.physicalAddress {
                Text(address)
                    .font(.caption)
                    .foregroundColor(.secondary)
                    .lineLimit(2)
            }
        }
        .padding(.vertical, 2)
    }
    
    private func ratingColor(_ rating: String) -> Color {
        switch rating.lowercased() {
        case "satisfactory":
            return .green
        case "conditional":
            return .orange
        case "unsatisfactory":
            return .red
        default:
            return .gray
        }
    }
}

#Preview {
    SavedCarriersView()
        .environmentObject(AuthManager())
} 