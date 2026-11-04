from rest_framework import serializers
from .models import Candidate

class CandidateSerializer(serializers.ModelSerializer):
    last_message = serializers.SerializerMethodField()
    status = serializers.SerializerMethodField()

    class Meta:
        model = Candidate
        fields = [
            "id",
            "name",
            "phone_number",
            "email",
            "created_at",
            "updated_at",
            "last_message",
            "status",
        ]

    def get_last_message(self, obj):
        messages = list(obj.messages.all())
        if messages:
            latest = max(messages, key=lambda m: m.created_at)
            return latest.created_at
        return None

    def get_status(self, obj):
        messages = list(obj.messages.all())
        if messages:
            latest = max(messages, key=lambda m: m.created_at)
            return latest.status
        return "NA"

