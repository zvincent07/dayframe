declare module "open-graph-scraper" {
  export interface OGSOptions {
    url: string;
    timeout?: number;
    headers?: Record<string, string>;
  }
  export interface OGSResult {
    error: boolean;
    result: Record<string, unknown>;
    response?: Record<string, unknown>;
  }
  export default function ogs(options: OGSOptions): Promise<OGSResult>;
}
