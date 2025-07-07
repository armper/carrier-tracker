import SwiftUI

struct MainTabView: View {
    var body: some View {
        TabView {
            HomeView()
                .tabItem {
                    Image(systemName: "house.fill")
                    Text("Home")
                }
            
            CarrierListView()
                .tabItem {
                    Image(systemName: "magnifyingglass")
                    Text("Search")
                }
            
            SavedCarriersView()
                .tabItem {
                    Image(systemName: "heart.fill")
                    Text("Saved")
                }
            
            ProfileView()
                .tabItem {
                    Image(systemName: "person.fill")
                    Text("Profile")
                }
        }
        .accentColor(.orange)
    }
}

#Preview("Main Tab View") {
    MainTabView()
        .environmentObject(AuthManager())
}

#Preview("Dark Mode") {
    MainTabView()
        .environmentObject(AuthManager())
        .preferredColorScheme(.dark)
}

#Preview("iPad") {
    MainTabView()
        .environmentObject(AuthManager())
        .previewDevice("iPad Pro (12.9-inch) (6th generation)")
}