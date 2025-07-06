import Foundation
import Supabase

class SupabaseService {
    static let shared = SupabaseService()
    
    let client: SupabaseClient
    
    private init() {
        let supabaseURL = URL(string: "https://axmnmxwjijsigiueednz.supabase.co")!
        let supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF4bW5teHdqaWpzaWdpdWVlZG56Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEwNzgzMDEsImV4cCI6MjA2NjY1NDMwMX0.nsABAOauQ5ubWKx1vGXl5X028INOCL0nqvmE-RQ5MqA"
        
        client = SupabaseClient(
            supabaseURL: supabaseURL,
            supabaseKey: supabaseKey
        )
    }
}