from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Q
from .serializers import CandidateSerializer
from .models import Candidate
from messaging.services import sync_whatsapp_statuses


class CandidateView(APIView):
    
    def get(self, request):
        if request.query_params.get("sync") == "true":
            try:
                sync_whatsapp_statuses()
            except Exception:
                pass

        search = request.query_params.get("search", "").strip()

        candidates = Candidate.objects.prefetch_related("messages").order_by("-created_at")

        if search:
            candidates = candidates.filter(
                Q(name__icontains=search) |
                Q(phone_number__icontains=search) |
                Q(email__icontains=search)
            )

        serializer = CandidateSerializer(candidates, many=True)

        return Response(
            {
                "message": "success",
                "total": candidates.count(),
                "data": serializer.data
            },
            status=status.HTTP_200_OK
        )


    def post(self, request):
        serializer = CandidateSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response({"message": "success", "data": serializer.data}, status=status.HTTP_201_CREATED)
        return Response({"message": "error", "error": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

class SingleCandidateView(APIView):
    def get(self, request, id):
        try:
            candidate = Candidate.objects.get(id=id)
            serializer = CandidateSerializer(candidate)
            return Response({"message": "success", "data": serializer.data}, status=status.HTTP_200_OK)
        except Candidate.DoesNotExist:
            return Response({"message": "error", "error": "candidate not found"}, status=status.HTTP_404_NOT_FOUND)

    def put(self, request, id):
        try:
            candidate = Candidate.objects.get(id=id)
            serializer = CandidateSerializer(candidate, data=request.data, partial=True)
            if serializer.is_valid():
                serializer.save()
                return Response({"message": "Candidate Successfully Updated", "data": serializer.data}, status=status.HTTP_200_OK)
            return Response({"message": "Error", "error": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)
        except Candidate.DoesNotExist:
            return Response({"message": "Error", "error": "candidate not found"}, status=status.HTTP_404_NOT_FOUND)

    def patch(self, request, id):
        return self.put(request, id)

    def delete(self, request, id):
        try:
            candidate = Candidate.objects.get(id=id)
            candidate.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except Candidate.DoesNotExist:
            return Response({"message": "Error", "error": "candidate not found"}, status=status.HTTP_404_NOT_FOUND)


