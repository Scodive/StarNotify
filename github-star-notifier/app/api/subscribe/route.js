import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

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