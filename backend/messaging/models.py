from django.db import models
from uuid import uuid4
from candidates.models import Candidate


class Message(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        SENT = "sent", "Sent"
        DELIVERED = "delivered", "Delivered"
        READ = "read", "Read"
        FAILED = "failed", "Failed"

    id = models.UUIDField(primary_key=True, default=uuid4, editable=False)
    candidate = models.ForeignKey(Candidate, on_delete=models.CASCADE, related_name="messages")
    body = models.TextField()
    provider = models.CharField(max_length=30, default="green_api")
    provider_message_id = models.CharField(max_length=225, blank=True, null=True)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING
    )
    error_message = models.TextField(blank=True)
    is_retryable = models.BooleanField(default=True)
    sent_at = models.DateTimeField(blank=True, null=True)
    delivered_at = models.DateTimeField(blank=True, null=True)
    read_at = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    retry_count = models.PositiveIntegerField(default=0)

    def __str__(self):
        return f"{self.id}"


class WebhookEvent(models.Model):
    provider_message_id = models.CharField(max_length=255)
    status = models.CharField(max_length=20)
    received_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["provider_message_id", "status"],
                name="unique_message_status_event"
            )
        ]

    def __str__(self):
        return f"{self.provider_message_id} - {self.status}"
