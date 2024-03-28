import fs from 'fs';
import csv from 'csv-parser';
import { createObjectCsvWriter } from 'csv-writer';

const RAW_CHAT_LOGS_PATH = 'src/data/raw/chatlog.csv';
const CLEAN_CHAT_LOGS_PATH = 'src/data/clean/chatlog_clean.csv';

const cleanChatLog = (chatLog: string): string => {
    const systemMessageStarters = [
        "Incoming session from:",
        "Connecting to:",
        "Connected to Applet",
        "Sending resource file:",
        "Waiting for customer permission",
        "File has been successfully sent",
        "Executing script:",
        "Remote Control successfully initiated",
        "Remote Control ended",
        "Execution of script",
        "Output:",
        "Disconnected (Applet)",
        "Transferring session to",
        "Switched to P2P",
        "URL push:",
        "Holding session...",
        "Desktop View successfully initiated",
        "(Size:",
        "The customer ended the session",
        "The technician ended the session.",
        "1)",
        "2)",
        "3)",
        "Requesting Dashboard information.",
        "Dashboard Drives information received.",
        "Dashboard Memory information received.",
        "Dashboard CPU information received.",
        "Dashboard Scheduled Tasks information received.",
        "Dashboard OS information received.",
        "Dashboard Events information received.",
        "Dashboard Processes information received.",
        "Emergency reboot has been successfully initiated on the customer's device.",
        "The customer's device is rebooting.",
        "Emergency reboot has been successfully initiated",
        "xxx",
        "xxx",
        "xxx",
        "xxx",
    ];

    const incomingSessionPattern = /^(\d{1,2}:\d{2} (?:AM|PM)) Incoming session from:.*Good luck on your exam!/s;
// /^\d{1,2}:\d{2} (?:AM|PM)|^\d{1,2}:\d{2}/i
// /(?:(?:\d{1,2}:\d{2} (?:AM|PM))|(?:[01]?\d|2[0-3]):\d{2})/gi

    const messages = chatLog.split(/(?:(?:\d{1,2}:\d{2} (?:AM|PM))|(?:[01]?\d|2[0-3]):\d{2})/gi);
    const cleanedMessages = messages.map((message) => {
        const trimmedMessage = message.trim();
        console.log(trimmedMessage)
        const messageWithoutTimestamp = trimmedMessage.replace(/^\d{1,2}:\d{2} (?:AM|PM) /i, '');
        console.log(messageWithoutTimestamp)

        const isSystemMessage = systemMessageStarters.some((starter) => {
            return messageWithoutTimestamp.startsWith(starter) 
                || incomingSessionPattern.test(trimmedMessage)
        })

        console.log(isSystemMessage)
        const isInvalidMessage = /^\d+$/.test(messageWithoutTimestamp);
        console.log(isInvalidMessage, '\n\n')

        return isSystemMessage || isInvalidMessage ? '' : message;
    });

    return cleanedMessages.join(' ').trim();
};






const cleanCsv = async (inputPath: string, outputPath: string) => {
    const rows: any[] = [];
    fs.createReadStream(inputPath)
        .pipe(csv())
        .on('data', (row) => {
            row.Chatlog = cleanChatLog(row.Chatlog || '');
            rows.push(row);
        })
        .on('end', async () => {
            const csvWriter = createObjectCsvWriter({
                path: outputPath,
                header: Object.keys(rows[0]).map(key => ({ id: key, title: key }))
            });
            await csvWriter.writeRecords(rows);
            console.log(`Cleaned CSV written to ${outputPath}`);
        });
};

cleanCsv(RAW_CHAT_LOGS_PATH, CLEAN_CHAT_LOGS_PATH);
