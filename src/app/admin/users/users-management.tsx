'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useNotifications } from '@/components/ui/notification'

interface User {
  id: string
  email?: string
}

interface Profile {
  id: string
  email: string
  full_name: string | null
  company_name: string | null
  is_admin: boolean
  role: string
  created_at: string
  updated_at: string
}

interface CurrentProfile {
  is_admin: boolean
  role: string
}

interface Props {
  currentUser: User
  currentProfile: CurrentProfile
  users: Profile[]
}

export default function UsersManagement({ currentUser, users }: Props) {
  const [userList, setUserList] = useState<Profile[]>(users)
  const [loading, setLoading] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const router = useRouter()
  const supabase = createClient()
  const { addNotification } = useNotifications()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const updateUserRole = async (userId: string, newRole: string, makeAdmin: boolean) => {
    if (userId === currentUser.id) {
      addNotification({
        type: 'error',
        title: 'Cannot modify own role',
        message: 'You cannot change your own admin status or role'
      })
      return
    }

    setLoading(userId)
    try {
      const response = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          role: newRole,
          is_admin: makeAdmin
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message || 'Failed to update user role')
      }

      // Update local state
      setUserList(prev => prev.map(user => 
        user.id === userId 
          ? { ...user, role: newRole, is_admin: makeAdmin }
          : user
      ))

      addNotification({
        type: 'success',
        title: 'User role updated',
        message: `User role has been updated to ${newRole}`
      })

    } catch (error) {
      console.error('Error updating user role:', error)
      addNotification({
        type: 'error',
        title: 'Failed to update user role',
        message: error instanceof Error ? error.message : 'An unexpected error occurred'
      })
    } finally {
      setLoading(null)
    }
  }

  const filteredUsers = userList.filter(user => {
    const matchesSearch = user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.company_name?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesRole = roleFilter === 'all' || 
                       (roleFilter === 'admin' && user.is_admin) ||
                       (roleFilter === 'user' && !user.is_admin) ||
                       (roleFilter === 'super_admin' && user.role === 'super_admin')
    
    return matchesSearch && matchesRole
  })

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  const getRoleBadgeColor = (role: string, isAdmin: boolean) => {
    if (role === 'super_admin') return 'bg-purple-100 text-purple-800'
    if (isAdmin) return 'bg-red-100 text-red-800'
    return 'bg-gray-100 text-gray-800'
  }

  const getRoleDisplayName = (role: string, isAdmin: boolean) => {
    if (role === 'super_admin') return 'Super Admin'
    if (isAdmin) return 'Admin'
    return 'User'
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b-2 border-blue-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-6">
              <Link href="/admin" className="text-2xl font-bold text-blue-600">
                CarrierTracker Admin
              </Link>
              <nav className="flex items-center gap-4 text-sm">
                <Link href="/admin" className="text-gray-600 hover:text-gray-900">Dashboard</Link>
                <span className="text-gray-400">/</span>
                <span className="text-gray-900 font-medium">Users</span>
              </nav>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/dashboard" className="text-gray-600 hover:text-gray-900">
                User Dashboard
              </Link>
              <div className="relative group">
                <button className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-900 rounded-md hover:bg-gray-50">
                  <span className="text-sm">{currentUser.email?.split('@')[0]}</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border py-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                  <Link href="/profile" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                    Profile Settings
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-600 mt-2">Manage user accounts and admin permissions</p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Search Users
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="Search by email, name, or company..."
              />
            </div>
            <div className="sm:w-48">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Filter by Role
              </label>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Users</option>
                <option value="user">Regular Users</option>
                <option value="admin">Admins</option>
                <option value="super_admin">Super Admins</option>
              </select>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">Total Users</p>
                <p className="text-2xl font-bold text-gray-900">{userList.length}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">Regular Users</p>
                <p className="text-2xl font-bold text-gray-900">{userList.filter(u => !u.is_admin).length}</p>
              </div>
              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">Admins</p>
                <p className="text-2xl font-bold text-gray-900">{userList.filter(u => u.is_admin && u.role !== 'super_admin').length}</p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">Super Admins</p>
                <p className="text-2xl font-bold text-gray-900">{userList.filter(u => u.role === 'super_admin').length}</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Users ({filteredUsers.length})
            </h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Company
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Joined
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                            <span className="text-sm font-medium text-gray-700">
                              {user.email.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {user.full_name || 'No name provided'}
                          </div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleBadgeColor(user.role, user.is_admin)}`}>
                        {getRoleDisplayName(user.role, user.is_admin)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {user.company_name || 'Not provided'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(user.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {user.id === currentUser.id ? (
                        <span className="text-gray-400">You</span>
                      ) : (
                        <div className="flex items-center gap-2">
                          {user.role === 'super_admin' ? (
                            <>
                              <button
                                onClick={() => updateUserRole(user.id, 'admin', true)}
                                disabled={loading === user.id}
                                className="text-orange-600 hover:text-orange-900 disabled:opacity-50"
                              >
                                {loading === user.id ? 'Updating...' : 'Demote to Admin'}
                              </button>
                              <span className="text-gray-300">|</span>
                              <button
                                onClick={() => updateUserRole(user.id, 'user', false)}
                                disabled={loading === user.id}
                                className="text-red-600 hover:text-red-900 disabled:opacity-50"
                              >
                                {loading === user.id ? 'Updating...' : 'Make User'}
                              </button>
                            </>
                          ) : user.is_admin ? (
                            <>
                              <button
                                onClick={() => updateUserRole(user.id, 'super_admin', true)}
                                disabled={loading === user.id}
                                className="text-purple-600 hover:text-purple-900 disabled:opacity-50"
                              >
                                {loading === user.id ? 'Updating...' : 'Make Super Admin'}
                              </button>
                              <span className="text-gray-300">|</span>
                              <button
                                onClick={() => updateUserRole(user.id, 'user', false)}
                                disabled={loading === user.id}
                                className="text-red-600 hover:text-red-900 disabled:opacity-50"
                              >
                                {loading === user.id ? 'Updating...' : 'Remove Admin'}
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => updateUserRole(user.id, 'admin', true)}
                                disabled={loading === user.id}
                                className="text-blue-600 hover:text-blue-900 disabled:opacity-50"
                              >
                                {loading === user.id ? 'Updating...' : 'Make Admin'}
                              </button>
                              <span className="text-gray-300">|</span>
                              <button
                                onClick={() => updateUserRole(user.id, 'super_admin', true)}
                                disabled={loading === user.id}
                                className="text-purple-600 hover:text-purple-900 disabled:opacity-50"
                              >
                                {loading === user.id ? 'Updating...' : 'Make Super Admin'}
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {filteredUsers.length === 0 && (
            <div className="text-center py-12">
              <svg className="w-12 h-12 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
              <p className="text-gray-500">No users found matching your criteria</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}