import axios from "axios";

// Axios instance with base URL and credentials
const API = axios.create({
  baseURL: "/api/v1",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

export default API;