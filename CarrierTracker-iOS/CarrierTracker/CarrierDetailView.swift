import SwiftUI

struct CarrierDetailView: View {
    let carrier: Carrier?
    let carrierId: String
    
    @State private var isSaved = false
    @State private var isLoading = true
    @State private var loadedCarrier: Carrier?
    @State private var selectedTab = 0
    @State private var showingRateSubmission = false
    @State private var showingInsuranceInfo = false
    @State private var selectedCommentType: CommentType = .carrierRating
    
    @EnvironmentObject var authManager: AuthManager
    @StateObject private var carrierService = CarrierService.shared
    
    // Initialize with either carrier object or just ID
    init(carrier: Carrier) {
        self.carrier = carrier
        self.carrierId = carrier.id
    }
    
    init(carrierId: String) {
        self.carrier = nil
        self.carrierId = carrierId
    }
    
    private var displayCarrier: Carrier? {
        return carrier ?? loadedCarrier
    }
    
    var body: some View {
        VStack {
            if isLoading {
                ProgressView("Loading carrier details...")
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if let displayCarrier = displayCarrier {
                VStack(spacing: 0) {
                    // Carrier Header
                    carrierHeaderView(displayCarrier)
                    
                    // Tab Navigation
                    tabNavigationView
                    
                    // Tab Content
                    TabView(selection: $selectedTab) {
                        // Overview Tab
                        overviewTabView(displayCarrier)
                            .tag(0)
                        
                        // Reviews Tab
                        reviewsTabView
                            .tag(1)
                        
                        // Comments Tab
                        commentsTabView
                            .tag(2)
                        
                        // Rates Tab
                        ratesTabView
                            .tag(3)
                        
                        // Insurance Tab
                        insuranceTabView
                            .tag(4)
                    }
                    .tabViewStyle(PageTabViewStyle(indexDisplayMode: .never))
                }
            } else {
                VStack(spacing: 16) {
                    Image(systemName: "exclamationmark.triangle")
                        .font(.system(size: 50))
                        .foregroundColor(.orange)
                    
                    Text("Carrier Not Found")
                        .font(.title2)
                        .fontWeight(.semibold)
                    
                    Text("This carrier may have been removed or the ID is invalid.")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                        .multilineTextAlignment(.center)
                }
                .padding()
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            }
        }
        .navigationTitle(displayCarrier?.legalName ?? "Carrier")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                if displayCarrier != nil {
                    Button(action: toggleSave) {
                        Image(systemName: isSaved ? "heart.fill" : "heart")
                            .foregroundColor(isSaved ? .red : .blue)
                    }
                }
            }
        }
        .sheet(isPresented: $showingRateSubmission) {
            if let displayCarrier = displayCarrier {
                RateSubmissionView(carrier: displayCarrier)
            }
        }
        .sheet(isPresented: $showingInsuranceInfo) {
            if let displayCarrier = displayCarrier {
                InsuranceSubmissionView(carrier: displayCarrier)
            }
        }
        .task {
            await loadCarrierIfNeeded()
            await checkIfSaved()
        }
    }
    
    // MARK: - Header View
    private func carrierHeaderView(_ carrier: Carrier) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text(carrier.legalName)
                        .font(.title2)
                        .fontWeight(.bold)
                        .lineLimit(2)
                    
                    if let dbaName = carrier.dbaName {
                        Text("DBA: \(dbaName)")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                    }
                    
                    Text("DOT: \(carrier.dotNumber)")
                        .font(.subheadline)
                        .foregroundColor(.blue)
                }
                
                Spacer()
                
                if let rating = carrier.safetyRating {
                    VStack(spacing: 4) {
                        Text("Safety Rating")
                            .font(.caption)
                            .foregroundColor(.secondary)
                        
                        Text(rating)
                            .font(.subheadline)
                            .fontWeight(.semibold)
                            .foregroundColor(.white)
                            .padding(.horizontal, 12)
                            .padding(.vertical, 6)
                            .background(ratingColor(rating))
                            .cornerRadius(8)
                    }
                }
            }
            
            // Quick Stats
            HStack(spacing: 20) {
                if let drivers = carrier.totalDrivers {
                    statView(title: "Drivers", value: "\(drivers)")
                }
                if let trucks = carrier.totalTrucks {
                    statView(title: "Vehicles", value: "\(trucks)")
                }
                if let status = carrier.operatingStatus {
                    statView(title: "Status", value: status)
                }
            }
        }
        .padding()
        .background(Color(UIColor.secondarySystemBackground))
    }
    
    private func statView(title: String, value: String) -> some View {
        VStack(spacing: 2) {
            Text(value)
                .font(.headline)
                .fontWeight(.semibold)
            Text(title)
                .font(.caption)
                .foregroundColor(.secondary)
        }
    }
    
    // MARK: - Tab Navigation
    private var tabNavigationView: some View {
        HStack(spacing: 0) {
            ForEach(Array(["Overview", "Reviews", "Comments", "Rates", "Insurance"].enumerated()), id: \.offset) { index, title in
                Button(action: { selectedTab = index }) {
                    VStack(spacing: 4) {
                        Text(title)
                            .font(.subheadline)
                            .fontWeight(selectedTab == index ? .semibold : .regular)
                            .foregroundColor(selectedTab == index ? .blue : .secondary)
                        
                        Rectangle()
                            .fill(selectedTab == index ? Color.blue : Color.clear)
                            .frame(height: 2)
                    }
                }
                .frame(maxWidth: .infinity)
            }
        }
        .padding(.horizontal)
        .background(Color(UIColor.systemBackground))
    }
    
    // MARK: - Tab Views
    private func overviewTabView(_ carrier: Carrier) -> some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                // Contact Information
                if carrier.physicalAddress != nil || carrier.phone != nil || carrier.email != nil {
                    sectionCard(title: "Contact Information") {
                        VStack(alignment: .leading, spacing: 8) {
                            if let address = carrier.physicalAddress {
                                infoRow(icon: "location", text: address)
                            }
                            if let phone = carrier.phone {
                                infoRow(icon: "phone", text: phone)
                            }
                            if let email = carrier.email {
                                infoRow(icon: "envelope", text: email)
                            }
                        }
                    }
                }
                
                // Authority Information
                sectionCard(title: "Authority Information") {
                    VStack(alignment: .leading, spacing: 8) {
                        infoRow(icon: "doc.text", text: "DOT: \(carrier.dotNumber)")
                        if let mc = carrier.mcNumber {
                            infoRow(icon: "doc.text", text: "MC: \(mc)")
                        }
                        if let entityType = carrier.entityType {
                            infoRow(icon: "building.2", text: "Type: \(entityType.capitalized)")
                        }
                    }
                }
                
                Spacer(minLength: 100)
            }
            .padding()
        }
    }
    
    private var reviewsTabView: some View {
        VStack(spacing: 20) {
            // Header with star rating display
            VStack(spacing: 12) {
                HStack {
                    VStack(alignment: .leading) {
                        Text("Reviews & Ratings")
                            .font(.title2)
                            .fontWeight(.bold)
                        
                        Text("Share your experience with this carrier")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                    }
                    
                    Spacer()
                }
                
                // Rating summary placeholder
                HStack {
                    VStack(alignment: .leading) {
                        Text("4.3")
                            .font(.system(size: 32, weight: .bold))
                            .foregroundColor(.primary)
                        
                        HStack {
                            ForEach(1...5, id: \.self) { star in
                                Image(systemName: star <= 4 ? "star.fill" : "star")
                                    .foregroundColor(.yellow)
                                    .font(.system(size: 16))
                            }
                        }
                        
                        Text("Based on 23 reviews")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    
                    Spacer()
                    
                    Button("Write Review") {
                        // Action for writing review
                    }
                    .buttonStyle(.borderedProminent)
                }
                .padding()
                .background(Color(UIColor.secondarySystemBackground))
                .cornerRadius(12)
            }
            
            Text("Reviews functionality coming soon!")
                .foregroundColor(.secondary)
                .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
        .padding()
    }
    
    private var commentsTabView: some View {
        VStack(spacing: 0) {
            // Comment Type Filters
            commentTypeSelector
            
            ScrollView {
                CommentThreadView(
                    targetType: selectedCommentType,
                    targetId: carrierId,
                    title: commentTypeTitle(selectedCommentType),
                    showCommentCount: true,
                    allowComments: true
                )
            }
        }
    }
    
    private var commentTypeSelector: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 12) {
                commentTypeButton("General", type: .carrierRating)
                commentTypeButton("Safety", type: .safetyConcern)
                commentTypeButton("Rates", type: .rateSubmission)
                commentTypeButton("Insurance", type: .insuranceInfo)
            }
            .padding(.horizontal)
        }
        .padding(.vertical, 8)
        .background(Color(UIColor.systemBackground))
    }
    
    private func commentTypeButton(_ title: String, type: CommentType) -> some View {
        Button(title) {
            selectedCommentType = type
        }
        .font(.subheadline)
        .fontWeight(.medium)
        .foregroundColor(selectedCommentType == type ? .white : .blue)
        .padding(.horizontal, 16)
        .padding(.vertical, 8)
        .background(selectedCommentType == type ? Color.blue : Color.blue.opacity(0.1))
        .cornerRadius(20)
    }
    
    private var ratesTabView: some View {
        VStack(spacing: 20) {
            // Header
            VStack(spacing: 12) {
                HStack {
                    VStack(alignment: .leading) {
                        Text("Rate Information")
                            .font(.title2)
                            .fontWeight(.bold)
                        
                        Text("Shared by the community")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                    }
                    
                    Spacer()
                }
                
                Button("Submit Rate Information") {
                    showingRateSubmission = true
                }
                .buttonStyle(.borderedProminent)
                .frame(maxWidth: .infinity)
            }
            
            // Sample rate display
            VStack(spacing: 12) {
                HStack {
                    Text("Recent Rate Submissions")
                        .font(.headline)
                    
                    Spacer()
                }
                
                VStack(spacing: 8) {
                    HStack {
                        VStack(alignment: .leading) {
                            Text("$2.85/mile")
                                .font(.headline)
                                .fontWeight(.bold)
                            
                            Text("Chicago to Atlanta • Dry Van")
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                        }
                        
                        Spacer()
                        
                        VStack(alignment: .trailing) {
                            Text("Verified")
                                .font(.caption)
                                .foregroundColor(.green)
                            
                            Text("2 days ago")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                    }
                    .padding()
                    .background(Color(UIColor.secondarySystemBackground))
                    .cornerRadius(8)
                }
            }
            
            Spacer()
        }
        .padding()
    }
    
    private var insuranceTabView: some View {
        VStack(spacing: 20) {
            // Header
            VStack(spacing: 12) {
                HStack {
                    VStack(alignment: .leading) {
                        Text("Insurance Information")
                            .font(.title2)
                            .fontWeight(.bold)
                        
                        Text("Crowdsourced insurance data")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                    }
                    
                    Spacer()
                }
                
                // Warning notice
                HStack {
                    Image(systemName: "info.circle.fill")
                        .foregroundColor(.orange)
                    
                    Text("This information is user-submitted and may not be current or accurate.")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    
                    Spacer()
                }
                .padding()
                .background(Color.orange.opacity(0.1))
                .cornerRadius(8)
                
                Button("Submit Insurance Info") {
                    showingInsuranceInfo = true
                }
                .buttonStyle(.borderedProminent)
                .frame(maxWidth: .infinity)
            }
            
            // Sample insurance display
            VStack(spacing: 12) {
                HStack {
                    Text("Insurance Providers")
                        .font(.headline)
                    
                    Spacer()
                }
                
                VStack(spacing: 8) {
                    HStack {
                        VStack(alignment: .leading) {
                            Text("Progressive Commercial")
                                .font(.subheadline)
                                .fontWeight(.semibold)
                            
                            Text("Liability: $1,000,000 • Cargo: $100,000")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                        
                        Spacer()
                        
                        VStack(alignment: .trailing) {
                            Text("Active")
                                .font(.caption)
                                .foregroundColor(.green)
                            
                            Text("85% confidence")
                                .font(.caption)
                                .foregroundColor(.blue)
                        }
                    }
                    .padding()
                    .background(Color(UIColor.secondarySystemBackground))
                    .cornerRadius(8)
                }
            }
            
            Spacer()
        }
        .padding()
    }
    
    // MARK: - Helper Views
    private func sectionCard<Content: View>(title: String, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(title)
                .font(.headline)
                .fontWeight(.semibold)
            
            content()
        }
        .padding()
        .background(Color(UIColor.secondarySystemBackground))
        .cornerRadius(12)
    }
    
    private func infoRow(icon: String, text: String) -> some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .foregroundColor(.blue)
                .frame(width: 20)
            
            Text(text)
                .foregroundColor(.primary)
            
            Spacer()
        }
    }
    
    // MARK: - Helper Functions
    private func commentTypeTitle(_ type: CommentType) -> String {
        switch type {
        case .carrierRating:
            return "General Discussion"
        case .safetyConcern:
            return "Safety Concerns"
        case .rateSubmission:
            return "Rate Information"
        case .insuranceInfo:
            return "Insurance Discussion"
        case .carrierGeneral:
            return "General Comments"
        }
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
    
    private func loadCarrierIfNeeded() async {
        if carrier == nil {
            isLoading = true
            do {
                loadedCarrier = try await carrierService.getCarrier(byId: carrierId)
            } catch {
                print("Error loading carrier: \(error)")
            }
            isLoading = false
        } else {
            isLoading = false
        }
    }
    
    private func checkIfSaved() async {
        guard let userId = authManager.user?.id.uuidString else { return }
        
        do {
            isSaved = try await CarrierService.shared.isCarrierSaved(carrierId: carrierId, userId: userId)
        } catch {
            print("Error checking saved status: \(error)")
        }
    }
    
    private func toggleSave() {
        guard let userId = authManager.user?.id.uuidString else { return }
        
        Task {
            do {
                if isSaved {
                    try await CarrierService.shared.removeSavedCarrier(carrierId: carrierId, userId: userId)
                } else {
                    try await CarrierService.shared.saveCarrier(carrierId: carrierId, userId: userId)
                }
                isSaved.toggle()
            } catch {
                print("Error toggling save: \(error)")
            }
        }
    }
}

