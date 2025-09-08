import { createClient } from '@supabase/supabase-js'
const supabaseUrl = 'https://tqzwrimdyhkvndclesly.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRxendyaW1keWhrdm5kY2xlc2x5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY5OTk1MDcsImV4cCI6MjA3MjU3NTUwN30.5QjwMmyM0lHdbtTPsST5Pg6-y6wt79DRNrqj-6DT6yE'
export const supabase = createClient(supabaseUrl, supabaseAnonKey)