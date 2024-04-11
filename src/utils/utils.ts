import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import readline from 'readline';

interface CsvRow {
    [key: string]: string;
}

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

export const inputPrompt = (question: string) => new Promise<string>((resolve) => rl.question(question, resolve));

export const csvToJson = (filePath: string): Promise<CsvRow[]> => {
    return new Promise((resolve, reject) => {
        const jsonData: CsvRow[] = [];
        fs.createReadStream(filePath)
            .pipe(csv())
            .on('data', (row: CsvRow) => jsonData.push(row))
            .on('end', () => resolve(jsonData))
            .on('error', (error: Error) => reject(error));
    });
};


export const processFilesInDirectory = async (directoryPath: string): Promise<Record<string, CsvRow[]>> => {
    const files = fs.readdirSync(directoryPath);
    const data: Record<string, CsvRow[]> = {};

    for (const file of files) {
        if (file.startsWith('data-') && file.endsWith('.csv')) {
            const key = file.slice(5, -4);
            const filePath = path.join(directoryPath, file);
            data[key] = await csvToJson(filePath);
        }
    }

    return data;
};

export const formatDataForSystemMessage = (data: any): string => {
    let content = '';

    if (data.enrollments && data.enrollments.length > 0) {
        content += 'Enrollments:\n';
        data.enrollments.forEach((enrollment: any) => {
            Object.entries(enrollment).forEach(([key, value]) => {
                content += `  ${key}: ${value}\n`;
            });
            content += '\n';
        });
    }

    if (data.fulfillments && data.fulfillments.length > 0) {
        content += 'Fulfillments:\n';
        data.fulfillments.forEach((fulfillment: any) => {
            Object.entries(fulfillment).forEach(([key, value]) => {
                content += `  ${key}: ${value}\n`;
            });
            content += '\n';
        });
    }

    return content.trim();
};