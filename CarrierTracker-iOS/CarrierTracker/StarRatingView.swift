import SwiftUI

struct StarRatingView: View {
    let rating: Double
    let maxRating: Int
    let starSize: CGFloat
    let spacing: CGFloat
    let fillColor: Color
    let emptyColor: Color
    
    init(
        rating: Double,
        maxRating: Int = 5,
        starSize: CGFloat = 16,
        spacing: CGFloat = 2,
        fillColor: Color = .yellow,
        emptyColor: Color = .gray.opacity(0.3)
    ) {
        self.rating = rating
        self.maxRating = maxRating
        self.starSize = starSize
        self.spacing = spacing
        self.fillColor = fillColor
        self.emptyColor = emptyColor
    }
    
    var body: some View {
        HStack(spacing: spacing) {
            ForEach(1...maxRating, id: \.self) { index in
                starImage(for: index)
                    .font(.system(size: starSize))
                    .foregroundColor(starColor(for: index))
            }
        }
    }
    
    private func starImage(for index: Int) -> Image {
        let starValue = Double(index)
        
        if rating >= starValue {
            return Image(systemName: "star.fill")
        } else if rating >= starValue - 0.5 {
            return Image(systemName: "star.leadinghalf.filled")
        } else {
            return Image(systemName: "star")
        }
    }
    
    private func starColor(for index: Int) -> Color {
        let starValue = Double(index)
        return rating >= starValue - 0.5 ? fillColor : emptyColor
    }
}

struct InteractiveStarRatingView: View {
    @Binding var rating: Int
    let maxRating: Int
    let starSize: CGFloat
    let spacing: CGFloat
    let fillColor: Color
    let emptyColor: Color
    
    init(
        rating: Binding<Int>,
        maxRating: Int = 5,
        starSize: CGFloat = 20,
        spacing: CGFloat = 4,
        fillColor: Color = .yellow,
        emptyColor: Color = .gray.opacity(0.3)
    ) {
        self._rating = rating
        self.maxRating = maxRating
        self.starSize = starSize
        self.spacing = spacing
        self.fillColor = fillColor
        self.emptyColor = emptyColor
    }
    
    var body: some View {
        HStack(spacing: spacing) {
            ForEach(1...maxRating, id: \.self) { index in
                Button(action: {
                    rating = index
                }) {
                    Image(systemName: index <= rating ? "star.fill" : "star")
                        .font(.system(size: starSize))
                        .foregroundColor(index <= rating ? fillColor : emptyColor)
                }
                .buttonStyle(PlainButtonStyle())
            }
        }
    }
}

struct RatingCategoryView: View {
    let title: String
    let rating: Double
    let showNumeric: Bool
    
    init(title: String, rating: Double, showNumeric: Bool = true) {
        self.title = title
        self.rating = rating
        self.showNumeric = showNumeric
    }
    
    var body: some View {
        HStack {
            Text(title)
                .font(.subheadline)
                .foregroundColor(.secondary)
                .frame(width: 100, alignment: .leading)
            
            StarRatingView(rating: rating, starSize: 14)
            
            if showNumeric && rating > 0 {
                Text(String(format: "%.1f", rating))
                    .font(.caption)
                    .foregroundColor(.secondary)
                    .frame(width: 30, alignment: .trailing)
            }
            
            Spacer()
        }
    }
}

struct RatingSummaryView: View {
    let averageRating: Double
    let totalReviews: Int
    let showBreakdown: Bool
    
    init(averageRating: Double, totalReviews: Int, showBreakdown: Bool = true) {
        self.averageRating = averageRating
        self.totalReviews = totalReviews
        self.showBreakdown = showBreakdown
    }
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(alignment: .bottom, spacing: 8) {
                Text(String(format: "%.1f", averageRating))
                    .font(.system(size: 32, weight: .bold))
                    .foregroundColor(.primary)
                
                VStack(alignment: .leading, spacing: 2) {
                    StarRatingView(rating: averageRating, starSize: 18)
                    
                    Text("\(totalReviews) review\(totalReviews == 1 ? "" : "s")")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
            
            if showBreakdown && totalReviews > 0 {
                VStack(alignment: .leading, spacing: 4) {
                    ratingBar(stars: 5, count: 0) // These would be calculated from actual data
                    ratingBar(stars: 4, count: 0)
                    ratingBar(stars: 3, count: 0)
                    ratingBar(stars: 2, count: 0)
                    ratingBar(stars: 1, count: 0)
                }
                .padding(.top, 4)
            }
        }
    }
    
    private func ratingBar(stars: Int, count: Int) -> some View {
        HStack(spacing: 8) {
            Text("\(stars)")
                .font(.caption)
                .foregroundColor(.secondary)
                .frame(width: 12)
            
            Image(systemName: "star.fill")
                .font(.system(size: 10))
                .foregroundColor(.yellow)
            
            GeometryReader { geometry in
                ZStack(alignment: .leading) {
                    Rectangle()
                        .fill(Color.gray.opacity(0.2))
                        .frame(height: 4)
                        .cornerRadius(2)
                    
                    Rectangle()
                        .fill(Color.yellow)
                        .frame(width: progressWidth(for: count, total: totalReviews, maxWidth: geometry.size.width), height: 4)
                        .cornerRadius(2)
                }
            }
            .frame(height: 4)
            
            Text("\(count)")
                .font(.caption)
                .foregroundColor(.secondary)
                .frame(width: 20, alignment: .trailing)
        }
    }
    
    private func progressWidth(for count: Int, total: Int, maxWidth: CGFloat) -> CGFloat {
        guard total > 0 else { return 0 }
        return maxWidth * CGFloat(count) / CGFloat(total)
    }
}

#Preview {
    VStack(spacing: 30) {
        StarRatingView(rating: 4.5)
        
        InteractiveStarRatingView(rating: .constant(3))
        
        RatingCategoryView(title: "Payment", rating: 4.2)
        
        RatingSummaryView(averageRating: 4.3, totalReviews: 127)
    }
    .padding()
} 