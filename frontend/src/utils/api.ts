import axios from "axios";

console.log("API BASE URL:", import.meta.env.VITE_API_URL); 

const API = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL}/api/v1`,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

export default API;