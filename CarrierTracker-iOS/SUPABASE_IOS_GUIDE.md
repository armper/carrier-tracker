# Supabase iOS Integration Guide

## Setup & Installation

### Swift Package Manager
Add the Supabase Swift SDK to your iOS project:

1. In Xcode, go to `File` → `Add Package Dependencies`
2. Enter the repository URL: `https://github.com/supabase/supabase-swift`
3. Choose version `2.0.0` or later
4. Select `Supabase` from the package products

### CocoaPods (Alternative)
Add to your `Podfile`:
```ruby
pod 'Supabase', '~> 2.0'
```

### Manual Installation
Download the latest release from the [GitHub repository](https://github.com/supabase/supabase-swift) and add the framework to your project.

## Configuration

### Environment Configuration
Create a `Config.swift` file:
```swift
import Foundation

struct Config {
    static let supabaseURL = URL(string: "https://axmnmxwjijsigiueednz.supabase.co")!
    static let supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    
    // Optional: Custom headers
    static let headers = [
        "X-Client-Info": "carriertracker-ios/1.0.0"
    ]
}
```

### Supabase Client Setup
Create a `SupabaseManager.swift` file:
```swift
import Supabase
import Foundation

class SupabaseManager: ObservableObject {
    static let shared = SupabaseManager()
    
    let client: SupabaseClient
    
    private init() {
        client = SupabaseClient(
            supabaseURL: Config.supabaseURL,
            supabaseKey: Config.supabaseKey,
            options: SupabaseClientOptions(
                db: SupabaseClientOptions.DatabaseOptions(
                    schema: "public"
                ),
                auth: SupabaseClientOptions.AuthOptions(
                    autoRefreshToken: true,
                    persistSession: true,
                    detectSessionInUrl: true
                ),
                global: SupabaseClientOptions.GlobalOptions(
                    headers: Config.headers
                )
            )
        )
    }
}
```

## Authentication

### User Registration
```swift
import Supabase

class AuthService: ObservableObject {
    private let supabase = SupabaseManager.shared.client
    @Published var user: User?
    @Published var isAuthenticated = false
    
    func signUp(email: String, password: String, userType: String = "other") async throws {
        let response = try await supabase.auth.signUp(
            email: email,
            password: password,
            data: [
                "user_type": .string(userType),
                "full_name": .string("") // Optional
            ]
        )
        
        if let user = response.user {
            self.user = user
            self.isAuthenticated = true
        }
    }
    
    func signIn(email: String, password: String) async throws {
        let response = try await supabase.auth.signIn(
            email: email,
            password: password
        )
        
        if let user = response.user {
            self.user = user
            self.isAuthenticated = true
        }
    }
    
    func signOut() async throws {
        try await supabase.auth.signOut()
        self.user = nil
        self.isAuthenticated = false
    }
    
    func getCurrentUser() async throws -> User? {
        let user = try await supabase.auth.user()
        self.user = user
        self.isAuthenticated = user != nil
        return user
    }
}
```

### Session Management
```swift
class SessionManager: ObservableObject {
    private let supabase = SupabaseManager.shared.client
    @Published var session: Session?
    
    init() {
        // Listen for auth state changes
        supabase.auth.onAuthStateChange { [weak self] event, session in
            DispatchQueue.main.async {
                self?.session = session
            }
        }
    }
    
    func restoreSession() async {
        do {
            let session = try await supabase.auth.session
            DispatchQueue.main.async {
                self.session = session
            }
        } catch {
            print("Failed to restore session: \(error)")
        }
    }
}
```

## Data Models

### User Profile
```swift
import Foundation

struct UserProfile: Codable, Identifiable {
    let id: UUID
    let email: String
    let fullName: String?
    let companyName: String?
    let userType: String
    let isAdmin: Bool
    let createdAt: Date
    let updatedAt: Date
    
    enum CodingKeys: String, CodingKey {
        case id, email
        case fullName = "full_name"
        case companyName = "company_name"
        case userType = "user_type"
        case isAdmin = "is_admin"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
}
```

### Carrier
```swift
import Foundation

struct Carrier: Codable, Identifiable {
    let id: UUID
    let dotNumber: String
    let legalName: String
    let dbaName: String?
    let mcNumber: String?
    let physicalAddress: String?
    let city: String?
    let state: String?
    let phone: String?
    let email: String?
    let website: String?
    let safetyRating: String?
    let insuranceStatus: String?
    let authorityStatus: String?
    let vehicleCount: Int?
    let driverCount: Int?
    let yearsInBusiness: Int?
    let createdAt: Date
    let updatedAt: Date
    
    enum CodingKeys: String, CodingKey {
        case id
        case dotNumber = "dot_number"
        case legalName = "legal_name"
        case dbaName = "dba_name"
        case mcNumber = "mc_number"
        case physicalAddress = "physical_address"
        case city, state, phone, email, website
        case safetyRating = "safety_rating"
        case insuranceStatus = "insurance_status"
        case authorityStatus = "authority_status"
        case vehicleCount = "vehicle_count"
        case driverCount = "driver_count"
        case yearsInBusiness = "years_in_business"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
}
```

### Saved Carrier
```swift
import Foundation

struct SavedCarrier: Codable, Identifiable {
    let id: UUID
    let userId: UUID
    let carrierId: UUID
    let notes: String?
    let createdAt: Date
    let carrier: Carrier?
    
    enum CodingKeys: String, CodingKey {
        case id
        case userId = "user_id"
        case carrierId = "carrier_id"
        case notes
        case createdAt = "created_at"
        case carrier
    }
}
```

## Data Services

### Carrier Service
```swift
import Supabase
import Foundation

class CarrierService: ObservableObject {
    private let supabase = SupabaseManager.shared.client
    @Published var carriers: [Carrier] = []
    @Published var isLoading = false
    @Published var error: String?
    
    func searchCarriers(query: String, state: String? = nil, limit: Int = 20) async throws -> [Carrier] {
        isLoading = true
        defer { isLoading = false }
        
        var request = supabase
            .from("carriers")
            .select()
            .limit(limit)
        
        if !query.isEmpty {
            request = request.or("legal_name.ilike.%\(query)%,dot_number.ilike.%\(query)%")
        }
        
        if let state = state {
            request = request.eq("state", value: state)
        }
        
        let response: [Carrier] = try await request.execute().value
        
        DispatchQueue.main.async {
            self.carriers = response
        }
        
        return response
    }
    
    func getCarrierByDotNumber(_ dotNumber: String) async throws -> Carrier? {
        let response: [Carrier] = try await supabase
            .from("carriers")
            .select()
            .eq("dot_number", value: dotNumber)
            .limit(1)
            .execute()
            .value
        
        return response.first
    }
    
    func getCarrierById(_ id: UUID) async throws -> Carrier? {
        let response: [Carrier] = try await supabase
            .from("carriers")
            .select()
            .eq("id", value: id)
            .limit(1)
            .execute()
            .value
        
        return response.first
    }
}
```

### Saved Carriers Service
```swift
import Supabase
import Foundation

class SavedCarriersService: ObservableObject {
    private let supabase = SupabaseManager.shared.client
    @Published var savedCarriers: [SavedCarrier] = []
    @Published var isLoading = false
    
    func getSavedCarriers(userId: UUID) async throws -> [SavedCarrier] {
        isLoading = true
        defer { isLoading = false }
        
        let response: [SavedCarrier] = try await supabase
            .from("saved_carriers")
            .select("""
                *,
                carriers:carrier_id (
                    id,
                    dot_number,
                    legal_name,
                    dba_name,
                    city,
                    state,
                    safety_rating,
                    insurance_status
                )
            """)
            .eq("user_id", value: userId)
            .order("created_at", ascending: false)
            .execute()
            .value
        
        DispatchQueue.main.async {
            self.savedCarriers = response
        }
        
        return response
    }
    
    func saveCarrier(userId: UUID, carrierId: UUID, notes: String? = nil) async throws {
        let savedCarrier = [
            "user_id": userId.uuidString,
            "carrier_id": carrierId.uuidString,
            "notes": notes
        ]
        
        try await supabase
            .from("saved_carriers")
            .insert(savedCarrier)
            .execute()
    }
    
    func removeSavedCarrier(id: UUID) async throws {
        try await supabase
            .from("saved_carriers")
            .delete()
            .eq("id", value: id)
            .execute()
    }
    
    func updateNotes(id: UUID, notes: String) async throws {
        try await supabase
            .from("saved_carriers")
            .update(["notes": notes])
            .eq("id", value: id)
            .execute()
    }
}
```

### Insurance Service
```swift
import Supabase
import Foundation

class InsuranceService: ObservableObject {
    private let supabase = SupabaseManager.shared.client
    
    func submitInsuranceInfo(
        carrierId: UUID,
        provider: String,
        policyNumber: String,
        effectiveDate: Date,
        expirationDate: Date,
        coverageAmount: Int
    ) async throws {
        let insuranceData = [
            "carrier_id": carrierId.uuidString,
            "insurance_provider": provider,
            "policy_number": policyNumber,
            "effective_date": ISO8601DateFormatter().string(from: effectiveDate),
            "expiration_date": ISO8601DateFormatter().string(from: expirationDate),
            "coverage_amount": coverageAmount
        ] as [String: Any]
        
        try await supabase
            .from("carrier_insurance_info")
            .insert(insuranceData)
            .execute()
    }
    
    func getCarrierInsurance(carrierId: UUID) async throws -> [CarrierInsurance] {
        let response: [CarrierInsurance] = try await supabase
            .from("carrier_insurance_info")
            .select()
            .eq("carrier_id", value: carrierId)
            .eq("is_active", value: true)
            .order("created_at", ascending: false)
            .execute()
            .value
        
        return response
    }
}
```

## Real-time Updates

### Real-time Subscription
```swift
import Supabase
import Foundation

class RealTimeService: ObservableObject {
    private let supabase = SupabaseManager.shared.client
    private var subscription: RealtimeSubscription?
    
    func subscribeTo(table: String, userId: UUID? = nil, onUpdate: @escaping (RealtimePayload) -> Void) {
        var channel = supabase.realtimeV2.channel("public:\(table)")
        
        if let userId = userId {
            channel = channel.on(.postgresChanges(
                PostgresChangesConfig(
                    event: .all,
                    schema: "public",
                    table: table,
                    filter: "user_id=eq.\(userId.uuidString)"
                )
            )) { payload in
                onUpdate(payload)
            }
        } else {
            channel = channel.on(.postgresChanges(
                PostgresChangesConfig(
                    event: .all,
                    schema: "public",
                    table: table
                )
            )) { payload in
                onUpdate(payload)
            }
        }
        
        subscription = channel.subscribe()
    }
    
    func unsubscribe() {
        subscription?.unsubscribe()
        subscription = nil
    }
}
```

### Usage in SwiftUI
```swift
import SwiftUI

struct CarrierListView: View {
    @StateObject private var carrierService = CarrierService()
    @StateObject private var realTimeService = RealTimeService()
    @State private var searchText = ""
    
    var body: some View {
        NavigationView {
            List(carrierService.carriers) { carrier in
                CarrierRowView(carrier: carrier)
            }
            .searchable(text: $searchText)
            .onSubmit(of: .search) {
                Task {
                    try await carrierService.searchCarriers(query: searchText)
                }
            }
            .onAppear {
                realTimeService.subscribeTo(table: "carriers") { payload in
                    // Handle real-time updates
                    print("Carrier updated: \(payload)")
                }
            }
            .onDisappear {
                realTimeService.unsubscribe()
            }
        }
    }
}
```

## Error Handling

### Custom Error Types
```swift
import Foundation

enum CarrierTrackerError: Error, LocalizedError {
    case networkError(String)
    case authenticationError(String)
    case dataError(String)
    case unknownError
    
    var errorDescription: String? {
        switch self {
        case .networkError(let message):
            return "Network Error: \(message)"
        case .authenticationError(let message):
            return "Authentication Error: \(message)"
        case .dataError(let message):
            return "Data Error: \(message)"
        case .unknownError:
            return "An unknown error occurred"
        }
    }
}
```

### Error Handling in Services
```swift
extension CarrierService {
    func handleError(_ error: Error) -> CarrierTrackerError {
        if let postgrestError = error as? PostgrestError {
            return .dataError(postgrestError.message)
        } else if let authError = error as? AuthError {
            return .authenticationError(authError.description)
        } else {
            return .unknownError
        }
    }
}
```

## Testing

### Unit Tests
```swift
import XCTest
@testable import CarrierTracker

class CarrierServiceTests: XCTestCase {
    var carrierService: CarrierService!
    
    override func setUp() {
        super.setUp()
        carrierService = CarrierService()
    }
    
    func testSearchCarriers() async throws {
        let carriers = try await carrierService.searchCarriers(query: "ABC")
        XCTAssertFalse(carriers.isEmpty)
    }
    
    func testGetCarrierByDotNumber() async throws {
        let carrier = try await carrierService.getCarrierByDotNumber("123456")
        XCTAssertNotNil(carrier)
        XCTAssertEqual(carrier?.dotNumber, "123456")
    }
}
```

### Integration Tests
```swift
class AuthServiceTests: XCTestCase {
    var authService: AuthService!
    
    override func setUp() {
        super.setUp()
        authService = AuthService()
    }
    
    func testSignUpAndSignIn() async throws {
        let testEmail = "test@example.com"
        let testPassword = "testpassword123"
        
        // Sign up
        try await authService.signUp(
            email: testEmail,
            password: testPassword,
            userType: "broker"
        )
        
        XCTAssertTrue(authService.isAuthenticated)
        XCTAssertNotNil(authService.user)
        
        // Sign out
        try await authService.signOut()
        XCTAssertFalse(authService.isAuthenticated)
        
        // Sign in
        try await authService.signIn(email: testEmail, password: testPassword)
        XCTAssertTrue(authService.isAuthenticated)
    }
}
```

## Performance Optimization

### Caching
```swift
import Foundation

class CacheManager {
    private let cache = NSCache<NSString, AnyObject>()
    
    func set<T: Codable>(_ object: T, forKey key: String) {
        let data = try? JSONEncoder().encode(object)
        cache.setObject(data as AnyObject, forKey: key as NSString)
    }
    
    func get<T: Codable>(_ type: T.Type, forKey key: String) -> T? {
        guard let data = cache.object(forKey: key as NSString) as? Data else {
            return nil
        }
        return try? JSONDecoder().decode(type, from: data)
    }
    
    func remove(forKey key: String) {
        cache.removeObject(forKey: key as NSString)
    }
}
```

### Image Loading
```swift
import SwiftUI

struct AsyncImageView: View {
    let url: URL?
    let placeholder: Image
    
    var body: some View {
        AsyncImage(url: url) { image in
            image
                .resizable()
                .aspectRatio(contentMode: .fit)
        } placeholder: {
            placeholder
                .foregroundColor(.gray)
        }
    }
}
```

## Security Best Practices

### Secure Storage
```swift
import Security

class KeychainManager {
    static let shared = KeychainManager()
    
    private let service = "com.carriertracker.keychain"
    
    func save(_ data: Data, forKey key: String) -> Bool {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
            kSecValueData as String: data
        ]
        
        SecItemDelete(query as CFDictionary)
        return SecItemAdd(query as CFDictionary, nil) == errSecSuccess
    }
    
    func load(forKey key: String) -> Data? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
            kSecReturnData as String: true
        ]
        
        var item: CFTypeRef?
        if SecItemCopyMatching(query as CFDictionary, &item) == errSecSuccess {
            return item as? Data
        }
        return nil
    }
}
```

### Token Management
```swift
extension AuthService {
    func refreshTokenIfNeeded() async {
        do {
            let session = try await supabase.auth.session
            if let expiresAt = session.expiresAt,
               Date().timeIntervalSince1970 > expiresAt - 300 { // 5 minutes before expiry
                try await supabase.auth.refreshSession()
            }
        } catch {
            print("Token refresh failed: \(error)")
        }
    }
}
```

This comprehensive guide provides everything needed to integrate your CarrierTracker Supabase backend with iOS applications.