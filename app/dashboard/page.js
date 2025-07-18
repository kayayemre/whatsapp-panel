'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser, logout, isAdmin } from '../../lib/auth'
import { supabase } from '../../lib/supabase'
import { Search, LogOut, Users, BarChart3, Filter, Phone, MapPin, MessageSquare, DollarSign, Calendar, User, TrendingUp, Eye } from 'lucide-react'

export default function DashboardPage() {
  const [user, setUser] = useState(null)
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [stats, setStats] = useState({})
  const [showMessageModal, setShowMessageModal] = useState(false)
  const [selectedMessage, setSelectedMessage] = useState('')
  const router = useRouter()

  const itemsPerPage = 50

  useEffect(() => {
  const currentUser = getCurrentUser()
  if (!currentUser) {
    router.push('/login')
    return
  }
  setUser(currentUser)
  loadData()
  loadStats()

  // Gerçek zamanlı güncellemeler için subscription (daha hızlı)
  const subscription = supabase
    .channel('musteriler_changes')
    .on('postgres_changes', 
      { 
        event: '*', 
        schema: 'public', 
        table: 'musteriler' 
      }, 
      (payload) => {
        console.log('Değişiklik algılandı:', payload)
        // Hemen veriyi ve istatistikleri yeniden yükle
        setTimeout(() => {
          loadData()
          loadStats() // İstatistikleri de güncelle
        }, 100)
      }
    )
    .subscribe()

  // Ek olarak her 5 saniyede bir kontrol et (daha sık)
  const interval = setInterval(() => {
    loadStats() // Sadece istatistikleri güncelle
  }, 5000) // 5 saniye

  return () => {
    subscription.unsubscribe()
    clearInterval(interval)
  }
}, [router, currentPage, searchTerm, statusFilter])

  // Duplicates temizleme fonksiyonu
  const removeDuplicates = async () => {
    try {
      const { data: allData, error } = await supabase
        .from('musteriler')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      const duplicateGroups = {}
      const toDelete = []

      allData.forEach(item => {
        if (!duplicateGroups[item.telefon]) {
          duplicateGroups[item.telefon] = []
        }
        duplicateGroups[item.telefon].push(item)
      })

      Object.values(duplicateGroups).forEach(group => {
        if (group.length > 1) {
          const hotelGroups = {}
          group.forEach(item => {
            if (!hotelGroups[item.otel_adi]) {
              hotelGroups[item.otel_adi] = []
            }
            hotelGroups[item.otel_adi].push(item)
          })

          Object.values(hotelGroups).forEach(hotelGroup => {
            if (hotelGroup.length > 1) {
              const withPrice = hotelGroup.filter(item => 
                item.fiyat && item.fiyat.trim() !== ''
              )
              const withoutPrice = hotelGroup.filter(item => 
                !item.fiyat || item.fiyat.trim() === ''
              )

              if (withPrice.length > 0) {
                toDelete.push(...withoutPrice.map(item => item.id))
                if (withPrice.length > 1) {
                  const sorted = withPrice.sort((a, b) => 
                    new Date(b.created_at) - new Date(a.created_at)
                  )
                  toDelete.push(...sorted.slice(1).map(item => item.id))
                }
              } else if (withoutPrice.length > 1) {
                const sorted = withoutPrice.sort((a, b) => 
                  new Date(b.created_at) - new Date(a.created_at)
                )
                toDelete.push(...sorted.slice(1).map(item => item.id))
              }
            }
          })
        }
      })

      if (toDelete.length > 0) {
        const { error: deleteError } = await supabase
          .from('musteriler')
          .delete()
          .in('id', toDelete)

        if (deleteError) throw deleteError
        console.log(`${toDelete.length} duplicate kayıt silindi`)
      }
    } catch (error) {
      console.error('Duplicate temizleme hatası:', error)
    }
  }

  const loadData = async () => {
    try {
      setLoading(true)
      await removeDuplicates()
      
      let query = supabase
        .from('musteriler')
        .select('*', { count: 'exact' })
        .order('durum', { ascending: false })
        .order('created_at', { ascending: false })

      if (searchTerm) {
        query = query.ilike('telefon', `%${searchTerm}%`)
      }

      if (statusFilter !== 'ALL') {
        query = query.eq('durum', statusFilter)
      }

      const from = (currentPage - 1) * itemsPerPage
      const to = from + itemsPerPage - 1
      query = query.range(from, to)

      const { data: result, error, count } = await query

      if (error) throw error

      // Veri kontrolü ve otomatik güncelleme
      for (const item of result || []) {
        let needsUpdate = false
        let updateData = {}

        // Mesaj kontrolü - cuf geçenleri "Arama bekliyor" yap
        if (item.mesaj && item.mesaj.includes('cuf') && item.mesaj !== 'Arama bekliyor') {
          updateData.mesaj = 'Arama bekliyor'
          needsUpdate = true
        }

        // Fiyat kontrolü - "oda" geçmeyenleri "Genel bilgi aldı" yap
        if (item.fiyat && 
            item.fiyat.trim() !== '' && 
            item.fiyat !== 'Genel bilgi aldı' &&
            !item.fiyat.toLowerCase().includes('oda')) {
          updateData.fiyat = 'Genel bilgi aldı'
          needsUpdate = true
        }

        // Güncelleme gerekiyorsa
        if (needsUpdate) {
          try {
            await supabase
              .from('musteriler')
              .update(updateData)
              .eq('id', item.id)
          } catch (updateError) {
            console.error('Otomatik güncelleme hatası:', updateError)
          }
        }
      }

      // Son veriyi tekrar çek
      const { data: finalResult } = await query
      setData(finalResult || [])
      setTotalPages(Math.ceil(count / itemsPerPage))
    } catch (error) {
      console.error('Veri yüklenirken hata:', error)
    } finally {
      setLoading(false)
    }
  }

 const loadStats = async () => {
  try {
    // Supabase'in varsayılan 1000 limit'ini kaldır
    const { data: totalData, error } = await supabase
      .from('musteriler')
      .select('durum, created_at, updated_by, updated_at')
      .limit(10000) // 10.000 kayıt limiti koy

    if (error) {
      console.error('Stats veri çekme hatası:', error)
      return
    }

    console.log('Stats için çekilen veri sayısı:', totalData?.length) // Debug için

    const today = new Date().toISOString().split('T')[0]
    const todayData = totalData?.filter(item => 
      item.created_at?.startsWith(today)
    ) || []

    const totalCalled = totalData?.filter(item => item.durum === 'ARANDI').length || 0
    
    // Bugün aranan: updated_at'i bugün olan ve durumu ARANDI olan kayıtlar
    const todayCalled = totalData?.filter(item => 
      item.durum === 'ARANDI' && item.updated_at?.startsWith(today)
    ).length || 0

    // Kullanıcı bazlı istatistikler - bugün arama yapanlar
    const userStats = {}
    totalData?.forEach(item => {
      if (item.updated_by && item.durum === 'ARANDI' && item.updated_at?.startsWith(today)) {
        userStats[item.updated_by] = (userStats[item.updated_by] || 0) + 1
      }
    })

    console.log('Hesaplanan stats:', {
      totalCount: totalData?.length,
      todayCount: todayData.length,
      totalCalled,
      todayCalled
    }) // Debug için

    setStats({
      totalCount: totalData?.length || 0,
      todayCount: todayData.length,
      totalCalled,
      todayCalled,
      callRateTotal: totalData?.length ? ((totalCalled / totalData.length) * 100).toFixed(1) : 0,
      callRateToday: todayData.length ? ((todayCalled / todayData.length) * 100).toFixed(1) : 0,
      userStats
    })
  } catch (error) {
    console.error('İstatistikler yüklenirken hata:', error)
  }
}

  const updateStatus = async (id, newStatus) => {
    try {
      const { error } = await supabase
        .from('musteriler')
        .update({ 
          durum: newStatus, 
          updated_by: user.username,
          updated_at: new Date().toISOString() // Güncelleme zamanını kaydet
        })
        .eq('id', id)

      if (error) throw error
      
      // Tabloyu anında güncelle
      setData(prevData => 
        prevData.map(item => 
          item.id === id 
            ? { ...item, durum: newStatus, updated_by: user.username }
            : item
        )
      )
      
      // İstatistikleri yeniden yükle
      await loadStats()
    } catch (error) {
      console.error('Durum güncellenirken hata:', error)
    }
  }

  const handleLogout = () => {
    logout()
    router.push('/login')
  }

  const getRowColor = (status, index) => {
    if (status === 'ARANDI') {
      return index % 2 === 0 ? 'bg-gradient-to-r from-green-50 to-green-100' : 'bg-gradient-to-r from-green-100 to-green-150'
    } else {
      return index % 2 === 0 ? 'bg-gradient-to-r from-pink-50 to-pink-100' : 'bg-gradient-to-r from-pink-100 to-pink-150'
    }
  }

  if (loading && data.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="bg-white/80 backdrop-blur-lg p-8 rounded-2xl shadow-2xl border border-white/20">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto"></div>
          <p className="text-center mt-4 text-gray-700 font-medium">Yükleniyor...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Animated Header */}
      <div className="bg-white/80 backdrop-blur-lg shadow-lg border-b border-white/20 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                  <Eye className="w-6 h-6 text-white" />
                </div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                  Müşteri Tablosu
                </h1>
              </div>
              <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg">
                <User className="w-4 h-4 inline mr-2" />
                {user?.username} ({user?.role})
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {isAdmin() && (
                <>
                  <button
                    onClick={() => router.push('/admin/users')}
                    className="flex items-center space-x-2 bg-gradient-to-r from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 px-4 py-2 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                  >
                    <Users size={16} />
                    <span>Kullanıcılar</span>
                  </button>
                  <button
                    onClick={() => router.push('/admin/stats')}
                    className="flex items-center space-x-2 bg-gradient-to-r from-blue-100 to-purple-100 hover:from-blue-200 hover:to-purple-200 px-4 py-2 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                  >
                    <BarChart3 size={16} />
                    <span>İstatistikler</span>
                  </button>
                </>
              )}
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 bg-gradient-to-r from-red-100 to-red-200 hover:from-red-200 hover:to-red-300 text-red-700 px-4 py-2 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                <LogOut size={16} />
                <span>Çıkış</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Statistics Cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Genel İstatistikler */}
          <div className="bg-white/80 backdrop-blur-lg p-8 rounded-2xl shadow-2xl border border-white/20 hover:shadow-3xl transition-all duration-300">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mr-4">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-800">Genel İstatistikler</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-xl">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 font-medium">Toplam Yazan</span>
                  <span className="text-2xl font-bold text-blue-600">{stats.totalCount}</span>
                </div>
              </div>
              <div className="bg-gradient-to-r from-green-50 to-green-100 p-4 rounded-xl">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 font-medium">Bugün Yazan</span>
                  <span className="text-2xl font-bold text-green-600">{stats.todayCount}</span>
                </div>
              </div>
              <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-4 rounded-xl">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 font-medium">Toplam Aranan</span>
                  <span className="text-2xl font-bold text-purple-600">{stats.totalCalled}</span>
                </div>
              </div>
              <div className="bg-gradient-to-r from-orange-50 to-orange-100 p-4 rounded-xl">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 font-medium">Bugün Aranan</span>
                  <span className="text-2xl font-bold text-orange-600">{stats.todayCalled}</span>
                </div>
              </div>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-gradient-to-r from-indigo-50 to-indigo-100 rounded-xl">
                <div className="text-3xl font-bold text-indigo-600">%{stats.callRateTotal}</div>
                <div className="text-sm text-gray-600 font-medium">Toplam Arama Oranı</div>
              </div>
              <div className="text-center p-4 bg-gradient-to-r from-pink-50 to-pink-100 rounded-xl">
                <div className="text-3xl font-bold text-pink-600">%{stats.callRateToday}</div>
                <div className="text-sm text-gray-600 font-medium">Bugün Arama Oranı</div>
              </div>
            </div>
          </div>

          {/* Kullanıcı Bazlı İstatistikler */}
          <div className="bg-white/80 backdrop-blur-lg p-8 rounded-2xl shadow-2xl border border-white/20 hover:shadow-3xl transition-all duration-300">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-green-600 rounded-xl flex items-center justify-center mr-4">
                <Users className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-800">Kullanıcı Bazlı İstatistikler</h3>
            </div>
            <div className="space-y-4">
              {Object.entries(stats.userStats || {})
                .sort(([, a], [, b]) => b - a) // En çok'tan en az'a sıralama
                .map(([username, count], index) => (
                  <div key={username} className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl hover:from-gray-100 hover:to-gray-150 transition-all duration-300">
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                        index % 4 === 0 ? 'bg-blue-500' : 
                        index % 4 === 1 ? 'bg-green-500' : 
                        index % 4 === 2 ? 'bg-purple-500' : 'bg-orange-500'
                      }`}>
                        {username.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium text-gray-700">{username}</span>
                    </div>
                    <span className="text-2xl font-bold text-gray-800">{count}</span>
                  </div>
                ))
              }
              {Object.keys(stats.userStats || {}).length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  Henüz bugün arama yapılmamış
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Enhanced Search and Filters */}
        <div className="bg-white/80 backdrop-blur-lg p-6 rounded-2xl shadow-2xl border border-white/20 mb-8">
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="flex-1">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Phone className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Telefon numarası ile ara..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-300 bg-white/80 backdrop-blur-sm"
                />
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Filter size={20} className="text-gray-500" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-300 bg-white/80 backdrop-blur-sm font-medium"
                >
                  <option value="ALL">Tüm Durumlar</option>
                  <option value="ARANDI">Arandı</option>
                  <option value="ARANMADI">Aranmadı</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Table */}
        <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/20 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full table-fixed" style={{tableLayout: 'fixed'}}>
              <colgroup>
                <col style={{width: '60px'}} />
                <col style={{width: '60px'}} />
                <col style={{width: '110px'}} />
                <col style={{width: '150px'}} />
                <col style={{width: '130px'}} />
                <col style={{width: '120px'}} />
                <col style={{width: '80px'}} />
                <col style={{width: '100px'}} />
              </colgroup>
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                <tr>
                  <th className="px-2 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                    <User className="w-4 h-4 inline mr-1" />
                    Ad
                  </th>
                  <th className="px-2 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                    <Phone className="w-4 h-4 inline mr-1" />
                    Tel
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                    <MapPin className="w-4 h-4 inline mr-1" />
                    Otel
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                    <MessageSquare className="w-4 h-4 inline mr-1" />
                    Mesaj
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                    <DollarSign className="w-4 h-4 inline mr-1" />
                    Fiyat
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Durum
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Arayan
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                    <Calendar className="w-4 h-4 inline mr-1" />
                    Tarih
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200/50">
                {data.map((item, index) => (
                  <tr key={item.id} className={`${getRowColor(item.durum, index)} transition-all duration-300`}>
                    <td className="px-2 py-3 text-sm font-medium text-gray-900 relative group overflow-hidden">
                      <div className="truncate text-sm">
                        {item.ad_soyad && item.ad_soyad.length > 8 ? item.ad_soyad.substring(0, 8) + '...' : item.ad_soyad}
                      </div>
                      <div className="absolute z-[100] bottom-full left-0 mb-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg shadow-2xl opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none whitespace-nowrap border border-gray-700">
                        {item.ad_soyad}
                      </div>
                    </td>
                    <td className="px-2 py-3 text-sm text-gray-900 font-mono overflow-hidden relative group">
                      <div className="truncate text-sm">
                        {item.telefon}
                      </div>
                      <div className="absolute z-[100] bottom-full left-0 mb-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg shadow-2xl opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none whitespace-nowrap border border-gray-700">
                        {item.telefon}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-900 overflow-hidden relative group">
                      <div className="truncate">
                        <span className="bg-blue-100 text-blue-800 px-1 py-0.5 rounded text-sm font-medium">
                          {item.otel_adi}
                        </span>
                      </div>
                      <div className="absolute z-[100] bottom-full left-0 mb-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg shadow-2xl opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none whitespace-nowrap border border-gray-700">
                        {item.otel_adi}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-900 overflow-hidden">
                      <div 
                        className="truncate cursor-pointer hover:bg-blue-50 p-1 rounded"
                        onClick={() => {
                          setSelectedMessage(item.mesaj)
                          setShowMessageModal(true)
                        }}
                        title="Tıklayın - tam mesajı görmek için"
                      >
                        {item.mesaj && item.mesaj.length > 45 ? item.mesaj.substring(0, 45) + '...' : item.mesaj}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-900 relative group overflow-hidden">
                      <div className="truncate text-sm">
                        {item.fiyat}
                      </div>
                      <div className="absolute z-[100] bottom-full left-0 mb-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg shadow-2xl opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none max-w-sm border border-gray-700 whitespace-normal">
                        {item.fiyat}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-900 overflow-hidden relative group">
                      <select
                        value={item.durum}
                        onChange={(e) => updateStatus(item.id, e.target.value)}
                        className={`px-2 py-1 border-2 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-300 font-medium text-sm w-full ${
                          item.durum === 'ARANDI' 
                            ? 'bg-green-50 border-green-200 text-green-800' 
                            : 'bg-pink-50 border-pink-200 text-pink-800'
                        }`}
                      >
                        <option value="ARANMADI">ARANMADI</option>
                        <option value="ARANDI">ARANDI</option>
                      </select>
                      <div className="absolute z-[100] bottom-full left-0 mb-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg shadow-2xl opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none whitespace-nowrap border border-gray-700">
                        Durum: {item.durum}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-900 overflow-hidden relative group">
                      <div className="truncate text-sm">
                        {item.updated_by && (item.updated_by.length > 5 ? item.updated_by.substring(0, 5) + '...' : item.updated_by)}
                      </div>
                      {item.updated_by && (
                        <div className="absolute z-[100] bottom-full left-0 mb-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg shadow-2xl opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none whitespace-nowrap border border-gray-700">
                          {item.updated_by}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-900 overflow-hidden relative group">
                      <div className="text-sm">
                        {new Date(item.created_at).toLocaleDateString('tr-TR', { 
                          day: '2-digit', 
                          month: '2-digit' 
                        })} {new Date(item.created_at).toLocaleTimeString('tr-TR', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </div>
                      <div className="absolute z-[100] bottom-full left-0 mb-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg shadow-2xl opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none whitespace-nowrap border border-gray-700">
                        {new Date(item.created_at).toLocaleString('tr-TR')}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Enhanced Pagination */}
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 flex items-center justify-between border-t border-gray-200/50">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-4 py-2 border-2 border-gray-300 text-sm font-medium rounded-xl text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
              >
                Önceki
              </button>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border-2 border-gray-300 text-sm font-medium rounded-xl text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
              >
                Sonraki
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700 font-medium">
                  Toplam <span className="font-bold text-blue-600">{data.length}</span> kayıt gösteriliyor
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-xl shadow-lg -space-x-px">
                  <button
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-3 py-2 rounded-l-xl border-2 border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                  >
                    İlk
                  </button>
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-3 py-2 border-2 border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                  >
                    Önceki
                  </button>
                  
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`relative inline-flex items-center px-4 py-2 border-2 text-sm font-medium transition-all duration-300 ${
                          currentPage === pageNum
                            ? 'z-10 bg-gradient-to-r from-blue-500 to-purple-600 border-blue-500 text-white shadow-lg'
                            : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50 hover:border-gray-400'
                        }`}
                      >
                        {pageNum}
                      </button>
                    )
                  })}
                  
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center px-3 py-2 border-2 border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                  >
                    Sonraki
                  </button>
                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center px-3 py-2 rounded-r-xl border-2 border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                  >
                    Son
                  </button>
                </nav>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mesaj Modal */}
      {showMessageModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1000]">
          <div className="bg-white p-6 rounded-lg shadow-2xl max-w-2xl w-full mx-4">
            <h3 className="text-lg font-semibold mb-4 text-gray-800">Tam Mesaj</h3>
            <div className="bg-gray-50 p-4 rounded-lg mb-4 max-h-80 overflow-y-auto">
              <p className="text-gray-700 whitespace-pre-wrap">{selectedMessage}</p>
            </div>
            <button
              onClick={() => setShowMessageModal(false)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Kapat
            </button>
          </div>
        </div>
      )}
    </div>
  )
}