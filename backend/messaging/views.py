from uuid import UUID
from django.utils import timezone
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response

from candidates.models import Candidate
from .models import Message, WebhookEvent
from .serializers import MessageSerializer, BulkMessageRequestSerializer
from .services import send_whatsapp_message, sync_whatsapp_statuses


class CandidateMessageHistoryView(APIView):
    def get(self, request, candidate_id):
        try:
            candidate = Candidate.objects.get(id=candidate_id)
        except Candidate.DoesNotExist:
            return Response({"error": "Candidate not found"}, status=status.HTTP_404_NOT_FOUND)

        try:
            sync_whatsapp_statuses()
        except Exception:
            pass

        messages = Message.objects.filter(candidate=candidate).order_by("-created_at")
        serializer = MessageSerializer(messages, many=True)

        return Response({
            "candidate": {
                "id": str(candidate.id),
                "name": candidate.name,
                "phone_number": candidate.phone_number,
            },
            "total_messages": messages.count(),
            "history": serializer.data,
        }, status=status.HTTP_200_OK)


class SendMessageView(APIView):
    def post(self, request):
        candidate_id = request.data.get("candidate_id")
        body = (request.data.get("body") or "").strip()

        if not candidate_id or not body:
            return Response(
                {"error": "Candidate ID and message body are required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            candidate = Candidate.objects.get(id=UUID(str(candidate_id)))
        except ValueError:
            return Response({"error": "Invalid candidate ID format"}, status=status.HTTP_400_BAD_REQUEST)
        except Candidate.DoesNotExist:
            return Response({"error": "Candidate not found"}, status=status.HTTP_404_NOT_FOUND)

        message = Message.objects.create(
            candidate=candidate,
            body=body,
            provider="green_api",
            status=Message.Status.PENDING
        )

        try:
            result = send_whatsapp_message(
                to=candidate.phone_number,
                candidate_name=candidate.name,
                body=body
            )
            message.provider_message_id = result.get("sid")
            message.status = Message.Status.SENT
            message.sent_at = timezone.now()
            message.save()

            return Response({
                "message": "Message sent successfully",
                "data": MessageSerializer(message).data
            }, status=status.HTTP_201_CREATED)

        except Exception as e:
            message.status = Message.Status.FAILED
            message.error_message = str(e)
            message.save()

            return Response({
                "error": str(e),
                "message": "Message sending failed",
                "data": MessageSerializer(message).data
            }, status=status.HTTP_400_BAD_REQUEST)


class BulkSendMessageView(APIView):
    def post(self, request):
        serializer = BulkMessageRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        candidate_ids = serializer.validated_data["candidate_ids"]
        body = serializer.validated_data["body"]

        candidates = Candidate.objects.filter(id__in=candidate_ids)
        results = []

        for candidate in candidates:
            message = Message.objects.create(
                candidate=candidate,
                body=body,
                provider="green_api",
                status=Message.Status.PENDING
            )

            try:
                result = send_whatsapp_message(
                    to=candidate.phone_number,
                    candidate_name=candidate.name,
                    body=body
                )
                message.provider_message_id = result.get("sid")
                message.status = Message.Status.SENT
                message.sent_at = timezone.now()
                message.save()

                results.append({
                    "candidate_id": str(candidate.id),
                    "status": "sent",
                    "message_id": str(message.id)
                })
            except Exception as e:
                message.status = Message.Status.FAILED
                message.error_message = str(e)
                message.save()

                results.append({
                    "candidate_id": str(candidate.id),
                    "status": "failed",
                    "error": str(e)
                })

        return Response({
            "message": "Bulk messaging completed",
            "results": results
        }, status=status.HTTP_200_OK)


class RetryMessageView(APIView):
    def post(self, request, message_id):
        try:
            message = Message.objects.get(id=message_id)
        except Message.DoesNotExist:
            return Response({"error": "Message not found"}, status=status.HTTP_404_NOT_FOUND)

        if message.status != Message.Status.FAILED:
            return Response({"error": "Only failed messages can be retried"}, status=status.HTTP_400_BAD_REQUEST)

        message.retry_count += 1
        message.status = Message.Status.PENDING
        message.error_message = ""
        message.save()

        try:
            result = send_whatsapp_message(
                to=message.candidate.phone_number,
                candidate_name=message.candidate.name,
                body=message.body
            )
            message.provider_message_id = result.get("sid")
            message.status = Message.Status.SENT
            message.sent_at = timezone.now()
            message.save()

            return Response({
                "message": "Message retry successful",
                "data": MessageSerializer(message).data
            }, status=status.HTTP_200_OK)

        except Exception as e:
            message.status = Message.Status.FAILED
            message.error_message = str(e)
            message.save()

            return Response({
                "error": str(e),
                "message": "Retry failed",
                "data": MessageSerializer(message).data
            }, status=status.HTTP_400_BAD_REQUEST)


class SyncStatusView(APIView):
    def post(self, request):
        updated_count = sync_whatsapp_statuses()
        return Response({
            "message": "Status sync completed",
            "updated_count": updated_count
        }, status=status.HTTP_200_OK)

    def get(self, request):
        updated_count = sync_whatsapp_statuses()
        return Response({
            "message": "Status sync completed",
            "updated_count": updated_count
        }, status=status.HTTP_200_OK)


class MessageStatusWebhookView(APIView):
    def post(self, request):
        provider_message_id = request.data.get("idMessage") or request.data.get("provider_message_id")
        raw_status = (request.data.get("status") or request.data.get("statusMessage") or "").lower()

        status_map = {
            "sent": Message.Status.SENT,
            "delivered": Message.Status.DELIVERED,
            "read": Message.Status.READ,
            "failed": Message.Status.FAILED,
            "noaccount": Message.Status.FAILED,
        }
        new_status = status_map.get(raw_status)

        if not provider_message_id or not new_status:
            return Response({"error": "idMessage and valid status are required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            message = Message.objects.get(provider_message_id=provider_message_id)
        except Message.DoesNotExist:
            return Response({"error": "Message not found"}, status=status.HTTP_404_NOT_FOUND)

        _, created = WebhookEvent.objects.get_or_create(
            provider_message_id=provider_message_id,
            status=new_status
        )
        if not created:
            return Response({"message": "Duplicate event ignored", "status": message.status})

        priority = {
            Message.Status.PENDING: 0,
            Message.Status.SENT: 1,
            Message.Status.DELIVERED: 2,
            Message.Status.READ: 3,
            Message.Status.FAILED: -1,
        }

        if priority.get(new_status, 0) > priority.get(message.status, 0):
            message.status = new_status
            now = timezone.now()
            if new_status == Message.Status.SENT and not message.sent_at:
                message.sent_at = now
            elif new_status == Message.Status.DELIVERED and not message.delivered_at:
                message.delivered_at = now
            elif new_status == Message.Status.READ:
                if not message.delivered_at:
                    message.delivered_at = now
                if not message.read_at:
                    message.read_at = now
            message.save()

        return Response({
            "message": "Status updated successfully",
            "current_status": str(message.status)
        }, status=status.HTTP_200_OK)
