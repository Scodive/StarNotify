import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { createClient } from '@vercel/edge-config';

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
    const { owner, repo, email, secret } = await req.json();
    
    if (!owner || !repo || !email || !secret) {
      return NextResponse.json(
        { error: '缺少必要参数' }, 
        { status: 400 }
      );
    }
    
    // 验证密钥是否匹配
    if (secret !== process.env.GITHUB_WEBHOOK_SECRET) {
      return NextResponse.json(
        { error: '密钥不匹配' }, 
        { status: 401 }
      );
    }
    
    // 检查 EDGE_CONFIG 环境变量
    if (!process.env.EDGE_CONFIG) {
      console.error('缺少 EDGE_CONFIG 环境变量');
      return NextResponse.json(
        { error: '服务器配置错误' }, 
        { status: 500 }
      );
    }
    
    try {
      // 创建 Edge Config 客户端
      const edgeConfig = createClient(process.env.EDGE_CONFIG);
      
      // 获取现有的订阅列表
      let subscriptions = await edgeConfig.get('subscriptions') || [];
      
      // 查找并更新订阅状态
      const updatedSubscriptions = subscriptions.map(sub => {
        if (sub.owner === owner && sub.repo === repo && sub.email === email) {
          return { ...sub, status: 'active', verifiedAt: new Date().toISOString() };
        }
        return sub;
      });
      
      // 保存更新后的订阅列表
      await edgeConfig.set('subscriptions', updatedSubscriptions);
      
      console.log(`已激活订阅: ${owner}/${repo} -> ${email}`);
    } catch (edgeConfigError) {
      console.error('Edge Config 操作失败:', edgeConfigError);
      // 即使 Edge Config 失败，我们仍然发送确认邮件
      console.log('Edge Config 失败，但继续发送确认邮件');
    }
    
    // 发送确认邮件
    try {
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
      console.log(`确认邮件已发送至: ${email}`);
    } catch (emailError) {
      console.error('发送确认邮件失败:', emailError);
      return NextResponse.json(
        { success: false, error: '发送确认邮件失败，但订阅可能已激活' }, 
        { status: 500 }
      );
    }
    
    return NextResponse.json({ 
      success: true,
      message: '验证成功，已发送确认邮件' 
    });
  } catch (error) {
    console.error('验证处理失败:', error);
    return NextResponse.json(
      { success: false, error: error.message }, 
      { status: 500 }
    );
  }
}