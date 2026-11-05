import axios from "axios";

const defaultBaseURL = typeof window !== "undefined" && !["localhost", "127.0.0.1"].includes(window.location.hostname)
    ? "https://candidate-communication-platform-ddv6.onrender.com/api/"
    : "http://127.0.0.1:8000/api/";

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || defaultBaseURL,
    headers: {
        "Content-Type": "application/json",
    },
});

export default api;
