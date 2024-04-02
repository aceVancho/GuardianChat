import dotenv from 'dotenv';
import { Session, ZepClient } from "@getzep/zep-js";

dotenv.config();
const ZEP_API_KEY = process.env.ZEP_API_KEY!
const zepClient = await ZepClient.init(ZEP_API_KEY,);
const sessions: Session[] = await zepClient.memory.listSessions();

sessions.forEach(async (session) => await zepClient.memory.deleteMemory(session.session_id));
