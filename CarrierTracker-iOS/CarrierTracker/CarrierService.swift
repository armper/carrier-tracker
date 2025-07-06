import Foundation
import Supabase

class CarrierService: ObservableObject {
    static let shared = CarrierService()
    private let supabase = SupabaseService.shared.client
    
    func searchCarriers(query: String) async throws -> [Carrier] {
        // Check if query is numeric (for DOT number search)
        let trimmedQuery = query.trimmingCharacters(in: .whitespacesAndNewlines)
        
        let carriers: [Carrier]
        
        if trimmedQuery.allSatisfy({ $0.isNumber }) {
            // If query is all numeric, search DOT number exactly first, then with pattern
            carriers = try await supabase
                .from("carriers")
                .select()
                .or("dot_number.eq.\(trimmedQuery),legal_name.ilike.%\(trimmedQuery)%,dba_name.ilike.%\(trimmedQuery)%")
                .limit(20)
                .execute()
                .value
        } else {
            // For text queries, search name fields and DOT number pattern
            carriers = try await supabase
                .from("carriers")
                .select()
                .or("legal_name.ilike.%\(trimmedQuery)%,dba_name.ilike.%\(trimmedQuery)%,dot_number.ilike.%\(trimmedQuery)%")
                .limit(20)
                .execute()
                .value
        }
        
        return carriers
    }
    
    func getCarrier(byId id: String) async throws -> Carrier? {
        let carriers: [Carrier] = try await supabase
            .from("carriers")
            .select()
            .eq("id", value: id)
            .limit(1)
            .execute()
            .value
        
        return carriers.first
    }
    
    func getCarrierComments(carrierId: String) async throws -> [CarrierCommentWithProfile] {
        let comments: [CarrierCommentWithProfile] = try await supabase
            .from("carrier_comments")
            .select("*, profile:profiles(*)")
            .eq("carrier_id", value: carrierId)
            .order("created_at", ascending: false)
            .execute()
            .value
        
        return comments
    }
    
    func addCarrierComment(carrierId: String, content: String) async throws {
        let comment = [
            "carrier_id": carrierId,
            "content": content
        ]
        
        try await supabase
            .from("carrier_comments")
            .insert(comment)
            .execute()
    }
    
    func getSavedCarriers(userId: String) async throws -> [Carrier] {
        print("🔄 Fetching saved carriers for user: \(userId)")
        
        struct SavedCarrier: Codable {
            let carrierId: String
            
            enum CodingKeys: String, CodingKey {
                case carrierId = "carrier_id"
            }
        }
        
        do {
            // First get the saved carrier IDs
            let savedCarriers: [SavedCarrier] = try await supabase
                .from("saved_carriers")
                .select("carrier_id")
                .eq("user_id", value: userId)
                .execute()
                .value
            
            print("✅ Found \(savedCarriers.count) saved carriers")
            let carrierIds = savedCarriers.map { $0.carrierId }
            
            // If no saved carriers, return empty array
            guard !carrierIds.isEmpty else {
                print("ℹ️ No saved carriers found for user")
                return []
            }
            
            print("🔄 Fetching carrier details for IDs: \(carrierIds)")
            
            // Then fetch the actual carrier data
            let carriers: [Carrier] = try await supabase
                .from("carriers")
                .select()
                .in("id", values: carrierIds)
                .execute()
                .value
            
            print("✅ Successfully fetched \(carriers.count) carrier details")
            return carriers
            
        } catch {
            print("❌ Error fetching saved carriers: \(error)")
            print("❌ Error details: \(error.localizedDescription)")
            throw error
        }
    }
    
    func saveCarrier(carrierId: String, userId: String, notes: String? = nil) async throws {
        let savedCarrier = [
            "carrier_id": carrierId,
            "user_id": userId,
            "notes": notes ?? ""
        ]
        
        try await supabase
            .from("saved_carriers")
            .insert(savedCarrier)
            .execute()
    }
    
    func removeSavedCarrier(carrierId: String, userId: String) async throws {
        try await supabase
            .from("saved_carriers")
            .delete()
            .eq("carrier_id", value: carrierId)
            .eq("user_id", value: userId)
            .execute()
    }
    
    func isCarrierSaved(carrierId: String, userId: String) async throws -> Bool {
        struct SavedCarrierCount: Codable {
            let count: Int
        }
        
        let result: [SavedCarrierCount] = try await supabase
            .from("saved_carriers")
            .select("count(*)")
            .eq("carrier_id", value: carrierId)
            .eq("user_id", value: userId)
            .execute()
            .value
        
        return result.first?.count ?? 0 > 0
    }
}