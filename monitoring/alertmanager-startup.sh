#!/bin/sh
set -e

# Source environment variables
set -a
if [ -f /etc/alertmanager/.env ]; then
  . /etc/alertmanager/.env
fi
set +a

# Substitute environment variables in the config template
sed \
  -e "s|\${SMTP_SMARTHOST}|${SMTP_SMARTHOST}|g" \
  -e "s|\${SMTP_FROM}|${SMTP_FROM}|g" \
  -e "s|\${SMTP_AUTH_USERNAME}|${SMTP_AUTH_USERNAME}|g" \
  -e "s|\${SMTP_AUTH_PASSWORD}|${SMTP_AUTH_PASSWORD}|g" \
  -e "s|\${SMTP_REQUIRE_TLS}|${SMTP_REQUIRE_TLS}|g" \
  -e "s|\${DISCORD_WEBHOOK_URL}|${DISCORD_WEBHOOK_URL}|g" \
  -e "s|\${TELEGRAM_BOT_TOKEN}|${TELEGRAM_BOT_TOKEN}|g" \
  -e "s|\${TELEGRAM_CHAT_ID}|${TELEGRAM_CHAT_ID}|g" \
  -e "s|\${ALERT_EMAIL_TO}|${ALERT_EMAIL_TO}|g" \
  /etc/alertmanager/alertmanager.template.yml > /etc/alertmanager/alertmanager.yml

# Start alertmanager
exec /bin/alertmanager --config.file=/etc/alertmanager/alertmanager.yml --storage.path=/alertmanager
