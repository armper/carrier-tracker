import Foundation

struct Carrier: Codable, Identifiable {
    let id: String
    let dotNumber: String
    let legalName: String
    let dbaName: String?
    let physicalAddress: String?
    let phone: String?
    let email: String?
    let mcNumber: String?
    let operatingStatus: String?
    let outOfServiceDate: String?
    let safetyRating: String?
    let totalDrivers: Int?
    let totalTrucks: Int?
    let totalTrailers: Int?
    let entityType: String?
    let createdAt: Date
    let updatedAt: Date
    
    enum CodingKeys: String, CodingKey {
        case id
        case dotNumber = "dot_number"
        case legalName = "legal_name"
        case dbaName = "dba_name"
        case physicalAddress = "physical_address"
        case phone
        case email
        case mcNumber = "mc_number"
        case operatingStatus = "operating_status"
        case outOfServiceDate = "out_of_service_date"
        case safetyRating = "safety_rating"
        case totalDrivers = "driver_count"
        case totalTrucks = "vehicle_count"
        case totalTrailers = "total_trailers"
        case entityType = "entity_type"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
}

enum EntityType: String, Codable, CaseIterable {
    case carrier = "carrier"
    case broker = "broker"
    case shipper = "shipper"
    case privateCarrier = "private_carrier"
    case other = "other"
}