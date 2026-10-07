# DreamStudio — Sunucu Kurulum Kılavuzu

## Gereksinimler
- Ubuntu 22.04+ VPS
- Docker + Docker Compose
- celalyabuz.store domain → sunucu IP'ye A kaydı

## 1. Sunucuya Bağlan ve Docker Kur

```bash
# Docker yükle
curl -fsSL https://get.docker.com | sh
usermod -aG docker $USER
newgrp docker
```

## 2. Proxy Network Oluştur

```bash
docker network create proxy
```

## 3. Projeyi Çek

```bash
git clone https://github.com/aliyabuz25/DreamStudio.git
cd DreamStudio
```

## 4. .env Dosyasını Hazırla

```bash
cp .env.example .env
```

Traefik dashboard şifresi oluştur:
```bash
echo $(htpasswd -nb admin SIFRENIZ) | sed -e 's/\$/\$\$/g'
# Çıktıyı .env içindeki TRAEFIK_AUTH değerine yapıştır
```

## 5. Let's Encrypt için acme.json Hazırla

Traefik volume otomatik oluşturur, sadece izinleri ayarla:
```bash
mkdir -p letsencrypt
touch letsencrypt/acme.json
chmod 600 letsencrypt/acme.json
```

## 6. Başlat

```bash
docker compose up -d --build
```

## 7. Logları İzle

```bash
docker compose logs -f dreamstudio-web
docker compose logs -f dreamstudio-wa
docker compose logs -f traefik
```

## 8. WhatsApp Bağlantısı

Uygulama ayağa kalktıktan sonra:
1. https://celalyabuz.store/admin adresine git
2. Sol menüden WhatsApp'a tıkla
3. "Bağlan / QR Üret" butonuna bas
4. Telefonundan WhatsApp > Bağlı Cihazlar > Cihaz Ekle ile QR'ı okut

## 9. Güncelleme

```bash
git pull origin main
docker compose up -d --build
```

## DNS Kayıtları

| Tip | İsim | Değer |
|-----|------|-------|
| A | @ | Sunucu IP |
| A | www | Sunucu IP |
| A | traefik | Sunucu IP |