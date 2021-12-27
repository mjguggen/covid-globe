import axios from 'axios';

const api = axios.create({
    baseURL: '/api',
    headers: {
      'Content-Type': 'application/json',
      "Access-Control-Allow-Origin": "*"
    }
});

export default api;