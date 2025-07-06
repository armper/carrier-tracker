import SwiftUI

struct SignUpView: View {
    @EnvironmentObject var authManager: AuthManager
    @Environment(\.dismiss) private var dismiss
    @State private var email = ""
    @State private var password = ""
    @State private var confirmPassword = ""
    @State private var isLoading = false
    @State private var errorMessage = ""
    
    var body: some View {
        NavigationView {
            VStack(spacing: 20) {
                VStack(spacing: 8) {
                    Image(systemName: "truck.box")
                        .font(.system(size: 50))
                        .foregroundColor(.blue)
                    
                    Text("Create Account")
                        .font(.title)
                        .fontWeight(.bold)
                }
                .padding(.bottom, 20)
                
                VStack(spacing: 16) {
                    TextField("Email", text: $email)
                        .textFieldStyle(RoundedBorderTextFieldStyle())
                        .keyboardType(.emailAddress)
                        .autocapitalization(.none)
                    
                    SecureField("Password", text: $password)
                        .textFieldStyle(RoundedBorderTextFieldStyle())
                    
                    SecureField("Confirm Password", text: $confirmPassword)
                        .textFieldStyle(RoundedBorderTextFieldStyle())
                    
                    if !errorMessage.isEmpty {
                        Text(errorMessage)
                            .foregroundColor(.red)
                            .font(.caption)
                    }
                    
                    Button(action: signUp) {
                        if isLoading {
                            ProgressView()
                                .progressViewStyle(CircularProgressViewStyle(tint: .white))
                        } else {
                            Text("Sign Up")
                        }
                    }
                    .buttonStyle(.borderedProminent)
                    .disabled(isLoading || !isValidForm)
                }
                .padding(.horizontal)
                
                Spacer()
            }
            .padding()
            .navigationTitle("Sign Up")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
            }
        }
    }
    
    private var isValidForm: Bool {
        !email.isEmpty && !password.isEmpty && password == confirmPassword && password.count >= 6
    }
    
    private func signUp() {
        isLoading = true
        errorMessage = ""
        
        Task {
            do {
                try await authManager.signUp(email: email, password: password)
                dismiss()
            } catch {
                errorMessage = "Failed to create account: \(error.localizedDescription)"
            }
            isLoading = false
        }
    }
}