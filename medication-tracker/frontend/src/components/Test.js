import React, { useState, useEffect } from 'react';
import axios from '../services/axiosConfig';

const Test = () => {
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        const testApi = async () => {
            try {
                const response = await axios.get('/test');
                setMessage(response.data.message);
            } catch (err) {
                setError(err.message);
                console.error('Test error:', err);
            }
        };

        testApi();
    }, []);

    return (
        <div>
            {message && <p>Message: {message}</p>}
            {error && <p>Error: {error}</p>}
        </div>
    );
};

export default Test;
