import SwiftUI

struct MainTabView: View {
    var body: some View {
        TabView {
            CarrierListView()
                .tabItem {
                    Image(systemName: "magnifyingglass")
                    Text("Search")
                }
            
            SavedCarriersView()
                .tabItem {
                    Image(systemName: "bookmark.fill")
                    Text("Saved")
                }
            
            ProfileView()
                .tabItem {
                    Image(systemName: "person.fill")
                    Text("Profile")
                }
        }
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