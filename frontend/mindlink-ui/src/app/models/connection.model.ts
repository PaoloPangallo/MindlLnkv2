export interface Connection {
  id?: number;
  source: number;
  target: number;
  type?: string;
  strength?: number;
  created_at?: string;
  source_title?: string;
  target_title?: string;
}
