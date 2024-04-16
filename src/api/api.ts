import dotenv from 'dotenv';
import { processFilesInDirectory } from "../utils/utils.js";
dotenv.config();

export const mockAPICall = async () => {
    const directoryPath = 'src/data/db/sessions/1059303213';
    let data;
    try {
        data = await processFilesInDirectory(directoryPath);
    } catch (error) {
        console.error('Error processing files:', error);
    }
    return data;
};

async function postLTISession(): Promise<string> {
    const url = process.env.LTI_SESSIONS_ENDPOINT!;
    const headers = {
        'Content-Type': 'application/json',
        'User-Agent': process.env.GUARDIAN_USER_AGENT!,
    };

    const ltiPayload = process.env.LTI_PAYLOAD!;
    const payloadObject = JSON.parse(ltiPayload);
    const body = JSON.stringify(payloadObject);

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: headers,
            body: body
        });

        let cookies = response['headers'].getSetCookie();
        const formattedCookies =  cookies.slice(1,3).join(',');
        return formattedCookies;
    } catch (error) {
        console.error('Error making POST request:', error);
        throw new Error('Error making POST request');
    }
}

async function getFulfillmentDetails(cookies: string, uuid: string): Promise<any> {
    const url = `${process.env.FULFILLMENT_ENDPOINT!}${uuid}`;

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Cookie': cookies,
                'User-Agent': process.env.GUARDIAN_USER_AGENT!
            }
        });
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error making GET request:', error);
        throw new Error('Error making GET request');
    }
}

async function getReservationData(uuid: string) {
    try {
        const cookies = await postLTISession();
        const details = await getFulfillmentDetails(cookies, uuid);
        console.log(details);
    } catch (error) {
        console.error('Failed:', error);
    }
}

getReservationData(process.env.FULFILLMENT_UUID!)