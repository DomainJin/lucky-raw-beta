// Next.js API route: Proxy Google Apps Script for CORS
export default async function handler(req, res) {
  const GSHEET_API = 'https://script.google.com/macros/s/AKfycbxo289V3Ky97PwhyW5INpfefEaw_LRwb90mbmBVtUNYIIxMphJ8plKTD8P7RnUmRsRm/exec';
  let method = req.method;
  let fetchOptions = { method };
  if (method === 'POST') {
    // Chuyển body sang x-www-form-urlencoded đúng chuẩn Google Script e.parameter
    let params = [];
    for (const key in req.body) {
      params.push(encodeURIComponent(key) + '=' + encodeURIComponent(req.body[key]));
    }
    fetchOptions.body = params.join('&');
    fetchOptions.headers = { 'Content-Type': 'application/x-www-form-urlencoded' };
  }
  try {
    const response = await fetch(GSHEET_API, fetchOptions);
    const text = await response.text();
    // Trả về JSON nếu có thể, nếu không trả về text
    try {
      res.status(response.status).json(JSON.parse(text));
    } catch {
      res.status(response.status).send(text);
    }
  } catch (e) {
    res.status(500).json({ error: 'Proxy error', detail: e.message });
  }
}
