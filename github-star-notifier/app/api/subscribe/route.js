import { NextResponse } from 'next/server';
// ... existing code ...
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
    const { owner, repo, email, secret } = await req.json();
    console.log('收到验证请求:', { owner, repo, email });
    
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
    
    try {
      // 创建 Supabase 客户端
      const supabase = await createClient();
      console.log('Supabase 客户端已创建');
      
      // 查找订阅
      const { data: subscription, error: queryError } = await supabase
        .from('User')
        .select('*')
        .eq('owner', owner)
        .eq('repo', repo)
        .eq('email', email)
        .single();
      
      if (queryError && queryError.code !== 'PGRST116') {
        console.error('查询订阅失败:', queryError);
        throw queryError;
      }
      
      if (subscription) {
        // 更新订阅状态
        const { error: updateError } = await supabase
          .from('User')
          .update({ 
            status: 'active', 
            verified_at: new Date().toISOString() 
          })
          .eq('id', subscription.id);
        
        if (updateError) {
          console.error('更新订阅状态失败:', updateError);
          throw updateError;
        }
        
        console.log(`已激活订阅: ${owner}/${repo} -> ${email}`);
      } else {
        // 添加新订阅
        const { error: insertError } = await supabase
          .from('User')
          .insert({
            owner,
            repo,
            email,
            created_at: new Date().toISOString(),
            status: 'active',
            verified_at: new Date().toISOString(),
            github_url: `https://github.com/${owner}/${repo}`
          });
        
        if (insertError) {
          console.error('添加订阅失败:', insertError);
          throw insertError;
        }
        
        console.log(`已添加并激活订阅: ${owner}/${repo} -> ${email}`);
      }
    } catch (dbError) {
      console.error('数据库操作失败:', dbError);
      console.log('数据库操作失败，但继续发送确认邮件');
    }
    
    // 发送确认邮件
    try {
      console.log('正在发送确认邮件...');
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