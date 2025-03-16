import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(req) {
  try {
    // 简单的 API 密钥验证
    const apiKey = req.headers.get('x-api-key');
    if (apiKey !== process.env.ADMIN_API_KEY) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }
    
    // 创建 Supabase 客户端
    const supabase = await createClient();
    
    // 获取所有订阅
    const { data: subscriptions, error } = await supabase
      .from('User')
      .select('*');
    
    if (error) {
      console.error('查询订阅失败:', error);
      throw error;
    }
    
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