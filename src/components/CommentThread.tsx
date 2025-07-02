'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import Comment from './Comment'

type CommentType = 'rate_submission' | 'insurance_info' | 'carrier_general' | 'safety_concern'

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
  user_vote: number
}

interface CommentThreadProps {
  targetType: CommentType
  targetId: string
  title?: string
  showCommentCount?: boolean
  allowComments?: boolean
  className?: string
}

export default function CommentThread({ 
  targetType, 
  targetId, 
  title = "Discussion",
  showCommentCount = true,
  allowComments = true,
  className = ""
}: CommentThreadProps) {
  const [comments, setComments] = useState<CommentData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [newComment, setNewComment] = useState('')
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    checkAuthentication()
    fetchComments()
  }, [targetType, targetId, refreshKey])

  const checkAuthentication = async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      setIsAuthenticated(!!user)
    } catch (error) {
      setIsAuthenticated(false)
    }
  }

  const fetchComments = async () => {
    try {
      setLoading(true)
      setError('')
      
      const supabase = createClient()
      const { data, error } = await supabase.rpc('get_comments_for_target', {
        p_target_type: targetType,
        p_target_id: targetId,
        p_limit: 100
      })

      if (error) {
        console.error('Error fetching comments:', error)
        setError('Failed to load comments')
      } else {
        setComments(data || [])
      }
    } catch (err) {
      console.error('Failed to fetch comments:', err)
      setError('Failed to load comments')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitComment = async (commentText: string, parentId: string | null = null) => {
    if (!commentText.trim() || submitting) return

    setSubmitting(true)
    setError('')

    try {
      const supabase = createClient()
      
      // Check authentication
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        setError('You must be logged in to comment')
        return
      }

      const { data, error } = await supabase.rpc('create_comment', {
        p_target_type: targetType,
        p_target_id: targetId,
        p_comment_text: commentText.trim(),
        p_parent_comment_id: parentId
      })

      if (error) {
        console.error('Error creating comment:', error)
        setError(error.message || 'Failed to post comment')
      } else {
        // Clear form
        if (parentId) {
          setReplyText('')
          setReplyTo(null)
        } else {
          setNewComment('')
        }
        
        // Refresh comments
        setRefreshKey(prev => prev + 1)
      }
    } catch (err: any) {
      console.error('Failed to submit comment:', err)
      setError(err.message || 'Failed to post comment')
    } finally {
      setSubmitting(false)
    }
  }

  const handleReply = (parentId: string) => {
    setReplyTo(parentId)
    setReplyText('')
  }

  const handleCancelReply = () => {
    setReplyTo(null)
    setReplyText('')
  }

  const handleVote = () => {
    // Refresh comments to get updated vote counts
    setRefreshKey(prev => prev + 1)
  }

  // Group comments by parent/reply structure
  const topLevelComments = comments.filter(c => !c.parent_comment_id)
  const replies = comments.filter(c => c.parent_comment_id)
  
  const getCommentReplies = (commentId: string) => {
    return replies.filter(r => r.parent_comment_id === commentId)
  }

  const totalComments = comments.length

  if (!allowComments && totalComments === 0) {
    return null
  }

  return (
    <div className={`bg-white rounded-lg border p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          💬 {title}
          {showCommentCount && totalComments > 0 && (
            <span className="ml-2 text-sm font-normal text-gray-500">
              ({totalComments} {totalComments === 1 ? 'comment' : 'comments'})
            </span>
          )}
        </h3>
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* New comment form */}
      {allowComments && isAuthenticated && (
        <div className="mb-6">
          <div className="space-y-3">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Share your thoughts or experience..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              disabled={submitting}
            />
            <div className="flex justify-between items-center">
              <p className="text-xs text-gray-500">
                {newComment.length}/2000 characters
              </p>
              <button
                onClick={() => handleSubmitComment(newComment)}
                disabled={submitting || !newComment.trim() || newComment.length > 2000}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Posting...' : 'Post Comment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Login prompt */}
      {allowComments && !isAuthenticated && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-blue-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div>
              <p className="text-sm font-medium text-blue-800">Join the Discussion</p>
              <p className="text-xs text-blue-600 mt-1">
                <a href="/auth/login" className="underline hover:text-blue-800">
                  Log in
                </a> or <a href="/auth/signup" className="underline hover:text-blue-800">
                  sign up
                </a> to share your thoughts and experiences.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Comments loading */}
      {loading && (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="animate-pulse flex space-x-3">
              <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                <div className="space-y-1">
                  <div className="h-3 bg-gray-200 rounded"></div>
                  <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Comments list */}
      {!loading && (
        <div className="space-y-4">
          {topLevelComments.length === 0 ? (
            <div className="text-center py-8">
              <svg className="mx-auto h-12 w-12 text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-3.582 8-8 8a8.955 8.955 0 01-4.906-1.471c-1.197 1.04-2.795 1.628-4.644 1.628a.75.75 0 01-.714-1.013 5.174 5.174 0 001.628-2.536A7.956 7.956 0 014 12C4 7.582 7.582 4 12 4s8 3.582 8 8z" />
              </svg>
              <h4 className="text-lg font-medium text-gray-900 mb-2">No comments yet</h4>
              <p className="text-gray-500">
                {allowComments ? 'Be the first to share your thoughts!' : 'Comments are disabled for this content.'}
              </p>
            </div>
          ) : (
            topLevelComments.map(comment => (
              <div key={comment.id}>
                {/* Main comment */}
                <Comment 
                  comment={comment}
                  onReply={allowComments && isAuthenticated ? handleReply : undefined}
                  onVote={handleVote}
                  showReplyButton={allowComments}
                />
                
                {/* Reply form for this comment */}
                {replyTo === comment.id && (
                  <div className="ml-11 mt-3 mb-4">
                    <div className="space-y-3">
                      <textarea
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Write a reply..."
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                        disabled={submitting}
                        autoFocus
                      />
                      <div className="flex justify-between items-center">
                        <p className="text-xs text-gray-500">
                          {replyText.length}/2000 characters
                        </p>
                        <div className="flex space-x-2">
                          <button
                            onClick={handleCancelReply}
                            className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
                            disabled={submitting}
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleSubmitComment(replyText, comment.id)}
                            disabled={submitting || !replyText.trim() || replyText.length > 2000}
                            className="px-4 py-1 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {submitting ? 'Replying...' : 'Reply'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Replies to this comment */}
                {getCommentReplies(comment.id).map(reply => (
                  <Comment 
                    key={reply.id}
                    comment={reply}
                    onVote={handleVote}
                    showReplyButton={false}
                    isReply={true}
                  />
                ))}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}