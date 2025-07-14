'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser, isAdmin, logout } from '../../../lib/auth'
import { supabase } from '../../../lib/supabase'
import { ArrowLeft, LogOut, BarChart3, PieChart, TrendingUp } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RechartsPieChart, Cell } from 'recharts'

export default function AdminStatsPage() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({})
  const [hotelStats, setHotelStats] = useState([])
  const [userStats, setUserStats] = useState([])
  const [responseStats, setResponseStats] = useState({})
  const router = useRouter()

  useEffect(() => {
    const currentUser = getCurrentUser()
    if (!currentUser || !isAdmin()) {
      router.push('/dashboard')
      return
    }
    setUser(currentUser)
    loadAllStats()
  }, [router])

  const loadAllStats = async () => {
    try {
      setLoading(true)
      await Promise.all([
        loadGeneralStats(),
        loadHotelStats(),
        loadUserStats(),
        loadResponseStats()
      ])
    } catch (error) {
      console.error('İstatistikler yüklenirken hata:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadGeneralStats = async () => {
    try {
      const { data: allData } = await supabase
        .from('musteriler')
        .select('durum, created_at, fiyat')

      const today = new Date().toISOString().split('T')[0]
      const todayData = allData?.filter(item => 
        item.created_at?.startsWith(today)
      ) || []

      const totalCalled = allData?.filter(item => item.durum === 'ARANDI').length || 0
      const todayCalled = todayData?.filter(item => item.durum === 'ARANDI').length || 0

      setStats({
        totalCount: allData?.length || 0,
        todayCount: todayData.length,
        totalCalled,
        todayCalled,
        callRateTotal: allData?.length ? ((totalCalled / allData.length) * 100).toFixed(1) : 0,
        callRateToday: todayData.length ? ((todayCalled / todayData.length) * 100).toFixed(1) : 0
      })
    } catch (error) {
      console.error('Genel istatistikler hatası:', error)
    }
  }

  const loadHotelStats = async () => {
    try {
      const { data: allData } = await supabase
        .from('musteriler')
        .select('otel_adi, durum, created_at')

      const today = new Date().toISOString().split('T')[0]
      const hotelGroups = {}

      // Otellere göre grupla
      allData?.forEach(item => {
        if (!hotelGroups[item.otel_adi]) {
          hotelGroups[item.otel_adi] = {
            name: item.otel_adi,
            totalCount: 0,
            todayCount: 0,
            totalCalled: 0,
            todayCalled: 0
          }
        }

        hotelGroups[item.otel_adi].totalCount++
        
        if (item.created_at?.startsWith(today)) {
          hotelGroups[item.otel_adi].todayCount++
        }

        if (item.durum === 'ARANDI') {
          hotelGroups[item.otel_adi].totalCalled++
          if (item.created_at?.startsWith(today)) {
            hotelGroups[item.otel_adi].todayCalled++
          }
        }
      })

      // Oranları hesapla
      const hotelStatsArray = Object.values(hotelGroups).map(hotel => ({
        ...hotel,
        callRateTotal: hotel.totalCount ? ((hotel.totalCalled / hotel.totalCount) * 100).toFixed(1) : 0,
        callRateToday: hotel.todayCount ? ((hotel.todayCalled / hotel.todayCount) * 100).toFixed(1) : 0
      }))

      setHotelStats(hotelStatsArray)
    } catch (error) {
      console.error('Otel istatistikleri hatası:', error)
    }
  }

  const loadUserStats = async () => {
    try {
      const { data: allData } = await supabase
        .from('musteriler')
        .select('updated_by, durum, created_at, otel_adi')

      const today = new Date().toISOString().split('T')[0]
      const userGroups = {}

      allData?.forEach(item => {
        if (item.updated_by && item.durum === 'ARANDI') {
          if (!userGroups[item.updated_by]) {
            userGroups[item.updated_by] = {
              name: item.updated_by,
              totalCalls: 0,
              todayCalls: 0,
              hotels: {}
            }
          }

          userGroups[item.updated_by].totalCalls++

          if (item.created_at?.startsWith(today)) {
            userGroups[item.updated_by].todayCalls++
          }

          // Otel bazlı istatistik
          if (!userGroups[item.updated_by].hotels[item.otel_adi]) {
            userGroups[item.updated_by].hotels[item.otel_adi] = 0
          }
          userGroups[item.updated_by].hotels[item.otel_adi]++
        }
      })

      setUserStats(Object.values(userGroups))
    } catch (error) {
      console.error('Kullanıcı istatistikleri hatası:', error)
    }
  }

  const loadResponseStats = async () => {
    try {
      const { data: allData } = await supabase
        .from('musteriler')
        .select('fiyat, created_at, otel_adi')

      const today = new Date().toISOString().split('T')[0]
      const todayData = allData?.filter(item => 
        item.created_at?.startsWith(today)
      ) || []

      // Genel cevaplanma istatistikleri
      const totalMessages = allData?.length || 0
      const priceAskers = allData?.filter(item => 
        item.fiyat && item.fiyat.toLowerCase().includes('oda')
      ).length || 0
      const infoAskers = allData?.filter(item => 
        item.fiyat && item.fiyat.toLowerCase().includes('genel bilgi')
      ).length || 0

      // Bugün için
      const todayMessages = todayData.length
      const todayPriceAskers = todayData.filter(item => 
        item.fiyat && item.fiyat.toLowerCase().includes('oda')
      ).length
      const todayInfoAskers = todayData.filter(item => 
        item.fiyat && item.fiyat.toLowerCase().includes('genel bilgi')
      ).length

      // Otel bazlı cevaplanma istatistikleri
      const hotelResponse = {}
      allData?.forEach(item => {
        if (!hotelResponse[item.otel_adi]) {
          hotelResponse[item.otel_adi] = {
            name: item.otel_adi,
            totalMessages: 0,
            priceAskers: 0,
            infoAskers: 0
          }
        }

        hotelResponse[item.otel_adi].totalMessages++
        
        if (item.fiyat && item.fiyat.toLowerCase().includes('oda')) {
          hotelResponse[item.otel_adi].priceAskers++
        } else if (item.fiyat && item.fiyat.toLowerCase().includes('genel bilgi')) {
          hotelResponse[item.otel_adi].infoAskers++
        }
      })

      setResponseStats({
        total: {
          totalMessages,
          priceAskers,
          infoAskers,
          priceRate: totalMessages ? ((priceAskers / totalMessages) * 100).toFixed(1) : 0
        },
        today: {
          totalMessages: todayMessages,
          priceAskers: todayPriceAskers,
          infoAskers: todayInfoAskers,
          priceRate: todayMessages ? ((todayPriceAskers / todayMessages) * 100).toFixed(1) : 0
        },
        hotels: Object.values(hotelResponse).map(hotel => ({
          ...hotel,
          priceRate: hotel.totalMessages ? ((hotel.priceAskers / hotel.totalMessages) * 100).toFixed(1) : 0
        }))
      })
    } catch (error) {
      console.error('Cevaplanma istatistikleri hatası:', error)
    }
  }

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8']

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-center mt-4 text-gray-600">İstatistikler yükleniyor...</p>
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
                İstatistikler
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Genel İstatistikler */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <BarChart3 className="h-8 w-8 text-blue-500" />
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-gray-900">Genel İstatistikler</h3>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <div className="flex justify-between">
                <span>Toplam Yazan:</span>
                <span className="font-bold">{stats.totalCount}</span>
              </div>
              <div className="flex justify-between">
                <span>Bugün Yazan:</span>
                <span className="font-bold">{stats.todayCount}</span>
              </div>
              <div className="flex justify-between">
                <span>Toplam Aranan:</span>
                <span className="font-bold">{stats.totalCalled}</span>
              </div>
              <div className="flex justify-between">
                <span>Bugün Aranan:</span>
                <span className="font-bold">{stats.todayCalled}</span>
              </div>
              <div className="flex justify-between">
                <span>Arama Oranı:</span>
                <span className="font-bold">%{stats.callRateTotal}</span>
              </div>
              <div className="flex justify-between">
                <span>Bugün Arama Oranı:</span>
                <span className="font-bold">%{stats.callRateToday}</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <PieChart className="h-8 w-8 text-green-500" />
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-gray-900">Cevaplanma İstatistikleri</h3>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <div className="flex justify-between">
                <span>Toplam Mesaj:</span>
                <span className="font-bold">{responseStats.total?.totalMessages}</span>
              </div>
              <div className="flex justify-between">
                <span>Fiyat Soran:</span>
                <span className="font-bold">{responseStats.total?.priceAskers}</span>
              </div>
              <div className="flex justify-between">
                <span>Bilgi Soran:</span>
                <span className="font-bold">{responseStats.total?.infoAskers}</span>
              </div>
              <div className="flex justify-between">
                <span>Fiyat Sorma Oranı:</span>
                <span className="font-bold">%{responseStats.total?.priceRate}</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-purple-500" />
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-gray-900">Bugün Cevaplanma</h3>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <div className="flex justify-between">
                <span>Bugün Mesaj:</span>
                <span className="font-bold">{responseStats.today?.totalMessages}</span>
              </div>
              <div className="flex justify-between">
                <span>Fiyat Soran:</span>
                <span className="font-bold">{responseStats.today?.priceAskers}</span>
              </div>
              <div className="flex justify-between">
                <span>Bilgi Soran:</span>
                <span className="font-bold">{responseStats.today?.infoAskers}</span>
              </div>
              <div className="flex justify-between">
                <span>Fiyat Sorma Oranı:</span>
                <span className="font-bold">%{responseStats.today?.priceRate}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Kullanıcı Performans Grafiği */}
        <div className="bg-white p-6 rounded-lg shadow mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Kullanıcı Performansı (Bugün)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={userStats}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="todayCalls" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Otel Bazlı İstatistikler */}
        <div className="bg-white p-6 rounded-lg shadow mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Otel Bazlı İstatistikler</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Otel Adı
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Toplam Yazan
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Bugün Yazan
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Toplam Aranan
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Bugün Aranan
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Arama Oranı
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Bugün Arama Oranı
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {hotelStats.map((hotel, index) => (
                  <tr key={hotel.name} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {hotel.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {hotel.totalCount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {hotel.todayCount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {hotel.totalCalled}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {hotel.todayCalled}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      %{hotel.callRateTotal}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      %{hotel.callRateToday}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Kullanıcı Detay İstatistikleri */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Kullanıcı Bazlı Detay İstatistikler</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {userStats.map((userStat) => (
              <div key={userStat.name} className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-2">{userStat.name}</h4>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span>Toplam Arama:</span>
                    <span className="font-bold">{userStat.totalCalls}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Bugün Arama:</span>
                    <span className="font-bold">{userStat.todayCalls}</span>
                  </div>
                  <div className="mt-2">
                    <span className="text-sm text-gray-600">Otel Bazlı:</span>
                    {Object.entries(userStat.hotels).map(([hotel, count]) => (
                      <div key={hotel} className="flex justify-between text-sm">
                        <span>{hotel}:</span>
                        <span>{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}