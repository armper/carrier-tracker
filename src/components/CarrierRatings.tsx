'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import CarrierRatingForm from './CarrierRatingForm'
import CommentThread from './CommentThread'

interface RatingSummary {
  total_ratings: number
  average_rating: number
  rating_distribution: {
    '5': number
    '4': number
    '3': number
    '2': number
    '1': number
  }
  would_recommend_percent: number
}

interface RatingData {
  id: string
  rating: number
  title: string
  review_text: string
  category: string
  would_recommend: boolean | null
  anonymous: boolean
  user_email: string
  user_type: string
  user_reputation: number
  created_at: string
  updated_at: string
  is_author: boolean
}

interface CarrierRatingsProps {
  carrierId: string
  carrierName: string
}

export default function CarrierRatings({ carrierId, carrierName }: CarrierRatingsProps) {
  const [summary, setSummary] = useState<RatingSummary | null>(null)
  const [ratings, setRatings] = useState<RatingData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showRatingForm, setShowRatingForm] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    checkAuthentication()
    fetchRatingSummary()
    fetchRatings()
  }, [carrierId, refreshKey])

  const checkAuthentication = async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      setIsAuthenticated(!!user)
    } catch (error) {
      setIsAuthenticated(false)
    }
  }

  const fetchRatingSummary = async () => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase.rpc('get_carrier_rating_summary', {
        p_carrier_id: carrierId
      })

      if (error) {
        console.error('Error fetching rating summary:', error)
        return
      }

      if (data && data.length > 0) {
        setSummary(data[0])
      }
    } catch (error) {
      console.error('Failed to fetch rating summary:', error)
    }
  }

  const fetchRatings = async () => {
    try {
      setLoading(true)
      const supabase = createClient()
      const { data, error } = await supabase.rpc('get_carrier_ratings', {
        p_carrier_id: carrierId,
        p_limit: 20
      })

      if (error) {
        console.error('Error fetching ratings:', error)
        setError('Failed to load ratings')
      } else {
        setRatings(data || [])
      }
    } catch (error) {
      console.error('Failed to fetch ratings:', error)
      setError('Failed to load ratings')
    } finally {
      setLoading(false)
    }
  }

  const handleRatingSuccess = () => {
    setRefreshKey(prev => prev + 1)
  }

  const getUserTypeBadge = (userType: string) => {
    switch (userType) {
      case 'driver':
        return { text: 'Driver', color: 'bg-blue-100 text-blue-800', icon: '🚛' }
      case 'carrier':
        return { text: 'Carrier', color: 'bg-green-100 text-green-800', icon: '🏢' }
      case 'broker':
        return { text: 'Broker', color: 'bg-purple-100 text-purple-800', icon: '🤝' }
      default:
        return { text: 'Member', color: 'bg-gray-100 text-gray-800', icon: '👤' }
    }
  }

  const getReputationBadge = (score: number) => {
    if (score >= 90) return { text: 'Expert', color: 'bg-green-100 text-green-800' }
    if (score >= 75) return { text: 'Trusted', color: 'bg-blue-100 text-blue-800' }
    if (score >= 60) return { text: 'Active', color: 'bg-yellow-100 text-yellow-800' }
    return { text: 'New', color: 'bg-gray-100 text-gray-800' }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatUserName = (email: string, anonymous: boolean) => {
    if (anonymous) return 'Anonymous'
    return email.split('@')[0] || 'User'
  }

  const renderStars = (rating: number, size: 'sm' | 'md' | 'lg' = 'md') => {
    const sizeClasses = {
      sm: 'text-sm',
      md: 'text-lg',
      lg: 'text-2xl'
    }
    
    return (
      <div className={`flex items-center ${sizeClasses[size]}`}>
        {[1, 2, 3, 4, 5].map((star) => (
          <span
            key={star}
            className={star <= rating ? 'text-yellow-400' : 'text-gray-300'}
          >
            ⭐
          </span>
        ))}
      </div>
    )
  }

  const renderRatingDistribution = () => {
    if (!summary || summary.total_ratings === 0) return null

    return (
      <div className="space-y-2">
        {[5, 4, 3, 2, 1].map((star) => {
          const count = summary.rating_distribution[star.toString()]
          const percentage = summary.total_ratings > 0 ? (count / summary.total_ratings) * 100 : 0
          
          return (
            <div key={star} className="flex items-center space-x-2 text-sm">
              <span className="w-8 text-gray-600">{star}⭐</span>
              <div className="flex-1 bg-gray-200 rounded-full h-2">
                <div
                  className="bg-yellow-400 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <span className="w-8 text-right text-gray-600">{count}</span>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Rating Summary */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Carrier Reviews & Ratings</h2>
          {isAuthenticated && (
            <button
              onClick={() => setShowRatingForm(true)}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 font-medium"
            >
              Write a Review
            </button>
          )}
        </div>

        {loading ? (
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/3"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
          </div>
        ) : summary && summary.total_ratings > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Overall Rating */}
            <div className="text-center">
              <div className="text-4xl font-bold text-gray-900 mb-2">
                {summary.average_rating.toFixed(1)}
              </div>
              {renderStars(Math.round(summary.average_rating), 'lg')}
              <p className="text-sm text-gray-600 mt-2">
                Based on {summary.total_ratings} review{summary.total_ratings !== 1 ? 's' : ''}
              </p>
              {summary.would_recommend_percent > 0 && (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
                  <p className="text-sm font-medium text-green-800">
                    👍 {summary.would_recommend_percent}% would recommend this carrier
                  </p>
                </div>
              )}
            </div>

            {/* Rating Distribution */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">Rating Distribution</h3>
              {renderRatingDistribution()}
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <svg className="mx-auto h-12 w-12 text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No reviews yet</h3>
            <p className="text-gray-500 mb-4">
              Be the first to review this carrier and help others in the community!
            </p>
            {isAuthenticated && (
              <button
                onClick={() => setShowRatingForm(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
              >
                Write the First Review
              </button>
            )}
          </div>
        )}

        {!isAuthenticated && summary && summary.total_ratings === 0 && (
          <div className="text-center p-4 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm text-blue-800">
              <a href="/auth/login" className="underline hover:text-blue-900">
                Log in
              </a> or <a href="/auth/signup" className="underline hover:text-blue-900">
                sign up
              </a> to write a review for this carrier.
            </p>
          </div>
        )}
      </div>

      {/* Individual Reviews */}
      {ratings.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Reviews</h3>
          <div className="space-y-6">
            {ratings.map((rating) => {
              const userTypeBadge = getUserTypeBadge(rating.user_type)
              const reputationBadge = getReputationBadge(rating.user_reputation)
              
              return (
                <div key={rating.id} className="border-b border-gray-200 pb-6 last:border-b-0 last:pb-0">
                  {/* Rating Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center">
                        <span className="text-sm font-semibold text-white">
                          {formatUserName(rating.user_email, rating.anonymous).charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-gray-900">
                            {formatUserName(rating.user_email, rating.anonymous)}
                            {rating.is_author && (
                              <span className="ml-1 text-xs bg-blue-100 text-blue-800 px-1 py-0.5 rounded">You</span>
                            )}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${userTypeBadge.color} flex items-center gap-1`}>
                            <span>{userTypeBadge.icon}</span>
                            <span>{userTypeBadge.text}</span>
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${reputationBadge.color}`}>
                            {reputationBadge.text}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2 mt-1">
                          {renderStars(rating.rating, 'sm')}
                          <span className="text-sm text-gray-500">
                            {formatDate(rating.created_at)}
                          </span>
                          <span className="text-xs text-gray-400 capitalize">
                            {rating.category}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {rating.would_recommend !== null && (
                      <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                        rating.would_recommend 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {rating.would_recommend ? '👍 Recommends' : '👎 Doesn\'t recommend'}
                      </div>
                    )}
                  </div>

                  {/* Review Content */}
                  {rating.title && (
                    <h4 className="font-medium text-gray-900 mb-2">{rating.title}</h4>
                  )}
                  {rating.review_text && (
                    <p className="text-gray-700 whitespace-pre-wrap mb-3">{rating.review_text}</p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Comments Section using existing CommentThread */}
      <CommentThread
        targetType="carrier_rating"
        targetId={carrierId}
        title="General Discussion"
        showCommentCount={true}
        allowComments={true}
      />

      {/* Rating Form Modal */}
      {showRatingForm && (
        <CarrierRatingForm
          carrierId={carrierId}
          carrierName={carrierName}
          onClose={() => setShowRatingForm(false)}
          onSuccess={handleRatingSuccess}
        />
      )}
    </div>
  )
}