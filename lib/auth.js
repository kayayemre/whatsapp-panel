import { supabase } from './supabase'
import Cookies from 'js-cookie'

export const login = async (username, password) => {
  try {
    // Kullanıcıyı veritabanından al
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .single()

    if (error || !user) {
      throw new Error('Kullanıcı bulunamadı')
    }

    // Basit şifre kontrolü (geliştirme için)
let isPasswordValid = false
if (username === 'admin' && password === 'admin123') {
  isPasswordValid = true
} else if (username === 'user' && password === 'user123') {
  isPasswordValid = true
} else if (password === username + '123') {
  // Yeni kullanıcılar için: kullanıcı_adı + 123
  isPasswordValid = true
}

    // Cookie'ye kullanıcı bilgilerini kaydet
    Cookies.set('user', JSON.stringify({
      id: user.id,
      username: user.username,
      role: user.role
    }), { expires: 7 })

    return user
  } catch (error) {
    throw error
  }
}

export const logout = () => {
  Cookies.remove('user')
}

export const getCurrentUser = () => {
  const userCookie = Cookies.get('user')
  return userCookie ? JSON.parse(userCookie) : null
}

export const isAdmin = () => {
  const user = getCurrentUser()
  return user?.role === 'admin'
}
