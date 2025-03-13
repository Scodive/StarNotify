"use client";

import { useState } from "react";
import Image from "next/image";

export default function Home() {
  const [repoUrl, setRepoUrl] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");

    try {
      // 从仓库URL中提取用户名和仓库名
      const urlPattern = /github\.com\/([^\/]+)\/([^\/]+)/;
      const match = repoUrl.match(urlPattern);
      
      if (!match) {
        throw new Error("请输入有效的 GitHub 仓库链接");
      }
      
      const [, owner, repo] = match;
      
      const response = await fetch("/api/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          owner,
          repo,
          email,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "订阅失败，请稍后再试");
      }
      
      setMessage("订阅成功！您将收到该仓库的 Star 通知");
      setRepoUrl("");
      setEmail("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-rows-[auto_1fr_auto] min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="py-6 px-4 bg-white dark:bg-gray-800 shadow">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image 
              src="/star-icon.svg" 
              alt="Star Icon" 
              width={32} 
              height={32}
              className="dark:invert"
            />
            <h1 className="text-xl font-bold">StarNotify</h1>
          </div>
          <a 
            href="https://github.com/Scodive/StarNotify" 
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
          >
            GitHub
          </a>
        </div>
      </header>

      <main className="flex flex-col items-center justify-center p-4 md:p-8">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 md:p-8">
          <div className="flex justify-center mb-6">
            <Image 
              src="/star-icon.svg" 
              alt="Star Icon" 
              width={64} 
              height={64}
              className="dark:invert"
            />
          </div>
          
          <h2 className="text-2xl font-bold text-center mb-2">GitHub Star 通知</h2>
          
          <p className="text-gray-600 dark:text-gray-300 text-center mb-8">
            当您的 GitHub 仓库收到新的 Star 时，自动发送邮件通知
          </p>
          
          {message && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
              {message}
            </div>
          )}
          
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}
          
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label htmlFor="repoUrl" className="block text-sm font-medium mb-2">
                GitHub 仓库链接
              </label>
              <input
                type="text"
                id="repoUrl"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://github.com/用户名/仓库名"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                required
              />
            </div>
            
            <div className="mb-6">
              <label htmlFor="email" className="block text-sm font-medium mb-2">
                通知邮箱
              </label>
              <input
                type="email"
                id="email"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors duration-300 disabled:bg-blue-400"
              disabled={loading}
            >
              {loading ? "处理中..." : "订阅 Star 通知"}
            </button>
          </form>
        </div>
      </main>

      <footer className="py-6 px-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
        <div className="max-w-5xl mx-auto text-center text-sm text-gray-600 dark:text-gray-400">
          <p>© {new Date().getFullYear()} StarNotify. 使用 Next.js 和 Tailwind CSS 构建。</p>
        </div>
      </footer>
    </div>
  );
}