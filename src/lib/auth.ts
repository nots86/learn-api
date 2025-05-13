import { secureAxios } from "./secureAxios";

// This function is responsible for obtaining authentication cookies from the server
// It sends a POST request to the 'api/tokens' endpoint with the username and password  
export default async function getAuthCookies() {
    const response  = await secureAxios.post(
        'https://pschat.novonordisk.com/api/api/tokens',
        {
            username: process.env.PS_CHAT_USERNAME,
            secret_key: process.env.PS_CHAT_PASSWORD,
        },
        {
            // Set the `withCredentials` option to true to include cookies in the request
            // This is important for authentication and session management
           withCredentials: true,
        }
    );

    // Check if the response contains cookies in the headers
    // The 'set-cookie' header is used to set cookies in the response
    const setCookies = response.headers['set-cookie'];

    if (!setCookies) {
        throw new Error("No cookies found in the response");
    }
    // Check if the cookies are in an array format
    // If so, join them into a single string    
    // If not, return the single cookie string
    // This is to ensure compatibility with different server responses
    return Array.isArray(setCookies) ? setCookies.join('; ') : setCookies;
}