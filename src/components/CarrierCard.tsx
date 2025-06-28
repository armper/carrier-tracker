'use client'

interface Carrier {
  id: string
  dot_number: string
  legal_name: string
  dba_name: string | null
  physical_address: string | null
  phone: string | null
  safety_rating: string
  insurance_status: string
  authority_status: string
  carb_compliance: boolean
  state: string | null
  city: string | null
  vehicle_count: number | null
}

interface CarrierCardProps {
  carrier: Carrier
  onSave?: (carrierId: string) => void
  isSaving?: boolean
  showSaveButton?: boolean
}

export default function CarrierCard({ carrier, onSave, isSaving, showSaveButton = true }: CarrierCardProps) {
  const getSafetyRatingColor = (rating: string) => {
    switch (rating.toLowerCase()) {
      case 'satisfactory':
        return 'bg-green-100 text-green-800'
      case 'conditional':
        return 'bg-yellow-100 text-yellow-800'
      case 'unsatisfactory':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            {carrier.legal_name}
          </h3>
          {carrier.dba_name && (
            <p className="text-sm text-gray-600 mb-1">DBA: {carrier.dba_name}</p>
          )}
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span>DOT: {carrier.dot_number}</span>
            {carrier.state && carrier.city && (
              <span>📍 {carrier.city}, {carrier.state}</span>
            )}
            {carrier.vehicle_count && (
              <span>🚛 {carrier.vehicle_count} vehicles</span>
            )}
          </div>
          {carrier.phone && (
            <p className="text-sm text-gray-600 mt-1">📞 {carrier.phone}</p>
          )}
        </div>
        
        {showSaveButton && onSave && (
          <button
            onClick={() => onSave(carrier.id)}
            disabled={isSaving}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm flex-shrink-0"
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <span className="text-sm text-gray-600 block mb-1">Safety Rating</span>
          <div className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getSafetyRatingColor(carrier.safety_rating)}`}>
            {carrier.safety_rating}
          </div>
        </div>
        
        <div>
          <span className="text-sm text-gray-600 block mb-1">Insurance</span>
          <div className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
            carrier.insurance_status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {carrier.insurance_status}
          </div>
        </div>
        
        <div>
          <span className="text-sm text-gray-600 block mb-1">Authority</span>
          <div className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
            carrier.authority_status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {carrier.authority_status}
          </div>
        </div>
        
        <div>
          <span className="text-sm text-gray-600 block mb-1">CARB Compliant</span>
          <div className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
            carrier.carb_compliance ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {carrier.carb_compliance ? 'Yes' : 'No'}
          </div>
        </div>
      </div>
    </div>
  )
}