import axios from "axios";

const api = axios.create({
  baseURL: "https://olivia-chatbot.onrender.com/api",
  withCredentials: true
});

export default api;
