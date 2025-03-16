import { NextResponse } from 'next/server';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { createClient } from '@/utils/supabase/server';

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
    // 验证 GitHub Webhook 签名
    const signature = req.headers.get('x-hub-signature-256');
    const body = await req.text();
    
    if (!verifySignature(body, signature)) {
      console.error('Webhook 签名验证失败');
      return NextResponse.json({ error: '签名验证失败' }, { status: 401 });
    }
    
    const event = req.headers.get('x-github-event');
    const payload = JSON.parse(body);
    
    // 只处理 star 事件
    if (event !== 'star') {
      return NextResponse.json({ message: '非 star 事件，已忽略' });
    }
    
    const { action, repository, sender } = payload;
    
    // 只处理新增 star 的事件
    if (action !== 'created') {
      return NextResponse.json({ message: `非新增 star 事件 (${action})，已忽略` });
    }
    
    const owner = repository.owner.login;
    const repo = repository.name;
    const stargazer = sender.login;
    
    console.log(`收到 star 事件: ${stargazer} -> ${owner}/${repo}`);
    
    // 查询订阅了该仓库的用户
    const supabase = await createClient();
    const { data: subscribers, error } = await supabase
      .from('User')
      .select('*')
      .eq('owner', owner)
      .eq('repo', repo)
      .eq('status', 'active');
    
    if (error) {
      console.error('查询订阅用户失败:', error);
      throw error;
    }
    
    console.log(`找到 ${subscribers.length} 个订阅用户`);
    
    // 向每个订阅用户发送邮件通知
    const emailPromises = subscribers.map(async (subscriber) => {
      try {
        await transporter.sendMail({
          from: process.env.EMAIL_FROM,
          to: subscriber.email,
          subject: `🌟 ${owner}/${repo} 获得了新的 Star!`,
          html: `
            <h1>新 Star 通知</h1>
            <p>您订阅的仓库 <strong>${owner}/${repo}</strong> 刚刚获得了一个新的 Star!</p>
            <p>用户 <a href="https://github.com/${stargazer}">${stargazer}</a> 在 ${new Date().toLocaleString()} 为该仓库点了 Star。</p>
            <p>当前 Star 总数: ${repository.stargazers_count}</p>
            <hr>
            <p><small>此邮件由 StarNotify 自动发送。</small></p>
          `,
        });
        console.log(`已发送通知邮件至: ${subscriber.email}`);
        return { email: subscriber.email, success: true };
      } catch (emailError) {
        console.error(`发送邮件至 ${subscriber.email} 失败:`, emailError);
        return { email: subscriber.email, success: false, error: emailError.message };
      }
    });
    
    const emailResults = await Promise.all(emailPromises);
    
    return NextResponse.json({ 
      success: true,
      message: `已处理 ${owner}/${repo} 的 star 事件`,
      emailResults
    });
  } catch (error) {
    console.error('处理 Webhook 失败:', error);
    return NextResponse.json(
      { success: false, error: error.message }, 
      { status: 500 }
    );
  }
}

// 验证 GitHub Webhook 签名
function verifySignature(payload, signature) {
  if (!signature) return false;
  
  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  const hmac = crypto.createHmac('sha256', secret);
  const digest = 'sha256=' + hmac.update(payload).digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(digest),
    Buffer.from(signature)
  );
}