import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import { io } from "socket.io-client";
import { AuthContext } from "./authContextCreate.js";

const backendUrl = import.meta.env.VITE_BACKEND_URL;

// =========================
// AXIOS DEFAULTS
// =========================
axios.defaults.baseURL = backendUrl;
axios.defaults.timeout = 30000;
axios.defaults.withCredentials = true;

// IMPORTANT FIX
const savedToken = localStorage.getItem("token");

if (savedToken) {
  axios.defaults.headers.common[
    "Authorization"
  ] = `Bearer ${savedToken}`;
}

// =========================
// AXIOS INTERCEPTOR
// =========================
let isRedirecting = false;

axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !isRedirecting) {
      isRedirecting = true;

      localStorage.removeItem("token");

      delete axios.defaults.headers.common["Authorization"];

      setTimeout(() => {
        window.location.href = "/login";
        isRedirecting = false;
      }, 500);
    }

    return Promise.reject(error);
  },
);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [authUser, setAuthUser] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [socket, setSocket] = useState(null);

  // IMPORTANT FIX
  const [loading, setLoading] = useState(true);

  // =========================
  // CONNECT SOCKET
  // =========================
  const connectSocket = useCallback(
    (userData) => {
      if (!userData || !token) return;

      if (socket?.connected) return;

      // When backendUrl is empty, connect to current origin (dev proxy mode)
      const socketUrl = backendUrl || window.location.origin;

      const newSocket = io(socketUrl, {
        withCredentials: true,
        transports: ["polling", "websocket"],
        reconnection: true,
        reconnectionAttempts: 5,
        query: {
          userId: userData._id,
        },
      });

      newSocket.on("connect_error", (error) => {
        console.error("Socket Error:", error);
      });

      newSocket.on("disconnect", (reason) => {
        console.log("Socket disconnected:", reason);
      });

      newSocket.on("getOnlineUsers", (userIds) => {
        setOnlineUsers(userIds);
      });

      setSocket(newSocket);
    },
    [socket, token],
  );

  // =========================
  // CHECK AUTH
  // =========================
  const checkAuth = useCallback(async () => {
    try {
      if (!token) {
        setLoading(false);
        return;
      }

      axios.defaults.headers.common[
        "Authorization"
      ] = `Bearer ${token}`;

      const { data } = await axios.get("/api/auth/check");

      if (data.success) {
        setAuthUser(data.user);

        connectSocket(data.user);
      } else {
        localStorage.removeItem("token");

        delete axios.defaults.headers.common[
          "Authorization"
        ];

        setToken(null);
        setAuthUser(null);
      }
    } catch (error) {
      console.error("Auth Check Error:", error);

      localStorage.removeItem("token");

      delete axios.defaults.headers.common[
        "Authorization"
      ];

      setToken(null);
      setAuthUser(null);
    } finally {
      setLoading(false);
    }
  }, [token, connectSocket]);

  // =========================
  // LOGIN / SIGNUP
  // =========================
  const login = async (state, credentials) => {
    try {
      const { data } = await axios.post(
        `/api/auth/${state}`,
        credentials,
      );

      if (data.success) {
        // SAVE TOKEN
        localStorage.setItem("token", data.token);

        // IMPORTANT FIX
        axios.defaults.headers.common[
          "Authorization"
        ] = `Bearer ${data.token}`;

        setToken(data.token);

        setAuthUser(data.userData);

        connectSocket(data.userData);

        toast.success(data.message);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.error(`${state} Error:`, error);

      toast.error(
        error.response?.data?.message ||
          error.message ||
          `${state} failed`,
      );
    }
  };

  // =========================
  // LOGOUT
  // =========================
  const logout = async () => {
    try {
      localStorage.removeItem("token");

      delete axios.defaults.headers.common[
        "Authorization"
      ];

      setToken(null);
      setAuthUser(null);
      setOnlineUsers([]);

      if (socket) {
        socket.disconnect();
      }

      toast.success("Logged out successfully");
    } catch (error) {
      console.error("Logout Error:", error);
    }
  };

  // =========================
  // UPDATE PROFILE
  // =========================
  const updateProfile = async (body) => {
    try {
      const { data } = await axios.put(
        "/api/auth/update-profile",
        body,
      );

      if (data.success) {
        setAuthUser(data.user);

        toast.success("Profile updated");

        return true;
      } else {
        toast.error(data.message);

        return false;
      }
    } catch (error) {
      console.error("Profile Update Error:", error);

      toast.error(
        error.response?.data?.message ||
          "Profile update failed",
      );

      return false;
    }
  };

  // =========================
  // INITIAL AUTH CHECK
  // =========================
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const value = {
    axios,
    authUser,
    onlineUsers,
    socket,
    login,
    logout,
    updateProfile,
    loading,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};