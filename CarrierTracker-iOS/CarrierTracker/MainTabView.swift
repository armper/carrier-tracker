import SwiftUI

struct MainTabView: View {
    var body: some View {
        TabView {
            CarrierListView()
                .tabItem {
                    Image(systemName: "truck.box")
                    Text("Carriers")
                }
            
            ChatView()
                .tabItem {
                    Image(systemName: "message")
                    Text("Chat")
                }
            
            ProfileView()
                .tabItem {
                    Image(systemName: "person")
                    Text("Profile")
                }
        }
    }
}