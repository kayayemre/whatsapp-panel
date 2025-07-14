'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser } from '../lib/auth'

export default function HomePage() {
  const router = useRouter()

  useEffect(() => {
    const user = getCurrentUser()
    if (user) {
      router.push('/dashboard')
    } else {
      router.push('/login')
    }
  }, [router])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-lg">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-center mt-4 text-gray-600">Yönlendiriliyor...</p>
      </div>
    </div>
  )
}