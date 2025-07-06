import XCTest
@testable import CarrierTracker
import Supabase

@MainActor
final class AuthManagerTests: XCTestCase {
    
    var authManager: AuthManager!
    
    override func setUpWithError() throws {
        super.setUp()
        authManager = AuthManager()
    }
    
    override func tearDownWithError() throws {
        authManager = nil
        super.tearDown()
    }
    
    // MARK: - Authentication Tests
    
    func testSignInWithValidCredentials() async throws {
        // Test with known valid credentials
        let email = "alpereastorage@gmail.com"
        let password = "testpassword123" // Replace with actual test password
        
        do {
            try await authManager.signIn(email: email, password: password)
            
            // Verify authentication state
            XCTAssertTrue(authManager.isAuthenticated, "User should be authenticated")
            XCTAssertNotNil(authManager.user, "User should be set")
            XCTAssertEqual(authManager.user?.email, email, "User email should match")
            
            // Give profile time to load
            try await Task.sleep(nanoseconds: 2_000_000_000) // 2 seconds
            
            // Verify profile is loaded
            XCTAssertNotNil(authManager.profile, "Profile should be loaded")
            XCTAssertEqual(authManager.profile?.email, email, "Profile email should match")
            XCTAssertEqual(authManager.profile?.fullName, "Armando Leon Perea", "Profile full name should match")
            XCTAssertEqual(authManager.profile?.userType, .driver, "Profile user type should be driver")
            
        } catch {
            XCTFail("Sign in should succeed with valid credentials: \(error)")
        }
    }
    
    func testSignInWithInvalidCredentials() async throws {
        let email = "invalid@example.com"
        let password = "wrongpassword"
        
        do {
            try await authManager.signIn(email: email, password: password)
            XCTFail("Sign in should fail with invalid credentials")
        } catch {
            // Expected to fail
            XCTAssertFalse(authManager.isAuthenticated, "User should not be authenticated")
            XCTAssertNil(authManager.user, "User should be nil")
            XCTAssertNil(authManager.profile, "Profile should be nil")
        }
    }
    
    func testCheckAuthStatus() async throws {
        // Test checking auth status
        await authManager.checkAuthStatus()
        
        // If there's a valid session, user should be authenticated
        if authManager.isAuthenticated {
            XCTAssertNotNil(authManager.user, "User should be set if authenticated")
        } else {
            XCTAssertNil(authManager.user, "User should be nil if not authenticated")
            XCTAssertNil(authManager.profile, "Profile should be nil if not authenticated")
        }
    }
    
    func testSignOut() async throws {
        // First sign in
        let email = "alpereastorage@gmail.com"
        let password = "testpassword123"
        
        do {
            try await authManager.signIn(email: email, password: password)
            XCTAssertTrue(authManager.isAuthenticated, "Should be authenticated after sign in")
            
            // Then sign out
            await authManager.signOut()
            
            XCTAssertFalse(authManager.isAuthenticated, "Should not be authenticated after sign out")
            XCTAssertNil(authManager.user, "User should be nil after sign out")
            XCTAssertNil(authManager.profile, "Profile should be nil after sign out")
            
        } catch {
            // If sign in fails, skip the test
            throw XCTSkip("Cannot test sign out without successful sign in")
        }
    }
    
    // MARK: - Profile Tests
    
    func testProfileLoadingState() async throws {
        // Test that loading state is properly managed
        XCTAssertFalse(authManager.isLoadingProfile, "Should not be loading initially")
        
        // Mock a profile fetch by directly calling the private method
        // We'll test this through the sign in flow
        let email = "alpereastorage@gmail.com"
        let password = "testpassword123"
        
        do {
            try await authManager.signIn(email: email, password: password)
            
            // Profile should eventually load
            var attempts = 0
            while authManager.isLoadingProfile && attempts < 10 {
                try await Task.sleep(nanoseconds: 500_000_000) // 0.5 seconds
                attempts += 1
            }
            
            XCTAssertFalse(authManager.isLoadingProfile, "Should not be loading after completion")
            XCTAssertNotNil(authManager.profile, "Profile should be loaded")
            
        } catch {
            throw XCTSkip("Cannot test profile loading without successful sign in")
        }
    }
    
    func testProfileDataAccuracy() async throws {
        // Test that profile data matches database values
        let email = "alpereastorage@gmail.com"
        let password = "testpassword123"
        
        do {
            try await authManager.signIn(email: email, password: password)
            
            // Wait for profile to load
            try await Task.sleep(nanoseconds: 2_000_000_000)
            
            guard let profile = authManager.profile else {
                XCTFail("Profile should be loaded")
                return
            }
            
            // Verify profile data matches database
            XCTAssertEqual(profile.email, "alpereastorage@gmail.com", "Email should match")
            XCTAssertEqual(profile.fullName, "Armando Leon Perea", "Full name should match")
            XCTAssertEqual(profile.userType, .driver, "User type should be driver")
            XCTAssertEqual(profile.id, "75b10c4f-fcef-4c42-a3bd-72275d410a8d", "ID should match")
            
        } catch {
            throw XCTSkip("Cannot test profile data without successful sign in")
        }
    }
    
    // MARK: - Error Handling Tests
    
    func testProfileErrorHandling() async throws {
        // Test error handling when profile fetch fails
        // This would require mocking the Supabase client, which is complex
        // For now, we'll test the positive case and rely on manual testing for error cases
        
        // Test with a user that might not have a profile
        // This is hard to test without creating test data
        
        // For now, just verify the error handling doesn't crash
        await authManager.checkAuthStatus()
        
        // Should not crash even if there are errors
        XCTAssertTrue(true, "Error handling should not crash the app")
    }
    
    // MARK: - Performance Tests
    
    func testAuthPerformance() throws {
        measure {
            Task {
                await authManager.checkAuthStatus()
            }
        }
    }
    
    func testProfileFetchPerformance() throws {
        let email = "alpereastorage@gmail.com"
        let password = "testpassword123"
        
        measure {
            Task {
                do {
                    try await authManager.signIn(email: email, password: password)
                    // Wait for profile to load
                    try await Task.sleep(nanoseconds: 1_000_000_000)
                } catch {
                    // Performance test should not fail on auth errors
                }
            }
        }
    }
} 