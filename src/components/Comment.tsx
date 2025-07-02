'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'

interface CommentData {
  id: string
  comment_text: string
  user_id: string
  user_email: string
  user_reputation: number
  parent_comment_id: string | null
  reply_count: number
  upvotes: number
  downvotes: number
  is_pinned: boolean
  created_at: string
  updated_at: string
  is_author: boolean
  user_vote: number // -1, 0, or 1
}

interface CommentProps {
  comment: CommentData
  onReply?: (parentId: string) => void
  onVote?: (commentId: string, voteType: number) => void
  showReplyButton?: boolean
  isReply?: boolean
}

export default function Comment({ 
  comment, 
  onReply, 
  onVote, 
  showReplyButton = true, 
  isReply = false 
}: CommentProps) {
  const [isVoting, setIsVoting] = useState(false)
  const [localVote, setLocalVote] = useState(comment.user_vote)
  const [localUpvotes, setLocalUpvotes] = useState(comment.upvotes)
  const [localDownvotes, setLocalDownvotes] = useState(comment.downvotes)

  // Sync local state when comment prop changes
  useEffect(() => {
    setLocalVote(comment.user_vote)
    setLocalUpvotes(comment.upvotes)
    setLocalDownvotes(comment.downvotes)
  }, [comment.user_vote, comment.upvotes, comment.downvotes])

  const handleVote = async (voteType: number) => {
    if (isVoting) return
    
    setIsVoting(true)
    
    try {
      const supabase = createClient()
      
      // Check authentication
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        alert('You must be logged in to vote on comments')
        return
      }

      // Calculate new vote (toggle if same, otherwise set new vote)
      const previousVote = localVote
      const newVote = localVote === voteType ? 0 : voteType
      
      // Calculate new vote counts
      let newUpvotes = localUpvotes
      let newDownvotes = localDownvotes
      
      // Remove previous vote if it existed
      if (previousVote === 1) {
        newUpvotes = Math.max(0, newUpvotes - 1)
      } else if (previousVote === -1) {
        newDownvotes = Math.max(0, newDownvotes - 1)
      }
      
      // Add new vote if not removing
      if (newVote === 1) {
        newUpvotes += 1
      } else if (newVote === -1) {
        newDownvotes += 1
      }
      
      // Apply optimistic updates
      setLocalVote(newVote)
      setLocalUpvotes(newUpvotes)
      setLocalDownvotes(newDownvotes)

      // Call API
      const { error } = await supabase.rpc('vote_on_comment', {
        p_comment_id: comment.id,
        p_vote_type: newVote
      })

      if (error) {
        console.error('Error voting on comment:', error)
        // Revert optimistic update
        setLocalVote(previousVote)
        setLocalUpvotes(comment.upvotes)
        setLocalDownvotes(comment.downvotes)
        alert('Failed to vote on comment. Please try again.')
      } else if (onVote) {
        onVote(comment.id, newVote)
      }
    } catch (error) {
      console.error('Failed to vote on comment:', error)
      // Revert optimistic update
      setLocalVote(comment.user_vote)
      setLocalUpvotes(comment.upvotes)
      setLocalDownvotes(comment.downvotes)
    } finally {
      setIsVoting(false)
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
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffHours / 24)
    
    if (diffHours < 1) return 'Just now'
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  const formatUserName = (email: string) => {
    return email.split('@')[0] || 'Anonymous'
  }

  const badge = getReputationBadge(comment.user_reputation)
  const netScore = localUpvotes - localDownvotes

  return (
    <div className={`${isReply ? 'ml-8 border-l-2 border-gray-200 pl-4' : ''} py-3`}>
      {comment.is_pinned && (
        <div className="flex items-center mb-2">
          <svg className="w-4 h-4 text-blue-500 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
          </svg>
          <span className="text-xs font-medium text-blue-600">Pinned Comment</span>
        </div>
      )}
      
      <div className="flex items-start space-x-3">
        {/* Avatar placeholder */}
        <div className="flex-shrink-0">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center">
            <span className="text-xs font-semibold text-white">
              {formatUserName(comment.user_email).charAt(0).toUpperCase()}
            </span>
          </div>
        </div>

        <div className="flex-1 min-w-0">
          {/* User info and metadata */}
          <div className="flex items-center space-x-2 mb-1">
            <span className="text-sm font-medium text-gray-900">
              {formatUserName(comment.user_email)}
              {comment.is_author && (
                <span className="ml-1 text-xs bg-blue-100 text-blue-800 px-1 py-0.5 rounded">You</span>
              )}
            </span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${badge.color}`}>
              {badge.text}
            </span>
            <span className="text-xs text-gray-500">
              {formatDate(comment.created_at)}
            </span>
            {comment.created_at !== comment.updated_at && (
              <span className="text-xs text-gray-400">(edited)</span>
            )}
          </div>

          {/* Comment content */}
          <div className="text-sm text-gray-700 mb-2 whitespace-pre-wrap">
            {comment.comment_text}
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-4">
            {/* Voting */}
            <div className="flex items-center space-x-1">
              <button
                onClick={() => handleVote(1)}
                disabled={isVoting}
                className={`p-1 rounded transition-colors ${
                  localVote === 1 
                    ? 'text-green-600 bg-green-50' 
                    : 'text-gray-400 hover:text-green-600 hover:bg-green-50'
                } disabled:opacity-50`}
                aria-label="Upvote comment"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              </button>
              
              <span className={`text-sm font-medium ${
                netScore > 0 ? 'text-green-600' : 
                netScore < 0 ? 'text-red-600' : 'text-gray-500'
              }`}>
                {netScore}
              </span>
              
              <button
                onClick={() => handleVote(-1)}
                disabled={isVoting}
                className={`p-1 rounded transition-colors ${
                  localVote === -1 
                    ? 'text-red-600 bg-red-50' 
                    : 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                } disabled:opacity-50`}
                aria-label="Downvote comment"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 10.293a1 1 0 010 1.414l-6 6a1 1 0 01-1.414 0l-6-6a1 1 0 111.414-1.414L9 14.586V3a1 1 0 012 0v11.586l4.293-4.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </button>
            </div>

            {/* Reply button - only show for top-level comments */}
            {showReplyButton && !isReply && onReply && (
              <button
                onClick={() => onReply(comment.id)}
                className="text-xs text-gray-500 hover:text-blue-600 transition-colors"
              >
                Reply
              </button>
            )}

            {/* Reply count for top-level comments */}
            {!isReply && comment.reply_count > 0 && (
              <span className="text-xs text-gray-500">
                {comment.reply_count} {comment.reply_count === 1 ? 'reply' : 'replies'}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}