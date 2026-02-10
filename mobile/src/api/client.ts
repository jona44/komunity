import axios from 'axios';

const API_BASE_URL = 'http://192.168.88.243:8000/api/v1/'; // Use machine IP for mobile devices

const client = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

export const setAuthToken = (token: string | null) => {
    if (token) {
        client.defaults.headers.common['Authorization'] = `Token ${token}`;
    } else {
        delete client.defaults.headers.common['Authorization'];
    }
};

export default client;
