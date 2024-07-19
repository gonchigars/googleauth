import React from "react";
import { useGoogleLogin } from "@react-oauth/google";
import { useNavigate } from "react-router-dom";
import axios from "axios";

function Login() {
  const navigate = useNavigate();

  const login = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      console.log("Google token response:", tokenResponse);
      try {
        // Request the ID token
        const { data } = await axios.get(
          "https://www.googleapis.com/oauth2/v3/userinfo",
          {
            headers: {
              Authorization: `Bearer ${tokenResponse.access_token}`,
            },
          }
        );

        console.log("Google user info:", data);

        // Send the ID token to your backend
        const response = await axios.post(
          "http://localhost:8000/google_login",
          {
            token: data.sub, // Use the 'sub' field as the ID token
          }
        );

        console.log("Backend response:", response.data);

        // Store the JWT token
        localStorage.setItem("token", response.data.access_token);

        // Navigate to the dashboard
        navigate("/dashboard");
      } catch (error) {
        console.error("Error during login:", error);
        if (error.response) {
          console.error("Error data:", error.response.data);
          console.error("Error status:", error.response.status);
          console.error("Error headers:", error.response.headers);
        } else if (error.request) {
          console.error("Error request:", error.request);
        } else {
          console.error("Error message:", error.message);
        }
      }
    },
    onError: (errorResponse) =>
      console.error("Google login error:", errorResponse),
  });

  return (
    <div>
      <h1>Login</h1>
      <button onClick={() => login()}>Sign in with Google</button>
    </div>
  );
}

export default Login;
