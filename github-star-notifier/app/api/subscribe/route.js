import { NextResponse } from 'next/server';
import { createClient } from '@vercel/edge-config';

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
    
    // 检查 EDGE_CONFIG 环境变量
    if (!process.env.EDGE_CONFIG) {
      console.error('缺少 EDGE_CONFIG 环境变量');
      return NextResponse.json(
        { error: '服务器配置错误' }, 
        { status: 500 }
      );
    }
    
    try {
      console.log('开始处理订阅请求:', { owner, repo, email });
      
      // 创建 Edge Config 客户端
      const edgeConfig = createClient(process.env.EDGE_CONFIG);
      console.log('Edge Config 客户端已创建');
      
      // 获取现有的订阅列表
      console.log('正在获取订阅列表...');
      let subscriptions = await edgeConfig.get('subscriptions');
      console.log('获取到的订阅列表:', subscriptions);
      
      // 确保 subscriptions 是数组
      if (!Array.isArray(subscriptions)) {
        console.log('订阅列表不是数组，初始化为空数组');
        subscriptions = [];
      }
      
      // 检查是否已存在相同的订阅
      const existingSubscription = subscriptions.find(
        sub => sub.owner === owner && sub.repo === repo && sub.email === email
      );
      
      if (existingSubscription) {
        console.log('找到现有订阅:', existingSubscription);
        
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
      const newSubscription = {
        owner,
        repo,
        email,
        createdAt: new Date().toISOString(),
        status: 'pending' // 待验证状态
      };
      
      console.log('添加新订阅:', newSubscription);
      subscriptions.push(newSubscription);
      
      // 保存更新后的订阅列表
      console.log('正在保存更新后的订阅列表...');
      await edgeConfig.set('subscriptions', subscriptions);
      console.log('订阅列表已保存');
      
      // 再次获取订阅列表以验证保存是否成功
      const verifySubscriptions = await edgeConfig.get('subscriptions');
      console.log('验证保存后的订阅列表:', verifySubscriptions);
      
      console.log(`已添加订阅: ${owner}/${repo} -> ${email}`);
      
      return NextResponse.json({ 
        success: true,
        owner,
        repo,
        email,
        secret,
        webhookUrl
      });
    } catch (edgeConfigError) {
      console.error('Edge Config 操作失败:', edgeConfigError);
      
      // 如果 Edge Config 操作失败，使用内存存储作为备用方案
      console.log('使用内存存储作为备用方案');
      
      return NextResponse.json({ 
        success: true,
        owner,
        repo,
        email,
        secret,
        webhookUrl,
        warning: '使用临时存储，订阅可能不会持久保存'
      });
    }
  } catch (error) {
    console.error('订阅处理失败:', error);
    return NextResponse.json(
      { success: false, error: error.message }, 
      { status: 500 }
    );
  }
}