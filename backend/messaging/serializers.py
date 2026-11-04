from rest_framework import serializers
from .models import Message


class MessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Message
        fields = "__all__"
        read_only_fields = [
            "id",
            "provider",
            "provider_message_id",
            "status",
            "error_message",
            "is_retryable",
            "retry_count",
            "sent_at",
            "delivered_at",
            "read_at",
            "created_at",
            "updated_at",
        ]


class BulkMessageRequestSerializer(serializers.Serializer):
    candidate_ids = serializers.ListField(
        child=serializers.UUIDField(),
        allow_empty=False
    )
    body = serializers.CharField()
