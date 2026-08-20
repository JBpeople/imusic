# iMusic

iMusic 的前后端会打包到同一个 Docker 镜像中，对外统一使用 `8001` 端口。

## Docker Compose 运行

先复制 `.env.example` 为 `.env` 并填写接口配置，然后执行：

```bash
docker compose up -d --build
```

启动完成后访问：<http://localhost:8001>

首次打开会要求创建管理员账号。管理员可以在左下角账号入口中新增、停用用户或重置密码；每个用户拥有独立的喜欢歌曲和收藏歌单，歌曲、歌单及歌词缓存由所有用户共享。

查看运行日志：

```bash
docker compose logs -f imusic
```

停止程序：

```bash
docker compose down
```

SQLite 数据保存在 `imusic-data` Docker 命名卷中，重新构建或删除容器不会清空歌曲缓存和喜欢列表。`.env` 仅在容器启动时读取，不会写入镜像。

## 单独使用 Docker

```bash
docker build -t imusic .
docker volume create imusic-data
docker run -d --name imusic -p 8001:8001 --env-file .env -e DATABASE_URL=sqlite:////app/data/data.db -v imusic-data:/app/data imusic
```
