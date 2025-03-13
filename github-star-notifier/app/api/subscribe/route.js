import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import crypto from 'crypto';
import { Readable } from 'stream';

// 配置邮件发送器
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

// 辅助函数：将请求体转换为字符串
async function buffer(readable) {
  const chunks = [];
  for await (const chunk of readable) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

export async function POST(req) {
  try {
    // 获取 GitHub 签名
    const signature = req.headers.get('x-hub-signature-256');
    if (!signature) {
      return NextResponse.json({ error: '缺少签名' }, { status: 401 });
    }
    
    // 获取原始请求体
    const rawBody = await buffer(Readable.fromWeb(req.body));
    const bodyString = rawBody.toString('utf8');
    
    // 解析请求体
    const payload = JSON.parse(bodyString);
    
    // 从数据库中查找对应的订阅信息
    // 这里应该根据 payload.repository.full_name 查找对应的订阅记录
    // 包括 email 和 secret
    
    // 假设我们从数据库中获取了以下信息
    const repoName = payload.repository.full_name;
    const secret = "从数据库中获取的密钥"; // 这里应该是从数据库中获取的
    const subscriberEmail = "从数据库中获取的邮箱"; // 这里应该是从数据库中获取的
    
    // 验证签名
    const hmac = crypto.createHmac('sha256', secret);
    const digest = 'sha256=' + hmac.update(bodyString).digest('hex');
    
    if (signature !== digest) {
      return NextResponse.json({ error: '签名无效' }, { status: 401 });
    }
    
    // 验证是否为 star 事件
    if (payload.action === 'starred') {
      const stargazerName = payload.sender.login;
      const stargazerUrl = payload.sender.html_url;
      
      // 发送邮件
      await transporter.sendMail({
        from: process.env.EMAIL_FROM,
        to: subscriberEmail, // 使用订阅者的邮箱
        subject: `🌟 新的 Star: ${repoName}`,
        html: `
          <h1>您的仓库收到了一个新的 Star!</h1>
          <p><strong>仓库:</strong> ${repoName}</p>
          <p><strong>用户:</strong> <a href="${stargazerUrl}">${stargazerName}</a></p>
          <p>感谢您使用 GitHub Star 通知服务!</p>
        `,
      });
      
      return NextResponse.json({ success: true });
    }
    
    return NextResponse.json({ success: true, message: '非 star 事件' });
  } catch (error) {
    console.error('处理 webhook 失败:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// 禁用默认的请求体解析，因为我们需要原始请求体来验证签名
export const config = {
  api: {
    bodyParser: false,
  },
};