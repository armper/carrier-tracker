# CarrierTracker Unified MVP Roadmap

**Consolidated and refined feature list prioritized by business impact and implementation effort**

## 🏆 TIER 1: Maximum Impact / Minimum Effort (Build First)

### 1. Automated Daily Data Refresh ⭐⭐⭐⭐⭐ 
**Impact**: Very High | **Effort**: Medium | **Revenue Impact**: $$$
- **Status**: Not Started
- **Why #1**: Differentiates from all competitors, justifies premium pricing
- Background job refreshing 100-500 carriers daily via FMCSA API
- Email notifications for watched carrier updates
- Premium users get priority refresh queue

### 2. Insurance Expiration Tracking ⭐⭐⭐⭐⭐
**Impact**: Very High | **Effort**: Medium | **Revenue Impact**: $$$
- **Status**: Not Started  
- **Why Critical**: Freight brokers' #1 pain point, massive competitive advantage
- 30/15/7 day expiration alerts
- Insurance carrier and policy tracking
- Risk scoring based on insurance history

### 3. Enhanced Search & Filtering ⭐⭐⭐⭐⭐
**Impact**: Very High | **Effort**: Low | **Revenue Impact**: $$
- **Status**: ✅ Completed
- Filter by state/city, safety rating, insurance status
- Advanced multi-criteria search
- Sort by DOT number, name, safety rating

### 4. Basic Alerts System ⭐⭐⭐⭐⭐
**Impact**: Very High | **Effort**: Medium | **Revenue Impact**: $$$
- **Status**: ✅ Completed
- Email notifications for carrier status changes
- Alert preferences (safety rating, insurance lapses)
- Weekly digest emails for account managers

## 🚀 TIER 2: High Impact Features (Build Next)

### 5. DOT Safety Rating History ⭐⭐⭐⭐
**Impact**: High | **Effort**: Medium | **Revenue Impact**: $$
- **Status**: Not Started
- Track historical safety rating changes over time
- Show rating trends and stability analysis
- Alert when ratings change (upgrade/downgrade)
- Risk scoring based on rating volatility

### 6. Real-time Inspection Alerts ⭐⭐⭐⭐⭐
**Impact**: Very High | **Effort**: Very High | **Revenue Impact**: $$$$
- **Status**: Not Started
- Monitor for new DOT inspections and violations
- Immediate alerts for out-of-service orders
- Inspection history trends and patterns
- **Game-changer for freight broker risk management**

### 7. Export Saved Carriers ⭐⭐⭐⭐
**Impact**: High | **Effort**: Low | **Revenue Impact**: $
- **Status**: ✅ Completed
- CSV/Excel export with company branding
- PDF reports for client presentations
- Email delivery option

### 8. Carrier Data Verification System ⭐⭐⭐⭐
**Impact**: High | **Effort**: Low | **Revenue Impact**: $$
- **Status**: ✅ Completed (Backend MVP)
- User reporting for incorrect data
- Admin review queue for corrections
- Trust scores and verification badges

## 🎯 TIER 3: Strong Foundation Features

### 9. Carrier Detail Page ⭐⭐⭐⭐
**Impact**: High | **Effort**: Low | **Revenue Impact**: $
- **Status**: ✅ Completed
- Complete carrier profiles with compliance history
- "Save to Dashboard" functionality
- Contact information and location data

### 10. Basic FMCSA Integration ⭐⭐⭐⭐
**Impact**: Very High | **Effort**: Low | **Revenue Impact**: $$
- **Status**: ✅ Completed (Backend MVP)
- On-demand carrier lookup via DOT number
- Populate legal name, DBA, safety rating, authority status
- 24-hour caching with manual fallback

### 11. Carrier Notes & Tags ⭐⭐⭐
**Impact**: Medium | **Effort**: Low | **Revenue Impact**: $
- **Status**: ✅ Completed
- Rich text notes and tagging system
- Priority levels (high/medium/low)
- Last contacted tracking for relationship management

### 12. CSA BASIC Scores Integration ⭐⭐⭐⭐
**Impact**: Very High | **Effort**: High | **Revenue Impact**: $$$
- **Status**: Not Started
- Import all 7 CSA BASIC categories
- Trend analysis and predictive risk scoring
- Professional-grade carrier analysis tool

