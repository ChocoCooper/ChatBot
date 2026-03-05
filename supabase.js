// supabase.js - Supabase Client
const SUPABASE_URL = "https://crkgzxsjseparkkiubow.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNya2d6eHNqc2VwYXJra2l1Ym93Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzNzA0NzgsImV4cCI6MjA4Nzk0NjQ3OH0.F98aNcm8988oBOdYVFvJgUY4IDW9Fe0pp3ITcBoibto";

// Load Supabase from CDN (injected via script tag in HTML)
// window.supabase is set after the CDN loads
let _supabaseClient = null;

function getSupabase() {
    if (!_supabaseClient) {
        _supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
    return _supabaseClient;
}
