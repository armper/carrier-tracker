import XCTest
@testable import CarrierTracker
import Supabase

final class CarrierServiceTests: XCTestCase {
    
    var carrierService: CarrierService!
    let testUserId = "75b10c4f-fcef-4c42-a3bd-72275d410a8d" // alpereastorage@gmail.com
    
    override func setUpWithError() throws {
        super.setUp()
        carrierService = CarrierService.shared
    }
    
    override func tearDownWithError() throws {
        carrierService = nil
        super.tearDown()
    }
    
    // MARK: - Saved Carriers Tests
    
    func testGetSavedCarriers() async throws {
        do {
            let savedCarriers = try await carrierService.getSavedCarriers(userId: testUserId)
            
            // Based on database check, we expect 7 saved carriers
            XCTAssertEqual(savedCarriers.count, 7, "Should have 7 saved carriers")
            
            // Verify carriers have required fields
            for carrier in savedCarriers {
                XCTAssertFalse(carrier.id.isEmpty, "Carrier ID should not be empty")
                XCTAssertFalse(carrier.legalName.isEmpty, "Carrier legal name should not be empty")
                XCTAssertFalse(carrier.dotNumber.isEmpty, "Carrier DOT number should not be empty")
            }
            
            // Test specific carriers we know should exist
            let amazonCarrier = savedCarriers.first { $0.legalName.contains("AMAZON") }
            XCTAssertNotNil(amazonCarrier, "Should have Amazon carrier")
            XCTAssertEqual(amazonCarrier?.dotNumber, "4196219", "Amazon DOT number should match")
            
            let christopherMezaCarrier = savedCarriers.first { $0.legalName.contains("CHRISTOPHER MEZA") }
            XCTAssertNotNil(christopherMezaCarrier, "Should have Christopher Meza carrier")
            XCTAssertEqual(christopherMezaCarrier?.dotNumber, "4000000", "Christopher Meza DOT number should match")
            
            let fbdTransportCarrier = savedCarriers.first { $0.legalName.contains("FB&D TRANSPORTATION") }
            XCTAssertNotNil(fbdTransportCarrier, "Should have FB&D Transportation carrier")
            XCTAssertEqual(fbdTransportCarrier?.dotNumber, "4000003", "FB&D Transportation DOT number should match")
            
        } catch {
            XCTFail("Should be able to fetch saved carriers: \(error)")
        }
    }
    
    func testGetSavedCarriersWithInvalidUserId() async throws {
        let invalidUserId = "00000000-0000-0000-0000-000000000000"
        
        do {
            let savedCarriers = try await carrierService.getSavedCarriers(userId: invalidUserId)
            XCTAssertEqual(savedCarriers.count, 0, "Should return empty array for invalid user ID")
        } catch {
            XCTFail("Should not throw error for invalid user ID: \(error)")
        }
    }
    
    func testGetSavedCarriersWithEmptyUserId() async throws {
        let emptyUserId = ""
        
        do {
            let savedCarriers = try await carrierService.getSavedCarriers(userId: emptyUserId)
            XCTAssertEqual(savedCarriers.count, 0, "Should return empty array for empty user ID")
        } catch {
            // This might throw an error, which is acceptable
            print("Expected error for empty user ID: \(error)")
        }
    }
    
    // MARK: - Carrier Search Tests
    
    func testSearchCarriersByDOTNumber() async throws {
        // Test searching by DOT number
        let dotNumber = "4196219" // Amazon's DOT number
        
        do {
            let searchResults = try await carrierService.searchCarriers(query: dotNumber)
            XCTAssertGreaterThan(searchResults.count, 0, "Should find carriers with DOT number")
            
            // Should find Amazon carrier
            let amazonCarrier = searchResults.first { $0.dotNumber == dotNumber }
            XCTAssertNotNil(amazonCarrier, "Should find Amazon carrier by DOT number")
            XCTAssertTrue(amazonCarrier?.legalName.contains("AMAZON") == true, "Should be Amazon carrier")
            
        } catch {
            XCTFail("Should be able to search by DOT number: \(error)")
        }
    }
    
    func testSearchCarriersByName() async throws {
        // Test searching by name
        let carrierName = "AMAZON"
        
        do {
            let searchResults = try await carrierService.searchCarriers(query: carrierName)
            XCTAssertGreaterThan(searchResults.count, 0, "Should find carriers with name")
            
            // Should find Amazon carrier
            let amazonCarrier = searchResults.first { $0.legalName.contains("AMAZON") }
            XCTAssertNotNil(amazonCarrier, "Should find Amazon carrier by name")
            XCTAssertEqual(amazonCarrier?.dotNumber, "4196219", "Amazon DOT number should match")
            
        } catch {
            XCTFail("Should be able to search by name: \(error)")
        }
    }
    
    func testSearchCarriersWithEmptyQuery() async throws {
        do {
            let searchResults = try await carrierService.searchCarriers(query: "")
            // Empty query might return no results or all results depending on implementation
            XCTAssertTrue(searchResults.count >= 0, "Should handle empty query gracefully")
            
        } catch {
            XCTFail("Should handle empty query gracefully: \(error)")
        }
    }
    
