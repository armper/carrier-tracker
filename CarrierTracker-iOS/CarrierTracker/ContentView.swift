import SwiftUI

struct ContentView: View {
    @EnvironmentObject var authManager: AuthManager
    
    var body: some View {
        NavigationView {
            if authManager.isAuthenticated {
                MainTabView()
            } else {
                LoginView()
            }
        }
        .task {
            await authManager.checkAuthStatus()
        }
    }
}

#Preview("Authenticated State") {
    let authManager = AuthManager()
    authManager.isAuthenticated = true
    
    return ContentView()
        .environmentObject(authManager)
}

#Preview("Not Authenticated") {
    let authManager = AuthManager()
    authManager.isAuthenticated = false
    
    return ContentView()
        .environmentObject(authManager)
}

#Preview("Dark Mode") {
    let authManager = AuthManager()
    authManager.isAuthenticated = true
    
    return ContentView()
        .environmentObject(authManager)
        .preferredColorScheme(.dark)
}