import SwiftUI

struct HomeView: View {
    @EnvironmentObject var authManager: AuthManager
    
    var body: some View {
        NavigationView {
            ZStack {
                Color.black.ignoresSafeArea()
                
                ScrollView {
                    VStack(spacing: 20) {
                        // Header with greeting
                        VStack(alignment: .leading, spacing: 8) {
                            HStack {
                                VStack(alignment: .leading, spacing: 4) {
                                    Text("Howdy,")
                                        .font(.system(size: 48, weight: .bold))
                                        .foregroundColor(.orange)
                                    Text("Dave!")
                                        .font(.system(size: 48, weight: .bold))
                                        .foregroundColor(.orange)
                                    
                                    Text("Ready for your")
                                        .font(.system(size: 24, weight: .medium))
                                        .foregroundColor(.white)
                                    Text("next load?")
                                        .font(.system(size: 24, weight: .medium))
                                        .foregroundColor(.white)
                                }
                                Spacer()
                                
                                // Trucker character illustration placeholder
                                Image(systemName: "person.circle.fill")
                                    .font(.system(size: 100))
                                    .foregroundColor(.orange)
                            }
                            .padding(.horizontal, 20)
                            .padding(.top, 20)
                        }
                        
                        // Feature tiles
                        LazyVGrid(columns: [
                            GridItem(.flexible()),
                            GridItem(.flexible())
                        ], spacing: 16) {
                            
                            // Search Carriers tile
                            NavigationLink(destination: CarrierListView()) {
                                FeatureTile(
                                    icon: "magnifyingglass",
                                    title: "Search Carriers",
                                    backgroundColor: .gray.opacity(0.3)
                                )
                            }
                            
                            // Saved Carriers tile
                            NavigationLink(destination: SavedCarriersView()) {
                                FeatureTile(
                                    icon: "bookmark.fill",
                                    title: "Saved Carriers",
                                    backgroundColor: .blue.opacity(0.8)
                                )
                            }
                            
                            // Profile tile
                            NavigationLink(destination: ProfileView()) {
                                FeatureTile(
                                    icon: "person.fill",
                                    title: "My Profile",
                                    backgroundColor: .gray.opacity(0.3)
                                )
                            }
                            
                            // Comments/Chat tile
                            NavigationLink(destination: CommentsTestView()) {
                                FeatureTile(
                                    icon: "message.fill",
                                    title: "Carrier Reviews",
                                    backgroundColor: .orange.opacity(0.8)
                                )
                            }
                        }
                        .padding(.horizontal, 20)
                        
                        Spacer(minLength: 100)
                    }
                }
            }
            .navigationBarHidden(true)
        }
    }
}

struct FeatureTile: View {
    let icon: String
    let title: String
    let backgroundColor: Color
    
    var body: some View {
        VStack(spacing: 12) {
            Image(systemName: icon)
                .font(.system(size: 40))
                .foregroundColor(.white)
            
            Text(title)
                .font(.system(size: 18, weight: .semibold))
                .foregroundColor(.white)
                .multilineTextAlignment(.center)
        }
        .frame(height: 140)
        .frame(maxWidth: .infinity)
        .background(backgroundColor)
        .cornerRadius(16)
    }
}

#Preview {
    HomeView()
        .environmentObject(AuthManager())
}

#Preview("Dark Mode") {
    HomeView()
        .environmentObject(AuthManager())
        .preferredColorScheme(.dark)
}