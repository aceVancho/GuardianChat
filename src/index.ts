import dotenv from 'dotenv';
import { run } from './chat/chat.js';
dotenv.config();

const init = async () => {
    console.log(`GuardianChat running on port ${process.env.PORT}`);
    run();
};

init();