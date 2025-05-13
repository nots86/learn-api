import axios from "axios";
import * as https from "https";
import fs from "fs";
import path from "path";

// Path to the directory containing the certificates. Definethe absolute path to the certs directory
const certDir = path.resolve(process.cwd(), "src", "certs");
console.log("Certs directory:", certDir);
// Check if the certs directory exists

// Create an HTTPS agent with multiple trusted root certificate
const agent = new https.Agent({
    ca: [
        // Read the certificates from the certs directory
        fs.readFileSync(path.join(certDir, "nn-root.pem")),
        fs.readFileSync(path.join(certDir, "ZScaler_Root_CA.crt")),
    ]
        })
// Create an Axios instance with the custom HTTPS agent
export const secureAxios = axios.create({
    httpsAgent: agent,
    //baseURL: process.env.PS_CHAT_API_URL,   
    
}) 