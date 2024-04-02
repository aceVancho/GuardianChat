import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';

interface CsvRow {
    [key: string]: string;
}

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
            const key = file.slice(5, -4); // Remove "data-" prefix and ".csv" suffix
            const filePath = path.join(directoryPath, file);
            data[key] = await csvToJson(filePath);
        }
    }

    return data;
};