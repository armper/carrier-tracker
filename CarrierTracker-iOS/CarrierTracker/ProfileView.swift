import SwiftUI

struct ProfileView: View {
    @EnvironmentObject var authManager: AuthManager
    
    var body: some View {
        NavigationView {
            List {
                Section("Profile") {
                    HStack {
                        Image(systemName: "person.circle.fill")
                            .font(.system(size: 50))
                            .foregroundColor(.blue)
                        
                        VStack(alignment: .leading, spacing: 6) {
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
                                    .padding(.horizontal, 8)
                                    .padding(.vertical, 2)
                                    .background(Color.blue.opacity(0.1))
                                    .foregroundColor(.blue)
                                    .cornerRadius(4)
                            } else if authManager.user != nil && !authManager.isLoadingProfile {
                                Text("Profile loading...")
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }
                        }
                        
                        Spacer()
                    }
                    .padding(.vertical, 8)
                }
                
                Section("Account Information") {
                    HStack {
                        Image(systemName: "envelope")
                            .foregroundColor(.secondary)
                            .frame(width: 20)
                        
                        VStack(alignment: .leading, spacing: 2) {
                            Text("Email")
                                .font(.caption)
                                .foregroundColor(.secondary)
                            
                            Text(authManager.profile?.email ?? authManager.user?.email ?? "Not available")
                                .font(.body)
                        }
                        
                        Spacer()
                    }
                    .padding(.vertical, 4)
                    
                    if let createdAt = authManager.user?.createdAt {
                        HStack {
                            Image(systemName: "calendar")
                                .foregroundColor(.secondary)
                                .frame(width: 20)
                            
                            VStack(alignment: .leading, spacing: 2) {
                                Text("Member Since")
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                                
                                Text(createdAt.formatted(date: .abbreviated, time: .omitted))
                                    .font(.body)
                            }
                            
                            Spacer()
                        }
                        .padding(.vertical, 4)
                    }
                }
                
                Section("Statistics") {
                    HStack {
                        Image(systemName: "bookmark.fill")
                            .foregroundColor(.blue)
                            .frame(width: 20)
                        
                        VStack(alignment: .leading, spacing: 2) {
                            Text("Saved Carriers")
                                .font(.caption)
                                .foregroundColor(.secondary)
                            
                            Text("View in Saved tab")
                                .font(.body)
                                .foregroundColor(.blue)
                        }
                        
                        Spacer()
                        
                        Image(systemName: "chevron.right")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    .padding(.vertical, 4)
                }
                
                Section("Settings") {
                    Button(action: {
                        // Add settings action later
                    }) {
                        HStack {
                            Image(systemName: "gear")
                                .foregroundColor(.secondary)
                                .frame(width: 20)
                            
                            Text("App Settings")
                                .foregroundColor(.primary)
                            
                            Spacer()
                            
                            Image(systemName: "chevron.right")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                        .padding(.vertical, 4)
                    }
                    
                    Button("Sign Out") {
                        Task {
                            await authManager.signOut()
                        }
                    }
                    .foregroundColor(.red)
                    .padding(.vertical, 4)
                }
            }
            .navigationTitle("Profile")
        }
    }
}

#Preview {
    ProfileView()
        .environmentObject(AuthManager())
}

#Preview("Dark Mode") {
    ProfileView()
        .environmentObject(AuthManager())
        .preferredColorScheme(.dark)
}

#Preview("Different Devices") {
    Group {
        ProfileView()
            .environmentObject(AuthManager())
            .previewDevice("iPhone 15")
            .previewDisplayName("iPhone 15")
        
        ProfileView()
            .environmentObject(AuthManager())
            .previewDevice("iPhone SE")
            .previewDisplayName("iPhone SE")
    }
}