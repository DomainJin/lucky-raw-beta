// API endpoint for managing passwords (for Vercel/Next.js serverless)
// Simple file-based storage (for demo, not production secure)

import fs from 'fs';
import path from 'path';


const ACCOUNTS_FILE = path.join(process.cwd(), 'passwords.json');

function readAccounts() {
  try {
    const data = fs.readFileSync(ACCOUNTS_FILE, 'utf8');
    const arr = JSON.parse(data);
    if (Array.isArray(arr) && arr.length > 0) return arr;
    // Nếu file rỗng, tạo account mặc định
    return [
      {
        username: 'visionx',
        password: 'admin123',
        active: 0,
        revoke: 9999999999999
      }
    ];
  } catch {
    // Nếu file chưa tồn tại, tạo account mặc định
    return [
      {
        username: 'visionx',
        password: 'admin123',
        active: 0,
        revoke: 9999999999999
      }
    ];
  }
}

function writeAccounts(list) {
  fs.writeFileSync(ACCOUNTS_FILE, JSON.stringify(list, null, 2));
}

export default function handler(req, res) {
  if (req.method === 'GET') {
    // Lấy danh sách account
    res.status(200).json(readAccounts());
  } else if (req.method === 'POST') {
    // Thêm account mới
    const { username, password, active, revoke } = req.body;
    if (!username || !password || !active || !revoke) {
      return res.status(400).json({ error: 'Thiếu thông tin' });
    }
    const list = readAccounts();
    list.push({ username, password, active, revoke });
    writeAccounts(list);
    res.status(201).json({ success: true });
  } else if (req.method === 'DELETE') {
    // Xóa account theo index
    const { idx } = req.body;
    const list = readAccounts();
    if (typeof idx !== 'number' || idx < 0 || idx >= list.length) {
      return res.status(400).json({ error: 'Sai index' });
    }
    list.splice(idx, 1);
    writeAccounts(list);
    res.status(200).json({ success: true });
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
