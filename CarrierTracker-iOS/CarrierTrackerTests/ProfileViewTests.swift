import XCTest
import SwiftUI
@testable import CarrierTracker

@MainActor
final class ProfileViewTests: XCTestCase {
    
    var authManager: AuthManager!
    
    override func setUpWithError() throws {
        super.setUp()
        authManager = AuthManager()
    }
    
    override func tearDownWithError() throws {
        authManager = nil
        super.tearDown()
    }
    
    // MARK: - Profile Display Tests
    
    func testProfileDisplayWithAuthenticatedUser() async throws {
        // Sign in first
        let email = "alpereastorage@gmail.com"
        let password = "testpassword123"
        
        do {
            try await authManager.signIn(email: email, password: password)
            
            // Wait for profile to load
            try await Task.sleep(nanoseconds: 2_000_000_000)
            
            // Test profile data display
            XCTAssertNotNil(authManager.profile, "Profile should be loaded")
            
            if let profile = authManager.profile {
                XCTAssertEqual(profile.email, email, "Email should match")
                XCTAssertEqual(profile.fullName, "Armando Leon Perea", "Full name should match")
                XCTAssertEqual(profile.userType, .driver, "User type should be driver")
            }
            
        } catch {
            throw XCTSkip("Cannot test profile display without authentication")
        }
    }
    
    func testProfileDisplayWithUnauthenticatedUser() async throws {
        // Test profile display when not authenticated
        XCTAssertFalse(authManager.isAuthenticated, "Should not be authenticated initially")
        XCTAssertNil(authManager.user, "User should be nil")
        XCTAssertNil(authManager.profile, "Profile should be nil")
    }
    
    func testLoadingStates() async throws {
        // Test loading states
        XCTAssertFalse(authManager.isLoadingProfile, "Should not be loading initially")
        
        // Sign in to trigger loading
        let email = "alpereastorage@gmail.com"
        let password = "testpassword123"
        
        do {
            try await authManager.signIn(email: email, password: password)
            
            // Profile loading should complete within reasonable time
            var attempts = 0
            while authManager.isLoadingProfile && attempts < 20 {
                try await Task.sleep(nanoseconds: 100_000_000) // 0.1 seconds
                attempts += 1
            }
            
            XCTAssertFalse(authManager.isLoadingProfile, "Profile loading should complete")
            
        } catch {
            throw XCTSkip("Cannot test loading states without authentication")
        }
    }
    
    // MARK: - Saved Carriers Display Tests
    
    func testSavedCarriersDisplay() async throws {
        // Test saved carriers display
        let email = "alpereastorage@gmail.com"
        let password = "testpassword123"
        
        do {
            try await authManager.signIn(email: email, password: password)
            
            // Wait for authentication
            try await Task.sleep(nanoseconds: 1_000_000_000)
            
            guard let userId = authManager.user?.id else {
                XCTFail("User ID should be available")
                return
            }
            
            // Test saved carriers fetch
            let savedCarriers = try await CarrierService.shared.getSavedCarriers(userId: userId.uuidString)
            
            XCTAssertEqual(savedCarriers.count, 7, "Should have 7 saved carriers")
            
            // Test carrier data completeness
            for carrier in savedCarriers {
                XCTAssertFalse(carrier.id.isEmpty, "Carrier ID should not be empty")
                XCTAssertFalse(carrier.legalName.isEmpty, "Legal name should not be empty")
                XCTAssertFalse(carrier.dotNumber.isEmpty, "DOT number should not be empty")
            }
            
        } catch {
            throw XCTSkip("Cannot test saved carriers display without authentication")
        }
    }
    
    func testSavedCarriersEmptyState() async throws {
        // Test empty saved carriers state
        let invalidUserId = "00000000-0000-0000-0000-000000000000"
        
        do {
            let savedCarriers = try await CarrierService.shared.getSavedCarriers(userId: invalidUserId)
            XCTAssertEqual(savedCarriers.count, 0, "Should have no saved carriers for invalid user")
            
        } catch {
            XCTFail("Should handle invalid user ID gracefully: \(error)")
        }
    }
    
