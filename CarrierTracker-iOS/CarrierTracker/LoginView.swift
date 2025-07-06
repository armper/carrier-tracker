import SwiftUI

struct LoginView: View {
    @EnvironmentObject var authManager: AuthManager
    @State private var email = ""
    @State private var password = ""
    @State private var isLoading = false
    @State private var showingSignUp = false
    @State private var errorMessage = ""
    
    var body: some View {
        VStack(spacing: 20) {
            VStack(spacing: 8) {
                Image(systemName: "truck.box")
                    .font(.system(size: 60))
                    .foregroundColor(.blue)
                
                Text("CarrierTracker")
                    .font(.largeTitle)
                    .fontWeight(.bold)
                
                Text("Track transportation carriers and safety ratings")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                    .multilineTextAlignment(.center)
            }
            .padding(.bottom, 30)
            
            VStack(spacing: 16) {
                TextField("Email", text: $email)
                    .textFieldStyle(RoundedBorderTextFieldStyle())
                    .keyboardType(.emailAddress)
                    .autocapitalization(.none)
                
                SecureField("Password", text: $password)
                    .textFieldStyle(RoundedBorderTextFieldStyle())
                
                if !errorMessage.isEmpty {
                    Text(errorMessage)
                        .foregroundColor(.red)
                        .font(.caption)
                }
                
                Button(action: signIn) {
                    if isLoading {
                        ProgressView()
                            .progressViewStyle(CircularProgressViewStyle(tint: .white))
                    } else {
                        Text("Sign In")
                    }
                }
                .buttonStyle(.borderedProminent)
                .disabled(isLoading || email.isEmpty || password.isEmpty)
                
                Button("Don't have an account? Sign Up") {
                    showingSignUp = true
                }
                .foregroundColor(.blue)
                
                // Test account button for development
                Button("Use Test Account") {
                    email = "test@example.com"
                    password = "testpassword123"
                }
                .foregroundColor(.orange)
                .font(.caption)
            }
            .padding(.horizontal)
            
            Spacer()
        }
        .padding()
        .sheet(isPresented: $showingSignUp) {
            SignUpView()
        }
    }
    
    private func signIn() {
        isLoading = true
        errorMessage = ""
        
        Task {
            do {
                try await authManager.signIn(email: email, password: password)
            } catch {
                errorMessage = "Failed to sign in: \(error.localizedDescription)"
            }
            isLoading = false
        }
    }
}