// MARK: - Placeholder Views
struct RateSubmissionView: View {
    let carrier: Carrier
    
    var body: some View {
        NavigationView {
            VStack {
                Text("Rate Submission Form")
                    .font(.title)
                    .padding()
                
                Text("Form for submitting rate information for \(carrier.legalName)")
                    .foregroundColor(.secondary)
                    .multilineTextAlignment(.center)
                    .padding()
                
                Spacer()
            }
            .navigationTitle("Submit Rate")
            .navigationBarTitleDisplayMode(.inline)
        }
    }
}

struct InsuranceSubmissionView: View {
    let carrier: Carrier
    
    var body: some View {
        NavigationView {
            VStack {
                Text("Insurance Submission Form")
                    .font(.title)
                    .padding()
                
                Text("Form for submitting insurance information for \(carrier.legalName)")
                    .foregroundColor(.secondary)
                    .multilineTextAlignment(.center)
                    .padding()
                
                Spacer()
            }
            .navigationTitle("Submit Insurance Info")
            .navigationBarTitleDisplayMode(.inline)
        }
    }
}

#Preview("Detail View with Carrier") {
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
    
    NavigationView {
        CarrierDetailView(carrier: sampleCarrier)
    }
    .environmentObject(AuthManager())
}

#Preview("Loading State") {
    NavigationView {
        CarrierDetailView(carrierId: "loading-carrier-id")
    }
    .environmentObject(AuthManager())
}

#Preview("Dark Mode") {
    let sampleCarrier = Carrier(
        id: "2",
        dotNumber: "789123",
        legalName: "Premium Logistics LLC",
        dbaName: nil,
        physicalAddress: "456 Commerce Blvd, Metro City, CA 90210",
        phone: "(555) 987-6543",
        email: "contact@premiumlogistics.com",
        mcNumber: "MC789123",
        operatingStatus: "Active",
        outOfServiceDate: nil,
        safetyRating: "Conditional",
        totalDrivers: 50,
        totalTrucks: 35,
        totalTrailers: 85,
        entityType: "carrier",
        createdAt: Date(),
        updatedAt: Date()
    )
    
    NavigationView {
        CarrierDetailView(carrier: sampleCarrier)
    }
    .environmentObject(AuthManager())
    .preferredColorScheme(.dark)
}