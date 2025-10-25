import {Connection} from "./connection.model";

export interface Idea {
  id?: number;
  title: string;
  content: string;
  summary?: string;
  category?: string;
  keywords?: string[];
  created_at?: string;
  user?: string;
  outgoing_connections?: Connection[];
}