## 🔧 TIER 4: User Experience & Retention

### 13. Dashboard Analytics ⭐⭐⭐
**Impact**: Medium | **Effort**: Low | **Revenue Impact**: $
- **Status**: ✅ Completed
- Saved carriers breakdown by safety rating
- Compliance summary widgets
- Risk assessment overview charts

### 14. Bulk Operations ⭐⭐⭐
**Impact**: Medium | **Effort**: Low | **Revenue Impact**: $
- **Status**: ✅ Completed
- Multi-select carriers with checkboxes
- Bulk save/remove, export, tag assignment
- Efficiency tools for power users

### 15. Search History ⭐⭐
**Impact**: Medium | **Effort**: Low | **Revenue Impact**: $
- **Status**: ✅ Completed
- Store user search queries
- Quick access to recent searches
- Popular search suggestions

### 16. Multi-Source Data Aggregation ⭐⭐⭐⭐
**Impact**: Very High | **Effort**: Very High | **Revenue Impact**: $$$$
- **Status**: Not Started
- Combine FMCSA + State DOT + Insurance databases
- Cross-reference and validate across sources
- Most comprehensive carrier database available

## 🏢 TIER 5: Business Growth Features

### 17. Manual Carrier Data Entry ⭐⭐⭐⭐
**Impact**: High | **Effort**: Very Low | **Revenue Impact**: $$
- **Status**: ✅ Completed (Backend MVP)
- Admin interface for data management
- Bulk CSV import functionality
- Immediate competitive advantage

### 18. Data Freshness Indicators ⭐⭐⭐
**Impact**: High | **Effort**: Very Low | **Revenue Impact**: $
- **Status**: ✅ Completed (Backend MVP)
- Color-coded freshness indicators
- Filter by data age
- Trust building and premium justification

### 19. Improved Landing Page ⭐⭐
**Impact**: Medium | **Effort**: Very Low | **Revenue Impact**: $
- **Status**: ✅ Completed
- Testimonials and social proof
- Feature comparison vs carrier411
- Better value proposition messaging

### 20. User Profile Page ⭐⭐
**Impact**: Low | **Effort**: Very Low | **Revenue Impact**: $
- **Status**: ✅ Completed
- Edit user information and preferences
- Account settings and password management
- Future subscription management foundation

---

## 🎯 **IMMEDIATE ACTION PLAN - Top 3 Priorities**

### **Priority #1: Automated Daily Data Refresh**
**Revenue Impact**: High | **Competitive Advantage**: Maximum
- Transforms CarrierTracker from static lookup to dynamic monitoring platform
- Justifies 3-5x premium pricing vs basic competitors
- **Estimated Dev Time**: 2-3 weeks

### **Priority #2: Insurance Expiration Tracking** 
**Revenue Impact**: Very High | **Market Demand**: Critical
- Addresses freight brokers' biggest pain point
- Creates vendor lock-in through critical alerts
- **Estimated Dev Time**: 2-3 weeks

### **Priority #3: Real-time Inspection Alerts**
**Revenue Impact**: Maximum | **Differentiation**: Complete
- No competitor offers real-time DOT inspection monitoring
- Game-changing feature for risk management
- **Estimated Dev Time**: 4-6 weeks

---

## 📊 Implementation Status Summary

**✅ Completed (13/20)**: Enhanced Search, Carrier Detail Pages, Export, Alerts, Notes/Tags, Search History, Analytics, Bulk Ops, Landing Page, User Profile, Manual Data Entry, Data Freshness, FMCSA Integration, Verification System

**🚧 High Priority (3/20)**: Automated Refresh, Insurance Tracking, Inspection Alerts

**📋 Medium Priority (2/20)**: Safety Rating History, CSA BASIC Scores  

**🔮 Future (2/20)**: Multi-Source Aggregation, Advanced Features

---

## 💰 Revenue Impact Analysis

**Tier 1 Features**: $10K-50K+ ARR potential each
**Tier 2 Features**: $5K-15K ARR potential each  
**Tier 3+ Features**: $1K-5K ARR potential each

**Total Addressable Revenue from MVP**: $75K-200K+ ARR

---

*Last Updated: July 1, 2025*
*Next Review: Weekly during active development*