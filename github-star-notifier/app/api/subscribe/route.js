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
    
    // 生成随机的 Webhook 密钥
    const secret = crypto.randomBytes(20).toString('hex');
    
    // 构建 Webhook URL
    const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://star-notify.vercel.app'}/api/webhook`;
    
    // 这里您可以将订阅信息存储到数据库中
    // 例如使用 MongoDB, Supabase, Firebase 等
    // 存储 owner, repo, email, secret 等信息
    
    return NextResponse.json({ 
      success: true,
      owner,
      repo,
      email,
      secret,
      webhookUrl
    });
  } catch (error) {
    console.error('订阅处理失败:', error);
    return NextResponse.json(
      { success: false, error: error.message }, 
      { status: 500 }
    );
  }
}