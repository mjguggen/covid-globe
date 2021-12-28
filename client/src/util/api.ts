import axios from 'axios';

const api = axios.create({
    baseURL: process.env.NODE_ENV === 'development' ? 'http://localhost:8080/api' : '/api',
    headers: {
      'Content-Type': 'application/json',
      "Access-Control-Allow-Origin": "*"
    }
});

export default api;