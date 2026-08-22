# 正畸复诊管理系统 - Vercel + Supabase 版

全部免费部署，不需要买服务器。

## 功能特点

- 患者列表，颜色提醒（7天内标黄、逾期标红）
- 一键确认复诊，自动归档历史记录
- 点击患者姓名查看完整复诊历史
- 搜索、统计卡片、导出备份
- 手机电脑都能用，自动 HTTPS

## 技术架构

- 前端 + API：部署在 Vercel（免费）
- 数据库：Supabase PostgreSQL（免费 500MB）

## 目录结构

```
ortho-tracker-vercel/
├── api/                        # Vercel Serverless API
│   ├── patients/
│   │   ├── index.js            # GET/POST /api/patients
│   │   ├── [id].js             # PUT/DELETE /api/patients/:id
│   │   └── [id]/
│   │       ├── confirm-visit.js # POST /api/patients/:id/confirm-visit
│   │       └── records.js      # GET/POST /api/patients/:id/records
│   ├── records/
│   │   └── [id].js             # PUT/DELETE /api/records/:id
│   ├── export/
│   │   └── [format].js        # GET /api/export/csv|json
│   ├── stats.js               # GET /api/stats
│   └── health.js              # GET /api/health
├── lib/
│   └── supabase.js            # Supabase 客户端
├── public/                    # 前端静态文件
│   ├── index.html
│   ├── style.css
│   └── app.js
├── supabase-schema.sql        # 数据库建表脚本
├── package.json
├── vercel.json
└── .env.example
```

---

## 部署步骤（按顺序操作）

### 第1步：注册 Supabase 并创建数据库

1. 打开 https://supabase.com 注册账号（可以用 GitHub 账号登录）
2. 点击 **New Project** 创建新项目
   - Name: `ortho-tracker`（随便填）
   - Database Password: 设置一个密码，**记下来**
   - Region: 选离你最近的（如 Northeast Asia / Singapore）
3. 等待项目创建完成（约2分钟）
4. 创建完成后，进入项目，点击左侧 **SQL Editor**
5. 点击 **New Query**
6. 打开项目里的 `supabase-schema.sql` 文件，**复制全部内容**，粘贴到 SQL Editor 里
7. 点击 **Run** 执行，看到 "Success" 表示建表成功

### 第2步：获取 Supabase 密钥

1. 在 Supabase 项目页面，点击左侧 **Settings**（齿轮图标）
2. 点击 **API**
3. 找到以下两个值，**记下来**：
   - **Project URL**：类似 `https://xxxxxxxx.supabase.co`
   - **service_role key**：一长串密钥（注意不是 anon key）

### 第3步：把代码上传到 GitHub

1. 在 GitHub 创建一个新仓库（public 或 private 都行）
2. 把 `ortho-tracker-vercel` 文件夹里的所有文件上传到这个仓库
3. 确保 `.gitignore` 文件也一起上传了

### 第4步：在 Vercel 部署

1. 打开 https://vercel.com 注册账号（可以用 GitHub 登录）
2. 点击 **Add New Project**
3. 找到你刚创建的 GitHub 仓库，点击 **Import**
4. **先不要急着点 Deploy**，需要先设置环境变量
5. 展开 **Environment Variables** 部分，添加两个变量：

   | Name | Value |
   |------|-------|
   | `SUPABASE_URL` | 你的 Project URL（第2步获取的） |
   | `SUPABASE_SERVICE_KEY` | 你的 service_role key（第2步获取的） |

6. 点击 **Deploy**
7. 等待1-2分钟，部署完成后会给你一个网址，类似 `https://ortho-tracker.vercel.app`

### 第5步：打开使用

在浏览器打开 Vercel 给你的网址，就可以开始用了。

把这个网址分享给同事，所有人都能同时访问和编辑。

---

## 数据备份

在网页上点击「导出表格」按钮，会下载 CSV 文件，用 Excel 可以直接打开。

建议每周导出一次备份。

也可以在 Supabase 后台的 **Table Editor** 里直接查看和管理数据。

---

## 常见问题

**Q: 真的免费吗？**
Vercel 免费额度：100GB 流量/月，够诊所用很久。
Supabase 免费额度：500MB 数据库、50GB 流量/月，几百个患者完全够用。

**Q: 网址能改成自己的域名吗？**
可以。在 Vercel 项目设置里的 Domains 页面添加自定义域名，按提示配置 DNS 即可。

**Q: 数据安全吗？**
数据存在 Supabase 的 PostgreSQL 数据库里，非常稳定。Supabase 是专业数据库服务商，每天自动备份。但还是建议定期导出 CSV 备份。

**Q: 手机能用吗？**
可以，页面自适应手机屏幕，手机浏览器打开网址就能用。