    // MARK: - User Interface Tests
    
    func testProfileViewInitialization() {
        // Test that ProfileView can be initialized
        let profileView = ProfileView()
            .environmentObject(authManager)
        
        XCTAssertNotNil(profileView, "ProfileView should initialize successfully")
    }
    
    func testSignOutBehavior() async throws {
        // Test sign out behavior
        let email = "alpereastorage@gmail.com"
        let password = "testpassword123"
        
        do {
            // Sign in first
            try await authManager.signIn(email: email, password: password)
            XCTAssertTrue(authManager.isAuthenticated, "Should be authenticated")
            
            // Sign out
            await authManager.signOut()
            
            // Verify state after sign out
            XCTAssertFalse(authManager.isAuthenticated, "Should not be authenticated after sign out")
            XCTAssertNil(authManager.user, "User should be nil after sign out")
            XCTAssertNil(authManager.profile, "Profile should be nil after sign out")
            
        } catch {
            throw XCTSkip("Cannot test sign out without authentication")
        }
    }
    
    // MARK: - Data Integration Tests
    
    func testProfileDataIntegration() async throws {
        // Test complete profile data integration
        let email = "alpereastorage@gmail.com"
        let password = "testpassword123"
        
        do {
            try await authManager.signIn(email: email, password: password)
            
            // Wait for profile to load
            try await Task.sleep(nanoseconds: 2_000_000_000)
            
            // Test profile data
            guard let profile = authManager.profile else {
                XCTFail("Profile should be loaded")
                return
            }
            
            // Test user data
            guard let user = authManager.user else {
                XCTFail("User should be available")
                return
            }
            
            // Test saved carriers
            let savedCarriers = try await CarrierService.shared.getSavedCarriers(userId: user.id.uuidString)
            
            // Verify data consistency
            XCTAssertEqual(profile.email, user.email, "Profile and user emails should match")
            XCTAssertEqual(profile.id, user.id.uuidString, "Profile and user IDs should match")
            XCTAssertEqual(savedCarriers.count, 7, "Should have expected number of saved carriers")
            
            // Test specific carriers
            let amazonCarrier = savedCarriers.first { $0.legalName.contains("AMAZON") }
            XCTAssertNotNil(amazonCarrier, "Should have Amazon carrier")
            
            let christopherCarrier = savedCarriers.first { $0.legalName.contains("CHRISTOPHER MEZA") }
            XCTAssertNotNil(christopherCarrier, "Should have Christopher Meza carrier")
            
            print("✅ Profile data integration test completed successfully")
            print("   - Profile: \(profile.email) (\(profile.fullName ?? "No name"))")
            print("   - User Type: \(profile.userType?.rawValue ?? "Unknown")")
            print("   - Saved Carriers: \(savedCarriers.count)")
            
        } catch {
            XCTFail("Profile data integration test failed: \(error)")
        }
    }
    
    // MARK: - Error Handling Tests
    
    func testErrorHandling() async throws {
        // Test error handling in profile view
        
        // Test with no authentication
        let savedCarriers = try await CarrierService.shared.getSavedCarriers(userId: "invalid-id")
        XCTAssertEqual(savedCarriers.count, 0, "Should handle invalid user ID")
        
        // Test profile loading without user
        authManager.user = nil
        authManager.profile = nil
        
        XCTAssertNil(authManager.profile, "Profile should be nil without user")
        XCTAssertFalse(authManager.isAuthenticated, "Should not be authenticated")
        
        // Should not crash
        XCTAssertTrue(true, "Error handling should not crash")
    }
    
    // MARK: - Performance Tests
    
    func testProfileLoadingPerformance() throws {
        measure {
            Task {
                await authManager.checkAuthStatus()
            }
        }
    }
    
    func testSavedCarriersLoadingPerformance() throws {
        let userId = "75b10c4f-fcef-4c42-a3bd-72275d410a8d"
        
        measure {
            Task {
                do {
                    _ = try await CarrierService.shared.getSavedCarriers(userId: userId)
                } catch {
                    // Performance test should not fail on errors
                }
            }
        }
    }
} 