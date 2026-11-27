import { describe, it, expect, vi, beforeEach } from 'vitest';
import handler from '../../api/health';

describe('Health Check API (/api/health)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('deve responder HTTP 200 com JSON { status: "ok", project: "clarice-achadinhos", timestamp }', async () => {
    const req = new Request('http://localhost:3000/api/health');
    const res = await handler(req);

    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('application/json');

    const data = await res.json();
    expect(data.status).toBe('ok');
    expect(data.project).toBe('clarice-achadinhos');
    expect(data.timestamp).toBeDefined();
    expect(new Date(data.timestamp).getTime()).not.toBeNaN();
  });

  it('deve suportar o formato Node.js serverless (req, res)', async () => {
    let statusCode = 0;
    let jsonBody: any = null;

    const mockReq = { method: 'GET' };
    const mockRes = {
      status(code: number) {
        statusCode = code;
        return this;
      },
      json(body: any) {
        jsonBody = body;
        return this;
      },
    };

    await handler(mockReq, mockRes);

    expect(statusCode).toBe(200);
    expect(jsonBody.status).toBe('ok');
    expect(jsonBody.project).toBe('clarice-achadinhos');
    expect(jsonBody.timestamp).toBeDefined();
  });
});
