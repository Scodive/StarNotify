import { NextResponse } from 'next/server';
import { get, set } from '@vercel/edge-config';

export async function POST(req) {
  try {
    const { owner, repo, email } = await req.json();
    
    if (!owner || !repo || !email) {
      return NextResponse.json(
        { error: '缺少必要参数' }, 
        { status: 400 }
      );
    }
    
    // 使用固定的 Webhook 密钥
    const secret = process.env.GITHUB_WEBHOOK_SECRET;
    
    // 构建 Webhook URL
    const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://star-notify.vercel.app'}/api/webhook`;
    
    // 获取现有的订阅列表
    let subscriptions = await get('subscriptions') || [];
    
    // 检查是否已存在相同的订阅
    const existingSubscription = subscriptions.find(
      sub => sub.owner === owner && sub.repo === repo && sub.email === email
    );
    
    if (existingSubscription) {
      // 如果已存在但状态是 pending，则返回相同的数据让用户继续设置
      if (existingSubscription.status === 'pending') {
        return NextResponse.json({ 
          success: true,
          owner,
          repo,
          email,
          secret,
          webhookUrl,
          message: '继续完成 Webhook 设置'
        });
      }
      
      // 如果已存在且状态是 active，则通知用户
      if (existingSubscription.status === 'active') {
        return NextResponse.json({ 
          success: false, 
          error: '您已经订阅了这个仓库' 
        }, { status: 400 });
      }
    }
    
    // 添加新的订阅
    subscriptions.push({
      owner,
      repo,
      email,
      createdAt: new Date().toISOString(),
      status: 'pending' // 待验证状态
    });
    
    // 保存更新后的订阅列表
    await set('subscriptions', subscriptions);
    
    console.log(`已添加订阅: ${owner}/${repo} -> ${email}`);
    
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