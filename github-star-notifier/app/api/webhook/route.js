import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import crypto from 'crypto';



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
  
  export async function POST(req) {
    try {
      const { owner, repo, email } = await req.json();
      
      if (!owner || !repo || !email) {
        return NextResponse.json(
          { error: '缺少必要参数' }, 
          { status: 400 }
        );
      }
      
      // 这里您可以将订阅信息存储到数据库中
      // 例如使用 MongoDB, Supabase, Firebase 等
      
      // 发送确认邮件
      await transporter.sendMail({
        from: process.env.EMAIL_FROM,
        to: email,
        subject: `已订阅 ${owner}/${repo} 的 Star 通知`,
        html: `
          <h1>订阅确认</h1>
          <p>您已成功订阅 <strong>${owner}/${repo}</strong> 仓库的 Star 通知。</p>
          <p>当该仓库收到新的 Star 时，我们会向您发送邮件通知。</p>
          <p>感谢您使用 StarNotify 服务！</p>
        `,
      });
      
      return NextResponse.json({ 
        success: true,
        message: '订阅成功' 
      });
    } catch (error) {
      console.error('订阅处理失败:', error);
      return NextResponse.json(
        { success: false, error: error.message }, 
        { status: 500 }
      );
    }
  }

export async function POST(req) {
  try {
    // 获取 GitHub 签名
    const signature = req.headers.get('x-hub-signature-256');
    if (!signature) {
      return NextResponse.json({ error: '缺少签名' }, { status: 401 });
    }
    
    // 获取原始请求体
    const bodyText = await req.text();
    
    // 验证签名
    const hmac = crypto.createHmac('sha256', process.env.GITHUB_WEBHOOK_SECRET);
    const digest = 'sha256=' + hmac.update(bodyText).digest('hex');
    
    if (signature !== digest) {
      return NextResponse.json({ error: '签名无效' }, { status: 401 });
    }
    
    // 解析请求体
    const payload = JSON.parse(bodyText);
    
    // 验证是否为 star 事件
    if (payload.action === 'starred') {
      const repoName = payload.repository.full_name;
      const stargazerName = payload.sender.login;
      const stargazerUrl = payload.sender.html_url;
      
      // 发送邮件
      await transporter.sendMail({
        from: process.env.EMAIL_FROM,
        to: process.env.EMAIL_TO,
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