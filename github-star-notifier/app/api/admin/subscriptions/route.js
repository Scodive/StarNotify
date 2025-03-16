import { NextResponse } from 'next/server';
import { createClient } from '@vercel/edge-config';

export async function GET(req) {
  try {
    // 简单的 API 密钥验证
    const apiKey = req.headers.get('x-api-key');
    if (apiKey !== process.env.ADMIN_API_KEY) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }
    
    // 创建 Edge Config 客户端
    const edgeConfig = createClient(process.env.EDGE_CONFIG);
    
    // 获取所有订阅
    const subscriptions = await edgeConfig.get('subscriptions') || [];
    
    return NextResponse.json({ 
      success: true,
      count: subscriptions.length,
      subscriptions
    });
  } catch (error) {
    console.error('获取订阅失败:', error);
    return NextResponse.json(
      { success: false, error: error.message }, 
      { status: 500 }
    );
  }
} 