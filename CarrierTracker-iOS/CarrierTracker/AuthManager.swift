import Foundation
import Supabase
import SwiftUI

@MainActor
class AuthManager: ObservableObject {
    @Published var isAuthenticated = false
    @Published var user: User?
    @Published var profile: Profile?
    @Published var isLoadingProfile = false
    
    private let supabase = SupabaseService.shared.client
    
    init() {
        Task {
            await checkAuthStatus()
        }
    }
    
    func checkAuthStatus() async {
        do {
            let session = try await supabase.auth.session
            let user = session.user
            self.user = user
            self.isAuthenticated = true
            await fetchProfile()
            print("✅ User authenticated: \(user.email ?? "no email")")
        } catch {
            print("❌ Auth check error: \(error)")
            self.isAuthenticated = false
            self.user = nil
            self.profile = nil
        }
    }
    
    func signIn(email: String, password: String) async throws {
        let session = try await supabase.auth.signIn(email: email, password: password)
        self.user = session.user
        self.isAuthenticated = true
        await fetchProfile()
    }
    
    func signUp(email: String, password: String) async throws {
        let response = try await supabase.auth.signUp(email: email, password: password)
        if let session = response.session {
            self.user = session.user
            self.isAuthenticated = true
            await fetchProfile()
        }
    }
    
    func signOut() async {
        do {
            try await supabase.auth.signOut()
            self.isAuthenticated = false
            self.user = nil
            self.profile = nil
        } catch {
            print("Error signing out: \(error)")
        }
    }
    
    private func fetchProfile() async {
        guard let user = user else { 
            print("❌ No user found when fetching profile")
            return 
        }
        
        isLoadingProfile = true
        print("🔄 Fetching profile for user: \(user.id)")
        
        do {
            let profile: Profile = try await supabase
                .from("profiles")
                .select()
                .eq("id", value: user.id)
                .single()
                .execute()
                .value
            
            self.profile = profile
            print("✅ Profile fetched successfully: \(profile.email)")
        } catch {
            print("❌ Error fetching profile: \(error)")
            print("❌ Error details: \(error.localizedDescription)")
            
            // If profile doesn't exist, create one
            if error.localizedDescription.contains("PGRST116") || error.localizedDescription.contains("not found") {
                print("🔄 Profile not found, creating new profile...")
                await createProfile()
            }
        }
        
        isLoadingProfile = false
    }
    
    private func createProfile() async {
        guard let user = user else { return }
        
        do {
            let newProfile = [
                "id": user.id.uuidString,
                "email": user.email ?? "",
                "full_name": user.email?.components(separatedBy: "@").first ?? "",
                "user_type": "driver"
            ]
            
            let profile: Profile = try await supabase
                .from("profiles")
                .insert(newProfile)
                .select()
                .single()
                .execute()
                .value
            
            self.profile = profile
            print("✅ Profile created successfully: \(profile.email)")
        } catch {
            print("❌ Error creating profile: \(error)")
        }
    }
}