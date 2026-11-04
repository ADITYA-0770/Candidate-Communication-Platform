from django.urls import path
from .views import (
    SendMessageView,
    BulkSendMessageView,
    CandidateMessageHistoryView,
    MessageStatusWebhookView,
    RetryMessageView,
    SyncStatusView,
)

urlpatterns = [
    path("messages/send/", SendMessageView.as_view(), name="send-message"),
    path("messages/bulk-send/", BulkSendMessageView.as_view(), name="bulk-send-messages"),
    path("candidates/<uuid:candidate_id>/messages/", CandidateMessageHistoryView.as_view(), name="candidate-message-history"),
    path("candidates/<uuid:candidate_id>/history/", CandidateMessageHistoryView.as_view(), name="candidate-history-alias"),
    path("webhooks/message-status/", MessageStatusWebhookView.as_view(), name="message-status-webhook"),
    path("messages/<uuid:message_id>/retry/", RetryMessageView.as_view(), name="retry-message"),
    path("messages/sync-status/", SyncStatusView.as_view(), name="sync-status"),
]
