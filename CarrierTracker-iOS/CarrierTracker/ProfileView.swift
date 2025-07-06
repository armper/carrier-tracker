import SwiftUI

struct ProfileView: View {
    @EnvironmentObject var authManager: AuthManager
    @State private var savedCarriers: [Carrier] = []
    @State private var isLoading = false
    @State private var errorMessage: String?
    
    var body: some View {
        NavigationView {
            List {
                Section("Profile") {
                    HStack {
                        Image(systemName: "person.circle.fill")
                            .font(.system(size: 40))
                            .foregroundColor(.blue)
                        
                        VStack(alignment: .leading, spacing: 4) {
                            if authManager.isLoadingProfile {
                                Text("Loading profile...")
                                    .font(.headline)
                                    .foregroundColor(.secondary)
                            } else {
                                Text(authManager.profile?.email ?? authManager.user?.email ?? "Unknown User")
                                    .font(.headline)
                                
                                if let fullName = authManager.profile?.fullName {
                                    Text(fullName)
                                        .font(.subheadline)
                                        .foregroundColor(.secondary)
                                }
                            }
                            
                            if let userType = authManager.profile?.userType {
                                Text(userType.rawValue.capitalized)
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            } else if authManager.user != nil && !authManager.isLoadingProfile {
                                Text("Profile loading...")
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }
                        }
                        
                        Spacer()
                    }
                    .padding(.vertical, 4)
                }
                
                Section("Saved Carriers") {
                    if isLoading {
                        ProgressView("Loading saved carriers...")
                            .padding()
                    } else if let errorMessage = errorMessage {
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Error loading saved carriers")
                                .font(.headline)
                                .foregroundColor(.red)
                            
                            Text(errorMessage)
                                .font(.caption)
                                .foregroundColor(.secondary)
                            
                            Button("Retry") {
                                Task {
                                    await loadSavedCarriers()
                                }
                            }
                        }
                        .padding(.vertical, 4)
                    } else if savedCarriers.isEmpty {
                        Text("No saved carriers")
                            .foregroundColor(.secondary)
                            .font(.subheadline)
                    } else {
                        ForEach(savedCarriers) { carrier in
                            NavigationLink(destination: CarrierDetailView(carrier: carrier)) {
                                VStack(alignment: .leading, spacing: 4) {
                                    Text(carrier.legalName)
                                        .font(.headline)
                                    
                                    Text("DOT: \(carrier.dotNumber)")
                                        .font(.caption)
                                        .foregroundColor(.secondary)
                                }
                            }
                        }
                    }
                }
                
                Section("Settings") {
                    Button("Sign Out") {
                        Task {
                            await authManager.signOut()
                        }
                    }
                    .foregroundColor(.red)
                }
            }
            .navigationTitle("Profile")
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