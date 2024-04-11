import { processFilesInDirectory } from "../utils/utils.js";

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