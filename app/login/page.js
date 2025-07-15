'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { login } from '../../lib/auth'
import { User, Lock, LogIn, Eye, BarChart3, Users, Shield } from 'lucide-react'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      await login(username, password)
      router.push('/dashboard')
    } catch (error) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400 to-purple-600 rounded-full opacity-20 blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-pink-400 to-orange-600 rounded-full opacity-20 blur-3xl"></div>
      </div>

      <div className="relative w-full max-w-md">
        {/* Main login card */}
        <div className="bg-white/80 backdrop-blur-lg p-8 rounded-3xl shadow-2xl border border-white/20">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Eye className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent mb-2">
              Giriş Yap
            </h1>
            <p className="text-gray-600">Tablo yönetim sistemine hoş geldiniz</p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Kullanıcı Adı
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-300 bg-white/80 backdrop-blur-sm"
                  placeholder="Kullanıcı adınızı girin"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Şifre
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-300 bg-white/80 backdrop-blur-sm"
                  placeholder="Şifrenizi girin"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="bg-gradient-to-r from-red-50 to-red-100 border-2 border-red-200 text-red-700 px-4 py-3 rounded-xl animate-shake">
                <div className="flex items-center">
                  <Shield className="w-5 h-5 mr-2" />
                  {error}
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 px-4 rounded-xl hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 hover:shadow-xl font-semibold flex items-center justify-center space-x-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                  <span>Giriş yapılıyor...</span>
                </>
              ) : (
                <>
                  <LogIn size={20} />
                  <span>Giriş Yap</span>
                </>
              )}
            </button>
          </form>

          {/* Features showcase */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-center text-sm text-gray-600 mb-4 font-medium">Sistem Özellikleri</p>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-3 bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl">
                <BarChart3 className="w-6 h-6 text-blue-600 mx-auto mb-1" />
                <span className="text-xs text-blue-600 font-medium">İstatistikler</span>
              </div>
              <div className="p-3 bg-gradient-to-r from-green-50 to-green-100 rounded-xl">
                <Eye className="w-6 h-6 text-green-600 mx-auto mb-1" />
                <span className="text-xs text-green-600 font-medium">Gerçek Zamanlı</span>
              </div>
              <div className="p-3 bg-gradient-to-r from-purple-50 to-purple-100 rounded-xl">
                <Users className="w-6 h-6 text-purple-600 mx-auto mb-1" />
                <span className="text-xs text-purple-600 font-medium">Çoklu Kullanıcı</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom decoration */}
        <div className="text-center mt-8">
          <p className="text-gray-500 text-sm">
            © 2025 Müşteri Tablo Yönetim Sistemi
          </p>
        </div>
      </div>

      <style jsx>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
      `}</style>
    </div>
  )
}
