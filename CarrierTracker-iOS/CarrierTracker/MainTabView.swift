import SwiftUI

struct MainTabView: View {
    var body: some View {
        TabView {
            HomeView()
                .tabItem {
                    Image(systemName: "house.fill")
                    Text("Home")
                }
            
            CommentsTestView()
                .tabItem {
                    Image(systemName: "message.fill")
                    Text("Chat")
                }
            
            SavedCarriersView()
                .tabItem {
                    Image(systemName: "bell.fill")
                    Text("Alerts")
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