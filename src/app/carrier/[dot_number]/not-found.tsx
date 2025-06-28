import Link from 'next/link'

export default function CarrierNotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md mx-auto text-center">
        <div className="mb-8">
          <div className="text-6xl font-bold text-gray-300 mb-4">404</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Carrier Not Found</h1>
          <p className="text-gray-600">
            The carrier with this DOT number doesn&apos;t exist in our database.
          </p>
        </div>
        
        <div className="space-y-4">
          <Link 
            href="/search" 
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
          >
            Search for Carriers
          </Link>
          <div>
            <Link 
              href="/" 
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              ← Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}