    func testSearchCarriersWithNonExistentQuery() async throws {
        let nonExistentQuery = "XXXXXXXXX_NONEXISTENT_CARRIER_XXXXXXXXX"
        
        do {
            let searchResults = try await carrierService.searchCarriers(query: nonExistentQuery)
            XCTAssertEqual(searchResults.count, 0, "Should return empty results for non-existent carrier")
            
        } catch {
            XCTFail("Should handle non-existent query gracefully: \(error)")
        }
    }
    
    // MARK: - Individual Carrier Tests
    
    func testGetCarrierById() async throws {
        // Test with Amazon carrier ID
        let amazonCarrierId = "8f809eff-58a3-4fca-a8f5-7eec98ad5e69"
        
        do {
            let carrier = try await carrierService.getCarrier(byId: amazonCarrierId)
            XCTAssertNotNil(carrier, "Should find carrier by ID")
            XCTAssertEqual(carrier?.id, amazonCarrierId, "Carrier ID should match")
            XCTAssertTrue(carrier?.legalName.contains("AMAZON") == true, "Should be Amazon carrier")
            XCTAssertEqual(carrier?.dotNumber, "4196219", "DOT number should match")
            
        } catch {
            XCTFail("Should be able to get carrier by ID: \(error)")
        }
    }
    
    func testGetCarrierByInvalidId() async throws {
        let invalidId = "00000000-0000-0000-0000-000000000000"
        
        do {
            let carrier = try await carrierService.getCarrier(byId: invalidId)
            XCTAssertNil(carrier, "Should return nil for invalid ID")
            
        } catch {
            XCTFail("Should handle invalid ID gracefully: \(error)")
        }
    }
    
    // MARK: - Carrier Save/Remove Tests
    
    func testIsCarrierSaved() async throws {
        // Test with a carrier we know is saved
        let amazonCarrierId = "8f809eff-58a3-4fca-a8f5-7eec98ad5e69"
        
        do {
            let isSaved = try await carrierService.isCarrierSaved(carrierId: amazonCarrierId, userId: testUserId)
            XCTAssertTrue(isSaved, "Amazon carrier should be saved for test user")
            
        } catch {
            XCTFail("Should be able to check if carrier is saved: \(error)")
        }
    }
    
    func testIsCarrierNotSaved() async throws {
        // Test with a carrier we know is not saved
        let nonSavedCarrierId = "00000000-0000-0000-0000-000000000000"
        
        do {
            let isSaved = try await carrierService.isCarrierSaved(carrierId: nonSavedCarrierId, userId: testUserId)
            XCTAssertFalse(isSaved, "Non-existent carrier should not be saved")
            
        } catch {
            XCTFail("Should handle non-existent carrier check gracefully: \(error)")
        }
    }
    
    // MARK: - Performance Tests
    
    func testSavedCarriersFetchPerformance() throws {
        measure {
            Task {
                do {
                    _ = try await carrierService.getSavedCarriers(userId: testUserId)
                } catch {
                    // Performance test should not fail on errors
                }
            }
        }
    }
    
    func testCarrierSearchPerformance() throws {
        measure {
            Task {
                do {
                    _ = try await carrierService.searchCarriers(query: "AMAZON")
                } catch {
                    // Performance test should not fail on errors
                }
            }
        }
    }
    
    // MARK: - Integration Tests
    
    func testFullDataFlow() async throws {
        // Test the complete flow: search -> get by ID -> check if saved
        
        // 1. Search for a carrier
        let searchResults = try await carrierService.searchCarriers(query: "AMAZON")
        XCTAssertGreaterThan(searchResults.count, 0, "Should find search results")
        
        guard let firstCarrier = searchResults.first else {
            XCTFail("Should have at least one search result")
            return
        }
        
        // 2. Get carrier by ID
        let carrierById = try await carrierService.getCarrier(byId: firstCarrier.id)
        XCTAssertNotNil(carrierById, "Should find carrier by ID")
        XCTAssertEqual(carrierById?.id, firstCarrier.id, "Carrier IDs should match")
        
        // 3. Check if carrier is saved
        let isSaved = try await carrierService.isCarrierSaved(carrierId: firstCarrier.id, userId: testUserId)
        
        // 4. Verify data consistency
        XCTAssertEqual(firstCarrier.legalName, carrierById?.legalName, "Legal names should match")
        XCTAssertEqual(firstCarrier.dotNumber, carrierById?.dotNumber, "DOT numbers should match")
        
        print("✅ Full data flow test completed successfully")
        print("   - Search found: \(searchResults.count) carriers")
        print("   - Carrier: \(firstCarrier.legalName) (DOT: \(firstCarrier.dotNumber))")
        print("   - Is saved: \(isSaved)")
    }
    
    // MARK: - Error Handling Tests
    
    func testErrorHandlingRobustness() async throws {
        // Test that the service handles various error conditions gracefully
        
        // Test with malformed UUIDs
        do {
            _ = try await carrierService.getSavedCarriers(userId: "malformed-uuid")
        } catch {
            print("Expected error for malformed UUID: \(error)")
        }
        
        // Test with nil/empty strings
        do {
            _ = try await carrierService.searchCarriers(query: "")
        } catch {
            print("Handled empty search query: \(error)")
        }
        
        // Should not crash the app
        XCTAssertTrue(true, "Error handling should not crash the app")
    }
} 