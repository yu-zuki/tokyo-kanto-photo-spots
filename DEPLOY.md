# GitHub Pages 部署

这个项目是纯静态网站，可以免费部署到 GitHub Pages。

## 使用方式

1. 创建一个 public GitHub 仓库，例如：

```text
tokyo-kanto-photo-spots
```

2. 把本地仓库推上去：

```bash
git remote add origin https://github.com/yu-zuki/tokyo-kanto-photo-spots.git
git push -u origin main
```

3. 打开仓库页面：

```text
Settings -> Pages
```

4. 在 `Build and deployment` 里选择：

```text
Source: GitHub Actions
```

5. 等待 Actions 里的 `Deploy to GitHub Pages` 跑完。

最终网址通常是：

```text
https://yu-zuki.github.io/tokyo-kanto-photo-spots/
```

## 后续更新

每次改完网站后：

```bash
git add .
git commit -m "Update site"
git push
```

GitHub Actions 会自动重新发布。

## 文件说明

- `index.html`: 网站入口。
- `assets/`: 页面样式、交互和数据。
- `.github/workflows/pages.yml`: GitHub Pages 自动发布流程。
- `fetch_wikipedia_title_photos.py`: 从公开来源补充地点照片元数据。
