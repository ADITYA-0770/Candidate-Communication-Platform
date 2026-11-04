import os
import re
import requests
from django.conf import settings
from django.utils import timezone


def get_green_api_config():
    instance_id = getattr(settings, "GREEN_API_INSTANCE_ID", "") or os.getenv("GREEN_API_INSTANCE_ID", "")
    api_token = getattr(settings, "GREEN_API_TOKEN", "") or os.getenv("GREEN_API_TOKEN", "")
    host = (getattr(settings, "GREEN_API_HOST", "") or os.getenv("GREEN_API_HOST", "") or "https://api.green-api.com").rstrip("/")
    return str(instance_id).strip(), str(api_token).strip(), host


def format_chat_id(phone: str) -> str:
    if not phone:
        return ""
    digits = re.sub(r"\D", "", str(phone))
    if len(digits) == 10:
        digits = f"91{digits}"
    return f"{digits}@c.us"


def send_whatsapp_message(to: str, candidate_name: str = "", body: str = "") -> dict:
    instance_id, api_token, host = get_green_api_config()
    if not instance_id or not api_token:
        raise ValueError("Green API credentials missing in .env (GREEN_API_INSTANCE_ID / GREEN_API_TOKEN)")

    chat_id = format_chat_id(to)
    if not chat_id:
        raise ValueError("Invalid recipient phone number")

    message_text = (body or "").strip()
    if not message_text:
        message_text = f"Hi {candidate_name or 'there'}, this is an update regarding your application."

    url = f"{host}/waInstance{instance_id}/sendMessage/{api_token}"
    response = requests.post(url, json={"chatId": chat_id, "message": message_text}, timeout=15)

    if response.status_code != 200:
        desc = ""
        try:
            err_data = response.json()
            desc = (
                err_data.get("correspondentsStatus", {}).get("description")
                or err_data.get("invokeStatus", {}).get("description")
                or err_data.get("message")
                or ""
            )
        except Exception:
            pass

        if response.status_code == 466:
            raise RuntimeError(
                "Green API Free Plan limit: Monthly quota of 3 recipient phone numbers exceeded on this developer instance. "
                "You can only send to your 3 registered numbers (918260510768, 919337110177, 917377343478). "
                "Upgrade to a business tariff on green-api.com to message new numbers."
            )

        if desc:
            raise RuntimeError(f"Green API error ({response.status_code}): {desc}")
        raise RuntimeError(f"Green API request failed with status code {response.status_code}")

    data = response.json()
    id_message = data.get("idMessage")
    if not id_message:
        raise RuntimeError(f"Green API response missing idMessage: {data}")

    return {
        "sid": id_message,
        "status": "sent",
        "provider": "green_api"
    }


def sync_whatsapp_statuses(minutes: int = 1440) -> int:
    from .models import Message

    instance_id, api_token, host = get_green_api_config()
    if not instance_id or not api_token:
        return 0

    priority = {
        Message.Status.PENDING: 0,
        Message.Status.SENT: 1,
        Message.Status.DELIVERED: 2,
        Message.Status.READ: 3,
        Message.Status.FAILED: -1,
    }

    status_map = {
        "sent": Message.Status.SENT,
        "delivered": Message.Status.DELIVERED,
        "read": Message.Status.READ,
        "readed": Message.Status.READ,
        "viewed": Message.Status.READ,
        "failed": Message.Status.FAILED,
        "noaccount": Message.Status.FAILED,
        "undelivered": Message.Status.FAILED,
    }

    updated_count = 0
    now = timezone.now()

    try:
        url = f"{host}/waInstance{instance_id}/lastOutgoingMessages/{api_token}?minutes={minutes}"
        res = requests.get(url, timeout=5)
        if res.ok and isinstance(res.json(), list):
            for item in res.json():
                msg_id = item.get("idMessage")
                raw_status = (item.get("statusMessage") or item.get("status") or "").lower()
                new_status = status_map.get(raw_status)

                if not msg_id or not new_status:
                    continue

                msg = Message.objects.filter(provider_message_id=msg_id).first()
                if not msg:
                    continue

                if priority.get(new_status, 0) > priority.get(msg.status, 0):
                    msg.status = new_status
                    if new_status == Message.Status.SENT and not msg.sent_at:
                        msg.sent_at = now
                    elif new_status == Message.Status.DELIVERED and not msg.delivered_at:
                        msg.delivered_at = now
                    elif new_status == Message.Status.READ:
                        if not msg.delivered_at:
                            msg.delivered_at = now
                        if not msg.read_at:
                            msg.read_at = now
                    msg.save()
                    updated_count += 1
    except Exception:
        pass

    try:
        res = requests.get(f"{host}/waInstance{instance_id}/receiveNotification/{api_token}", timeout=2)
        if res.ok and res.json():
            data = res.json()
            receipt_id = data.get("receiptId")
            body = data.get("body", {})

            if body.get("typeWebhook") == "outgoingMessageStatus":
                msg_id = body.get("idMessage")
                raw_status = (body.get("status") or body.get("statusMessage") or "").lower()
                new_status = status_map.get(raw_status)

                if msg_id and new_status:
                    msg = Message.objects.filter(provider_message_id=msg_id).first()
                    if msg and priority.get(new_status, 0) > priority.get(msg.status, 0):
                        msg.status = new_status
                        if new_status == Message.Status.READ:
                            if not msg.delivered_at:
                                msg.delivered_at = now
                            if not msg.read_at:
                                msg.read_at = now
                        elif new_status == Message.Status.DELIVERED and not msg.delivered_at:
                            msg.delivered_at = now
                        msg.save()
                        updated_count += 1

            if receipt_id:
                requests.delete(f"{host}/waInstance{instance_id}/deleteNotification/{api_token}/{receipt_id}", timeout=2)
    except Exception:
        pass

    return updated_count
