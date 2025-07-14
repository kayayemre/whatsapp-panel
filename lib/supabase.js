import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://knnfjuslcmrixhlcejag.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtubmZqdXNsY21yaXhobGNlamFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI0MTEzMjksImV4cCI6MjA2Nzk4NzMyOX0.QlNLG7cZlMWTc3NeKQMvtKJ36bpiBuSpbWwscAZND5I'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)