'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser, isAdmin, logout } from '../../../lib/auth'
import { supabase } from '../../../lib/supabase'
import { ArrowLeft, Plus, Trash2, User, Shield, LogOut } from 'lucide-react'

export default function AdminUsersPage() {
  const [user, setUser] = useState(null)
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newUser, setNewUser] = useState({ username: '', password: '', role: 'user' })
  const [error, setError] = useState('')
  const router = useRouter()

  useEffect(() => {
    const currentUser = getCurrentUser()
    if (!currentUser || !isAdmin()) {
      router.push('/dashboard')
      return
    }
    setUser(currentUser)
    loadUsers()
  }, [router])

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setUsers(data || [])
    } catch (error) {
      console.error('Kullanıcılar yüklenirken hata:', error)
    } finally {
      setLoading(false)
    }
  }

  const addUser = async (e) => {
    e.preventDefault()
    setError('')

    try {
      // Basit şifre hash'i (production'da bcrypt kullanılmalı)
      const { data, error } = await supabase
        .from('users')
        .insert([{
          username: newUser.username,
          password_hash: 'simple_hash_' + newUser.password, // Basit hash
          role: newUser.role
        }])

      if (error) throw error

      setNewUser({ username: '', password: '', role: 'user' })
      setShowAddForm(false)
      await loadUsers()
    } catch (error) {
      setError(error.message)
    }
  }

  const deleteUser = async (userId, username) => {
    if (username === 'admin') {
      alert('Admin kullanıcısı silinemez!')
      return
    }

    if (confirm(`${username} kullanıcısını silmek istediğinizden emin misiniz?`)) {
      try {
        const { error } = await supabase
          .from('users')
          .delete()
          .eq('id', userId)

        if (error) throw error
        await loadUsers()
      } catch (error) {
        console.error('Kullanıcı silinirken hata:', error)
      }
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-center mt-4 text-gray-600">Yükleniyor...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft size={20} />
                <span>Geri</span>
              </button>
              <h1 className="text-xl font-semibold text-gray-900">
                Kullanıcı Yönetimi
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm">
                {user?.username} (Admin)
              </span>
              <button
                onClick={() => {
                  logout()
                  router.push('/login')
                }}
                className="flex items-center space-x-2 bg-red-100 hover:bg-red-200 text-red-700 px-4 py-2 rounded-md transition-colors"
              >
                <LogOut size={16} />
                <span>Çıkış</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Add User Button */}
        <div className="mb-6">
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors"
          >
            <Plus size={16} />
            <span>Yeni Kullanıcı Ekle</span>
          </button>
        </div>

        {/* Add User Form */}
        {showAddForm && (
          <div className="bg-white p-6 rounded-lg shadow mb-6">
            <h3 className="text-lg font-semibold mb-4">Yeni Kullanıcı Ekle</h3>
            <form onSubmit={addUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Kullanıcı Adı
                </label>
                <input
                  type="text"
                  value={newUser.username}
                  onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Şifre
                </label>
                <input
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rol
                </label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="user">Kullanıcı</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                  {error}
                </div>
              )}
              <div className="flex space-x-4">
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors"
                >
                  Kullanıcı Ekle
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-md transition-colors"
                >
                  İptal
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Users List */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Kullanıcılar</h3>
          </div>
          <div className="divide-y divide-gray-200">
            {users.map((userItem) => (
              <div key={userItem.id} className="px-6 py-4 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    {userItem.role === 'admin' ? (
                      <Shield className="h-8 w-8 text-red-500" />
                    ) : (
                      <User className="h-8 w-8 text-blue-500" />
                    )}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {userItem.username}
                    </div>
                    <div className="text-sm text-gray-500">
                      {userItem.role === 'admin' ? 'Yönetici' : 'Kullanıcı'}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    userItem.role === 'admin' 
                      ? 'bg-red-100 text-red-800' 
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {userItem.role === 'admin' ? 'Admin' : 'Kullanıcı'}
                  </span>
                  {userItem.username !== 'admin' && (
                    <button
                      onClick={() => deleteUser(userItem.id, userItem.username)}
                      className="text-red-600 hover:text-red-800 p-1 rounded-md hover:bg-red-100"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}