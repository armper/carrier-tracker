# CarrierTracker MVP Feature Roadmap

Prioritized feature list ordered by impact/effort ratio for the carrier411 competitor.

## 🚀 High Impact / Low Effort Features

### 1. Enhanced Search & Filtering ⭐⭐⭐⭐⭐
**Impact**: Very High | **Effort**: Low | **Priority**: 1

**Database Changes Required**:
```sql
ALTER TABLE carriers ADD COLUMN state TEXT;
ALTER TABLE carriers ADD COLUMN city TEXT; 
ALTER TABLE carriers ADD COLUMN vehicle_count INTEGER;
```

**Features to Add**:
- Filter by state/city dropdown
- Filter by safety rating (dropdown)
- Filter by insurance status
- Sort by DOT number, company name, safety rating
- Advanced search with multiple criteria

**Technical Implementation**:
- Update search API with query parameters
- Add filter UI components using React Aria
- Enhance SQL queries with WHERE clauses
- Add sorting functionality

---

### 2. Carrier Detail Page ⭐⭐⭐⭐⭐
**Impact**: Very High | **Effort**: Low | **Priority**: 2

**Features**:
- Create `/carrier/[dot_number]` dynamic route
- Show complete carrier profile with all data fields
- "Save to Dashboard" button for logged-in users
- Compliance history and status timeline
- Contact information and location map (future)

**Technical Implementation**:
- Create new page route in Next.js App Router
- Fetch carrier data by DOT number
- Reusable carrier profile component
- Integration with saved_carriers table

---

### 3. Export Saved Carriers ⭐⭐⭐⭐
**Impact**: High | **Effort**: Low | **Priority**: 3

**Features**:
- CSV export of user's saved carriers
- PDF report generation with company branding
- Excel-compatible format (.xlsx)
- Email delivery option

**Technical Implementation**:
- API endpoint for data export
- CSV generation library
- PDF generation with React-PDF
- Download functionality in dashboard

---

### 4. Basic Alerts System ⭐⭐⭐⭐
**Impact**: High | **Effort**: Medium | **Priority**: 4

**Database**: Uses existing `monitoring_alerts` table

**Features**:
- Email notifications for carrier status changes
- Alert preferences (safety rating changes, insurance lapses)
- Simple notification dashboard
- Weekly digest emails

**Technical Implementation**:
- Email service integration (Resend/SendGrid)
- Background job processing
- Alert preference UI
- Notification history

---

### 5. Carrier Notes & Tags ⭐⭐⭐
**Impact**: Medium | **Effort**: Low | **Priority**: 5

**Database Changes**:
```sql
ALTER TABLE saved_carriers ADD COLUMN tags TEXT[];
ALTER TABLE saved_carriers ADD COLUMN priority TEXT;
ALTER TABLE saved_carriers ADD COLUMN last_contacted DATE;
```

**Features**:
- Enhanced notes with rich text
- Tagging system for organization (e.g., "preferred", "high-risk", "new")
- Priority levels (high, medium, low)
- Last contacted tracking

## 🎯 Medium Impact / Low Effort

### 6. Search History
**Impact**: Medium | **Effort**: Low | **Priority**: 6
- Store user search queries
- Quick access to recent searches  
- Popular search suggestions
- Search analytics for admin

### 7. Dashboard Analytics
**Impact**: Medium | **Effort**: Low | **Priority**: 7
- Count of saved carriers by safety rating
- Simple charts with Chart.js or Recharts
- Compliance summary widgets
- Risk assessment overview

### 8. Bulk Operations
**Impact**: Medium | **Effort**: Low | **Priority**: 8
- Select multiple carriers with checkboxes
- Bulk save/remove from dashboard
- Bulk export selected carriers
- Bulk tag assignment

## 🔥 Quick Wins (Can Build Today)

### 9. Improved Landing Page
**Impact**: Medium | **Effort**: Very Low | **Priority**: 9
- Add testimonials section
- Feature comparison table vs carrier411
- Better value proposition messaging
- Social proof and trust indicators

### 10. User Profile Page
**Impact**: Low | **Effort**: Very Low | **Priority**: 10
- Edit user information (name, company)
- Account settings and preferences
- Password change functionality
- Future: subscription management

## 🚛 Implementation Status

- [x] Enhanced Search & Filtering
- [x] Carrier Detail Page  
- [x] Export Saved Carriers
- [x] Basic Alerts System
- [ ] Carrier Notes & Tags
- [ ] Search History
- [ ] Dashboard Analytics
- [ ] Bulk Operations
- [ ] Improved Landing Page
- [ ] User Profile Page

## 💡 Next Steps

**Recommended Starting Point**: Enhanced Search & Filtering
- Builds on existing search functionality
- Immediate user value
- Low technical complexity
- Can be completed in 30-60 minutes

**Development Order**:
1. Enhanced Search (database + UI)
2. Carrier Detail Pages (new routes)
3. Export functionality (dashboard enhancement)
4. Notes & tags (user experience)
5. Alerts system (retention feature)

## 🔄 Future Considerations

**Beyond MVP**:
- Real-time data integration with DOT APIs
- Mobile app development
- Advanced analytics and reporting
- Multi-tenant support for fleet managers
- API access for enterprise customers
- Integration with TMS (Transportation Management Systems)

---

*Last Updated: December 28, 2024*
*Status: Planning Phase*