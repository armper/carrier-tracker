import SwiftUI

struct CarrierListView: View {
    @State private var searchText = ""
    @State private var carriers: [Carrier] = []
    @State private var isLoading = false
    @State private var errorMessage = ""
    
    var body: some View {
        NavigationView {
            VStack {
                SearchBar(text: $searchText, onSearchButtonClicked: performSearch)
                
                if isLoading {
                    ProgressView("Searching...")
                        .padding()
                } else if carriers.isEmpty && !searchText.isEmpty {
                    Text("No carriers found")
                        .foregroundColor(.secondary)
                        .padding()
                } else {
                    List(carriers) { carrier in
                        NavigationLink(destination: CarrierDetailView(carrier: carrier)) {
                            CarrierRowView(carrier: carrier)
                        }
                    }
                }
                
                if !errorMessage.isEmpty {
                    Text(errorMessage)
                        .foregroundColor(.red)
                        .padding()
                }
            }
            .navigationTitle("Carriers")
        }
    }
    
    private func performSearch() {
        guard !searchText.isEmpty else { return }
        
        isLoading = true
        errorMessage = ""
        
        Task {
            do {
                carriers = try await CarrierService.shared.searchCarriers(query: searchText)
            } catch {
                errorMessage = "Search failed: \(error.localizedDescription)"
            }
            isLoading = false
        }
    }
}

struct SearchBar: View {
    @Binding var text: String
    var onSearchButtonClicked: () -> Void
    
    var body: some View {
        HStack {
            TextField("Search carriers...", text: $text)
                .textFieldStyle(RoundedBorderTextFieldStyle())
                .onSubmit {
                    onSearchButtonClicked()
                }
            
            Button("Search", action: onSearchButtonClicked)
                .buttonStyle(.borderedProminent)
        }
        .padding()
    }
}

struct CarrierRowView: View {
    let carrier: Carrier
    
    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(carrier.legalName)
                .font(.headline)
            
            HStack {
                Text("DOT: \(carrier.dotNumber)")
                    .font(.caption)
                    .foregroundColor(.secondary)
                
                Spacer()
                
                if let rating = carrier.safetyRating {
                    Text(rating)
                        .font(.caption)
                        .padding(4)
                        .background(ratingColor(rating))
                        .foregroundColor(.white)
                        .cornerRadius(4)
                }
            }
            
            if let address = carrier.physicalAddress {
                Text(address)
                    .font(.caption)
                    .foregroundColor(.secondary)
                    .lineLimit(2)
            }
        }
        .padding(.vertical, 2)
    }
    
    private func ratingColor(_ rating: String) -> Color {
        switch rating.lowercased() {
        case "satisfactory":
            return .green
        case "conditional":
            return .orange
        case "unsatisfactory":
            return .red
        default:
            return .gray
        }
    }
}

#Preview("Carrier List") {
    CarrierListView()
}

#Preview("Dark Mode") {
    CarrierListView()
        .preferredColorScheme(.dark)
}

#Preview("Search Bar") {
    SearchBar(text: .constant("Sample Search")) {
        print("Search performed")
    }
}

#Preview("Carrier Row") {
    let sampleCarrier = Carrier(
        id: "1",
        dotNumber: "123456",
        legalName: "Sample Trucking Company",
        dbaName: "Sample Trucking",
        physicalAddress: "123 Main St, City, ST 12345",
        phone: "(555) 123-4567",
        email: "info@sampletrucking.com",
        mcNumber: "MC123456",
        operatingStatus: "Active",
        outOfServiceDate: nil,
        safetyRating: "Satisfactory",
        totalDrivers: 25,
        totalTrucks: 18,
        totalTrailers: 45,
        entityType: "carrier",
        createdAt: Date(),
        updatedAt: Date()
    )
    
    CarrierRowView(carrier: sampleCarrier)
        .padding()
}